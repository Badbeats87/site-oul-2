import prisma from '../utils/db.js';
import logger from '../../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from '../utils/passwordUtils.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
} from '../utils/tokenUtils.js';
import config from '../../config/config.js';

class AuthService {
  /**
   * Register a new user
   * @param {Object} data - Registration data
   * @param {string} data.email - User email
   * @param {string} data.password - User password (plaintext)
   * @param {string} data.name - User name
   * @param {string} data.role - User role (BUYER or SELLER for public registration)
   * @returns {Object} - User, accessToken, and refreshToken
   */
  async register(data) {
    const { email, password, name, role = 'BUYER' } = data;

    try {
      // Validate required fields
      if (!email || !password || !name) {
        throw new ApiError('Email, password, and name are required', 400);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ApiError('Invalid email format', 400);
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new ApiError(
          `Password does not meet requirements: ${passwordValidation.errors.join('; ')}`,
          400,
        );
      }

      // Check if email already exists
      const existingUser = await prisma.adminUser.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ApiError('Email already registered', 409);
      }

      // Validate role (only BUYER and SELLER can self-register)
      const validPublicRoles = ['BUYER', 'SELLER'];
      if (!validPublicRoles.includes(role)) {
        throw new ApiError(`Invalid role for registration: ${role}`, 400);
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await prisma.adminUser.create({
        data: {
          email,
          name,
          role,
          passwordHash,
          isActive: true,
        },
      });

      logger.info('User registered', { userId: user.id, email: user.email });

      // Generate tokens
      const { accessToken, refreshToken } = await this._generateTokenPair(user);

      return {
        user: this._sanitizeUser(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error registering user', { error: error.message });
      throw new ApiError('User registration failed', 500);
    }
  }

  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password (plaintext)
   * @returns {Object} - User, accessToken, and refreshToken
   */
  async login(email, password) {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new ApiError('Email and password are required', 400);
      }

      // Find user by email
      const user = await prisma.adminUser.findUnique({
        where: { email },
      });

      if (!user) {
        throw new ApiError('Invalid email or password', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new ApiError('User account is inactive', 403);
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new ApiError('Invalid email or password', 401);
      }

      // Update lastLoginAt
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      logger.info('User logged in', { userId: user.id, email: user.email });

      // Generate tokens
      const { accessToken, refreshToken } = await this._generateTokenPair(user);

      return {
        user: this._sanitizeUser(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error logging in', { error: error.message });
      throw new ApiError('Login failed', 500);
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshTokenString - Refresh token string
   * @returns {Object} - New accessToken and refreshToken
   */
  async refreshToken(refreshTokenString) {
    try {
      // Validate input
      if (!refreshTokenString) {
        throw new ApiError('Refresh token is required', 400);
      }

      // Verify JWT signature and expiration
      let decoded;
      try {
        decoded = verifyToken(refreshTokenString);
      } catch (error) {
        throw new ApiError('Invalid or expired refresh token', 401);
      }

      // Check token type
      if (decoded.type !== 'refresh') {
        throw new ApiError('Invalid token type', 401);
      }

      // Check if refresh token exists and is not revoked
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshTokenString },
      });

      if (!storedToken || storedToken.revokedAt || storedToken.replacedBy) {
        throw new ApiError('Refresh token has been revoked', 401);
      }

      // Check if token is expired
      if (new Date() > storedToken.expiresAt) {
        throw new ApiError('Refresh token has expired', 401);
      }

      // Get user
      const user = await prisma.adminUser.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        throw new ApiError('User not found or inactive', 401);
      }

      // Generate new token pair
      const { accessToken, refreshToken: newRefreshToken } =
        await this._generateTokenPair(user);

      // Mark old refresh token as replaced
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          replacedBy: newRefreshToken,
        },
      });

      logger.info('Tokens refreshed', { userId: user.id });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error refreshing token', { error: error.message });
      throw new ApiError('Token refresh failed', 500);
    }
  }

  /**
   * Logout user by revoking a specific refresh token
   * @param {string} userId - User ID
   * @param {string} refreshTokenString - Refresh token to revoke
   * @returns {Object} - Success message
   */
  async logout(userId, refreshTokenString) {
    try {
      // Validate input
      if (!userId || !refreshTokenString) {
        throw new ApiError('User ID and refresh token are required', 400);
      }

      // Find and revoke the refresh token
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: refreshTokenString },
      });

      if (!refreshToken || refreshToken.userId !== userId) {
        throw new ApiError(
          'Refresh token not found or does not belong to user',
          401,
        );
      }

      await prisma.refreshToken.update({
        where: { id: refreshToken.id },
        data: { revokedAt: new Date() },
      });

      logger.info('User logged out', { userId });

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error logging out', { error: error.message });
      throw new ApiError('Logout failed', 500);
    }
  }

  /**
   * Logout user from all devices by revoking all refresh tokens
   * @param {string} userId - User ID
   * @returns {Object} - Success message
   */
  async logoutAll(userId) {
    try {
      // Validate input
      if (!userId) {
        throw new ApiError('User ID is required', 400);
      }

      // Revoke all active refresh tokens
      const result = await prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
          replacedBy: null,
        },
        data: { revokedAt: new Date() },
      });

      logger.info('User logged out from all devices', {
        userId,
        count: result.count,
      });

      return {
        success: true,
        message: `Logged out from all devices (${result.count} sessions revoked)`,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error logging out from all devices', {
        error: error.message,
      });
      throw new ApiError('Logout failed', 500);
    }
  }

  /**
   * Verify and decode an access token
   * @param {string} token - Access token
   * @returns {Object} - Decoded token payload
   */
  async verifyAccessToken(token) {
    try {
      const decoded = verifyToken(token);

      // Check token type
      if (decoded.type !== 'access') {
        throw new ApiError('Invalid token type', 401);
      }

      return decoded;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Token verification failed', 401);
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} oldPassword - Old password (plaintext)
   * @param {string} newPassword - New password (plaintext)
   * @returns {Object} - Success message
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Validate inputs
      if (!oldPassword || !newPassword) {
        throw new ApiError('Old password and new password are required', 400);
      }

      if (oldPassword === newPassword) {
        throw new ApiError(
          'New password must be different from old password',
          400,
        );
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        throw new ApiError(
          `New password does not meet requirements: ${passwordValidation.errors.join('; ')}`,
          400,
        );
      }

      // Get user
      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new ApiError('User not found', 404);
      }

      // Verify old password
      const isPasswordValid = await verifyPassword(
        oldPassword,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        throw new ApiError('Old password is incorrect', 401);
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await prisma.adminUser.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all refresh tokens to force re-login
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      logger.info('User password changed', { userId });

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error changing password', { error: error.message });
      throw new ApiError('Password change failed', 500);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate access and refresh token pair
   * @private
   * @param {Object} user - User object from database
   * @returns {Promise<Object>} - {accessToken, refreshToken}
   */
  async _generateTokenPair(user) {
    // Generate access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Generate refresh token
    const refreshTokenString = generateRefreshToken({
      userId: user.id,
      tokenId: user.id,
    });

    // Store refresh token in database with expiration
    const expiresAt = new Date();
    const refreshExpiryDays =
      parseInt(config.auth.jwtRefreshExpiresIn, 10) || 7;
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenString,
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: refreshTokenString };
  }

  /**
   * Remove sensitive fields from user object
   * @private
   * @param {Object} user - User object
   * @returns {Object} - Sanitized user object
   */
  _sanitizeUser(user) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

export default new AuthService();
