# Railway Authorization - Quick Reference Card

## The 10-Step Authorization & Deployment Flow

```
START
  ↓
1. Open https://railway.app
  ↓
2. Click "Start for Free" / "Sign In"
  ↓
3. Click "Continue with GitHub"
  ↓
4. Enter GitHub credentials (if needed)
  ↓
5. Click "Authorize railwayapp"
  ↓
6. You're in Railway dashboard
  ↓
7. Click "New Project"
  ↓
8. Click "Deploy from GitHub"
  ↓
9. Search & click "Badbeats87/site-oul-2"
  ↓
10. Click "Deploy"
  ↓
BUILDING (2-3 min)
  ↓
LIVE ✅
  ↓
Visit: https://vinyl-catalog-prod-******.railway.app
  ↓
DONE!
```

---

## What You'll See on Each Screen

### Screen 1: Railway Landing
```
┌─────────────────────────────────────┐
│  Railway                            │
│                                     │
│  [ Start for Free ] [ Sign In ]     │
└─────────────────────────────────────┘
```
**Action**: Click "Start for Free" or "Sign In"

---

### Screen 2: Sign In Options
```
┌─────────────────────────────────────┐
│  Sign In / Create Account           │
│                                     │
│  [ Continue with GitHub ]           │
│  [ Continue with Google ]           │
│  [ Continue with Email  ]           │
└─────────────────────────────────────┘
```
**Action**: Click "Continue with GitHub"

---

### Screen 3: GitHub Authorization
```
┌─────────────────────────────────────┐
│  GitHub                             │
│  Authorize Railway                  │
│                                     │
│  Rail needs permission to:          │
│  ✓ Read repositories                │
│  ✓ Access deployments               │
│                                     │
│  [ Authorize railwayapp ]           │
│  [ Cancel ]                         │
└─────────────────────────────────────┘
```
**Action**: Click "Authorize railwayapp"

---

### Screen 4: Railway Dashboard
```
┌─────────────────────────────────────┐
│  Railway Dashboard                  │
│                                     │
│  Welcome, User!                     │
│                                     │
│  [ New Project ]                    │
│  [ Team Settings ]                  │
│  [ Profile ]                        │
└─────────────────────────────────────┘
```
**Action**: Click "New Project"

---

### Screen 5: Create Project Options
```
┌─────────────────────────────────────┐
│  New Project                        │
│                                     │
│  [ Deploy from GitHub ]  ← CLICK   │
│  [ Create from Template ]           │
│  [ Create Empty Project ]           │
└─────────────────────────────────────┘
```
**Action**: Click "Deploy from GitHub"

---

### Screen 6: GitHub App Authorization (if needed)
```
┌─────────────────────────────────────┐
│  GitHub App Configuration           │
│                                     │
│  Select repositories to access:     │
│  ○ All repositories                 │
│  ○ Only select repositories ←       │
│                                     │
│  [ Badbeats87/site-oul-2 ] ✓        │
│                                     │
│  [ Install & Authorize ]            │
└─────────────────────────────────────┘
```
**Action**: Select "Only select repositories", check site-oul-2, click "Install & Authorize"

---

### Screen 7: Repository Search
```
┌─────────────────────────────────────┐
│  Railway                            │
│                                     │
│  Search repositories...             │
│  [site-oul-2 or vinyl-catalog]      │
│                                     │
│  Results:                           │
│  > Badbeats87/site-oul-2 ← CLICK   │
│                                     │
└─────────────────────────────────────┘
```
**Action**: Type repository name and click when it appears

---

### Screen 8: Project Detection
```
┌─────────────────────────────────────┐
│  Deploying site-oul-2               │
│                                     │
│  ✅ Dockerfile detected             │
│  ✅ package.json detected           │
│  ✅ Node.js environment ready       │
│                                     │
│  [ Deploy ]                         │
└─────────────────────────────────────┘
```
**Action**: Click "Deploy"

---

### Screen 9: Building
```
┌─────────────────────────────────────┐
│  Deployments                        │
│                                     │
│  Status: Building...                │
│  ⏳ Building Docker image...        │
│  ⏳ Installing dependencies...      │
│  ⏳ Preparing for deployment...     │
│                                     │
│  (Takes 2-3 minutes)                │
└─────────────────────────────────────┘
```
**Action**: Wait...

---

### Screen 10: Live!
```
┌─────────────────────────────────────┐
│  Deployments                        │
│                                     │
│  Status: ✅ Live                    │
│                                     │
│  URL: vinyl-catalog-prod-xxxxx      │
│       .railway.app                  │
│                                     │
│  [ Click URL to visit ]             │
└─────────────────────────────────────┘
```
**Action**: Click the URL to view your live app

---

## If Authorization Fails

### "GitHub Authorization Stuck"
1. Go to: https://github.com/settings/applications
2. Find Railway app
3. Click "Revoke"
4. Try Railway auth again

### "Repository Not Found"
1. Go to: https://github.com/settings/applications
2. Click Railway
3. Grant access to your organization/repository
4. Try deploying again

### "Wrong GitHub Account"
1. Logout of Railway
2. Logout of GitHub (https://github.com/logout)
3. Login with correct GitHub account
4. Try Railway auth again

---

## After Deployment

### Your Live App
```
https://vinyl-catalog-prod-******.railway.app
```

### Every Time You Push
```bash
git push origin main
    ↓
GitHub notifies Railway
    ↓
Railway auto-builds and deploys
    ↓
Your app updates (2-5 minutes)
```

---

## Quick Links

| Link | Purpose |
|------|---------|
| https://railway.app | Railway home |
| https://github.com/settings/applications | Revoke auth |
| https://docs.railway.app | Railway docs |
| [RAILWAY_AUTH.md](./RAILWAY_AUTH.md) | Detailed guide |
| [RAILWAY_CHECKLIST.md](./RAILWAY_CHECKLIST.md) | Step checklist |

---

## TL;DR - 3 Click Deploy

1. Go to railway.app → Click "GitHub" → Authorize
2. Dashboard → "New Project" → "Deploy from GitHub" → Select repo
3. Click "Deploy" and wait 2-3 minutes

Done! 🎉

