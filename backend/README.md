# Vinyl Catalog Backend API

Node.js/Express backend for the Vinyl Catalog marketplace system.

## Features

- ✅ Express.js REST API
- ✅ PostgreSQL database
- ✅ JWT authentication
- ✅ Structured logging with Winston
- ✅ Environment-based configuration
- ✅ Docker containerization
- ✅ GitHub Actions CI/CD
- ✅ Health check endpoints
- ✅ Error handling middleware
- ✅ CORS security
- ✅ Request ID tracing

## Tech Stack

- **Runtime**: Node.js 18.x
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 15
- **Cache**: Redis (optional)
- **Logging**: Winston
- **Security**: Helmet, CORS
- **Testing**: Jest, Supertest
- **Linting**: ESLint
- **Formatting**: Prettier

## Project Structure

```
backend/
├── config/               # Configuration files
│   ├── config.js        # Main config loader
│   └── logger.js        # Winston logger setup
├── src/
│   ├── index.js         # Application entry point
│   ├── middleware/      # Express middleware
│   │   ├── errorHandler.js
│   │   └── notFoundHandler.js
│   ├── routes/          # API routes
│   │   └── health.js
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── models/          # Database models
│   └── utils/           # Utility functions
├── tests/               # Test files
├── docs/                # API documentation
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Development environment
├── package.json         # Dependencies
├── DEPLOYMENT.md        # Deployment guide
└── RUNBOOK.md           # Operations runbook
```

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Run tests
docker-compose exec backend npm test

# Stop services
docker-compose down
```

### Local Development

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Available Scripts

```bash
npm start              # Run production server
npm run dev            # Run development server with hot reload
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm test               # Run Jest tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

## API Endpoints

### Health Check
- `GET /api/v1/health` - Health status
- `GET /api/v1/health/live` - Liveness check (Kubernetes)
- `GET /api/v1/health/ready` - Readiness check (Kubernetes)

### TODO: Add other endpoints
- `/api/v1/auth/*` - Authentication endpoints
- `/api/v1/catalog/*` - Catalog management
- `/api/v1/pricing/*` - Pricing engine
- `/api/v1/submissions/*` - Seller submissions
- `/api/v1/inventory/*` - Inventory management
- `/api/v1/orders/*` - Order management

## Environment Variables

See `.env.example` for all available variables. Key variables:

```
NODE_ENV=development        # Environment (development/production)
APP_PORT=3001              # Server port
DB_HOST=localhost          # Database host
DB_NAME=vinyl_catalog_dev  # Database name
JWT_SECRET=your_secret     # JWT signing secret
LOG_LEVEL=debug            # Logging level
```

## Error Handling

All errors follow a standard response format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "status": 400,
    "requestId": "uuid-here"
  }
}
```

## Logging

Logs are stored in `logs/` directory:
- `error.log` - Error level logs only
- `all.log` - All logs

Format: JSON in production, colorized text in development

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/health.test.js

# Run with coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Railway

```bash
# Login to Railway
railway login

# Link project
railway link <project-id>

# Deploy
railway up
```

## Common Operations

See [RUNBOOK.md](./RUNBOOK.md) for common operational tasks.

## Development Workflow

1. Create feature branch from `develop`
2. Make changes and commit with descriptive messages
3. Run linting and tests locally
4. Push and create pull request
5. Wait for CI/CD to pass
6. Merge to develop, then to main for release

## Performance Considerations

- Database queries are optimized with indexes
- Request ID tracking for debugging
- Structured logging for analysis
- Health check endpoints for monitoring
- Docker container with resource limits

## Security

- JWT authentication for API endpoints
- Helmet security headers
- CORS configuration
- Rate limiting (to be implemented)
- Input validation with express-validator
- Environment-based secrets management

## Dependencies

- **express** - Web framework
- **winston** - Logging
- **dotenv** - Environment variables
- **cors** - Cross-origin requests
- **helmet** - Security headers
- **uuid** - ID generation

## Contributing

1. Follow existing code structure
2. Write tests for new features
3. Run linting and tests before committing
4. Update documentation
5. Reference related issues in commit messages

## Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **CI/CD Status**: GitHub Actions
- **Deployment**: Railway Dashboard

## License

MIT
