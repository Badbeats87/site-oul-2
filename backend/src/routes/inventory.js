import express from 'express';
import {
  listInventory,
  getInventoryDetail,
  updateInventory,
  deleteInventory,
  applyPricingPolicy,
  getPricingHistory,
  getInventoryAnalytics,
  getLowStockAlerts,
  calculateSalesVelocity,
  bulkUpdatePrices,
} from '../controllers/inventoryController.js';

const router = express.Router();

// ============================================================================
// INVENTORY LISTING & RETRIEVAL
// ============================================================================

/**
 * @swagger
 * /api/v1/inventory:
 *   get:
 *     summary: List inventory with advanced filtering, search, and sorting
 *     description: Retrieve paginated inventory with comprehensive filtering, full-text search, and multiple sorting options
 *     tags:
 *       - Inventory Management
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, LIVE, RESERVED, SOLD, REMOVED, RETURNED]
 *         description: Filter by inventory status
 *       - in: query
 *         name: conditions
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [MINT, NM, VG_PLUS, VG, VG_MINUS, G, FAIR, POOR]
 *         style: form
 *         explode: true
 *         description: Filter by vinyl condition grades (media or sleeve)
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by release genre
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum list price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum list price
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by album name, artist, barcode, or SKU
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 500
 *         description: Results per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, listPrice, soldAt, listedAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated inventory with advanced filters applied
 */
router.get('/', listInventory);

/**
 * @swagger
 * /api/v1/inventory/{inventoryLotId}:
 *   get:
 *     summary: Get inventory lot details
 *     description: Retrieve complete details for a specific inventory lot including pricing, condition, and submission origin
 *     tags:
 *       - Inventory Management
 *     parameters:
 *       - in: path
 *         name: inventoryLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory lot details
 *       404:
 *         description: Inventory lot not found
 */
router.get('/:inventoryLotId', getInventoryDetail);

// ============================================================================
// INVENTORY UPDATES
// ============================================================================

/**
 * @swagger
 * /api/v1/inventory/{inventoryLotId}:
 *   put:
 *     summary: Update inventory lot
 *     description: Update inventory lot properties including price, status, and notes
 *     tags:
 *       - Inventory Management
 *     parameters:
 *       - in: path
 *         name: inventoryLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               listPrice:
 *                 type: number
 *                 minimum: 0
 *                 description: List price for the item
 *               salePrice:
 *                 type: number
 *                 minimum: 0
 *                 description: Actual sale price (if different from list price)
 *               status:
 *                 type: string
 *                 enum: [DRAFT, LIVE, RESERVED, SOLD, REMOVED, RETURNED]
 *                 description: Current inventory status
 *               internalNotes:
 *                 type: string
 *                 description: Internal notes visible to staff
 *               publicDescription:
 *                 type: string
 *                 description: Public product description for buyers
 *               sku:
 *                 type: string
 *                 description: Stock keeping unit (must be unique)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory lot updated
 *       400:
 *         description: Invalid update data
 *       404:
 *         description: Inventory lot not found
 */
router.put('/:inventoryLotId', updateInventory);

/**
 * @swagger
 * /api/v1/inventory/{inventoryLotId}:
 *   delete:
 *     summary: Delete/remove inventory lot
 *     description: Mark inventory lot as REMOVED (soft delete to maintain audit trail)
 *     tags:
 *       - Inventory Management
 *     parameters:
 *       - in: path
 *         name: inventoryLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for removal
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory lot removed
 *       404:
 *         description: Inventory lot not found
 */
router.delete('/:inventoryLotId', deleteInventory);

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * @swagger
 * /api/v1/inventory/bulk/prices:
 *   post:
 *     summary: Bulk update inventory prices
 *     description: Update prices for multiple inventory lots in a single request
 *     tags:
 *       - Inventory Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 maxItems: 500
 *                 items:
 *                   type: object
 *                   required:
 *                     - inventoryLotId
 *                   properties:
 *                     inventoryLotId:
 *                       type: string
 *                       format: uuid
 *                     listPrice:
 *                       type: number
 *                       minimum: 0
 *                     salePrice:
 *                       type: number
 *                       minimum: 0
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bulk price update results with successful and failed updates
 *       400:
 *         description: Invalid request data
 */
router.post('/bulk/prices', bulkUpdatePrices);

// ============================================================================
// PRICING POLICY OPERATIONS
// ============================================================================

/**
 * @swagger
 * /api/v1/inventory/pricing/apply:
 *   post:
 *     summary: Apply pricing policy to inventory items
 *     description: Apply a pricing policy to inventory items with optional dry-run preview
 *     tags:
 *       - Inventory Pricing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - policyId
 *             properties:
 *               policyId:
 *                 type: string
 *                 format: uuid
 *                 description: Pricing policy ID to apply
 *               inventoryLotIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Specific lot IDs to apply to (if not specified, uses filters)
 *               filters:
 *                 type: object
 *                 description: Filter options for partial application (status, conditions)
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [DRAFT, LIVE, RESERVED, SOLD, REMOVED, RETURNED]
 *                   conditions:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [MINT, NM, VG_PLUS, VG, VG_MINUS, G, FAIR, POOR]
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *                 description: Preview changes without applying if true
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Policy application results with price calculations
 */
router.post('/pricing/apply', applyPricingPolicy);

/**
 * @swagger
 * /api/v1/inventory/{inventoryLotId}/pricing-history:
 *   get:
 *     summary: Get pricing history for an inventory lot
 *     description: Retrieve pricing change history including all policy applications
 *     tags:
 *       - Inventory Pricing
 *     parameters:
 *       - in: path
 *         name: inventoryLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pricing history with policy names, prices, and timestamps
 *       404:
 *         description: Inventory lot not found
 */
router.get('/:inventoryLotId/pricing-history', getPricingHistory);

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * @swagger
 * /api/v1/inventory/analytics/overview:
 *   get:
 *     summary: Get inventory analytics and summary statistics
 *     description: Retrieve comprehensive analytics including status breakdown, price statistics, low-stock alerts, and top performers
 *     tags:
 *       - Inventory Analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory analytics with stats and alerts
 */
router.get('/analytics/overview', getInventoryAnalytics);

/**
 * @swagger
 * /api/v1/inventory/analytics/low-stock:
 *   get:
 *     summary: Get low-stock alerts
 *     description: Retrieve inventory items with stock levels below threshold
 *     tags:
 *       - Inventory Analytics
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Threshold for low-stock alert
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low-stock alert items grouped by release
 */
router.get('/analytics/low-stock', getLowStockAlerts);

/**
 * @swagger
 * /api/v1/inventory/analytics/sales-velocity:
 *   get:
 *     summary: Calculate sales velocity metrics
 *     description: Retrieve sales statistics including total sold, revenue, and top selling releases
 *     tags:
 *       - Inventory Analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales velocity metrics with top performers
 */
router.get('/analytics/sales-velocity', calculateSalesVelocity);

export default router;
