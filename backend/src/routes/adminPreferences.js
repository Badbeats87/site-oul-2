import express from 'express';
import {
  getTablePreferences,
  updateTablePreferences,
  resetTablePreferences,
  getUserPreferences,
} from '../controllers/adminPreferencesController.js';

const router = express.Router();

/**
 * GET /api/v1/admin/preferences
 * Get all table preferences for the current user
 */
router.get('/', getUserPreferences);

/**
 * GET /api/v1/admin/preferences/tables/:tableName
 * Get column preferences for a specific table
 */
router.get('/tables/:tableName', getTablePreferences);

/**
 * PUT /api/v1/admin/preferences/tables/:tableName
 * Save or update column preferences for a specific table
 */
router.put('/tables/:tableName', updateTablePreferences);

/**
 * DELETE /api/v1/admin/preferences/tables/:tableName
 * Reset table preferences to defaults
 */
router.delete('/tables/:tableName', resetTablePreferences);

export default router;
