import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getCurrentUser,
  changePassword,
} from '../controllers/authController.js';
import discogsOAuthService from '../services/discogsOAuthService.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rate limiting middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per windowMs
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// PUBLIC ROUTES (no authentication required)
// ============================================================================

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with BUYER or SELLER role
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 description: Must be at least 8 chars with uppercase, lowercase, number, and special char
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [BUYER, SELLER]
 *                 default: BUYER
 *     responses:
 *       201:
 *         description: User registered successfully
 *       429:
 *         description: Too many registration attempts
 */
router.post('/register', registerLimiter, register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user and return access and refresh tokens
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', loginLimiter, login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using a valid refresh token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', refresh);

// ============================================================================
// DISCOGS OAUTH ENDPOINTS (public, no authentication required)
// ============================================================================

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
 */
router.get('/discogs/initiate', async (req, res, next) => {
  try {
    logger.info('Initiating Discogs OAuth flow');

    const result = await discogsOAuthService.getRequestToken();

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
 *       - in: query
 *         name: oauth_verifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully exchanged for access token
 */
router.get('/discogs/callback', async (req, res, next) => {
  try {
    const { oauth_token: oauthToken, oauth_verifier: oauthVerifier } = req.query;

    if (!oauthToken || !oauthVerifier) {
      throw new ApiError('Missing OAuth token or verifier', 400);
    }

    logger.info('Processing Discogs OAuth callback', {
      token: oauthToken.substring(0, 5) + '...',
    });

    const result = await discogsOAuthService.getAccessToken(oauthToken, oauthVerifier);

    logger.info('Discogs OAuth tokens successfully exchanged', {
      username: result.discogsUsername,
      userId: result.discogsUserId,
    });

    res.json({
      success: true,
      data: {
        message: 'Successfully authenticated with Discogs',
        username: result.discogsUsername,
        userId: result.discogsUserId,
        accessToken: result.accessToken.substring(0, 5) + '...',
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
 */
router.get('/discogs/status', async (req, res, next) => {
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

// ============================================================================
// PROTECTED ROUTES (authentication required)
// ============================================================================

/**
 * POST /api/v1/auth/logout
 * Logout user by revoking single refresh token
 *
 * Headers: Authorization: Bearer <accessToken>
 * Request body:
 * {
 *   "refreshToken": "jwt_refresh_token"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 */
router.post('/logout', authenticate, logout);

/**
 * POST /api/v1/auth/logout-all
 * Logout user from all devices by revoking all refresh tokens
 *
 * Headers: Authorization: Bearer <accessToken>
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "success": true,
 *     "message": "Logged out from all devices (X sessions revoked)"
 *   }
 * }
 */
router.post('/logout-all', authenticate, logoutAll);

/**
 * GET /api/v1/auth/me
 * Get current authenticated user info
 *
 * Headers: Authorization: Bearer <accessToken>
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "user": { id, email, name, role, isActive, ... }
 *   }
 * }
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * POST /api/v1/auth/change-password
 * Change user password (logs out all other sessions)
 *
 * Headers: Authorization: Bearer <accessToken>
 * Request body:
 * {
 *   "oldPassword": "OldPassword123!",
 *   "newPassword": "NewPassword456!"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "success": true,
 *     "message": "Password changed successfully"
 *   }
 * }
 */
router.post('/change-password', authenticate, changePassword);

export default router;
