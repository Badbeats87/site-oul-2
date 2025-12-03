# Railway & GitHub Authorization - Step-by-Step Guide

This guide walks you through connecting your GitHub repository to Railway for automatic deployment.

## Complete Walkthrough

### Step 1: Go to Railway Website

1. Open https://railway.app in your browser
2. You should see the Railway landing page with a big button to get started

### Step 2: Sign Up / Sign In

**If you don't have a Railway account:**
1. Click **"Start for Free"** or **"Sign Up"**
2. You'll see sign-in options:
   - **GitHub** ← Use this (recommended)
   - Google
   - Email

**If you have an account:**
1. Click **"Sign In"**
2. Click **"Continue with GitHub"**

### Step 3: Authorize Railway App on GitHub

When you click "GitHub" or "Continue with GitHub":

1. You'll be redirected to GitHub login if not already logged in
2. You'll see a screen: **"Authorize Railway"**
3. This shows what permissions Railway needs:
   - Read/write access to repositories
   - Read pull request information
   - Read/write deployments
4. Click **"Authorize railwayapp"** (or similar button)

### Step 4: You're Now in Railway Dashboard

After authorization, you're back on Railway with your account active.

### Step 5: Create New Project

1. In Railway dashboard, look for **"New Project"** button
2. Click it
3. You'll see options:
   - Deploy from GitHub
   - Create from template
   - Deploy from Git
   - Create empty project

**Click: "Deploy from GitHub"**

### Step 6: Select Your Repository

After clicking "Deploy from GitHub":

1. If you see a message "Configure GitHub App", click it
2. You'll go back to GitHub to authorize Railway's app
3. Choose which repositories to give Railway access to:
   - Option A: **"All repositories"** (easier)
   - Option B: **"Only select repositories"** → Choose `site-oul-2`
4. Click **"Install & Authorize"**

### Step 7: Back in Railway - Pick Your Repo

1. You're back in Railway
2. Search box appears: **"Search repositories..."**
3. Type: **site-oul-2** or **vinyl-catalog**
4. Your repository appears: **Badbeats87/site-oul-2**
5. Click on it to select

### Step 8: Railway Auto-Detects Configuration

Railway will:
- 🔍 Find `Dockerfile`
- 🔍 Find `package.json`
- 🔍 Find `server.js`
- ✅ Show a green checkmark (auto-detected)

### Step 9: Deploy!

1. Click **"Deploy"** button (or it might auto-deploy)
2. Railway shows:
   - **"Building..."** → Docker image is being built
   - **"Deploying..."** → Pushing to Railway servers
   - **"Live"** → Your app is live!

### Step 10: Get Your Live URL

Once deployed:

1. Railway dashboard shows your project
2. Look for **"Deployments"** section
3. You'll see a URL like:
   ```
   https://vinyl-catalog-prod-******.railway.app
   ```
4. Click the URL to visit your live app

---

## Troubleshooting Authorization

### Issue: GitHub Authorization Stuck

**Solution:**
1. Go to https://github.com/settings/applications
2. Under "Authorized OAuth Apps", find **Railway**
3. Click **"Revoke"**
4. Try authorizing again on Railway.app

### Issue: Repository Not Showing

**Possible causes:**
- You gave Railway access to only certain repos, not `site-oul-2`
- You need to re-authorize with "All repositories" access

**Solution:**
1. Go to https://github.com/settings/applications
2. Click Railway app
3. Click **"Organization access"** section
4. Find your org and click **"Grant"** or **"Authorize"**

### Issue: Can't See "Deploy from GitHub"

**Solution:**
1. Make sure you're logged into Railway
2. Click your profile in top-right corner
3. Check you're in the right team/account
4. Try logging out and back in

---

## After Authorization: What Happens

### Automatic Deployment Enabled

Once authorized, Railway watches your GitHub repo:

```
You push code to GitHub
            ↓
GitHub notifies Railway (webhook)
            ↓
Railway pulls latest code
            ↓
Railway builds Docker image
            ↓
Railway deploys to production
            ↓
Your app updates automatically
```

### Manual Deployment (if needed)

In Railway dashboard:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on any build

---

## What Permissions Does Railway Need?

Railway requests GitHub access to:
- **Read repositories** - See your code
- **Write repositories** - Can't actually write (misleading name)
- **Read pull requests** - Monitor for PR deployments
- **Deployments** - Create deployment records

Railway does NOT:
- ❌ Modify your source code
- ❌ Delete repositories
- ❌ Access private data
- ❌ Make commits on your behalf

---

## Security Note

You can revoke Railway access anytime:

1. Go to https://github.com/settings/applications
2. Find Railway app
3. Click **"Revoke"**

This removes all Railway access to your repos but won't delete deployed apps.

---

## Need Help?

- **Railway Docs**: https://docs.railway.app/reference/github-integration
- **Railway Support**: https://railway.app/support
- **GitHub OAuth Docs**: https://docs.github.com/en/apps/oauth-apps

---

## Quick Summary

| Step | Action |
|------|--------|
| 1 | Go to railway.app |
| 2 | Click "GitHub" to sign in/up |
| 3 | Click "Authorize railwayapp" |
| 4 | Click "New Project" |
| 5 | Click "Deploy from GitHub" |
| 6 | Search and select "site-oul-2" |
| 7 | Click "Deploy" |
| 8 | Wait for build (2-3 minutes) |
| 9 | Get your live URL |
| 10 | Done! 🎉 |

