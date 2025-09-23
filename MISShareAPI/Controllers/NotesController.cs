using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using MISShareAPI.Data;
using MISShareAPI.DTOs;
using MISShareAPI.Models;
using System.Security.Claims;

namespace MISShareAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public NotesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<NoteDto>>> GetNotes([FromQuery] SearchNotesDto searchDto)
        {
            var query = _context.Notes
                .Include(n => n.Author)
                .AsQueryable();

            // Apply filters
            if (!string.IsNullOrEmpty(searchDto.Title))
            {
                query = query.Where(n => n.Title.ToLower().Contains(searchDto.Title.ToLower()));
            }

            if (!string.IsNullOrEmpty(searchDto.Topic))
            {
                query = query.Where(n => n.Topic.ToLower() == searchDto.Topic.ToLower());
            }

            if (!string.IsNullOrEmpty(searchDto.Class))
            {
                query = query.Where(n => n.Class.ToLower() == searchDto.Class.ToLower());
            }

            if (searchDto.Year.HasValue)
            {
                query = query.Where(n => n.Year == searchDto.Year.Value);
            }

            if (!string.IsNullOrEmpty(searchDto.Author))
            {
                query = query.Where(n => 
                    (n.Author.FirstName + " " + n.Author.LastName).ToLower().Contains(searchDto.Author.ToLower()));
            }

            // Apply sorting
            query = searchDto.SortBy?.ToLower() switch
            {
                "title" => searchDto.SortOrder == "desc" ? query.OrderByDescending(n => n.Title) : query.OrderBy(n => n.Title),
                "createdat" => searchDto.SortOrder == "desc" ? query.OrderByDescending(n => n.CreatedAt) : query.OrderBy(n => n.CreatedAt),
                _ => query.OrderByDescending(n => n.CreatedAt)
            };

            // Apply pagination
            var totalCount = await query.CountAsync();
            var notes = await query
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            var noteDtos = notes.Select(n => MapToNoteDto(n)).ToList();

            Response.Headers.Append("X-Total-Count", totalCount.ToString());
            Response.Headers.Append("X-Page", searchDto.Page.ToString());
            Response.Headers.Append("X-Page-Size", searchDto.PageSize.ToString());

            return Ok(noteDtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<NoteDto>> GetNote(int id)
        {
            var note = await _context.Notes
                .Include(n => n.Author)
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                return NotFound();
            }

            return Ok(MapToNoteDto(note));
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<NoteDto>> CreateNote(CreateNoteDto createNoteDto)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized();
            }

            var note = new Note
            {
                AuthorId = userId,
                Title = createNoteDto.Title,
                Class = createNoteDto.Class,
                Topic = createNoteDto.Topic,
                Year = createNoteDto.Year,
                Content = createNoteDto.Content,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notes.Add(note);
            await _context.SaveChangesAsync();

            // Reload with includes
            note = await _context.Notes
                .Include(n => n.Author)
                .FirstAsync(n => n.Id == note.Id);

            return CreatedAtAction(nameof(GetNote), new { id = note.Id }, MapToNoteDto(note));
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<ActionResult<NoteDto>> UpdateNote(int id, UpdateNoteDto updateNoteDto)
        {
            var note = await _context.Notes
                .Include(n => n.Author)
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                return NotFound();
            }

            var userId = GetCurrentUserId();
            if (userId != note.AuthorId)
            {
                return Forbid();
            }

            if (!string.IsNullOrEmpty(updateNoteDto.Title))
                note.Title = updateNoteDto.Title;
            
            if (!string.IsNullOrEmpty(updateNoteDto.Class))
                note.Class = updateNoteDto.Class;
            
            if (!string.IsNullOrEmpty(updateNoteDto.Topic))
                note.Topic = updateNoteDto.Topic;
            
            if (updateNoteDto.Year.HasValue)
                note.Year = updateNoteDto.Year.Value;
            
            if (!string.IsNullOrEmpty(updateNoteDto.Content))
                note.Content = updateNoteDto.Content;

            await _context.SaveChangesAsync();

            return Ok(MapToNoteDto(note));
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<ActionResult> DeleteNote(int id)
        {
            var note = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                return NotFound();
            }

            var userId = GetCurrentUserId();
            if (userId != note.AuthorId)
            {
                return Forbid();
            }

            _context.Notes.Remove(note);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        private NoteDto MapToNoteDto(Note note)
        {
            return new NoteDto
            {
                Id = note.Id,
                Title = note.Title,
                Class = note.Class,
                Topic = note.Topic,
                Year = note.Year,
                Content = note.Content,
                AuthorName = $"{note.Author.FirstName} {note.Author.LastName}",
                CreatedAt = note.CreatedAt
            };
        }
    }
}
