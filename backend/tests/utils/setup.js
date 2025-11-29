/**
 * Test setup and teardown utilities
 * Provides helpers for integration test configuration and cleanup
 */

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Resolves after delay
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract Authorization header from response
 * @param {Object} response - Supertest response object
 * @returns {string|null} - Authorization header value or null
 */
export function getAuthHeaderFromResponse(response) {
  return response.headers['authorization'] || null;
}

/**
 * Extract tokens from auth response body
 * @param {Object} responseBody - Response body from auth endpoint
 * @returns {Object} - Object with accessToken and refreshToken
 */
export function extractTokensFromResponse(responseBody) {
  if (responseBody.data) {
    return {
      accessToken: responseBody.data.accessToken,
      refreshToken: responseBody.data.refreshToken,
    };
  }
  return {
    accessToken: null,
    refreshToken: null,
  };
}

/**
 * Create Bearer token header
 * @param {string} token - JWT token
 * @returns {string} - Bearer token header value
 */
export function createBearerToken(token) {
  return `Bearer ${token}`;
}

/**
 * Parse JWT token (without verification)
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
export function parseToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

/**
 * Validate response structure matches expected format
 * @param {Object} response - Response body from API
 * @returns {boolean} - True if response has correct structure
 */
export function isValidApiResponse(response) {
  return (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    typeof response.success === 'boolean'
  );
}

/**
 * Validate error response structure
 * @param {Object} response - Response body from API
 * @returns {boolean} - True if response is valid error response
 */
export function isValidErrorResponse(response) {
  return (
    isValidApiResponse(response) &&
    response.success === false &&
    response.error &&
    typeof response.error === 'object'
  );
}

/**
 * Validate success response structure
 * @param {Object} response - Response body from API
 * @returns {boolean} - True if response is valid success response
 */
export function isValidSuccessResponse(response) {
  return isValidApiResponse(response) && response.success === true;
}

/**
 * Get error message from error response
 * @param {Object} response - Error response from API
 * @returns {string} - Error message
 */
export function getErrorMessage(response) {
  if (isValidErrorResponse(response)) {
    return response.error.message || 'Unknown error';
  }
  return null;
}
