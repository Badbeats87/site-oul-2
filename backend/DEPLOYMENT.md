# Backend Deployment Guide

## Overview

This guide covers deployment of the Vinyl Catalog Backend API across development, staging, and production environments.

## Prerequisites

- Docker & Docker Compose installed
- Node.js 18.x
- PostgreSQL 15+
- GitHub account with repository access
- Railway account (for production deployment)

## Local Development

### Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Running with Docker Compose

```bash
# Start all services (database, backend, redis)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Running locally without Docker

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Environment Configuration

### Development (.env.development)
```
NODE_ENV=development
APP_PORT=3001
DB_HOST=localhost
DB_NAME=vinyl_catalog_dev
LOG_LEVEL=debug
```

### Production (.env.production)
```
NODE_ENV=production
APP_PORT=3001
DB_HOST=production-db.example.com
DB_NAME=vinyl_catalog_prod
LOG_LEVEL=warn
```

## Docker Deployment

### Build Image

```bash
docker build -t vinyl-catalog-backend:latest .
```

### Run Container

```bash
docker run \
  -e NODE_ENV=production \
  -e DB_HOST=db.example.com \
  -p 3001:3001 \
  vinyl-catalog-backend:latest
```

## CI/CD Pipeline

The repository includes GitHub Actions workflows:

- **backend-ci.yml**: Runs on every push/PR
  - Lints code
  - Runs tests
  - Builds Docker image
  - Deploys to Railway (main branch only)

## Railway Deployment

### Initial Setup

1. Connect GitHub repository to Railway
2. Select `backend` directory as service root
3. Configure environment variables in Railway dashboard
4. Set up PostgreSQL database service

### Deployment

Automatic deployment triggers on:
- Push to `main` branch
- Pull request merged to `main`

### Manual Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link <project-id>

# Deploy
railway up
```

## Database Migrations

```bash
# Run migrations (when implemented)
npm run migrate

# Rollback migrations
npm run migrate:rollback

# Create new migration
npm run migrate:create <migration-name>
```

## Monitoring & Logs

### Local Logs

```bash
# View logs
docker-compose logs -f backend

# Tail specific number of lines
docker-compose logs --tail=100 backend
```

### Production Logs

Via Railway Dashboard:
1. Select service
2. Click "Logs" tab
3. View real-time logs

### Health Checks

```bash
# Health check endpoint
curl http://localhost:3001/api/v1/health

# Readiness check
curl http://localhost:3001/api/v1/health/ready

# Liveness check
curl http://localhost:3001/api/v1/health/live
```

## Scaling

### Local

Increase `docker-compose.yml` resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

### Production (Railway)

1. Go to Railway project
2. Select backend service
3. Increase Memory/CPU
4. Enable auto-scaling if available

## Troubleshooting

### Port Already in Use

```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

### Database Connection Issues

```bash
# Check database connectivity
npm run test:db-connection

# View database logs
docker-compose logs postgres
```

### Memory Leaks

```bash
# Check memory usage
docker stats

# Generate heap dump
node --inspect src/index.js
```

## Backup & Recovery

### Database Backup

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U postgres vinyl_catalog_prod > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres vinyl_catalog_prod < backup.sql
```

### Configuration Backup

Store `.env.production` securely using:
- Environment variable manager
- Secret vault (HashiCorp Vault, AWS Secrets Manager)
- GitHub Secrets (for CI/CD)

## Performance Optimization

### Caching

- Redis for session/cache layer (configured in docker-compose)
- HTTP caching headers for API responses
- Database query optimization

### Load Balancing

Use behind reverse proxy (nginx, HAProxy):
- Health check endpoints
- Connection pooling
- Gzip compression

### Database Optimization

- Index frequently queried columns
- Query result pagination
- Connection pooling tuning

## Security Checklist

- [ ] JWT secret configured in production
- [ ] Database password is strong and unique
- [ ] CORS origin restricted to frontend domain
- [ ] Helmet security headers enabled
- [ ] Rate limiting configured
- [ ] HTTPS enforced in production
- [ ] Environment secrets not committed to git
- [ ] Regular security updates applied

## Rollback Procedure

### Docker Container

```bash
# Stop current version
docker-compose stop backend

# Run previous version
docker run -d --name backend-prev vinyl-catalog-backend:previous-tag
```

### Railway

1. Go to Railway project
2. Click "Deployments"
3. Select previous deployment
4. Click "Redeploy"

## Contact & Support

- Issues: GitHub Issues
- Documentation: See `README.md`
- CI/CD: See `.github/workflows/backend-ci.yml`
