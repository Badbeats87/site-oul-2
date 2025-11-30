import express from 'express';
import {
  getAllReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  deleteRelease,
  searchReleases,
  fullTextSearch,
  autocomplete,
  searchByAlbumArtistLabel,
  facetedSearch,
} from '../controllers/releaseController.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/catalog:
 *   get:
 *     summary: List all releases
 *     description: Retrieve all vinyl records with optional filtering and pagination
 *     tags:
 *       - Catalog
 *     parameters:
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
 *         description: List of releases retrieved successfully
 */
router.get('/', getAllReleases);

/**
 * @swagger
 * /api/v1/catalog/search:
 *   get:
 *     summary: Search releases
 *     description: Search vinyl records by title, artist, or other criteria
 *     tags:
 *       - Catalog
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum results
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search results returned successfully
 */
router.get('/search', searchReleases);

/**
 * @swagger
 * /api/v1/catalog/search/album-artist-label:
 *   get:
 *     summary: Optimized search by album/artist/label
 *     description: Fast full-text search specifically for album title, artist, and label with optimized relevance ranking
 *     tags:
 *       - Catalog
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Maximum results
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search results returned successfully
 */
router.get('/search/album-artist-label', searchByAlbumArtistLabel);

/**
 * @swagger
 * /api/v1/catalog/search/fulltext:
 *   get:
 *     summary: Full-text search using PostgreSQL tsvector
 *     description: Perform fast full-text search across all text fields (title, artist, label, description, genre)
 *     tags:
 *       - Catalog
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Maximum results
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full-text search results returned successfully
 */
router.get('/search/fulltext', fullTextSearch);

/**
 * @swagger
 * /api/v1/catalog/autocomplete:
 *   get:
 *     summary: Get autocomplete suggestions
 *     description: Get type-ahead suggestions for a field (title, artist, label, genre)
 *     tags:
 *       - Catalog
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (minimum 1 character)
 *       - in: query
 *         name: field
 *         schema:
 *           type: string
 *           enum: [title, artist, label, genre]
 *           default: title
 *         description: Field to autocomplete
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Maximum suggestions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Autocomplete suggestions returned successfully
 */
router.get('/autocomplete', autocomplete);

/**
 * @swagger
 * /api/v1/catalog/{id}:
 *   get:
 *     summary: Get release by ID
 *     description: Retrieve a specific vinyl record by its ID
 *     tags:
 *       - Catalog
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Release retrieved successfully
 *       404:
 *         description: Release not found
 *   put:
 *     summary: Update release
 *     description: Update vinyl record information
 *     tags:
 *       - Catalog
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               artist:
 *                 type: string
 *               releaseYear:
 *                 type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Release updated successfully
 *       404:
 *         description: Release not found
 *   delete:
 *     summary: Delete release
 *     description: Delete a vinyl record from the catalog
 *     tags:
 *       - Catalog
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Release deleted successfully
 *       404:
 *         description: Release not found
 */
router.get('/:id', getReleaseById);

/**
 * @swagger
 * /api/v1/catalog:
 *   post:
 *     summary: Create new release
 *     description: Add a new vinyl record to the catalog
 *     tags:
 *       - Catalog
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - artist
 *             properties:
 *               title:
 *                 type: string
 *               artist:
 *                 type: string
 *               releaseYear:
 *                 type: integer
 *               format:
 *                 type: string
 *               condition:
 *                 type: string
 *               price:
 *                 type: number
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Release created successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/', createRelease);

router.put('/:id', updateRelease);

router.delete('/:id', deleteRelease);

/**
 * @swagger
 * /api/v1/catalog/search/faceted:
 *   get:
 *     summary: Faceted search with filters and category counts
 *     description: Advanced search with genre, condition, price, and year filtering plus aggregated facets
 *     tags:
 *       - Catalog
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Optional search query
 *       - in: query
 *         name: genres
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by genre(s)
 *       - in: query
 *         name: conditions
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by condition(s) (MINT, NEAR_MINT, etc.)
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: yearMin
 *         schema:
 *           type: integer
 *         description: Minimum release year
 *       - in: query
 *         name: yearMax
 *         schema:
 *           type: integer
 *         description: Maximum release year
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Maximum results per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Faceted search results with aggregated counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                     facets:
 *                       type: object
 *                       properties:
 *                         genres:
 *                           type: array
 *                         conditions:
 *                           type: array
 *                         priceRanges:
 *                           type: array
 *                         years:
 *                           type: array
 */
router.get('/search/faceted', facetedSearch);

export default router;
