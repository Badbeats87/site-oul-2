import logger from '../../config/logger.js';
import { ApiError } from './errorHandler.js';
import authService from '../services/authService.js';
import { extractTokenFromHeader } from '../utils/tokenUtils.js';

/**
 * Role hierarchy for access control
 * Higher number = higher privilege
 */
const ROLE_HIERARCHY = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  SELLER: 2,
  BUYER: 1,
};

/**
 * Permission matrix by role
 * Format: resource:action
 */
const PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'catalog:read',
    'catalog:write',
    'catalog:delete',
    'pricing:read',
    'pricing:write',
    'pricing:delete',
    'submissions:read',
    'submissions:write',
    'submissions:delete',
    'inventory:read',
    'inventory:write',
    'inventory:delete',
    'orders:read',
    'orders:write',
    'orders:delete',
  ],
  SELLER: [
    'catalog:read',
    'submissions:read',
    'submissions:write',
    'inventory:read',
  ],
  BUYER: ['catalog:read', 'orders:read', 'orders:write'],
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  const requestId = req.id || 'unknown';

  // Allow health checks without authentication
  if (req.path.startsWith('/api/v1/health')) {
    return next();
  }

  // Allow public auth endpoints without authentication
  // Check both possible path formats (/api/v1/auth/... and /auth/...)
  const isPublicAuthEndpoint =
    req.path === '/api/v1/auth/login' ||
    req.path === '/api/v1/auth/register' ||
    req.path === '/api/v1/auth/refresh' ||
    req.path === '/auth/login' ||
    req.path === '/auth/register' ||
    req.path === '/auth/refresh';

  if (isPublicAuthEndpoint) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn(`[${requestId}] Missing authorization header`, {
      method: req.method,
      path: req.path,
    });
    return res.status(401).json({
      success: false,
      error: {
        message: 'Missing authorization header',
        status: 401,
        requestId,
      },
    });
  }

  // Extract token from header
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    logger.warn(`[${requestId}] Invalid authorization header format`, {
      method: req.method,
      path: req.path,
    });
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid authorization header format. Use: Bearer <token>',
        status: 401,
        requestId,
      },
    });
  }

  try {
    // Verify JWT token
    const decoded = await authService.verifyAccessToken(token);

    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.warn(`[${requestId}] Token verification failed`, {
      error: error.message,
      method: req.method,
      path: req.path,
    });
    return res.status(401).json({
      success: false,
      error: {
        message: error.message || 'Invalid or expired token',
        status: 401,
        requestId,
      },
    });
  }
};

/**
 * Role-based authorization middleware
 * Checks if user has required role or higher
 *
 * Usage: router.get('/admin', authenticate, requireRole('ADMIN'), handler);
 *
 * @param {string} minRole - Minimum required role
 * @returns {Function} - Middleware function
 */
export const requireRole = (minRole) => {
  return (req, res, next) => {
    const requestId = req.id || 'unknown';

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized',
          status: 401,
          requestId,
        },
      });
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredRoleLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      logger.warn(
        `[${requestId}] Insufficient permissions - role check failed`,
        {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRole: minRole,
          method: req.method,
          path: req.path,
        },
      );

      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          status: 403,
          requestId,
          required: minRole,
          actual: req.user.role,
        },
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 * Checks if user has specific permission
 *
 * Usage: router.post('/pricing', authenticate, requirePermission('pricing:write'), handler);
 *
 * @param {string} permission - Required permission (e.g., 'catalog:write')
 * @returns {Function} - Middleware function
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    const requestId = req.id || 'unknown';

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized',
          status: 401,
          requestId,
        },
      });
    }

    const userPermissions = PERMISSIONS[req.user.role] || [];

    // Super admin has all permissions
    if (userPermissions.includes('*')) {
      return next();
    }

    // Check specific permission
    if (!userPermissions.includes(permission)) {
      logger.warn(
        `[${requestId}] Insufficient permissions - permission check failed`,
        {
          userId: req.user.id,
          userRole: req.user.role,
          requiredPermission: permission,
          method: req.method,
          path: req.path,
        },
      );

      return res.status(403).json({
        success: false,
        error: {
          message: 'Permission denied',
          status: 403,
          requestId,
          required: permission,
        },
      });
    }

    next();
  };
};
