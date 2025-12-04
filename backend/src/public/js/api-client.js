/**
 * API Client for Admin Dashboard
 * Handles JWT authentication and API requests to backend
 */

class APIClient {
  constructor(baseURL = '/api/v1') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  /**
   * Make an API request
   * @param {string} endpoint - API endpoint (e.g., '/admin/submissions')
   * @param {Object} options - Request options
   * @returns {Promise<any>} Response data
   */
  async request(endpoint, options = {}) {
    const { method = 'GET', body = null, headers = {}, params = {} } = options;

    // Build query string
    const queryString = new URLSearchParams(params).toString();
    const url = new URL(
      `${this.baseURL}${endpoint}${queryString ? '?' + queryString : ''}`,
      window.location.origin
    );

    // Build request headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...headers,
    };

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle unauthorized
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new Error('Unauthorized - please log in');
      }

      // Handle forbidden
      if (response.status === 403) {
        throw new Error(
          'Forbidden - you do not have permission to perform this action'
        );
      }

      const data = await response.json();

      // Handle API error responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (data?.error?.message) {
          errorMessage = data.error.message;
        } else if (data?.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        } else if (data?.message) {
          errorMessage = data.message;
        }
        throw new Error(errorMessage);
      }

      // Return data from response
      return data.data || data;
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<any>}
   */
  async get(endpoint, params = {}) {
    return this.request(endpoint, { method: 'GET', params });
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @returns {Promise<any>}
   */
  async post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @returns {Promise<any>}
   */
  async put(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<any>}
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Handle unauthorized access
   */
  handleUnauthorized() {
    localStorage.removeItem('auth_token');
    window.location.href = '/pages/admin/login.html';
  }

  /**
   * Set auth token
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Get current token
   * @returns {string|null}
   */
  getToken() {
    return this.token;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.token;
  }
}

// Create global instance
const api = new APIClient();
