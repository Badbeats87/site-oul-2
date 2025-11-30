/**
 * Authentication Module for Admin Dashboard
 * Handles login, logout, and session management
 */

class AuthManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.currentUser = null;
  }

  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User data
   */
  async login(email, password) {
    try {
      const response = await this.api.post('/auth/login', {
        email,
        password
      });

      // Store token
      if (response.token) {
        this.api.setToken(response.token);
        this.currentUser = response.user;
        return response;
      } else {
        throw new Error('No token received from server');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      // Call logout endpoint if available
      try {
        await this.api.post('/auth/logout', {});
      } catch (e) {
        // Ignore errors, proceed with cleanup
      }

      // Clear local state
      this.api.setToken(null);
      this.currentUser = null;
      localStorage.removeItem('auth_token');

      // Redirect to login
      window.location.href = '/pages/admin/login.html';
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear state and redirect
      localStorage.removeItem('auth_token');
      window.location.href = '/pages/admin/login.html';
    }
  }

  /**
   * Verify current session
   * @returns {Promise<boolean>}
   */
  async verifySession() {
    if (!this.api.isAuthenticated()) {
      return false;
    }

    try {
      const user = await this.api.get('/auth/me');
      this.currentUser = user;
      return true;
    } catch (error) {
      console.error('Session verification failed:', error);
      this.api.setToken(null);
      return false;
    }
  }

  /**
   * Get current user
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user has specific role
   * @param {string} role - Role to check (ADMIN, SUPER_ADMIN)
   * @returns {boolean}
   */
  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }

  /**
   * Check if user is admin (ADMIN or SUPER_ADMIN)
   * @returns {boolean}
   */
  isAdmin() {
    return this.currentUser && (this.currentUser.role === 'ADMIN' || this.currentUser.role === 'SUPER_ADMIN');
  }
}

// Create global instance
const auth = new AuthManager(api);
