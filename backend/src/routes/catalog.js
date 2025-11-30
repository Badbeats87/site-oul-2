import express from "express";
import {
  getAllReleases,
  getReleaseById,
  createRelease,
  updateRelease,
  deleteRelease,
  searchReleases,
  autocomplete,
} from "../controllers/releaseController.js";

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
router.get("/", getAllReleases);

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
router.get("/search", searchReleases);

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
router.get("/autocomplete", autocomplete);

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
router.get("/:id", getReleaseById);

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
router.post("/", createRelease);

router.put("/:id", updateRelease);

router.delete("/:id", deleteRelease);

export default router;
