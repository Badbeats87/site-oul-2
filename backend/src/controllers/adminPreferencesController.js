import adminPreferencesService from '../services/adminPreferencesService.js';
import logger from '../../config/logger.js';

/**
 * GET /api/v1/admin/preferences/tables/:tableName
 * Retrieve column preferences for a specific table
 */
export const getTablePreferences = async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const userId = req.user.id;

    const preferences = await adminPreferencesService.getTablePreferences(
      userId,
      tableName
    );

    res.json({
      success: true,
      data: preferences,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/preferences/tables/:tableName
 * Save or update column preferences for a specific table
 */
export const updateTablePreferences = async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const { visibleColumns } = req.body;
    const userId = req.user.id;

    if (!visibleColumns) {
      return res.status(400).json({
        success: false,
        error: 'visibleColumns is required',
        requestId: req.id,
      });
    }

    const preferences = await adminPreferencesService.updateTablePreferences(
      userId,
      tableName,
      visibleColumns
    );

    logger.info('Table preferences updated', {
      userId,
      tableName,
      columnsCount: Object.keys(visibleColumns).length,
    });

    res.json({
      success: true,
      data: preferences,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/preferences/tables/:tableName
 * Reset table preferences to defaults (delete the preference record)
 */
export const resetTablePreferences = async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const userId = req.user.id;

    await adminPreferencesService.resetTablePreferences(userId, tableName);

    logger.info('Table preferences reset', {
      userId,
      tableName,
    });

    res.json({
      success: true,
      message: 'Preferences reset to defaults',
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/preferences
 * Get all table preferences for the current user
 */
export const getUserPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const preferences =
      await adminPreferencesService.getUserPreferences(userId);

    res.json({
      success: true,
      data: {
        userId,
        preferences,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};
