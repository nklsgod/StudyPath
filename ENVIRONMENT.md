# Environment Configuration

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

### Database Configuration

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://studypath:studypath@localhost:5432/studypath

# Database connection pool settings
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

### JWT Configuration

```bash
# JWT secret key - change this in production!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# JWT token expiration time
JWT_EXPIRES_IN=7d
```

### Server Configuration

```bash
# Server port
PORT=3000

# Environment mode
NODE_ENV=development
```

### CORS Configuration

```bash
# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

## Example .env File

```env
# Database Configuration
DATABASE_URL=postgresql://studypath:studypath@localhost:5432/studypath
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# JWT Configuration
JWT_SECRET=dev-jwt-secret-key-change-in-production-2024
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

## Production Considerations

### Security

- **JWT_SECRET**: Use a strong, randomly generated secret (at least 256 bits)
- **DATABASE_URL**: Use secure credentials and connection strings
- Enable SSL/TLS in production database connections

### Performance

- **DB_MAX_CONNECTIONS**: Adjust based on your server capacity and expected load
- **DB_IDLE_TIMEOUT**: Configure based on connection pool requirements
- **JWT_EXPIRES_IN**: Balance security with user experience

### Environment Specific Settings

- **NODE_ENV**: Set to `production` in production environment
- **PORT**: Use port provided by hosting platform (e.g., process.env.PORT)
- **FRONTEND_URL**: Set to your actual frontend domain in production

## Docker Development Setup

If using the provided `docker-compose.yml`:

```bash
# For local development with Docker
DATABASE_URL=postgresql://studypath:studypath@localhost:5432/studypath
```

Make sure to start the database:

```bash
docker-compose up -d
```

## Verification

You can verify your environment setup by:

1. Starting the server: `npm run dev`
2. Checking the console for "Database connected successfully"
3. Visiting `http://localhost:3000` for the API overview
