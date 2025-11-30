import express from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getCurrentUser,
  changePassword,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Rate limiting middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per windowMs
  message: "Too many registration attempts, please try again later",
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
router.post("/register", registerLimiter, register);

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
router.post("/login", loginLimiter, login);

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
router.post("/refresh", refresh);

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
router.post("/logout", authenticate, logout);

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
router.post("/logout-all", authenticate, logoutAll);

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
router.get("/me", authenticate, getCurrentUser);

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
router.post("/change-password", authenticate, changePassword);

export default router;
