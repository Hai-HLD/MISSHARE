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
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("{cwid}")]
        public async Task<ActionResult<UserDto>> GetUser(string cwid)
        {
            var user = await _context.Users
                .Include(u => u.Notes)
                .FirstOrDefaultAsync(u => u.CWID == cwid);

            if (user == null)
            {
                return NotFound();
            }

            return Ok(MapToUserDto(user));
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<ActionResult<UserDto>> UpdateProfile(UpdateUserDto updateUserDto)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized();
            }

            var user = await _context.Users
                .Include(u => u.Notes)
                .FirstOrDefaultAsync(u => u.CWID == userId);

            if (user == null)
            {
                return NotFound();
            }

            if (!string.IsNullOrEmpty(updateUserDto.FirstName))
                user.FirstName = updateUserDto.FirstName;

            if (!string.IsNullOrEmpty(updateUserDto.LastName))
                user.LastName = updateUserDto.LastName;


            await _context.SaveChangesAsync();

            return Ok(MapToUserDto(user));
        }

        [HttpGet("{cwid}/notes")]
        public async Task<ActionResult<IEnumerable<NoteDto>>> GetUserNotes(string cwid, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.CWID == cwid);

            if (user == null)
            {
                return NotFound();
            }

            var notes = await _context.Notes
                .Include(n => n.Author)
                .Where(n => n.AuthorId == cwid)
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var noteDtos = notes.Select(n => MapToNoteDto(n)).ToList();

            var totalCount = await _context.Notes
                .CountAsync(n => n.AuthorId == cwid);

            Response.Headers.Append("X-Total-Count", totalCount.ToString());
            Response.Headers.Append("X-Page", page.ToString());
            Response.Headers.Append("X-Page-Size", pageSize.ToString());

            return Ok(noteDtos);
        }


        private string? GetCurrentUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        private UserDto MapToUserDto(User user)
        {
            var notesCount = user.Notes?.Count ?? 0;

            return new UserDto
            {
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                CWID = user.CWID,
                NotesCount = notesCount
            };
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
