import express from 'express';
import {
  calculateShippingRates,
  getZoneForAddress,
  listShippingZones,
  getShippingZone,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
  listShippingRates,
  getShippingRate,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
} from '../controllers/shippingController.js';
import { requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================================================
// BUYER ENDPOINTS - PUBLIC
// ============================================================================

/**
 * @swagger
 * /api/v1/shipping/calculate-rates:
 *   post:
 *     summary: Calculate shipping rates for destination
 *     description: Calculate available shipping rates for an order based on destination and items
 *     tags:
 *       - Shipping
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - destinationAddress
 *             properties:
 *               originAddress:
 *                 type: object
 *                 description: Warehouse/origin address (optional)
 *               destinationAddress:
 *                 type: object
 *                 required:
 *                   - state
 *                 properties:
 *                   state:
 *                     type: string
 *                     example: CA
 *                   city:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     inventoryLotId:
 *                       type: string
 *                       format: uuid
 *               shippingMethod:
 *                 type: string
 *                 enum: [STANDARD, EXPRESS, OVERNIGHT]
 *     responses:
 *       200:
 *         description: Available shipping rates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method:
 *                         type: string
 *                       carrier:
 *                         type: string
 *                       cost:
 *                         type: number
 *                       deliveryDays:
 *                         type: string
 *       400:
 *         description: Invalid destination or missing required fields
 *       404:
 *         description: No shipping zone found for destination
 */
router.post('/calculate-rates', calculateShippingRates);

/**
 * @swagger
 * /api/v1/shipping/zones/lookup:
 *   get:
 *     summary: Look up shipping zone for destination
 *     description: Get shipping zone information for a destination state
 *     tags:
 *       - Shipping
 *     parameters:
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *           example: CA
 *     responses:
 *       200:
 *         description: Shipping zone details
 *       400:
 *         description: State parameter required
 *       404:
 *         description: No shipping zone found for state
 */
router.get('/zones/lookup', getZoneForAddress);

// ============================================================================
// ADMIN ENDPOINTS - ZONES
// ============================================================================

/**
 * @swagger
 * /api/v1/shipping/zones:
 *   get:
 *     summary: List all shipping zones (admin)
 *     description: Get paginated list of all shipping zones with optional filtering
 *     tags:
 *       - Admin - Shipping
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *     responses:
 *       200:
 *         description: List of shipping zones with pagination
 */
router.get('/zones', requireRole('ADMIN'), listShippingZones);

/**
 * @swagger
 * /api/v1/shipping/zones:
 *   post:
 *     summary: Create shipping zone (admin)
 *     description: Create a new shipping zone with states and priority
 *     tags:
 *       - Admin - Shipping
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - statesIncluded
 *             properties:
 *               name:
 *                 type: string
 *                 example: Zone 1 - West Coast
 *               statesIncluded:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [CA, OR, WA]
 *               priority:
 *                 type: integer
 *                 default: 0
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Zone created
 */
router.post('/zones', requireRole('ADMIN'), createShippingZone);

/**
 * @swagger
 * /api/v1/shipping/zones/{zoneId}:
 *   get:
 *     summary: Get shipping zone details (admin)
 *     description: Get detailed information about a specific shipping zone
 *     tags:
 *       - Admin - Shipping
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Zone details with rates
 *       404:
 *         description: Zone not found
 */
router.get('/zones/:zoneId', requireRole('ADMIN'), getShippingZone);

/**
 * @swagger
 * /api/v1/shipping/zones/{zoneId}:
 *   put:
 *     summary: Update shipping zone (admin)
 *     description: Update zone information and states
 *     tags:
 *       - Admin - Shipping
 *     parameters:
 *       - in: path
 *         name: zoneId
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
 *               name:
 *                 type: string
 *               statesIncluded:
 *                 type: array
 *                 items:
 *                   type: string
 *               priority:
 *                 type: integer
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Zone updated
 *       404:
 *         description: Zone not found
 */
router.put('/zones/:zoneId', requireRole('ADMIN'), updateShippingZone);

/**
 * @swagger
 * /api/v1/shipping/zones/{zoneId}:
 *   delete:
 *     summary: Delete shipping zone (admin)
 *     description: Delete a shipping zone (must have no rates)
 *     tags:
 *       - Admin - Shipping
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Zone deleted
 *       400:
 *         description: Zone has active rates
 *       404:
 *         description: Zone not found
 */
router.delete('/zones/:zoneId', requireRole('ADMIN'), deleteShippingZone);

// ============================================================================
// ADMIN ENDPOINTS - RATES
// ============================================================================

/**
 * @swagger
 * /api/v1/shipping/rates:
 *   get:
 *     summary: List shipping rates (admin)
 *     description: Get paginated list of shipping rates with optional filtering
 *     tags:
 *       - Admin - Shipping
 *     parameters:
 *       - in: query
 *         name: zoneId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: shippingMethod
 *         schema:
 *           type: string
 *           enum: [STANDARD, EXPRESS, OVERNIGHT]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
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
 *     responses:
 *       200:
 *         description: List of shipping rates with pagination
 */
router.get('/rates', requireRole('ADMIN'), listShippingRates);

/**
 * @swagger
 * /api/v1/shipping/rates:
 *   post:
 *     summary: Create shipping rate (admin)
 *     description: Create a new shipping rate for a zone and method
 *     tags:
 *       - Admin - Shipping
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - zoneId
 *               - shippingMethod
 *               - carrier
 *               - baseRate
 *               - perOzRate
 *               - minWeightOz
 *               - maxWeightOz
 *             properties:
 *               zoneId:
 *                 type: string
 *                 format: uuid
 *               shippingMethod:
 *                 type: string
 *                 enum: [STANDARD, EXPRESS, OVERNIGHT]
 *               carrier:
 *                 type: string
 *                 enum: [MOCK, USPS, UPS, FEDEX, DHL]
 *               baseRate:
 *                 type: number
 *                 example: 5.99
 *               perOzRate:
 *                 type: number
 *                 example: 0.25
 *               minWeightOz:
 *                 type: integer
 *                 example: 1
 *               maxWeightOz:
 *                 type: integer
 *                 example: 32
 *               minDays:
 *                 type: integer
 *               maxDays:
 *                 type: integer
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Rate created
 *       400:
 *         description: Invalid parameters
 */
router.post('/rates', requireRole('ADMIN'), createShippingRate);

/**
 * @swagger
 * /api/v1/shipping/rates/{rateId}:
 *   get:
 *     summary: Get shipping rate details (admin)
 *     description: Get detailed information about a specific shipping rate
 *     tags:
 *       - Admin - Shipping
 *     parameters:
 *       - in: path
 *         name: rateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Rate details
 *       404:
 *         description: Rate not found
 */
router.get('/rates/:rateId', requireRole('ADMIN'), getShippingRate);

/**
 * @swagger
 * /api/v1/shipping/rates/{rateId}:
 *   put:
 *     summary: Update shipping rate (admin)
 *     description: Update rate pricing and configuration
 *     tags:
 *       - Admin - Shipping
 *     parameters:
 *       - in: path
 *         name: rateId
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
 *               baseRate:
 *                 type: number
 *               perOzRate:
 *                 type: number
 *               minWeightOz:
 *                 type: integer
 *               maxWeightOz:
 *                 type: integer
 *               minDays:
 *                 type: integer
 *               maxDays:
 *                 type: integer
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Rate updated
 *       404:
 *         description: Rate not found
 */
router.put('/rates/:rateId', requireRole('ADMIN'), updateShippingRate);

/**
 * @swagger
 * /api/v1/shipping/rates/{rateId}:
 *   delete:
 *     summary: Delete shipping rate (admin)
 *     description: Delete a shipping rate
 *     tags:
 *       - Admin - Shipping
 *     parameters:
 *       - in: path
 *         name: rateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Rate deleted
 *       404:
 *         description: Rate not found
 */
router.delete('/rates/:rateId', requireRole('ADMIN'), deleteShippingRate);

export default router;
