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
 * POST /api/v1/auth/register
 * Register a new user (BUYER or SELLER role)
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePassword123!",
 *   "name": "John Doe",
 *   "role": "BUYER" (optional, defaults to BUYER)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "user": { id, email, name, role, isActive, createdAt, ... },
 *     "accessToken": "jwt_token",
 *     "refreshToken": "jwt_token"
 *   }
 * }
 */
router.post('/register', registerLimiter, register);

/**
 * POST /api/v1/auth/login
 * Login user and return tokens
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePassword123!"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "user": { id, email, name, role, isActive, ... },
 *     "accessToken": "jwt_token",
 *     "refreshToken": "jwt_token"
 *   }
 * }
 */
router.post('/login', loginLimiter, login);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 *
 * Request body:
 * {
 *   "refreshToken": "jwt_refresh_token"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "accessToken": "new_jwt_token",
 *     "refreshToken": "new_jwt_refresh_token"
 *   }
 * }
 */
router.post('/refresh', refresh);

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
