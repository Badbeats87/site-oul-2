import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

/**
 * Generate a test access token
 * @param {Object} overrides - Override default token values
 * @returns {string} - Valid JWT access token
 */
export function generateTestAccessToken(overrides = {}) {
  const payload = {
    userId: '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com',
    role: 'ADMIN',
    type: 'access',
    ...overrides,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Generate a test refresh token
 * @param {Object} overrides - Override default token values
 * @returns {string} - Valid JWT refresh token
 */
export function generateTestRefreshToken(overrides = {}) {
  const payload = {
    userId: '00000000-0000-0000-0000-000000000000',
    tokenId: '00000000-0000-0000-0000-000000000000',
    type: 'refresh',
    ...overrides,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Get test authorization header with valid access token
 * @param {Object} overrides - Override default token values
 * @returns {string} - Authorization header value (Bearer <token>)
 */
export function getTestAuthHeader(overrides = {}) {
  const token = generateTestAccessToken(overrides);
  return `Bearer ${token}`;
}
