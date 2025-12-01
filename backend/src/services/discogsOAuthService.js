import axios from 'axios';
import crypto from 'crypto';
import logger from '../../config/logger.js';
import prisma from '../utils/db.js';

const DISCOGS_API_BASE = 'https://api.discogs.com';

// Temporary request token storage during OAuth flow (cleared on completion)
const tempRequestTokens = new Map();

/**
 * Discogs OAuth 1.0a Service
 * Handles 3-legged OAuth flow for marketplace access
 * Stores access tokens in database for persistent use
 */
class DiscogsOAuthService {
  constructor() {
    this.consumerKey = process.env.DISCOGS_CONSUMER_KEY;
    this.consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;
    this.callbackUrl = process.env.DISCOGS_OAUTH_CALLBACK || 'http://localhost:3001/api/v1/auth/discogs/callback';
  }

  /**
   * Step 1: Get Request Token
   * User starts OAuth flow here
   */
  async getRequestToken() {
    try {
      if (!this.consumerKey || !this.consumerSecret) {
        throw new Error('Discogs OAuth credentials not configured');
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');

      const baseUrl = `${DISCOGS_API_BASE}/oauth/request_token`;
      const params = {
        oauth_consumer_key: this.consumerKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'PLAINTEXT',
        oauth_timestamp: timestamp,
        oauth_version: '1.0',
        oauth_callback: this.callbackUrl,
        oauth_signature: `${this.consumerSecret}&`,
      };

      const authHeader = this._buildAuthHeader(params);

      const response = await axios.get(baseUrl, {
        headers: {
          'Authorization': authHeader,
          'User-Agent': 'VinylCatalogAPI/1.0',
        },
      });

      const tokens = this._parseTokenResponse(response.data);

      // Store request token temporarily (expires in 10 minutes)
      tempRequestTokens.set(tokens.oauth_token, {
        ...tokens,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minute expiry
      });

      logger.info('Discogs request token obtained', {
        token: tokens.oauth_token.substring(0, 5) + '...',
      });

      return {
        requestToken: tokens.oauth_token,
        requestTokenSecret: tokens.oauth_token_secret,
        authorizationUrl: `https://discogs.com/oauth/authorize?oauth_token=${tokens.oauth_token}`,
      };
    } catch (error) {
      logger.error('Failed to get Discogs request token', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Step 2: Exchange Request Token + Verifier for Access Token
   * Called after user authorizes at discogs.com/oauth/authorize
   */
  async getAccessToken(requestToken, verifier) {
    try {
      if (!requestToken || !verifier) {
        throw new Error('Request token and verifier required');
      }

      // Get stored request token secret
      const storedToken = tempRequestTokens.get(requestToken);
      if (!storedToken) {
        throw new Error('Invalid or expired request token');
      }

      // Check expiry
      if (storedToken.expiresAt && Date.now() > storedToken.expiresAt) {
        tempRequestTokens.delete(requestToken);
        throw new Error('Request token has expired');
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');

      const baseUrl = `${DISCOGS_API_BASE}/oauth/access_token`;
      const params = {
        oauth_consumer_key: this.consumerKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'PLAINTEXT',
        oauth_timestamp: timestamp,
        oauth_token: requestToken,
        oauth_verifier: verifier,
        oauth_version: '1.0',
        oauth_signature: `${this.consumerSecret}&${storedToken.oauth_token_secret}`,
      };

      const authHeader = this._buildAuthHeader(params);

      const response = await axios.post(baseUrl, null, {
        headers: {
          'Authorization': authHeader,
          'User-Agent': 'VinylCatalogAPI/1.0',
        },
      });

      const accessTokens = this._parseTokenResponse(response.data);

      // Store access token in database
      const savedToken = await prisma.discogsOAuthToken.create({
        data: {
          accessToken: accessTokens.oauth_token,
          accessTokenSecret: accessTokens.oauth_token_secret,
          discogsUsername: accessTokens.oauth_username || null,
          discogsUserId: accessTokens.oauth_user_id ? parseInt(accessTokens.oauth_user_id) : null,
          isActive: true,
        },
      });

      logger.info('Discogs access token obtained and stored', {
        token: accessTokens.oauth_token.substring(0, 5) + '...',
        username: accessTokens.oauth_username,
      });

      // Clean up temp token
      tempRequestTokens.delete(requestToken);

      return {
        accessToken: accessTokens.oauth_token,
        accessTokenSecret: accessTokens.oauth_token_secret,
        discogsUsername: accessTokens.oauth_username,
        discogsUserId: accessTokens.oauth_user_id,
        tokenId: savedToken.id,
      };
    } catch (error) {
      logger.error('Failed to exchange Discogs tokens', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get the most recent active OAuth token from database
   */
  async getLatestAccessToken() {
    try {
      const token = await prisma.discogsOAuthToken.findFirst({
        where: { isActive: true },
        orderBy: { obtainedAt: 'desc' },
      });

      if (!token) {
        return null;
      }

      return {
        accessToken: token.accessToken,
        accessTokenSecret: token.accessTokenSecret,
      };
    } catch (error) {
      logger.error('Failed to retrieve access token from database', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Invalidate an OAuth token
   */
  async invalidateToken(tokenId) {
    try {
      await prisma.discogsOAuthToken.update({
        where: { id: tokenId },
        data: { isActive: false },
      });

      logger.info('Discogs OAuth token invalidated', { tokenId });
    } catch (error) {
      logger.error('Failed to invalidate token', {
        tokenId,
        error: error.message,
      });
    }
  }

  /**
   * Generate OAuth 1.0a Authorization header
   */
  _buildAuthHeader(params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}="${encodeURIComponent(params[key])}"`)
      .join(',');

    return `OAuth ${sortedParams}`;
  }

  /**
   * Parse Discogs token response
   */
  _parseTokenResponse(data) {
    const params = new URLSearchParams(data);
    return {
      oauth_token: params.get('oauth_token'),
      oauth_token_secret: params.get('oauth_token_secret'),
    };
  }
}

export default new DiscogsOAuthService();
