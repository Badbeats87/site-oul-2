import jwt from 'jsonwebtoken';
import config from '../../config/config.js';

/**
 * Generate an access token
 * @param {Object} payload - Token payload (userId, email, role)
 * @returns {string} - Signed JWT token
 */
export function generateAccessToken(payload) {
  return jwt.sign({ ...payload, type: 'access' }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

/**
 * Generate a refresh token
 * @param {Object} payload - Token payload (userId, tokenId)
 * @returns {string} - Signed JWT token
 */
export function generateRefreshToken(payload) {
  return jwt.sign({ ...payload, type: 'refresh' }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtRefreshExpiresIn,
  });
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.auth.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode a JWT token without verification
 * @param {string} token - JWT token to decode
 * @returns {Object} - Decoded token payload
 */
export function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null if not found
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}
