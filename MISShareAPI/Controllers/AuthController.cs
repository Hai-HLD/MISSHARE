using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using MISShareAPI.Data;
using MISShareAPI.DTOs;
using MISShareAPI.Models;
using MISShareAPI.Services;
using System.Security.Claims;

namespace MISShareAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly JwtService _jwtService;

        public AuthController(ApplicationDbContext context, JwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(CreateUserDto createUserDto)
        {
            // Validate CWID format
            if (createUserDto.CWID.Length != 8 || !createUserDto.CWID.All(char.IsDigit))
            {
                return BadRequest("CWID must be exactly 8 digits.");
            }

            // Check if user already exists
            if (await _context.Users.AnyAsync(u => u.Email == createUserDto.Email))
            {
                return BadRequest("User with this email already exists.");
            }

            if (await _context.Users.AnyAsync(u => u.CWID == createUserDto.CWID))
            {
                return BadRequest("User with this CWID already exists.");
            }

            // Create new user
            var user = new User
            {
                FirstName = createUserDto.FirstName,
                LastName = createUserDto.LastName,
                Email = createUserDto.Email,
                CWID = createUserDto.CWID,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(createUserDto.Password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Generate token
            var token = _jwtService.GenerateToken(user);
            var expiresAt = _jwtService.GetTokenExpiration(token);

            return Ok(new AuthResponseDto
            {
                Token = token,
                User = MapToUserDto(user),
                ExpiresAt = expiresAt
            });
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(LoginDto loginDto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid email or password.");
            }

            // Generate token
            var token = _jwtService.GenerateToken(user);
            var expiresAt = _jwtService.GetTokenExpiration(token);

            return Ok(new AuthResponseDto
            {
                Token = token,
                User = MapToUserDto(user),
                ExpiresAt = expiresAt
            });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<UserDto>> GetCurrentUser()
        {
            var userCwidClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userCwidClaim == null)
            {
                return Unauthorized();
            }

            var user = await _context.Users
                .Include(u => u.Notes)
                .FirstOrDefaultAsync(u => u.CWID == userCwidClaim.Value);

            if (user == null)
            {
                return NotFound("User not found.");
            }

            return Ok(MapToUserDto(user));
        }

        private UserDto MapToUserDto(User user)
        {
            var notesCount = user.Notes?.Count ?? 0;

            return new UserDto
            {
                CWID = user.CWID,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                NotesCount = notesCount
            };
        }
    }
}
