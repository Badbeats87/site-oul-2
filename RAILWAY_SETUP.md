# Railway Deployment Setup - Quick Start

## Prerequisites

- GitHub account with access to [Badbeats87/site-oul-2](https://github.com/Badbeats87/site-oul-2)
- Railway account (sign up free at https://railway.app)

## 5-Minute Setup

### 1. Sign In to Railway

Go to https://railway.app and sign in with GitHub.

### 2. Create New Project

- Click **"New Project"**
- Click **"Deploy from GitHub"**
- Click **"Configure GitHub App"** if prompted

### 3. Select Repository

- Search for: **site-oul-2**
- Click on **Badbeats87/site-oul-2**
- Click **"Deploy"**

### 4. Wait for Deployment

Railway will:
1. Detect the Dockerfile ✓
2. Build the Docker image (2-3 minutes)
3. Deploy to Railway infrastructure
4. Show a live URL like: `https://vinyl-catalog-prod.railway.app`

### 5. Test Live Application

1. Click the deployment URL
2. You should see the Vinyl Catalog landing page
3. Test navigation to different sections

## How Automatic Deployment Works

```
You push code to GitHub
           ↓
GitHub sends webhook to Railway
           ↓
Railway automatically:
  - Pulls the latest code
  - Builds Docker image
  - Runs tests (if configured)
  - Deploys new version
           ↓
Live application updated
```

### Next Push

Next time you push to `main`:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Railway automatically deploys within 2-5 minutes.

## Useful Railway Dashboard Features

### Monitoring

- **Deployments**: View build/deploy status
- **Logs**: See application output
- **Metrics**: Monitor performance
- **Settings**: Configure environment variables

### Common Tasks

**View Live App**
- Click the generated URL in Railway dashboard

**See Build Logs**
- Go to "Deployments" tab
- Click on any deployment
- View "Build Logs" section

**View Application Logs**
- Go to "Logs" tab
- See real-time application output

**Redeploy**
- Go to "Deployments"
- Click "Redeploy" on any previous build

**Rollback**
- Go to "Deployments"
- Click "Rollback" on an old version

## Environment Variables (Optional)

Currently no environment variables are needed. The app uses:
- `PORT`: Automatically set by Railway (reads from process.env.PORT)
- `NODE_ENV`: Defaults to `production` on Railway

To add custom variables in Railway:

1. Go to **Project Settings**
2. Click **"Variables"**
3. Add new variable
4. Redeploy (Railway auto-restarts)

## Troubleshooting

### Deployment Failed?

**Check the logs:**
1. Go to **"Deployments"** tab
2. Click the failed deployment
3. View **"Build Logs"** for error message

**Common fixes:**
- Ensure `Dockerfile` is in repository root
- Check `package.json` exists
- Verify Node.js version compatibility

### Application Won't Start?

1. Check **"Logs"** tab for errors
2. Verify `npm start` command works locally: `npm start`
3. Try redeploying from Railway dashboard

### Pages Not Loading?

1. Check browser console (F12)
2. Verify all static file paths are correct
3. Check Network tab to see which files fail to load

## Custom Domain Setup

To use your own domain (optional):

1. Go to **Project Settings**
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `vinyl-catalog.yourdomain.com`)
4. Update DNS records as instructed by Railway

## Upgrading Railway Plan

Railway offers:

- **Free tier**: Good for development/testing
- **Paid tier**: Custom domains, more resources, priority support

Upgrade anytime from your Railway account dashboard.

## Getting Help

- **Railway Docs**: https://docs.railway.app
- **Railway Support**: https://railway.app/support
- **Discord**: Join Railway's Discord community

## What's Next?

Your app is now live! You can:

✅ Push changes and see them auto-deploy
✅ Monitor logs and performance
✅ Set up custom domain
✅ Add environment variables as needed
✅ Scale up when needed

---

**Your Live Application**:
After deployment, Railway shows your URL. It looks like:
- `https://vinyl-catalog-prod.railway.app`

Every push to `main` automatically updates this URL!
