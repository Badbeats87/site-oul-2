import express from 'express';
import {
  registerSeller,
  getSellerById,
  updateSeller,
  listSellers,
  getSellerQuote,
} from '../controllers/sellerController.js';
import {
  createSubmission,
  getSubmission,
  updateItemQuote,
  reviewSubmissionItem,
} from '../controllers/submissionController.js';

const router = express.Router();

// ============================================================================
// SELLER ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/sellers/register:
 *   post:
 *     summary: Register a new seller
 *     description: Create a seller submission to sell vinyl records
 *     tags:
 *       - Sellers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Seller registered successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/register', registerSeller);

/**
 * @swagger
 * /api/v1/sellers:
 *   get:
 *     summary: List all sellers (admin only)
 *     description: Get paginated list of all sellers and their submissions
 *     tags:
 *       - Sellers
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_REVIEW, COUNTER_OFFERED, ACCEPTED, REJECTED, EXPIRED, COMPLETED]
 *         description: Filter by submission status
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sellers
 */
router.get('/', listSellers);

/**
 * @swagger
 * /api/v1/sellers/{id}:
 *   get:
 *     summary: Get seller information
 *     description: Retrieve seller details and submission items
 *     tags:
 *       - Sellers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Seller information retrieved
 *       404:
 *         description: Seller not found
 *   put:
 *     summary: Update seller information
 *     description: Update seller name or notes
 *     tags:
 *       - Sellers
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Seller updated successfully
 *       404:
 *         description: Seller not found
 */
router.get('/:id', getSellerById);
router.put('/:id', updateSeller);

/**
 * @swagger
 * /api/v1/sellers/{id}/quote:
 *   get:
 *     summary: Get seller quote summary
 *     description: Retrieve automatic quotes for all submitted items
 *     tags:
 *       - Sellers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Quote summary with item offers
 *       404:
 *         description: Seller not found
 */
router.get('/:id/quote', getSellerQuote);

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

export default router;
