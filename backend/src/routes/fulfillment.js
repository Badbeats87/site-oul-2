import express from "express";
import {
  getOrdersReadyToShip,
  prepareOrderForShipment,
  generateLabelsForOrders,
  approveShipment,
  rejectShipment,
  batchApproveShipments,
  markAsPacked,
  markAsShipped,
  batchMarkAsShipped,
  getFulfillmentStats,
  getShipmentsByStatus,
  getShipmentDetail,
} from "../controllers/fulfillmentController.js";
import { requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================================================
// ADMIN ENDPOINTS - FULFILLMENT WORKFLOW
// ============================================================================

/**
 * @swagger
 * /api/v1/fulfillment/orders/ready-to-ship:
 *   get:
 *     summary: Get orders ready to ship (admin)
 *     description: Retrieve orders with PAYMENT_CONFIRMED status ready for fulfillment
 *     tags:
 *       - Admin - Fulfillment
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Order status filter (PAYMENT_CONFIRMED, PROCESSING, etc.)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Orders ready to ship with pagination
 */
router.get("/orders/ready-to-ship", requireRole("ADMIN"), getOrdersReadyToShip);

/**
 * @swagger
 * /api/v1/fulfillment/orders/{orderId}/prepare:
 *   post:
 *     summary: Prepare order for shipment (admin)
 *     description: Validate order and prepare for label generation
 *     tags:
 *       - Admin - Fulfillment
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *             required:
 *               - shippingMethod
 *             properties:
 *               shippingMethod:
 *                 type: string
 *                 enum: [STANDARD, EXPRESS, OVERNIGHT]
 *     responses:
 *       200:
 *         description: Order prepared for shipment
 *       400:
 *         description: Order cannot be prepared
 *       404:
 *         description: Order not found
 */
router.post(
  "/orders/:orderId/prepare",
  requireRole("ADMIN"),
  prepareOrderForShipment,
);

/**
 * @swagger
 * /api/v1/fulfillment/labels/generate:
 *   post:
 *     summary: Generate shipping labels for orders (admin)
 *     description: Batch generate shipping labels for multiple orders
 *     tags:
 *       - Admin - Fulfillment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderIds
 *             properties:
 *               orderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Labels generated with success/failure breakdown
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
 *                     success:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     shipments:
 *                       type: array
 *                     errors:
 *                       type: array
 */
router.post("/labels/generate", requireRole("ADMIN"), generateLabelsForOrders);

/**
 * @swagger
 * /api/v1/fulfillment/shipments/{shipmentId}:
 *   get:
 *     summary: Get shipment detail (admin)
 *     description: Retrieve complete shipment information with items and tracking
 *     tags:
 *       - Admin - Fulfillment
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Shipment details with order and tracking info
 *       404:
 *         description: Shipment not found
 */
router.get("/shipments/:shipmentId", requireRole("ADMIN"), getShipmentDetail);

/**
 * @swagger
 * /api/v1/fulfillment/shipments/{shipmentId}/approve:
 *   post:
 *     summary: Approve shipment (admin)
 *     description: Approve label and move shipment to READY_TO_SHIP status
 *     tags:
 *       - Admin - Fulfillment
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Shipment approved
 *       400:
 *         description: Shipment cannot be approved
 *       404:
 *         description: Shipment not found
 */
router.post(
  "/shipments/:shipmentId/approve",
  requireRole("ADMIN"),
  approveShipment,
);

/**
 * @swagger
 * /api/v1/fulfillment/shipments/{shipmentId}/reject:
 *   post:
 *     summary: Reject shipment (admin)
 *     description: Reject label and reset shipment to PENDING_LABEL status
 *     tags:
 *       - Admin - Fulfillment
 *     parameters:
 *       - in: path
 *         name: shipmentId
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
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Label dimensions incorrect
 *     responses:
 *       200:
 *         description: Shipment rejected
 *       404:
 *         description: Shipment not found
 */
router.post(
  "/shipments/:shipmentId/reject",
  requireRole("ADMIN"),
  rejectShipment,
);

/**
 * @swagger
 * /api/v1/fulfillment/shipments/batch/approve:
 *   post:
 *     summary: Batch approve shipments (admin)
 *     description: Approve multiple shipments at once
 *     tags:
 *       - Admin - Fulfillment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentIds
 *             properties:
 *               shipmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Batch approval completed with breakdown
 */
router.post(
  "/shipments/batch/approve",
  requireRole("ADMIN"),
  batchApproveShipments,
);

/**
 * @swagger
 * /api/v1/fulfillment/shipments/{shipmentId}/pack:
 *   post:
 *     summary: Mark shipment as packed (admin)
 *     description: Record packing details and move to PACKED status
 *     tags:
 *       - Admin - Fulfillment
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageDetails:
 *                 type: object
 *     responses:
 *       200:
 *         description: Shipment marked as packed
 *       404:
 *         description: Shipment not found
 */
router.post("/shipments/:shipmentId/pack", requireRole("ADMIN"), markAsPacked);

/**
 * @swagger
 * /api/v1/fulfillment/shipments/{shipmentId}/ship:
 *   post:
 *     summary: Mark shipment as shipped (admin)
 *     description: Finalize shipment and update order status to SHIPPED
 *     tags:
 *       - Admin - Fulfillment
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Shipment marked as shipped
 *       404:
 *         description: Shipment not found
 */
router.post("/shipments/:shipmentId/ship", requireRole("ADMIN"), markAsShipped);

/**
 * @swagger
 * /api/v1/fulfillment/shipments/batch/ship:
 *   post:
 *     summary: Batch mark shipments as shipped (admin)
 *     description: Mark multiple shipments as shipped at once
 *     tags:
 *       - Admin - Fulfillment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentIds
 *             properties:
 *               shipmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Batch shipping completed with breakdown
 */
router.post("/shipments/batch/ship", requireRole("ADMIN"), batchMarkAsShipped);

// ============================================================================
// ADMIN ENDPOINTS - ANALYTICS & REPORTING
// ============================================================================

/**
 * @swagger
 * /api/v1/fulfillment/stats:
 *   get:
 *     summary: Get fulfillment statistics (admin)
 *     description: Retrieve fulfillment metrics and status breakdown
 *     tags:
 *       - Admin - Fulfillment
 *     responses:
 *       200:
 *         description: Fulfillment statistics
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
 *                     statusBreakdown:
 *                       type: object
 *                     averageShippingCost:
 *                       type: number
 *                     totalShipped:
 *                       type: integer
 *                     pendingShipments:
 *                       type: integer
 */
router.get("/stats", requireRole("ADMIN"), getFulfillmentStats);

/**
 * @swagger
 * /api/v1/fulfillment/shipments:
 *   get:
 *     summary: Get shipments by status (admin)
 *     description: Retrieve paginated list of shipments filtered by status
 *     tags:
 *       - Admin - Fulfillment
 *     parameters:
 *       - in: query
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [PENDING_LABEL, LABEL_GENERATED, READY_TO_SHIP, PACKED, SHIPPED, IN_TRANSIT, DELIVERED, LOST, RETURNED]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Shipments with pagination
 *       400:
 *         description: Status parameter required
 */
router.get("/shipments", requireRole("ADMIN"), getShipmentsByStatus);

export default router;
