import logger from '../../config/logger.js';
import { ApiError } from './errorHandler.js';

/**
 * Authentication middleware
 * Validates API key or bearer token
 */
export const authenticate = (req, res, next) => {
  const requestId = req.id || 'unknown';

  // Check for API key in headers
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  // Allow health checks without authentication
  if (req.path.startsWith('/api/v1/health')) {
    return next();
  }

  // Validate API key or bearer token
  if (!apiKey && !authHeader) {
    logger.warn(`[${requestId}] Missing authentication credentials`, {
      method: req.method,
      path: req.path,
    });
    return res.status(401).json({
      success: false,
      error: {
        message: 'Missing authentication credentials',
        status: 401,
        requestId,
      },
    });
  }

  // Validate API key format (should be UUID-like for this project)
  if (apiKey) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(apiKey)) {
      logger.warn(`[${requestId}] Invalid API key format`, {
        method: req.method,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid API key format',
          status: 401,
          requestId,
        },
      });
    }

    // Store API key in request for later use
    req.apiKey = apiKey;
    return next();
  }

  // Validate bearer token format
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
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

    const token = parts[1];
    // Validate token format (UUID-like)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      logger.warn(`[${requestId}] Invalid bearer token format`, {
        method: req.method,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid bearer token format',
          status: 401,
          requestId,
        },
      });
    }

    // Store token in request for later use
    req.token = token;
    return next();
  }
};

/**
 * Optional authentication middleware
 * Validates credentials if provided, but allows unauthenticated requests
 */
export const optionalAuth = (req, res, next) => {
  const requestId = req.id || 'unknown';

  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  // If no credentials provided, continue
  if (!apiKey && !authHeader) {
    return next();
  }

  // If credentials provided, validate them
  if (apiKey) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(apiKey)) {
      logger.warn(`[${requestId}] Invalid API key format (optional auth)`, {
        method: req.method,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid API key format',
          status: 401,
          requestId,
        },
      });
    }
    req.apiKey = apiKey;
  }

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      logger.warn(`[${requestId}] Invalid authorization header format (optional auth)`, {
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

    const token = parts[1];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      logger.warn(`[${requestId}] Invalid bearer token format (optional auth)`, {
        method: req.method,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid bearer token format',
          status: 401,
          requestId,
        },
      });
    }
    req.token = token;
  }

  next();
};
