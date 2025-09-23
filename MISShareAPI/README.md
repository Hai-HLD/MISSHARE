# MIS Share API

A .NET 8 Web API for the MIS Share note-sharing platform, built with Entity Framework Core and SQLite.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **Note Management**: Create, read, update, delete notes with full-text search
- **Comments System**: Add comments to notes with full CRUD operations
- **Social Features**: Note sharing and discovery
- **User Profiles**: User management and profile customization
- **Database**: SQLite with Entity Framework Core for data persistence

## Technology Stack

- **.NET 8** - Web API framework
- **Entity Framework Core 8** - ORM for database operations
- **SQLite** - Lightweight database
- **JWT Bearer Authentication** - Secure authentication
- **BCrypt** - Password hashing
- **Swagger/OpenAPI** - API documentation
- **CORS** - Cross-origin resource sharing for frontend integration

## Getting Started

### Prerequisites

- .NET 8 SDK
- Visual Studio 2022 or VS Code (optional)

### Installation

1. Clone the repository
2. Navigate to the API directory:
   ```bash
   cd MISShareAPI
   ```

3. Restore packages:
   ```bash
   dotnet restore
   ```

4. Build the project:
   ```bash
   dotnet build
   ```

5. Run the API:
   ```bash
   dotnet run
   ```

The API will be available at:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:7000`
- Swagger UI: `http://localhost:5000` (root URL)

### Database

The SQLite database (`MISShare.db`) will be automatically created when you first run the application. It includes:

- Seed data with sample users and notes
- Proper relationships and constraints
- Indexes for performance optimization

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Notes
- `GET /api/notes` - Get all notes (with search/filter options)
- `GET /api/notes/{id}` - Get specific note
- `POST /api/notes` - Create new note
- `PUT /api/notes/{id}` - Update note
- `DELETE /api/notes/{id}` - Delete note

### Comments
- `GET /api/comments/note/{noteId}` - Get comments for a note
- `POST /api/comments` - Create new comment
- `PUT /api/comments/{id}` - Update comment
- `DELETE /api/comments/{id}` - Delete comment

### Users
- `GET /api/users/{id}` - Get user profile
- `PUT /api/users/profile` - Update current user profile
- `GET /api/users/{id}/notes` - Get user's notes

## Configuration

### JWT Settings
Configure JWT settings in `appsettings.json`:

```json
{
  "JwtSettings": {
    "SecretKey": "YourSuperSecretKeyThatIsAtLeast32CharactersLong!",
    "Issuer": "MISShareAPI",
    "Audience": "MISShareAPI",
    "ExpiryHours": 24
  }
}
```

### CORS Settings
The API is configured to allow requests from common development ports:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:8000`
- `http://127.0.0.1:8000`

## Data Models

### User
- Id, FirstName, LastName, Email, CWID
- PasswordHash, Title, Bio
- CreatedAt, UpdatedAt, IsActive

### Note
- Id, Title, Class, Topic, Year, Content
- AuthorId, CreatedAt

### Comment
- Id, Content, NoteId, AuthorId
- CreatedAt, UpdatedAt, IsActive

## File Upload

File upload functionality has been removed from the application.

## Security Features

- JWT token-based authentication
- Password hashing with BCrypt
- CORS configuration for frontend integration
- Input validation and sanitization
- Soft deletes for data integrity

## Development

### Adding New Endpoints

1. Create controller in `Controllers/` folder
2. Add DTOs in `DTOs/` folder if needed
3. Update `Program.cs` if new services are required

### Database Changes

1. Modify entity models in `Models/` folder
2. Update `ApplicationDbContext.cs` if needed
3. The database will be automatically updated on next run

### Testing

Use Swagger UI at the root URL to test all endpoints interactively.

## Deployment

For production deployment:

1. Update connection strings in `appsettings.json`
2. Change JWT secret key to a secure value
3. Configure proper CORS origins
4. Set up file storage for uploads
5. Configure HTTPS certificates

## License

This project is part of the MIS Share platform and follows the same licensing terms.
