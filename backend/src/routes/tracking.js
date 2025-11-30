import express from 'express';
import {
  getTrackingByNumber,
  getShipmentTrackingEvents,
  getTrackingBatch,
} from '../controllers/trackingController.js';
import {
  receiveCarrierWebhook,
  webhookHealth,
  simulateCarrierWebhook,
} from '../controllers/webhookController.js';

const router = express.Router();

// ============================================================================
// PUBLIC TRACKING ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/tracking/{trackingNumber}:
 *   get:
 *     summary: Get tracking information
 *     description: Retrieve shipment tracking information by tracking number (public)
 *     tags:
 *       - Tracking
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *           example: MOCK123456789012
 *     responses:
 *       200:
 *         description: Tracking information with current status and events
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
 *                     shipment:
 *                       type: object
 *                     trackingEvents:
 *                       type: array
 *                     order:
 *                       type: object
 *       404:
 *         description: Shipment not found
 */
router.get('/:trackingNumber', getTrackingByNumber);

/**
 * @swagger
 * /api/v1/tracking/shipment/{shipmentId}/events:
 *   get:
 *     summary: Get tracking events for shipment
 *     description: Retrieve tracking history and events for a specific shipment
 *     tags:
 *       - Tracking
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Shipment tracking details with event history
 *       404:
 *         description: Shipment not found
 */
router.get('/shipment/:shipmentId/events', getShipmentTrackingEvents);

/**
 * @swagger
 * /api/v1/tracking/batch:
 *   post:
 *     summary: Get tracking for multiple shipments
 *     description: Retrieve tracking information for up to 50 shipments in one request
 *     tags:
 *       - Tracking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackingNumbers
 *             properties:
 *               trackingNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 50
 *                 example:
 *                   - MOCK123456789012
 *                   - MOCK123456789013
 *     responses:
 *       200:
 *         description: Batch tracking results
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
 *                     errors:
 *                       type: array
 *                     summary:
 *                       type: object
 */
router.post('/batch', getTrackingBatch);

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/webhooks/shipping/health:
 *   get:
 *     summary: Webhook health check
 *     description: Check if webhook endpoint is ready to receive events
 *     tags:
 *       - Webhooks
 *     responses:
 *       200:
 *         description: Webhook endpoint is operational
 */
router.get('/webhooks/shipping/health', webhookHealth);

/**
 * @swagger
 * /api/v1/webhooks/shipping/carrier-events:
 *   post:
 *     summary: Receive carrier webhook events
 *     description: Receive shipping updates from carrier providers (Shippo, EasyPost, etc.)
 *     tags:
 *       - Webhooks
 *     parameters:
 *       - in: header
 *         name: x-carrier-signature
 *         schema:
 *           type: string
 *         description: Optional carrier webhook signature for validation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: tracking_update
 *               tracking_number:
 *                 type: string
 *                 example: MOCK123456789012
 *               status:
 *                 type: string
 *                 enum: [LABEL_GENERATED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, LOST, RETURNED]
 *               status_detail:
 *                 type: string
 *               location:
 *                 type: string
 *               message:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 */
router.post('/webhooks/shipping/carrier-events', receiveCarrierWebhook);

/**
 * @swagger
 * /api/v1/webhooks/shipping/simulate:
 *   post:
 *     summary: Simulate carrier webhook (testing)
 *     description: Send mock carrier webhook for testing and development
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackingNumber
 *               - status
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 example: MOCK123456789012
 *               status:
 *                 type: string
 *                 enum: [LABEL_GENERATED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, LOST, RETURNED]
 *               details:
 *                 type: object
 *                 properties:
 *                   statusDetail:
 *                     type: string
 *                   location:
 *                     type: string
 *                   message:
 *                     type: string
 *     responses:
 *       200:
 *         description: Mock webhook simulated successfully
 */
router.post('/webhooks/shipping/simulate', simulateCarrierWebhook);

export default router;
