# Discogs OAuth Setup Guide

This guide walks through setting up Discogs OAuth 1.0a authentication for accessing the marketplace price suggestions endpoint, which provides real marketplace pricing data for vinyl records.

## Overview

The Vinyl Catalog API integrates with Discogs in two ways:

1. **API Token (Basic Search)**: Personal token for basic catalog search and metadata fetching
   - Set via `DISCOGS_API_TOKEN` environment variable
   - Limited query rate
   - Does NOT have access to marketplace pricing data

2. **OAuth 1.0a (Marketplace Pricing)**: 3-legged OAuth flow for accessing marketplace data
   - Set via `DISCOGS_CONSUMER_KEY` and `DISCOGS_CONSUMER_SECRET`
   - Access tokens stored in database
   - Provides real marketplace pricing via `/marketplace/price_suggestions/{release_id}`

## Your OAuth Credentials

You have already registered an application with Discogs and obtained:

- **Consumer Key**: `DSJwZhnBDJmIWdBHTSgs`
- **Consumer Secret**: `NesvkPBRvTFMnflFWNmXgoBgifeJepvi`
- **Request Token URL**: `https://api.discogs.com/oauth/request_token`
- **Authorize URL**: `https://www.discogs.com/oauth/authorize`
- **Access Token URL**: `https://api.discogs.com/oauth/access_token`

## Step 1: Configure Environment Variables

Add the following to your `.env` file or Railway environment variables:

```env
# Discogs API Token (for basic search)
DISCOGS_API_TOKEN=XokkvcklBGQkOtHPYgbVaBKlgPiDLNmgRKnwPwXk

# Discogs OAuth Credentials
DISCOGS_CONSUMER_KEY=DSJwZhnBDJmIWdBHTSgs
DISCOGS_CONSUMER_SECRET=NesvkPBRvTFMnflFWNmXgoBgifeJepvi

# OAuth Callback URL (where Discogs redirects after user authorization)
DISCOGS_OAUTH_CALLBACK=http://localhost:3001/api/v1/auth/discogs/callback
# For production:
# DISCOGS_OAUTH_CALLBACK=https://site-oul-2-production.up.railway.app/api/v1/auth/discogs/callback
```

## Step 2: Database Setup

The OAuth tokens are stored in the `discogs_oauth_tokens` table created by the migration:

```sql
CREATE TABLE discogs_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token VARCHAR(500) UNIQUE NOT NULL,
  access_token_secret VARCHAR(500) NOT NULL,
  discogs_username VARCHAR(255),
  discogs_user_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Run the migration:
```bash
cd backend
npx prisma migrate dev
```

## Step 3: Initiate OAuth Flow

To authenticate and obtain access tokens, make a request to initiate the OAuth flow:

```bash
curl -X GET http://localhost:3001/api/v1/auth/discogs/initiate
```

Response:
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://www.discogs.com/oauth/authorize?oauth_token=<request_token>",
    "requestToken": "<request_token>"
  }
}
```

### Browser Flow

1. **Initiate OAuth**: Redirect user to `/api/v1/auth/discogs/initiate`
2. **User Authorizes**: User is redirected to Discogs to authorize the application
3. **Callback**: Discogs redirects back to `/api/v1/auth/discogs/callback?oauth_token=...&oauth_verifier=...`
4. **Token Exchange**: Backend exchanges request token + verifier for access token and stores it

### Programmatic Flow Example

```bash
# 1. Get request token
REQUEST_RESPONSE=$(curl -s http://localhost:3001/api/v1/auth/discogs/initiate)
AUTH_URL=$(echo $REQUEST_RESPONSE | jq -r '.data.authorizationUrl')

echo "Open this URL in your browser and authorize:"
echo $AUTH_URL

# 2. Paste the verifier you get after authorization
# The callback URL will be: http://localhost:3001/api/v1/auth/discogs/callback?oauth_token=...&oauth_verifier=...

# 3. Extract oauth_token and oauth_verifier from callback URL and call callback endpoint
OAUTH_TOKEN="<from_callback>"
OAUTH_VERIFIER="<from_callback>"

curl -X GET "http://localhost:3001/api/v1/auth/discogs/callback?oauth_token=${OAUTH_TOKEN}&oauth_verifier=${OAUTH_VERIFIER}"
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Successfully authenticated with Discogs",
    "username": "discogs_username",
    "userId": 12345,
    "accessToken": "XXXXX..."
  }
}
```

## Step 4: Verify OAuth Status

Check if a valid OAuth token is currently configured:

```bash
curl -s http://localhost:3001/api/v1/auth/discogs/status | jq
```

Response (with active token):
```json
{
  "success": true,
  "data": {
    "hasActiveToken": true,
    "message": "Active Discogs OAuth token is configured"
  }
}
```

Response (without token):
```json
{
  "success": true,
  "data": {
    "hasActiveToken": false,
    "message": "No active Discogs OAuth token found. Please run the OAuth flow to authenticate."
  }
}
```

## Step 5: How Marketplace Pricing Works

Once OAuth is configured, marketplace pricing automatically works:

### Without OAuth Token
- Search calls `/releases/{id}/stats` endpoint
- Returns community data, not marketplace data
- Fallback to algorithmic price estimation

### With OAuth Token
- Search calls `/marketplace/price_suggestions/{release_id}` endpoint
- Returns real marketplace prices (Mint, NM, VG+, VG, etc.)
- Much more accurate pricing for sellers

### Price Data Hierarchy

1. **Marketplace Price Suggestions** (OAuth required)
   - Source: Real marketplace listings
   - Conditions: Mint (M), Near Mint (NM), VG+, VG, VG-, Good, Fair, Poor
   - Updated: Real-time marketplace data

2. **Statistics Endpoint** (Fallback when OAuth unavailable)
   - Source: Sold listings history
   - Data may be older/less reliable

3. **Algorithmic Estimation** (Final fallback)
   - Based on: Genre + Release year
   - Used when no marketplace/stats data available

## Step 6: Testing Search with Marketplace Pricing

Once OAuth is configured, searches automatically use marketplace pricing:

```bash
curl -s "http://localhost:3001/api/v1/catalog/search?q=Conway%20Reject%202" | jq '.data.results[0] | {title, artist, prices}'
```

Example response (with OAuth):
```json
{
  "title": "Reject 2",
  "artist": "Conway the Machine",
  "prices": {
    "release_id": 1234567,
    "currency": "USD",
    "lowest": 18.45,
    "highest": 12903.00,
    "average": 89.50,
    "median": 45.00
  }
}
```

## Deployment to Production

### Step 1: Update Environment Variables in Railway

1. Go to Railway project dashboard
2. Navigate to Variables section
3. Add/update:
   - `DISCOGS_CONSUMER_KEY`: `DSJwZhnBDJmIWdBHTSgs`
   - `DISCOGS_CONSUMER_SECRET`: `NesvkPBRvTFMnflFWNmXgoBgifeJepvi`
   - `DISCOGS_OAUTH_CALLBACK`: `https://site-oul-2-production.up.railway.app/api/v1/auth/discogs/callback`

### Step 2: Run OAuth Flow in Production

```bash
# 1. Initiate OAuth
curl -s https://site-oul-2-production.up.railway.app/api/v1/auth/discogs/initiate | jq '.data.authorizationUrl'

# 2. Open URL in browser and authorize

# 3. Use callback parameters to complete flow
curl -X GET "https://site-oul-2-production.up.railway.app/api/v1/auth/discogs/callback?oauth_token=...&oauth_verifier=..."
```

### Step 3: Verify in Production

```bash
curl -s https://site-oul-2-production.up.railway.app/api/v1/auth/discogs/status | jq
```

## API Endpoints Reference

### GET /api/v1/auth/discogs/initiate
Initiates the OAuth flow and returns the authorization URL.

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://www.discogs.com/oauth/authorize?oauth_token=...",
    "requestToken": "..."
  }
}
```

### GET /api/v1/auth/discogs/callback
Handles the OAuth callback from Discogs. Called after user authorizes.

**Query Parameters:**
- `oauth_token`: Request token from Discogs
- `oauth_verifier`: Verifier from Discogs authorization

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Successfully authenticated with Discogs",
    "username": "discogs_username",
    "userId": 12345,
    "accessToken": "XXXXX..."
  }
}
```

**Errors:**
- `400 Bad Request`: Missing oauth_token or oauth_verifier
- `500 Internal Server Error`: Failed to exchange tokens

### GET /api/v1/auth/discogs/status
Checks if a valid OAuth token is currently configured.

**Response:**
```json
{
  "success": true,
  "data": {
    "hasActiveToken": true,
    "message": "Active Discogs OAuth token is configured"
  }
}
```

## Troubleshooting

### "No OAuth token available for marketplace pricing"

**Problem**: Search results use fallback pricing instead of marketplace pricing.

**Solution**:
1. Run the OAuth flow: `GET /api/v1/auth/discogs/initiate`
2. Authorize in browser
3. Complete callback to store access token

### "Invalid or expired request token"

**Problem**: OAuth flow times out or takes too long.

**Solution**: Request tokens expire after 10 minutes. Restart the OAuth flow:
```bash
curl -s http://localhost:3001/api/v1/auth/discogs/initiate
```

### "Missing DISCOGS_CONSUMER_KEY or DISCOGS_CONSUMER_SECRET"

**Problem**: Environment variables not set.

**Solution**:
```bash
# Add to .env or Railway variables:
export DISCOGS_CONSUMER_KEY=DSJwZhnBDJmIWdBHTSgs
export DISCOGS_CONSUMER_SECRET=NesvkPBRvTFMnflFWNmXgoBgifeJepvi
```

Then restart the server.

### "401 Unauthorized from /marketplace/price_suggestions"

**Problem**: OAuth token is invalid or expired.

**Solution**:
1. Check token status: `GET /api/v1/auth/discogs/status`
2. If no active token, run OAuth flow again
3. Check that `DISCOGS_CONSUMER_KEY` and `DISCOGS_CONSUMER_SECRET` are correct

## Architecture

### OAuth Flow Diagram

```
1. Client initiates:
   GET /api/v1/auth/discogs/initiate

2. Server returns:
   - authorizationUrl: https://discogs.com/oauth/authorize?oauth_token=...
   - requestToken (for session storage)

3. Client redirects user to authorizationUrl
   - User logs into Discogs
   - User clicks "Authorize"

4. Discogs redirects to:
   /api/v1/auth/discogs/callback?oauth_token=...&oauth_verifier=...

5. Server exchanges tokens:
   - Uses requestToken from session
   - Uses oauth_verifier from callback
   - Calls https://api.discogs.com/oauth/access_token

6. Server stores accessToken in database
   - table: discogs_oauth_tokens
   - fields: access_token, access_token_secret, username, user_id

7. On subsequent searches:
   - Service retrieves latest accessToken from database
   - Signs requests to /marketplace/price_suggestions/{release_id}
   - Returns real marketplace pricing
```

### Storage Architecture

```
Temporary Storage (Request Tokens):
- In-memory Map in DiscogsOAuthService
- Expires after 10 minutes
- Cleared on token exchange or expiry

Persistent Storage (Access Tokens):
- PostgreSQL: discogs_oauth_tokens table
- Indexed by: is_active, created_at
- Multiple tokens supported (for different Discogs users)
- Query: getLatestAccessToken() returns most recent active token
```

## File Changes Summary

- **backend/prisma/schema.prisma**: Added `DiscogsOAuthToken` model
- **backend/prisma/migrations/**: New migration for OAuth token table
- **backend/src/services/discogsOAuthService.js**: OAuth 1.0a implementation
- **backend/src/services/discogsService.js**: Integrated OAuth for marketplace pricing
- **backend/src/routes/discogsOAuth.js**: OAuth flow endpoints
- **backend/src/index.js**: Registered OAuth routes

## Next Steps

1. **Complete OAuth Flow**: Follow Step 3 to authenticate
2. **Verify Status**: Run `GET /api/v1/auth/discogs/status` to confirm
3. **Test Pricing**: Search for a release to verify marketplace pricing is working
4. **Monitor**: Check logs for any OAuth-related errors

## Support

For issues with:
- **OAuth Flow**: Check `DISCOGS_CONSUMER_KEY` and `DISCOGS_CONSUMER_SECRET`
- **Marketplace Pricing**: Ensure OAuth token is active via `/api/v1/auth/discogs/status`
- **Database**: Verify `discogs_oauth_tokens` table exists and is populated

Check logs at `/tmp/server.log` or Railway console for detailed error information.
