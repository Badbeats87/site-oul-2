import express from 'express';
import discogsOAuthService from '../services/discogsOAuthService.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/discogs/initiate:
 *   get:
 *     summary: Initiate Discogs OAuth flow
 *     description: Start the 3-legged OAuth flow by requesting a request token and returning the authorization URL
 *     tags:
 *       - Discogs OAuth
 *     responses:
 *       200:
 *         description: OAuth flow initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     authorizationUrl:
 *                       type: string
 *                       description: URL to redirect user for Discogs authorization
 *                     requestToken:
 *                       type: string
 *                       description: Temporary request token (should be stored in session/state)
 *       500:
 *         description: Failed to initiate OAuth flow
 */
router.get('/initiate', async (req, res, next) => {
  try {
    logger.info('Initiating Discogs OAuth flow');

    const result = await discogsOAuthService.getRequestToken();

    // Store request token in session for later retrieval in callback
    req.session = req.session || {};
    req.session.discogsRequestToken = result.requestToken;
    req.session.discogsRequestTokenSecret = result.requestTokenSecret;

    logger.info('OAuth request token generated', {
      token: result.requestToken.substring(0, 5) + '...',
    });

    res.json({
      success: true,
      data: {
        authorizationUrl: result.authorizationUrl,
        requestToken: result.requestToken,
      },
    });
  } catch (error) {
    logger.error('Failed to initiate Discogs OAuth flow', {
      error: error.message,
    });
    next(new ApiError('Failed to initiate OAuth flow', 500));
  }
});

/**
 * @swagger
 * /api/v1/auth/discogs/callback:
 *   get:
 *     summary: Handle Discogs OAuth callback
 *     description: Exchange request token + verifier for access token after user authorizes
 *     tags:
 *       - Discogs OAuth
 *     parameters:
 *       - in: query
 *         name: oauth_token
 *         required: true
 *         schema:
 *           type: string
 *         description: Request token from OAuth callback
 *       - in: query
 *         name: oauth_verifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Verifier from OAuth callback
 *     responses:
 *       200:
 *         description: Successfully exchanged for access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     username:
 *                       type: string
 *       400:
 *         description: Missing or invalid OAuth parameters
 *       500:
 *         description: Failed to exchange tokens
 */
router.get('/callback', async (req, res, next) => {
  try {
    const { oauth_token: oauthToken, oauth_verifier: oauthVerifier } =
      req.query;

    if (!oauthToken || !oauthVerifier) {
      throw new ApiError('Missing OAuth token or verifier', 400);
    }

    logger.info('Processing Discogs OAuth callback', {
      token: oauthToken.substring(0, 5) + '...',
    });

    // Exchange tokens
    const result = await discogsOAuthService.getAccessToken(
      oauthToken,
      oauthVerifier
    );

    logger.info('Discogs OAuth tokens successfully exchanged', {
      username: result.discogsUsername,
      userId: result.discogsUserId,
    });

    // Success response - in production, redirect to frontend with token or set secure cookie
    res.json({
      success: true,
      data: {
        message: 'Successfully authenticated with Discogs',
        username: result.discogsUsername,
        userId: result.discogsUserId,
        accessToken: result.accessToken.substring(0, 5) + '...', // Only return first 5 chars for security
      },
    });
  } catch (error) {
    logger.error('Failed to process Discogs OAuth callback', {
      error: error.message,
    });

    if (error.isApiError) {
      next(error);
    } else {
      next(new ApiError('Failed to process OAuth callback', 500));
    }
  }
});

/**
 * @swagger
 * /api/v1/auth/discogs/status:
 *   get:
 *     summary: Check if Discogs OAuth token is active
 *     description: Verify if a valid Discogs OAuth token is currently stored in the system
 *     tags:
 *       - Discogs OAuth
 *     responses:
 *       200:
 *         description: OAuth token status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasActiveToken:
 *                       type: boolean
 *                     message:
 *                       type: string
 */
router.get('/status', async (req, res, next) => {
  try {
    const token = await discogsOAuthService.getLatestAccessToken();
    const hasActiveToken = token !== null;

    res.json({
      success: true,
      data: {
        hasActiveToken,
        message: hasActiveToken
          ? 'Active Discogs OAuth token is configured'
          : 'No active Discogs OAuth token found. Please run the OAuth flow to authenticate.',
      },
    });
  } catch (error) {
    logger.error('Failed to check OAuth status', {
      error: error.message,
    });
    next(new ApiError('Failed to check OAuth status', 500));
  }
});

export default router;
