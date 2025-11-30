/**
 * Inventory Reservation Routes
 * REST API routes for inventory holds and reservations
 */

import express from 'express';
import * as reservationController from '../controllers/reservationController.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/inventory/reserves:
 *   post:
 *     summary: Create an inventory hold/reservation
 *     tags: [Inventory Reservations]
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
 *                 description: ID of inventory lot to hold
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 description: Order ID (required if sessionId not provided)
 *               sessionId:
 *                 type: string
 *                 description: Session ID for guest carts (required if orderId not provided)
 *               quantity:
 *                 type: integer
 *                 default: 1
 *                 description: Quantity to hold
 *               durationMinutes:
 *                 type: integer
 *                 default: 30
 *                 description: How long to hold the item (minutes)
 *     responses:
 *       201:
 *         description: Hold created successfully
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     inventoryLotId:
 *                       type: string
 *                     holdStatus:
 *                       type: string
 *                       enum: [ACTIVE, RELEASED, EXPIRED, CONVERTED_TO_SALE]
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request parameters
 *       409:
 *         description: Item already reserved or unavailable
 */
router.post('/', reservationController.createReservation);

/**
 * @swagger
 * /api/v1/inventory/reserves/{holdId}:
 *   delete:
 *     summary: Release an inventory hold
 *     tags: [Inventory Reservations]
 *     parameters:
 *       - in: path
 *         name: holdId
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
 *                 description: Reason for releasing the hold
 *     responses:
 *       200:
 *         description: Hold released successfully
 */
router.delete('/:holdId', reservationController.releaseReservation);

/**
 * @swagger
 * /api/v1/inventory/reserves/{inventoryLotId}/check:
 *   get:
 *     summary: Check if inventory lot has active holds
 *     tags: [Inventory Reservations]
 *     parameters:
 *       - in: path
 *         name: inventoryLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Hold status retrieved
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
 *                     inventoryLotId:
 *                       type: string
 *                     isReserved:
 *                       type: boolean
 *                     activeHolds:
 *                       type: integer
 */
router.get('/:inventoryLotId/check', reservationController.checkReservation);

/**
 * @swagger
 * /api/v1/inventory/reserves/order/{orderId}:
 *   get:
 *     summary: Get all holds for an order
 *     tags: [Inventory Reservations]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order holds retrieved
 */
router.get('/order/:orderId', reservationController.getOrderReservations);

/**
 * @swagger
 * /api/v1/inventory/reserves/session/{sessionId}:
 *   get:
 *     summary: Get all holds for a guest session
 *     tags: [Inventory Reservations]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session holds retrieved
 */
router.get('/session/:sessionId', reservationController.getSessionReservations);

/**
 * @swagger
 * /api/v1/inventory/holds/{holdId}/history:
 *   get:
 *     summary: Get audit history for a hold
 *     tags: [Inventory Reservations]
 *     parameters:
 *       - in: path
 *         name: holdId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Hold history retrieved
 */
router.get(
  '/holds/:holdId/history',
  reservationController.getReservationHistory
);

/**
 * @swagger
 * /api/v1/inventory/reserves/stats:
 *   get:
 *     summary: Get hold statistics (admin only)
 *     tags: [Inventory Reservations]
 *     responses:
 *       200:
 *         description: Hold statistics retrieved
 */
router.get('/stats', reservationController.getReservationStats);

/**
 * @swagger
 * /api/v1/inventory/reserves/{holdId}/convert:
 *   post:
 *     summary: Convert hold to completed sale (admin only)
 *     tags: [Inventory Reservations]
 *     parameters:
 *       - in: path
 *         name: holdId
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
 *     responses:
 *       200:
 *         description: Hold converted to sale
 */
router.post('/:holdId/convert', reservationController.convertReservationToSale);

export default router;
