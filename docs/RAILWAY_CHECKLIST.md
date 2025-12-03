# Railway Deployment Checklist ✅

Follow this checklist step-by-step to deploy your app.

## Pre-Deployment Checklist

- [ ] GitHub repository created and pushed
- [ ] All files committed to `main` branch
- [ ] `Dockerfile` exists in repository root
- [ ] `package.json` exists with start script
- [ ] `server.js` exists and is runnable

**Repository**: https://github.com/Badbeats87/site-oul-2

## Railway Authorization & Deployment

### Phase 1: Create Railway Account

- [ ] Go to https://railway.app
- [ ] Click **"Start for Free"** or **"Sign In"**
- [ ] Click **"Continue with GitHub"** (or **"Sign Up with GitHub"**)
- [ ] Verify you're logged in with correct GitHub account
- [ ] **GitHub Authorization Screen** appears
  - [ ] Click **"Authorize railwayapp"**
  - [ ] Confirm permissions (read repository, deployments, etc.)
- [ ] You're now in Railway dashboard

### Phase 2: Create Project

- [ ] In Railway dashboard, click **"New Project"**
- [ ] Click **"Deploy from GitHub"**
- [ ] **GitHub App Configuration** (if needed)
  - [ ] Click **"Configure GitHub App"**
  - [ ] Select **"Only select repositories"** or **"All repositories"**
  - [ ] Find and select **Badbeats87/site-oul-2**
  - [ ] Click **"Install & Authorize"**
  - [ ] Back in Railway, click **"Refresh"** if needed

### Phase 3: Select Repository

- [ ] Search box appears: **"Search repositories..."**
- [ ] Type: `site-oul-2`
- [ ] Click on **Badbeats87/site-oul-2** when it appears
- [ ] Railway shows:
  - [ ] **✅ Dockerfile detected**
  - [ ] **✅ package.json detected**

### Phase 4: Deploy

- [ ] Click **"Deploy"** button
- [ ] Watch deployment progress:
  - [ ] **Building...** (Docker image creation)
  - [ ] **Deploying...** (Pushing to Railway)
  - [ ] **Live** (App is now running)
- [ ] Build takes **2-5 minutes**

### Phase 5: Test Live Application

Once deployed:

- [ ] Click the deployment URL (shown in Railway dashboard)
- [ ] URL format: `https://vinyl-catalog-prod-******.railway.app`
- [ ] Test main page loads
- [ ] Test navigation to different pages:
  - [ ] `/pages/index.html` (Landing)
  - [ ] `/pages/seller/` (Seller Site)
  - [ ] `/pages/buyer/` (Buyer Storefront)
  - [ ] `/pages/admin/` (Admin Console)
  - [ ] `/pages/admin/inventory.html` (Inventory)
  - [ ] `/pages/admin/pricing-editor.html` (Pricing Editor)
- [ ] Check browser console (F12) for errors
- [ ] All pages load without errors ✅

## Automatic Deployment Verification

After first deployment:

- [ ] Push a small test change to `main` branch:
  ```bash
  git add .
  git commit -m "test: verify automatic deployment"
  git push origin main
  ```
- [ ] Go to Railway dashboard
- [ ] Watch for new deployment in **Deployments** tab
- [ ] Verify deployment completes (2-5 minutes)
- [ ] Verify change is live in production URL

## Post-Deployment Configuration (Optional)

### Custom Domain

- [ ] In Railway, go to **Project Settings**
- [ ] Click **"Custom Domain"**
- [ ] Enter your domain (e.g., `vinyl-catalog.yourdomain.com`)
- [ ] Follow DNS configuration steps
- [ ] Test custom domain works

### Environment Variables (if needed)

- [ ] In Railway, go to **Variables**
- [ ] Add any custom environment variables
- [ ] Click **"Save"**
- [ ] Railway auto-restarts with new variables

### Monitoring

- [ ] Go to **Logs** tab to see application output
- [ ] Go to **Metrics** tab to monitor performance
- [ ] Set up alerts if Railway offers them

## Troubleshooting Checklist

### Deployment Failed to Build

- [ ] Check **Build Logs** in Railway dashboard
- [ ] Common causes:
  - [ ] Missing `Dockerfile`
  - [ ] Missing `package.json`
  - [ ] Invalid Node.js version
  - [ ] Syntax errors in code
- [ ] Fix error locally
- [ ] Commit and push to GitHub
- [ ] Railway auto-redeploys

### Application Won't Start

- [ ] Check **Logs** tab in Railway dashboard
- [ ] Verify `npm start` works locally:
  ```bash
  npm start
  ```
- [ ] Check `server.js` for errors
- [ ] Verify PORT 3000 is available
- [ ] Try manual redeploy in Railway

### Pages Not Loading

- [ ] Open browser DevTools (F12)
- [ ] Check **Console** tab for errors
- [ ] Check **Network** tab for failed requests
- [ ] Verify all static files exist in repo
- [ ] Check file paths (case-sensitive on Linux)

### Authorization Issues

- [ ] See **[RAILWAY_AUTH.md](./RAILWAY_AUTH.md)** for detailed help
- [ ] Revoke Railway app: https://github.com/settings/applications
- [ ] Re-authorize from scratch

## Success Criteria ✅

Your deployment is successful when:

- [ ] Railway dashboard shows **"Live"** status (green)
- [ ] Application URL is accessible in browser
- [ ] All pages load without errors
- [ ] Console has no JavaScript errors
- [ ] Navigation between pages works
- [ ] Static assets (CSS, JS) load correctly
- [ ] Next push to GitHub auto-deploys

---

## Quick Links

- **Railway App**: https://railway.app
- **Your Repository**: https://github.com/Badbeats87/site-oul-2
- **Authorization Help**: [RAILWAY_AUTH.md](./RAILWAY_AUTH.md)
- **Setup Guide**: [RAILWAY_SETUP.md](./RAILWAY_SETUP.md)
- **Full Documentation**: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Need Help?

1. **Can't authorize?** → See [RAILWAY_AUTH.md](./RAILWAY_AUTH.md)
2. **Build failed?** → Check Railway build logs
3. **App not loading?** → Check browser console (F12)
4. **Still stuck?** → Check [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting

---

**Last Updated**: 2024-11-29
**Repository**: Badbeats87/site-oul-2
**Status**: Ready for deployment
