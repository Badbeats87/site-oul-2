import adminSubmissionService from "../services/adminSubmissionService.js";
import logger from "../../config/logger.js";

/**
 * GET /api/v1/admin/submissions
 * Get paginated list of submissions for admin review
 */
export const getSubmissionQueue = async (req, res, next) => {
  try {
    const { status, limit, page, sortBy, sortOrder } = req.query;

    const result = await adminSubmissionService.getSubmissionQueue({
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      page: page ? parseInt(page, 10) : 1,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
    });

    res.json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/submissions/:submissionId
 * Get detailed submission info with items and audit trail
 */
export const getSubmissionDetail = async (req, res, next) => {
  try {
    const { submissionId } = req.params;

    const submission =
      await adminSubmissionService.getSubmissionDetail(submissionId);

    res.json({
      success: true,
      data: submission,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/submissions/:submissionId/accept
 * Accept an entire submission
 */
export const acceptSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { notes } = req.body;

    const result = await adminSubmissionService.acceptSubmission(
      submissionId,
      notes,
      req.user?.id,
    );

    res.json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/submissions/:submissionId/reject
 * Reject an entire submission
 */
export const rejectSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { reason, notes } = req.body;

    const result = await adminSubmissionService.rejectSubmission(
      submissionId,
      reason,
      notes,
      req.user?.id,
    );

    res.json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/submissions/:submissionId/counter-offer
 * Create or update counter-offer for submission items
 */
export const createCounterOffer = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: "items must be a non-empty array",
          status: 400,
        },
      });
    }

    const result = await adminSubmissionService.createCounterOffer(
      submissionId,
      items,
      notes,
      req.user?.id,
    );

    res.json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/submissions/:submissionId/items/:itemId/accept
 * Accept a specific submission item
 */
export const acceptSubmissionItem = async (req, res, next) => {
  try {
    const { submissionId, itemId } = req.params;
    const { notes } = req.body;

    const result = await adminSubmissionService.acceptSubmissionItem(
      submissionId,
      itemId,
      notes,
      req.user?.id,
    );

    res.json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/submissions/:submissionId/items/:itemId/reject
 * Reject a specific submission item
 */
export const rejectSubmissionItem = async (req, res, next) => {
  try {
    const { submissionId, itemId } = req.params;
    const { reason, notes } = req.body;

    const result = await adminSubmissionService.rejectSubmissionItem(
      submissionId,
      itemId,
      reason,
      notes,
      req.user?.id,
    );

    res.json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/submissions/:submissionId/items/:itemId/counter-offer
 * Update counter-offer price for specific item
 */
export const updateItemCounterOffer = async (req, res, next) => {
  try {
    const { submissionId, itemId } = req.params;
    const { counterOfferPrice, notes } = req.body;

    if (counterOfferPrice === undefined || counterOfferPrice < 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: "counterOfferPrice must be a non-negative number",
          status: 400,
        },
      });
    }

    const result = await adminSubmissionService.updateItemCounterOffer(
      submissionId,
      itemId,
      counterOfferPrice,
      notes,
      req.user?.id,
    );

    res.json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/submissions/:submissionId/notes
 * Add or update admin notes on a submission
 */
export const updateSubmissionNotes = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { notes } = req.body;

    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: "notes cannot be empty",
          status: 400,
        },
      });
    }

    const result = await adminSubmissionService.updateSubmissionNotes(
      submissionId,
      notes,
      req.user?.id,
    );

    res.json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/submissions/:submissionId/audit
 * Get full audit trail for a submission
 */
export const getSubmissionAudit = async (req, res, next) => {
  try {
    const { submissionId } = req.params;

    const audit = await adminSubmissionService.getSubmissionAudit(submissionId);

    res.json({
      success: true,
      data: audit,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};
