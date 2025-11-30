import express from 'express';
import {
  listInventory,
  getInventoryDetail,
  updateInventory,
  deleteInventory,
  applyPricingPolicy,
  getPricingHistory,
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
 *     summary: List inventory with pagination and filtering
 *     description: Retrieve paginated inventory lots with optional status filtering and sorting
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 500
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, listPrice, soldAt, listedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated inventory list
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

export default router;
