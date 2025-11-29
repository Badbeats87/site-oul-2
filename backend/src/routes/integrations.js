import express from 'express';
import { discogsLimiter } from '../middleware/integrationRateLimiter.js';
import {
  searchDiscogs,
  getDiscogsRelease,
  getDiscogsPrices,
  searchDiscogsEnriched,
} from '../controllers/discogsController.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/integrations/discogs/search:
 *   get:
 *     summary: Search Discogs for releases
 *     description: Search the Discogs database for vinyl releases by query or barcode
 *     tags:
 *       - Integrations
 *       - Discogs
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (title, artist, etc.)
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         description: UPC/barcode to search
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Release year filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Pagination page number
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search results from Discogs
 *       400:
 *         description: Missing required parameters
 */
router.get('/discogs/search', discogsLimiter, searchDiscogs);

/**
 * @swagger
 * /api/v1/integrations/discogs/search-enriched:
 *   get:
 *     summary: Search Discogs with metadata and pricing
 *     description: Search Discogs and enrich results with full metadata and price statistics
 *     tags:
 *       - Integrations
 *       - Discogs
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (title, artist, etc.)
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         description: UPC/barcode to search
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Release year filter
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enriched search results with metadata and pricing
 */
router.get('/discogs/search-enriched', discogsLimiter, searchDiscogsEnriched);

/**
 * @swagger
 * /api/v1/integrations/discogs/releases/{id}:
 *   get:
 *     summary: Get Discogs release details
 *     description: Fetch full metadata for a specific Discogs release
 *     tags:
 *       - Integrations
 *       - Discogs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Discogs release ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Release metadata
 *       404:
 *         description: Release not found
 */
router.get('/discogs/releases/:id', discogsLimiter, getDiscogsRelease);

/**
 * @swagger
 * /api/v1/integrations/discogs/prices/{id}:
 *   get:
 *     summary: Get Discogs release price statistics
 *     description: Fetch price statistics from sold listings for a release
 *     tags:
 *       - Integrations
 *       - Discogs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Discogs release ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Price statistics
 */
router.get('/discogs/prices/:id', discogsLimiter, getDiscogsPrices);

export default router;
