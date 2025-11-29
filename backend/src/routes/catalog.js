import express from 'express';
import {
  getAllReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  deleteRelease,
  searchReleases,
} from '../controllers/releaseController.js';

const router = express.Router();

/**
 * GET /api/v1/catalog
 * Get all releases with optional filtering and pagination
 */
router.get('/', getAllReleases);

/**
 * GET /api/v1/catalog/search
 * Search releases by query
 */
router.get('/search', searchReleases);

/**
 * GET /api/v1/catalog/:id
 * Get a specific release by ID
 */
router.get('/:id', getReleaseById);

/**
 * POST /api/v1/catalog
 * Create a new release
 */
router.post('/', createRelease);

/**
 * PUT /api/v1/catalog/:id
 * Update a release
 */
router.put('/:id', updateRelease);

/**
 * DELETE /api/v1/catalog/:id
 * Delete a release
 */
router.delete('/:id', deleteRelease);

export default router;
