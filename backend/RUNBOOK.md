# Backend Operations Runbook

Quick reference guide for common operational tasks.

## Table of Contents

1. [Starting & Stopping Services](#starting--stopping-services)
2. [Monitoring & Debugging](#monitoring--debugging)
3. [Database Operations](#database-operations)
4. [Deployment & Rollback](#deployment--rollback)
5. [Scaling & Performance](#scaling--performance)
6. [Incident Response](#incident-response)

---

## Starting & Stopping Services

### Start Development Environment

```bash
# Start all services with Docker Compose
cd backend
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# CONTAINER ID    STATUS              PORTS
# ...postgres...  Up (healthy)        5432/5432
# ...backend...   Up                  3001/3001
# ...redis...     Up (healthy)        6379/6379
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop specific service
docker-compose stop backend

# Remove all volumes (WARNING: loses data)
docker-compose down -v
```

### Restart Single Service

```bash
# Restart backend
docker-compose restart backend

# View logs after restart
docker-compose logs -f backend
```

---

## Monitoring & Debugging

### Check Service Health

```bash
# Via HTTP
curl http://localhost:3001/api/v1/health

# Expected response:
# {
#   "success": true,
#   "data": {
#     "status": "healthy",
#     "timestamp": "2024-01-15T10:30:00Z",
#     "uptime": 3600
#   }
# }
```

### View Logs

```bash
# Live logs from all services
docker-compose logs -f

# Logs from specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Follow logs with timestamps
docker-compose logs -f --timestamps backend
```

### Check Container Status

```bash
# Resource usage
docker stats

# Container details
docker-compose ps

# Inspect specific container
docker inspect vinyl_catalog_backend
```

### Debug Connection Issues

```bash
# Check database connectivity
docker-compose exec backend npm run test:db

# Test API from container
docker-compose exec backend curl http://localhost:3001/api/v1/health

# Check network connectivity between services
docker-compose exec backend ping postgres
```

### View Application Logs

```bash
# View recent error logs
tail -f logs/error.log

# View all logs
tail -f logs/all.log

# Search for specific pattern
grep "ERROR" logs/error.log
```

---

## Database Operations

### Access Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d vinyl_catalog_dev

# Common PostgreSQL commands:
# \dt                    - List tables
# \d <table_name>        - Describe table
# SELECT * FROM <table>; - Query table
# \q                     - Exit
```

### Backup Database

```bash
# Backup to file
docker-compose exec postgres pg_dump -U postgres vinyl_catalog_dev > backup.sql

# Backup with timestamps
docker-compose exec postgres pg_dump -U postgres vinyl_catalog_dev > backup-$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
# Restore from backup
docker-compose exec -T postgres psql -U postgres vinyl_catalog_dev < backup.sql

# Restore specific table
psql -U postgres vinyl_catalog_dev < table_backup.sql
```

### Run Migrations

```bash
# Apply migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback

# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:create add_users_table
```

### Database Troubleshooting

```bash
# Check database size
docker-compose exec postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('vinyl_catalog_dev'));"

# Find slow queries (in psql)
SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC;

# Reset statistics
docker-compose exec postgres psql -U postgres -c "SELECT pg_stat_statements_reset();"
```

---

## Deployment & Rollback

### Deploy to Staging

```bash
# Build Docker image
docker build -t vinyl-catalog-backend:staging .

# Push to registry
docker push vinyl-catalog-backend:staging

# Deploy via Railway (if using)
railway link <staging-project-id>
railway up
```

### Deploy to Production

```bash
# Build production image
docker build -t vinyl-catalog-backend:latest .
docker build -t vinyl-catalog-backend:v1.0.0 .

# Push to registry
docker push vinyl-catalog-backend:latest
docker push vinyl-catalog-backend:v1.0.0

# Deploy via Railway
railway link <prod-project-id>
railway up
```

### Rollback Procedure

```bash
# List recent deployments
docker images | grep vinyl-catalog-backend

# Rollback to previous version
docker-compose down
docker run -d -p 3001:3001 --name backend-prod vinyl-catalog-backend:v1.0.0

# Or via Railway: Go to Deployments tab and click Redeploy on previous version
```

### Health Check After Deployment

```bash
# Check all health endpoints
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/health/ready
curl http://localhost:3001/api/v1/health/live

# Check logs for errors
docker-compose logs backend | grep ERROR
```

---

## Scaling & Performance

### Increase Resource Limits

```bash
# Edit docker-compose.yml or Railway dashboard
# In docker-compose.yml:
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Enable Caching

```bash
# Redis is already in docker-compose
# Configure in application
REDIS_URL=redis://redis:6379

# Test Redis connection
docker-compose exec redis redis-cli ping
```

### Optimize Database

```bash
# Add indexes to frequently queried columns
CREATE INDEX idx_users_email ON users(email);

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM large_table WHERE column = value;

# Vacuum database to reclaim space
VACUUM;
ANALYZE;
```

### Monitor Performance

```bash
# Check container memory/CPU
docker stats vinyl_catalog_backend

# Check slow queries (if logging enabled)
grep "slow" logs/all.log

# Database connection pool stats
npm run inspect:db-pool
```

---

## Incident Response

### Service Down

```bash
# 1. Check status
docker-compose ps

# 2. Check logs for errors
docker-compose logs backend | tail -50

# 3. Restart service
docker-compose restart backend

# 4. Verify health
curl http://localhost:3001/api/v1/health

# 5. If still down, check dependencies
docker-compose logs postgres
docker-compose logs redis
```

### High Memory Usage

```bash
# 1. Check current usage
docker stats

# 2. View memory-intensive processes
docker-compose exec backend ps aux

# 3. Check for memory leaks
docker-compose logs backend | grep -i memory

# 4. Restart service
docker-compose restart backend

# 5. Generate heap dump if needed
docker-compose exec backend node --inspect src/index.js
```

### Database Connection Errors

```bash
# 1. Check database status
docker-compose ps postgres

# 2. Check PostgreSQL logs
docker-compose logs postgres

# 3. Test connection
docker-compose exec backend npm run test:db

# 4. Restart database
docker-compose restart postgres

# 5. Check connection pool
ps aux | grep postgres
```

### High CPU Usage

```bash
# 1. Identify process
docker stats

# 2. Check what's running
docker-compose exec backend top

# 3. Check for infinite loops
docker-compose logs backend | grep ERROR

# 4. Profile application
docker-compose exec backend node --prof src/index.js

# 5. Scale to more instances
# Add more backend containers in docker-compose or Railway
```

### 500 Errors in Production

```bash
# 1. Check error logs
tail -50 logs/error.log

# 2. Get request ID from client response
# X-Request-ID header in error response

# 3. Find request in logs
grep "REQUEST_ID" logs/all.log

# 4. Check database connectivity
npm run test:db

# 5. Check external API connectivity
curl https://api.discogs.com

# 6. Restart application
docker-compose restart backend
```

### Rollback Emergency

```bash
# If current version has critical bug

# 1. Find previous stable version
docker images | grep vinyl-catalog-backend

# 2. Quickly switch to previous version
docker-compose down
docker run -d -p 3001:3001 --name backend vinyl-catalog-backend:v1.0.0

# 3. Or via Railway:
# Go to Railway dashboard → Deployments → Click previous version → Redeploy

# 4. Verify health
curl http://localhost:3001/api/v1/health

# 5. Notify team and post-mortem
```

---

## Emergency Contacts

- **On-call**: Check team Slack channel
- **Escalation**: Contact tech lead
- **Major outage**: Notify #incidents channel

## Documentation Links

- [Deployment Guide](./DEPLOYMENT.md)
- [README](./README.md)
- [Architecture Docs](./docs/)

---

**Last Updated**: 2024-01-15
**Maintained By**: Backend Team
