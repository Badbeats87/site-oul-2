import express from 'express';
import {
  getSubmissionQueue,
  getSubmissionDetail,
  acceptSubmission,
  rejectSubmission,
  createCounterOffer,
  acceptSubmissionItem,
  rejectSubmissionItem,
  updateItemCounterOffer,
  updateSubmissionNotes,
  getSubmissionAudit,
} from '../controllers/adminSubmissionController.js';

const router = express.Router();

// ============================================================================
// SUBMISSION QUEUE & MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/submissions:
 *   get:
 *     summary: Get submission queue for admin review
 *     description: Retrieve paginated list of submissions for admin review with optional filtering
 *     tags:
 *       - Admin - Submissions
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_REVIEW, COUNTER_OFFERED, ACCEPTED, PARTIALLY_ACCEPTED, REJECTED, EXPIRED, COMPLETED]
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, totalOffered, updatedAt]
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
 *         description: Paginated submission queue
 */
router.get('/', getSubmissionQueue);

/**
 * @swagger
 * /api/v1/admin/submissions/{submissionId}:
 *   get:
 *     summary: Get submission details for review
 *     description: Retrieve complete submission details including items, pricing, and recent audit entries
 *     tags:
 *       - Admin - Submissions
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Submission details
 *       404:
 *         description: Submission not found
 */
router.get('/:submissionId', getSubmissionDetail);

/**
 * @swagger
 * /api/v1/admin/submissions/{submissionId}/audit:
 *   get:
 *     summary: Get full audit trail for submission
 *     description: Retrieve complete audit history of all state changes and admin actions
 *     tags:
 *       - Admin - Submissions
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Submission with full audit trail
 *       404:
 *         description: Submission not found
 */
router.get('/:submissionId/audit', getSubmissionAudit);

/**
 * @swagger
 * /api/v1/admin/submissions/{submissionId}/notes:
 *   put:
 *     summary: Update admin notes on submission
 *     description: Add or update admin notes with timestamp
 *     tags:
 *       - Admin - Submissions
 *     parameters:
 *       - in: path
 *         name: submissionId
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
 *               - notes
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Admin notes to add
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Submission notes updated
 *       404:
 *         description: Submission not found
 */
router.put('/:submissionId/notes', updateSubmissionNotes);

// ============================================================================
// BULK SUBMISSION ACTIONS
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/submissions/{submissionId}/accept:
 *   post:
 *     summary: Accept entire submission
 *     description: Accept all items in a submission in bulk
 *     tags:
 *       - Admin - Submissions
 *     parameters:
 *       - in: path
 *         name: submissionId
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
 *               notes:
 *                 type: string
 *                 description: Admin notes for acceptance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Submission accepted
 *       404:
 *         description: Submission not found
 */
router.post('/:submissionId/accept', acceptSubmission);

/**
 * @swagger
 * /api/v1/admin/submissions/{submissionId}/reject:
 *   post:
 *     summary: Reject entire submission
 *     description: Reject all items in a submission in bulk
 *     tags:
 *       - Admin - Submissions
 *     parameters:
 *       - in: path
 *         name: submissionId
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
 *                 description: Rejection reason
 *               notes:
 *                 type: string
 *                 description: Additional admin notes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Submission rejected
 *       404:
 *         description: Submission not found
 */
router.post('/:submissionId/reject', rejectSubmission);

/**
 * @swagger
 * /api/v1/admin/submissions/{submissionId}/counter-offer:
 *   post:
 *     summary: Create counter-offers for multiple items
 *     description: Bulk create or update counter-offers for submission items
 *     tags:
 *       - Admin - Submissions
 *     parameters:
 *       - in: path
 *         name: submissionId
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
 *                     - itemId
 *                     - counterOfferPrice
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       format: uuid
 *                     counterOfferPrice:
 *                       type: number
 *                       minimum: 0
 *               notes:
 *                 type: string
 *                 description: Admin notes for counter-offers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counter-offers created
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Submission or item not found
 */
router.post('/:submissionId/counter-offer', createCounterOffer);

// ============================================================================
// INDIVIDUAL ITEM ACTIONS
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/submissions/{submissionId}/items/{itemId}/accept:
 *   post:
 *     summary: Accept specific submission item
 *     description: Accept an individual submission item
 *     tags:
 *       - Admin - Submissions
 *     parameters:
 *       - in: path
 *         name: submissionId
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Item accepted
 *       404:
 *         description: Item not found
 */
router.post('/:submissionId/items/:itemId/accept', acceptSubmissionItem);

/**
 * @swagger
 * /api/v1/admin/submissions/{submissionId}/items/{itemId}/reject:
 *   post:
 *     summary: Reject specific submission item
 *     description: Reject an individual submission item
 *     tags:
 *       - Admin - Submissions
 *     parameters:
 *       - in: path
 *         name: submissionId
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Item rejected
 *       404:
 *         description: Item not found
 */
router.post('/:submissionId/items/:itemId/reject', rejectSubmissionItem);

/**
 * @swagger
 * /api/v1/admin/submissions/{submissionId}/items/{itemId}/counter-offer:
 *   put:
 *     summary: Update counter-offer for item
 *     description: Adjust counter-offer price for a specific item
 *     tags:
 *       - Admin - Submissions
 *     parameters:
 *       - in: path
 *         name: submissionId
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
 *               notes:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counter-offer updated
 *       400:
 *         description: Invalid price
 *       404:
 *         description: Item not found
 */
router.put('/:submissionId/items/:itemId/counter-offer', updateItemCounterOffer);

export default router;
