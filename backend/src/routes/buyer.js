import express from 'express';
import {
  listProducts,
  getProductDetail,
  getRecommendations,
  searchProducts,
  addToWishlist,
  removeFromWishlist,
} from '../controllers/buyerController.js';

const router = express.Router();

// ============================================================================
// PRODUCT BROWSING
// ============================================================================

/**
 * @swagger
 * /api/v1/buyer/products:
 *   get:
 *     summary: List products for purchase
 *     description: Browse available products with filtering, searching, and sorting
 *     tags:
 *       - Buyer Store
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by album name or artist
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre
 *       - in: query
 *         name: conditions
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [MINT, NM, VG_PLUS, VG, VG_MINUS, G, FAIR, POOR]
 *         style: form
 *         explode: true
 *         description: Filter by condition grades
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price, createdAt, popularity]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: List of available products
 */
router.get('/products', listProducts);

/**
 * @swagger
 * /api/v1/buyer/products/{inventoryLotId}:
 *   get:
 *     summary: Get product details
 *     description: Retrieve complete product information including condition, pricing, and description
 *     tags:
 *       - Buyer Store
 *     parameters:
 *       - in: path
 *         name: inventoryLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/products/:inventoryLotId', getProductDetail);

// ============================================================================
// PRODUCT SEARCH & DISCOVERY
// ============================================================================

/**
 * @swagger
 * /api/v1/buyer/search:
 *   get:
 *     summary: Search products
 *     description: Full-text search across albums, artists, labels, and barcodes
 *     tags:
 *       - Buyer Store
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', searchProducts);

/**
 * @swagger
 * /api/v1/buyer/products/{inventoryLotId}/recommendations:
 *   get:
 *     summary: Get product recommendations
 *     description: Get similar products based on artist or genre
 *     tags:
 *       - Buyer Store
 *     parameters:
 *       - in: path
 *         name: inventoryLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: List of recommended products
 */
router.get('/products/:inventoryLotId/recommendations', getRecommendations);

// ============================================================================
// WISHLIST MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/v1/buyer/wishlist:
 *   post:
 *     summary: Add product to wishlist
 *     description: Add a product to the buyer's wishlist
 *     tags:
 *       - Buyer Wishlist
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inventoryLotId
 *             properties:
 *               inventoryLotId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Item added to wishlist
 *       404:
 *         description: Product not found
 */
router.post('/wishlist', addToWishlist);

/**
 * @swagger
 * /api/v1/buyer/wishlist/{inventoryLotId}:
 *   delete:
 *     summary: Remove product from wishlist
 *     description: Remove a product from the buyer's wishlist
 *     tags:
 *       - Buyer Wishlist
 *     parameters:
 *       - in: path
 *         name: inventoryLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Item removed from wishlist
 *       404:
 *         description: Item not found in wishlist
 */
router.delete('/wishlist/:inventoryLotId', removeFromWishlist);

export default router;
