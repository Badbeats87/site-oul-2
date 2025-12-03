import prisma from '../generated/prisma/index.js';
import { ApiError } from '../middleware/errorHandler.js';

class AdminPreferencesService {
  /**
   * Get table preferences for a user
   * @param {string} userId - User ID
   * @param {string} tableName - Table name (inventory, submissions, etc.)
   * @returns {Promise<Object>} Preferences object
   */
  async getTablePreferences(userId, tableName) {
    try {
      const preference = await prisma.adminTablePreference.findUnique({
        where: {
          userId_tableName: { userId, tableName }
        }
      });

      return {
        tableName,
        visibleColumns: preference?.visibleColumns || null,
        hasCustomization: !!preference
      };
    } catch (error) {
      throw new ApiError('Failed to retrieve table preferences', 500);
    }
  }

  /**
   * Save or update table preferences
   * @param {string} userId - User ID
   * @param {string} tableName - Table name
   * @param {Object} visibleColumns - Column visibility object {columnId: boolean}
   * @returns {Promise<Object>} Saved preference
   */
  async updateTablePreferences(userId, tableName, visibleColumns) {
    // Validate inputs
    if (!userId || !tableName || !visibleColumns) {
      throw new ApiError('Missing required fields: userId, tableName, visibleColumns', 400);
    }

    // Validate tableName against whitelist
    const validTables = ['inventory', 'submissions', 'submission_detail', 'analytics'];
    if (!validTables.includes(tableName)) {
      throw new ApiError(`Invalid table name. Must be one of: ${validTables.join(', ')}`, 400);
    }

    // Validate visibleColumns is an object
    if (typeof visibleColumns !== 'object' || Array.isArray(visibleColumns)) {
      throw new ApiError('visibleColumns must be a JSON object', 400);
    }

    try {
      const preference = await prisma.adminTablePreference.upsert({
        where: {
          userId_tableName: { userId, tableName }
        },
        create: {
          userId,
          tableName,
          visibleColumns
        },
        update: {
          visibleColumns
        }
      });

      return preference;
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint error - shouldn't happen with upsert, but handle it
        throw new ApiError('Preference already exists for this user and table', 409);
      }
      throw new ApiError('Failed to save table preferences', 500);
    }
  }

  /**
   * Reset table preferences to defaults (delete the record)
   * @param {string} userId - User ID
   * @param {string} tableName - Table name
   * @returns {Promise<Object>} Deleted preference or null
   */
  async resetTablePreferences(userId, tableName) {
    try {
      // Validate inputs
      const validTables = ['inventory', 'submissions', 'submission_detail', 'analytics'];
      if (!validTables.includes(tableName)) {
        throw new ApiError(`Invalid table name. Must be one of: ${validTables.join(', ')}`, 400);
      }

      const deleted = await prisma.adminTablePreference.delete({
        where: {
          userId_tableName: { userId, tableName }
        }
      }).catch(() => null); // Ignore if doesn't exist

      return deleted;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to reset table preferences', 500);
    }
  }

  /**
   * Get all preferences for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of all preferences
   */
  async getUserPreferences(userId) {
    try {
      const preferences = await prisma.adminTablePreference.findMany({
        where: { userId }
      });

      return preferences;
    } catch (error) {
      throw new ApiError('Failed to retrieve user preferences', 500);
    }
  }

  /**
   * Delete all preferences for a user (cleanup)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteAllUserPreferences(userId) {
    try {
      const result = await prisma.adminTablePreference.deleteMany({
        where: { userId }
      });

      return result;
    } catch (error) {
      throw new ApiError('Failed to delete user preferences', 500);
    }
  }
}

export default new AdminPreferencesService();
