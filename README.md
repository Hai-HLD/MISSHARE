# MIS SHARE - Study Notes Platform

A modern study notes sharing platform for MIS students at the University of Alabama, built with vanilla web technologies and powered by Cloudflare Workers.

## Features

- 🎓 **Study Notes Sharing** - Upload and share study materials with fellow students
- 🔍 **Advanced Search** - Find notes by topic, class, year, or author
- 👤 **User Profiles** - View user profiles and their shared notes
- 🔐 **Secure Authentication** - JWT-based authentication system
- 📱 **Responsive Design** - Mobile-first design with Bootstrap 5
- ⚡ **Fast Performance** - Powered by Cloudflare Workers global edge network
- 🗄️ **Cloud Database** - Cloudflare D1 serverless SQL database

## Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom styles with CSS variables and animations
- **JavaScript (ES6+)** - Vanilla JavaScript with modern features
- **Bootstrap 5.3.3** - UI framework via CDN
- **Bootstrap Icons** - Icon library

### Backend
- **Cloudflare Workers** - Serverless edge computing platform
- **Cloudflare D1** - Serverless SQL database
- **JWT** - JSON Web Tokens for authentication
- **RESTful API** - Clean API design

## Project Structure

```
MIS SHARE/
├── index.html              # Homepage
├── Pages/                  # Application pages
│   ├── home.html          # Home page
│   ├── login.html         # Login/signup page
│   ├── search.html        # Notes search page
│   ├── upload.html        # Note upload page
│   ├── profile.html       # User profile page
│   └── note.html          # Individual note view
├── scripts/
│   ├── main.js            # Main JavaScript functionality
│   └── api.js             # API service for Cloudflare Workers
├── styles/
│   └── main.css           # Custom CSS styles
├── src/                   # Cloudflare Workers source code
│   ├── index.js           # Worker entry point
│   ├── handlers/          # API endpoint handlers
│   └── utils/             # Utility functions
├── wrangler.toml          # Cloudflare Workers configuration
├── package.json           # Node.js dependencies
└── DEPLOYMENT.md          # Deployment instructions
```

## Getting Started

### Prerequisites
- Node.js 18+ (for Wrangler CLI)
- Cloudflare account
- D1 database set up

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd MISSHARE
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   # For frontend
   python -m http.server 8000
   # or
   npx http-server
   
   # For Workers (in another terminal)
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:8000`

### Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to Cloudflare Workers.

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

## Features Overview

### Authentication System
- User registration with CWID validation
- Secure login with JWT tokens
- Password hashing and validation
- Session management

### Notes Management
- Upload study notes with metadata
- Search and filter functionality
- View individual notes
- Edit and delete own notes
- Author attribution

### User Profiles
- View user profiles
- See user's shared notes
- Profile information display
- Notes count tracking

### Search & Discovery
- Advanced search filters
- Topic-based categorization
- Class and year filtering
- Author search

## Database Schema

The application uses a simple SQLite-compatible schema in Cloudflare D1:

- **Users** - User accounts with CWID, name, email
- **Notes** - Study notes with title, content, metadata
- **Relationships** - Notes linked to users via AuthorId

## Security Features

- JWT token authentication
- Password hashing with SHA-256
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

## Performance

- Global edge deployment via Cloudflare
- Automatic scaling
- Low latency worldwide
- Built-in caching
- Optimized database queries

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ for MIS students at the University of Alabama.