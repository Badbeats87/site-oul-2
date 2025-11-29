import express from 'express';
import { discogsLimiter, ebayLimiter } from '../middleware/integrationRateLimiter.js';
import {
  searchDiscogs,
  getDiscogsRelease,
  getDiscogsPrices,
  searchDiscogsEnriched,
} from '../controllers/discogsController.js';
import {
  searchEbay,
  getSoldListingsEbay,
  getPricesEbay,
  searchEbayEnriched,
} from '../controllers/ebayController.js';

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

// ============================================================================
// eBay Integration Routes
// ============================================================================

/**
 * @swagger
 * /api/v1/integrations/ebay/search:
 *   get:
 *     summary: Search eBay for items
 *     description: Search for vinyl records on eBay by query
 *     tags:
 *       - Integrations
 *       - eBay
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (title, keywords)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: eBay category filter (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search results from eBay
 *       400:
 *         description: Missing required parameters
 */
router.get('/ebay/search', ebayLimiter, searchEbay);

/**
 * @swagger
 * /api/v1/integrations/ebay/sold-listings:
 *   get:
 *     summary: Get sold listings from eBay
 *     description: Fetch completed/sold listings from eBay for price comparables
 *     tags:
 *       - Integrations
 *       - eBay
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for similar items
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sold listings
 */
router.get('/ebay/sold-listings', ebayLimiter, getSoldListingsEbay);

/**
 * @swagger
 * /api/v1/integrations/ebay/prices:
 *   get:
 *     summary: Get eBay price statistics
 *     description: Fetch price statistics from sold listings on eBay
 *     tags:
 *       - Integrations
 *       - eBay
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for similar items
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Price statistics
 */
router.get('/ebay/prices', ebayLimiter, getPricesEbay);

/**
 * @swagger
 * /api/v1/integrations/ebay/search-enriched:
 *   get:
 *     summary: Search eBay with price statistics
 *     description: Search eBay and include current pricing and statistics
 *     tags:
 *       - Integrations
 *       - eBay
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enriched search results with pricing
 */
router.get('/ebay/search-enriched', ebayLimiter, searchEbayEnriched);

export default router;
