import submissionService from "../services/submissionService.js";
import logger from "../../config/logger.js";

/**
 * POST /api/v1/submissions/:sellerId
 * Create a new submission with items
 */
export const createSubmission = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "items must be an array",
          status: 400,
        },
      });
    }

    const submission = await submissionService.createSubmission(
      sellerId,
      items,
    );

    res.status(201).json({
      success: true,
      data: submission,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/submissions/:sellerId
 * Get submission details with all items
 */
export const getSubmission = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    const submission = await submissionService.getSubmission(sellerId);

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
 * PUT /api/v1/submissions/:sellerId/items/:itemId
 * Update quote for a specific submission item
 */
export const updateItemQuote = async (req, res, next) => {
  try {
    const { sellerId, itemId } = req.params;
    const { counterOfferPrice } = req.body;

    const item = await submissionService.updateItemQuote(sellerId, itemId, {
      counterOfferPrice,
    });

    res.json({
      success: true,
      data: item,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/submissions/:sellerId/items/:itemId/review
 * Accept or reject a submission item
 */
export const reviewSubmissionItem = async (req, res, next) => {
  try {
    const { sellerId, itemId } = req.params;
    const { action } = req.body;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "action must be accept or reject",
          status: 400,
        },
      });
    }

    const submission = await submissionService.reviewSubmissionItem(
      sellerId,
      itemId,
      action,
    );

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
 * GET /api/v1/submissions/:sellerId/history
 * Get submission audit trail and state change history
 */
export const getSubmissionHistory = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    const history = await submissionService.getSubmissionHistory(sellerId);

    res.json({
      success: true,
      data: history,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};
