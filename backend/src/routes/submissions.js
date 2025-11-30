import express from 'express';
import {
  createSubmission,
  getSubmission,
  updateItemQuote,
  reviewSubmissionItem,
  getSubmissionHistory,
} from '../controllers/submissionController.js';

const router = express.Router();

// ============================================================================
// SUBMISSION ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/submissions/{sellerId}:
 *   post:
 *     summary: Create new submission with items
 *     description: Add vinyl records to sell with automatic quote generation
 *     tags:
 *       - Submissions
 *     parameters:
 *       - in: path
 *         name: sellerId
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
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - releaseId
 *                     - conditionMedia
 *                     - conditionSleeve
 *                   properties:
 *                     releaseId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       default: 1
 *                     conditionMedia:
 *                       type: string
 *                       enum: [MINT, NM, VG_PLUS, VG, VG_MINUS, G, FAIR, POOR]
 *                     conditionSleeve:
 *                       type: string
 *                       enum: [MINT, NM, VG_PLUS, VG, VG_MINUS, G, FAIR, POOR]
 *     responses:
 *       201:
 *         description: Submission created with automatic quotes
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Seller or release not found
 *   get:
 *     summary: Get submission details
 *     description: Retrieve submission items and quotes
 *     tags:
 *       - Submissions
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Submission details with items
 *       404:
 *         description: Submission not found
 */
router.post('/:sellerId', createSubmission);
router.get('/:sellerId', getSubmission);

/**
 * @swagger
 * /api/v1/submissions/{sellerId}/items/{itemId}:
 *   put:
 *     summary: Update quote for submission item
 *     description: Counter-offer or adjust price for a specific item
 *     tags:
 *       - Submissions
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
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
 *               - counterOfferPrice
 *             properties:
 *               counterOfferPrice:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Quote updated successfully
 *       404:
 *         description: Item not found
 */
router.put('/:sellerId/items/:itemId', updateItemQuote);

/**
 * @swagger
 * /api/v1/submissions/{sellerId}/items/{itemId}/review:
 *   post:
 *     summary: Accept or reject submission item
 *     description: Review and approve/reject a specific submission item
 *     tags:
 *       - Submissions
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
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
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *     responses:
 *       200:
 *         description: Item reviewed successfully
 *       400:
 *         description: Invalid action
 *       404:
 *         description: Item not found
 */
router.post('/:sellerId/items/:itemId/review', reviewSubmissionItem);

/**
 * @swagger
 * /api/v1/submissions/{sellerId}/history:
 *   get:
 *     summary: Get submission audit trail and state change history
 *     description: Retrieve complete history of submission state changes and audit trail
 *     tags:
 *       - Submissions
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Submission history with audit trail
 *       404:
 *         description: Submission not found
 */
router.get('/:sellerId/history', getSubmissionHistory);

export default router;
