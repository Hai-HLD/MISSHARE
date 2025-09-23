# MIS SHARE - Cloudflare Workers API

This is the Cloudflare Workers implementation of the MIS SHARE API, replacing the previous .NET API.

## Architecture

- **Frontend**: HTML/CSS/JavaScript (Bootstrap 5)
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Authentication**: JWT tokens
- **Deployment**: Cloudflare Workers platform

## Project Structure

```
├── src/
│   ├── index.js              # Main worker entry point
│   ├── handlers/
│   │   ├── auth.js           # Authentication endpoints
│   │   ├── notes.js          # Notes CRUD operations
│   │   ├── users.js          # User management
│   │   └── test.js           # Test endpoints
│   └── utils/
│       ├── jwt.js            # JWT token handling
│       └── password.js       # Password hashing
├── wrangler.toml             # Cloudflare Workers configuration
├── package.json              # Node.js dependencies
└── DEPLOYMENT.md             # Deployment instructions
```

## Features

### Authentication
- User registration and login
- JWT token-based authentication
- Password hashing with SHA-256
- Token validation and expiration

### Notes Management
- Create, read, update, delete notes
- Search and filter functionality
- Pagination support
- Author information display

### User Management
- User profile viewing
- User notes listing
- Profile updates

### Database Operations
- Direct D1 database integration
- SQL query execution
- Connection testing

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Notes
- `GET /api/notes` - List notes (with search/filter)
- `GET /api/notes/{id}` - Get specific note
- `POST /api/notes` - Create new note
- `PUT /api/notes/{id}` - Update note
- `DELETE /api/notes/{id}` - Delete note

### Users
- `GET /api/users/{cwid}` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/{cwid}/notes` - Get user's notes

### Testing
- `GET /api/test/d1-connection` - Test database connection

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure wrangler.toml** with your Cloudflare account details

3. **Deploy to Cloudflare**:
   ```bash
   npm run deploy
   ```

4. **Update frontend** to use your worker URL

## Development

```bash
# Start local development server
npm run dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# View logs
npm run tail
```

## Security Features

- JWT token authentication
- Password hashing
- CORS protection
- Input validation
- SQL injection prevention (parameterized queries)

## Performance

- Global edge deployment via Cloudflare
- Automatic scaling
- Low latency worldwide
- Built-in caching capabilities

## Monitoring

- Real-time logs via `wrangler tail`
- Cloudflare Analytics dashboard
- Error tracking and debugging

## Migration from .NET

This Workers implementation provides the same API interface as the previous .NET version, making the frontend migration seamless. The main differences are:

- **Deployment**: Cloudflare Workers instead of local server
- **Database**: Direct D1 integration instead of Entity Framework
- **Authentication**: Simplified JWT implementation
- **Scaling**: Automatic global scaling

## Support

For issues and questions:
1. Check the Cloudflare Workers documentation
2. Review the deployment guide in `DEPLOYMENT.md`
3. Test endpoints using the provided test endpoint
