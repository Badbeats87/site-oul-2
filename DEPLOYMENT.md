# Deployment Guide - Vinyl Catalog

This guide explains how to deploy the Vinyl Catalog application to Railway with GitHub integration for continuous deployment.

## Overview

The Vinyl Catalog is a static web application that runs on Node.js. It's containerized with Docker and configured for automatic deployment on Railway.

## Deployment Architecture

```
GitHub Repository
       ↓
    (Push)
       ↓
Railway Project (GitHub Integration)
       ↓
    (Auto Deploy)
       ↓
Live Application
  https://your-app.railway.app
```

## Prerequisites

1. **GitHub Account**: Already set up at https://github.com/Badbeats87/site-oul-2
2. **Railway Account**: Sign up at https://railway.app (free tier available)
3. **Git**: Installed locally

## Setup Steps

### Step 1: Create a Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub"**

### Step 2: Connect GitHub Repository

1. Click **"GitHub Repo"**
2. Railway will redirect you to GitHub to authorize the connection
3. Select the **Badbeats87/site-oul-2** repository
4. Authorize Railway to access your repository

### Step 3: Configure Railway Project

Once the repository is connected:

1. Railway should auto-detect the `Dockerfile` or `package.json`
2. **Environment Variables**: No special configuration needed for this static site
3. The build will:
   - Install dependencies from `package.json`
   - Build the Docker image using `Dockerfile`
   - Deploy to Railway's infrastructure

### Step 4: Verify Deployment

Once deployed:

1. Railway shows your deployment URL (e.g., `https://vinyl-catalog-prod.railway.app`)
2. Click the URL to test the deployed application
3. All pages should load and function correctly

## Automatic Deployments

Once GitHub integration is set up:

- **Every push to `main` branch** automatically triggers a deployment
- **Build logs** are visible in Railway dashboard
- **Automatic rollback** on failed deploys (if configured)

### Deployment Workflow

```bash
# Make changes locally
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin main

# Railway automatically:
# 1. Detects the push
# 2. Builds the Docker image
# 3. Deploys the new version
# 4. Makes it live (usually within 2-5 minutes)
```

## Project Structure

```
site-oul-2/
├── pages/                    # HTML pages
│   ├── index.html          # Landing page
│   ├── admin/              # Admin console pages
│   ├── seller/             # Seller site pages
│   └── buyer/              # Buyer storefront pages
├── styles/                   # CSS stylesheets
├── js/                       # JavaScript files
├── server.js               # Node.js HTTP server
├── package.json            # Node.js dependencies
├── Dockerfile              # Container configuration
├── railway.json            # Railway deployment config
└── .dockerignore           # Files to exclude from Docker image
```

## Local Development

### Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm start

# Open in browser
http://localhost:3000
```

### Testing Docker Build Locally

```bash
# Build Docker image
docker build -t vinyl-catalog:local .

# Run container
docker run -p 3000:3000 vinyl-catalog:local

# Open in browser
http://localhost:3000
```

## Troubleshooting

### Deployment Failed

1. Check Railway dashboard for build logs
2. Common issues:
   - Missing `package.json` or `Dockerfile`
   - Incorrect Node.js version
   - Port not exposed correctly

### Application Not Loading

1. Check if server is running: `npm start`
2. Verify static files are in correct locations
3. Check console for JavaScript errors (F12 → Console tab)

### Port Issues

The application uses:
- **Local development**: Port 3000
- **Railway deployment**: Automatically assigned port (read from `process.env.PORT`)

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Runtime environment |

### Docker Build Args

None currently needed, but can be added in `Dockerfile` if needed.

## Monitoring

In Railway dashboard, you can monitor:

- **Deployment status**: Building, Deploying, Running, Failed
- **Build logs**: Real-time output during build process
- **Runtime logs**: Application console output
- **Metrics**: Memory usage, CPU, network I/O
- **Auto-restart**: Enabled for production stability

## Rollback

If a deployment causes issues:

1. Go to Railway dashboard
2. Select the project
3. View **"Deployments"** tab
4. Click **"Rollback"** on a previous successful deployment

## Custom Domain (Optional)

To add a custom domain:

1. In Railway dashboard, go to **Settings**
2. Select **"Custom Domain"**
3. Add your domain (e.g., `vinyl-catalog.yourdomain.com`)
4. Follow DNS configuration instructions

## SSL Certificate

Railway automatically provides SSL certificates for all deployments (free).

Your app is accessible via both:
- `https://vinyl-catalog-prod.railway.app` ✅
- `http://vinyl-catalog-prod.railway.app` ⚠️ (auto-upgrades to HTTPS)

## Performance Optimization

The application includes:

- **Caching headers**: Static assets cached for 1 hour
- **HTML no-cache**: HTML pages always fresh for SEO
- **Compression**: Gzip compression enabled automatically
- **CDN**: Railway provides edge caching

## Security

The Dockerfile includes:

- **Non-root user**: Application runs as `nodejs` user
- **Minimal base image**: `alpine` for smaller attack surface
- **Health checks**: Automatic monitoring of application health
- **Signal handling**: Graceful shutdown support

## Scaling

On Railway's paid tier, you can:

- **Increase replicas**: For load balancing
- **Increase memory/CPU**: For better performance
- **Auto-scaling**: Based on traffic and resource usage

For the free tier, the application runs on shared infrastructure.

## Support

- **Railway Support**: https://railway.app/support
- **Documentation**: https://docs.railway.app
- **Discord Community**: Railway has an active community on Discord

## Next Steps

1. ✅ Repository is already set up
2. ⏭️ Go to Railway.app and create an account
3. ⏭️ Connect the GitHub repository
4. ⏭️ Monitor the first automatic deployment
5. ⏭️ Test the live application
