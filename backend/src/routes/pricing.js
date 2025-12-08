import express from 'express';
import {
  getPricingPolicy,
  savePricingPolicy,
  getPricingPolicyHistory,
  rollbackPricingPolicy,
} from '../controllers/pricingPolicyController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';
import pricingService from '../services/pricingService.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/pricing/{type}:
 *   get:
 *     summary: Get active pricing policy
 *     description: Retrieve the current active pricing policy for BUYER or SELLER
 *     tags:
 *       - Admin - Pricing Policies
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [BUYER, SELLER]
 *         description: Policy type
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pricing policy retrieved
 *       404:
 *         description: No active policy found
 */
router.get('/:type', authenticate, getPricingPolicy);

/**
 * @swagger
 * /api/v1/admin/pricing/{type}:
 *   post:
 *     summary: Save or update pricing policy
 *     description: Create a new version of the pricing policy (previous version is deactivated)
 *     tags:
 *       - Admin - Pricing Policies
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [BUYER, SELLER]
 *         description: Policy type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - buyFormula
 *               - sellFormula
 *               - conditionCurve
 *             properties:
 *               name:
 *                 type: string
 *                 description: Policy name (e.g., "Buyer Pricing v1")
 *               buyFormula:
 *                 type: object
 *                 description: Buy formula configuration
 *                 properties:
 *                   buyPercentage:
 *                     type: number
 *                   mediaWeight:
 *                     type: number
 *                   sleeveWeight:
 *                     type: number
 *                   priceStatistic:
 *                     type: string
 *                     enum: [LOW, MEDIAN, HIGH]
 *               sellFormula:
 *                 type: object
 *                 description: Sell formula configuration
 *                 properties:
 *                   sellPercentage:
 *                     type: number
 *                   mediaWeight:
 *                     type: number
 *                   sleeveWeight:
 *                     type: number
 *                   priceStatistic:
 *                     type: string
 *               conditionCurve:
 *                 type: object
 *                 description: Condition grade multipliers
 *                 properties:
 *                   MINT:
 *                     type: number
 *                   NM:
 *                     type: number
 *                   VG_PLUS:
 *                     type: number
 *               minOffer:
 *                 type: number
 *               maxOffer:
 *                 type: number
 *               offerExpiryDays:
 *                 type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Pricing policy saved
 *       400:
 *         description: Invalid input
 */
router.post('/:type', authenticate, requireRole('ADMIN'), savePricingPolicy);

/**
 * @swagger
 * /api/v1/admin/pricing/{type}/history:
 *   get:
 *     summary: Get pricing policy version history
 *     description: Retrieve all versions of a pricing policy
 *     tags:
 *       - Admin - Pricing Policies
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [BUYER, SELLER]
 *         description: Policy type
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Policy history retrieved
 */
router.get('/:type/history', authenticate, getPricingPolicyHistory);

/**
 * @swagger
 * /api/v1/admin/pricing/{type}/rollback:
 *   post:
 *     summary: Rollback to previous policy version
 *     description: Create a new policy version based on a previous version
 *     tags:
 *       - Admin - Pricing Policies
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [BUYER, SELLER]
 *         description: Policy type
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - version
 *             properties:
 *               version:
 *                 type: integer
 *                 description: Target version to rollback to
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Policy rolled back
 */
router.post(
  '/:type/rollback',
  authenticate,
  requireRole('ADMIN'),
  rollbackPricingPolicy
);

/**
 * @swagger
 * /api/v1/admin/pricing/cache/clear:
 *   post:
 *     summary: Clear pricing policy cache
 *     description: Immediately clear the cached pricing policies to force reload from database
 *     tags:
 *       - Admin - Pricing Policies
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post(
  '/cache/clear',
  authenticate,
  requireRole('ADMIN'),
  (req, res) => {
    try {
      if (pricingService.clearPolicyCache) {
        pricingService.clearPolicyCache();
        res.json({
          success: true,
          message: 'Pricing policy cache cleared successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Cache clear not available',
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;
