import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import pricingService from './pricingService.js';
import releaseService from './releaseService.js';
import notificationService from './notificationService.js';
import { v4 as isUuid } from 'uuid';

class SubmissionService {
  /**
   * Validate UUID format
   * @param {string} id - ID to validate
   * @returns {boolean}
   */
  isValidUuid(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id
    );
  }
  /**
   * Helper method to track status changes and log to audit trail
   * @param {string} submissionId - Submission ID
   * @param {string} fromStatus - Previous status
   * @param {string} toStatus - New status
   * @param {string} changeReason - Reason for change
   * @param {string} changedBy - User ID who made the change
   */
  async logStatusChange(
    submissionId,
    fromStatus,
    toStatus,
    changeReason,
    changedBy
  ) {
    try {
      // Record audit entry
      await prisma.submissionAudit.create({
        data: {
          submissionId,
          fromStatus,
          toStatus,
          changeReason,
          changedBy,
        },
      });

      // Trigger notification
      await notificationService.notifySubmissionStateChange({
        submissionId,
        fromStatus,
        toStatus,
        changeReason,
      });

      logger.info('Submission status changed', {
        submissionId,
        fromStatus,
        toStatus,
        changeReason,
      });
    } catch (error) {
      logger.error('Error logging status change', {
        submissionId,
        error: error.message,
      });
    }
  }

  /**
   * Create a new submission with items
   * Generates automatic quotes for each item using the pricing engine
   * @param {string} sellerId - Seller submission ID
   * @param {Object[]} items - Array of items to submit
   * @param {string} items[].releaseId - Release ID
   * @param {string} items[].quantity - Quantity (default 1)
   * @param {string} items[].conditionMedia - Media condition
   * @param {string} items[].conditionSleeve - Sleeve condition
   * @returns {Promise<Object>} Created submission with quotes
   */
  async createSubmission(sellerId, items) {
    try {
      if (!items || items.length === 0) {
        throw new ApiError('At least one item is required', 400);
      }

      // Verify seller exists
      const seller = await prisma.sellerSubmission.findUnique({
        where: { id: sellerId },
      });

      if (!seller) {
        throw new ApiError('Seller not found', 404);
      }

      if (seller.status !== 'PENDING_REVIEW') {
        throw new ApiError(
          `Cannot add items to submission with status: ${seller.status}`,
          400
        );
      }

      let totalOffered = 0;
      const createdItems = [];

      // Process each submission item
      for (const item of items) {
        const {
          releaseId,
          quantity = 1,
          conditionMedia,
          conditionSleeve,
        } = item;

        // Validate required fields
        if (!releaseId || !conditionMedia || !conditionSleeve) {
          throw new ApiError(
            'releaseId, conditionMedia, and conditionSleeve are required',
            400
          );
        }

        // Verify release exists
        const release = await releaseService.findById(releaseId);
        if (!release) {
          throw new ApiError(`Release ${releaseId} not found`, 404);
        }

        // Generate automatic quote using pricing engine
        const quote = await pricingService.calculateBuyPrice({
          releaseId: release.id,
          mediaCondition: conditionMedia,
          sleeveCondition: conditionSleeve,
        });

        const autoOfferPrice = Number(quote.finalPrice) * (quantity || 1);
        totalOffered += autoOfferPrice;

        // Create submission item
        const submissionItem = await prisma.submissionItem.create({
          data: {
            submissionId: sellerId,
            releaseId,
            quantity: quantity || 1,
            sellerConditionMedia: conditionMedia,
            sellerConditionSleeve: conditionSleeve,
            autoOfferPrice,
            status: 'PENDING',
          },
          include: {
            release: {
              select: {
                id: true,
                title: true,
                artist: true,
              },
            },
          },
        });

        createdItems.push(submissionItem);
      }

      // Update seller submission totals
      const updatedSeller = await prisma.sellerSubmission.update({
        where: { id: sellerId },
        data: {
          totalOffered,
        },
        include: {
          items: true,
        },
      });

      logger.info('Submission created', {
        sellerId,
        itemCount: createdItems.length,
        totalOffered,
      });

      return {
        sellerId,
        items: createdItems,
        totalOffered,
        status: updatedSeller.status,
        expiresAt: updatedSeller.expiresAt,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating submission', {
        sellerId,
        error: error.message,
      });
      throw new ApiError('Failed to create submission', 500);
    }
  }

  /**
   * Get submission details with all items and quotes
   * @param {string} submissionId - Submission ID (seller submission ID)
   * @returns {Promise<Object>} Submission details with items
   */
  async getSubmission(submissionId) {
    try {
      // Validate UUID format
      if (!this.isValidUuid(submissionId)) {
        throw new ApiError('Invalid submission ID format', 400);
      }

      const submission = await prisma.sellerSubmission.findUnique({
        where: { id: submissionId },
        include: {
          items: {
            include: {
              release: {
                select: {
                  id: true,
                  title: true,
                  artist: true,
                  label: true,
                  releaseYear: true,
                },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new ApiError('Submission not found', 404);
      }

      return submission;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting submission', {
        submissionId,
        error: error.message,
      });
      throw new ApiError('Failed to get submission', 500);
    }
  }

  /**
   * Update quote for a specific submission item
   * Admin can counter-offer or adjust prices
   * @param {string} sellerId - Seller submission ID
   * @param {string} itemId - Submission item ID
   * @param {Object} data - Updated quote data
   * @param {number} data.counterOfferPrice - Counter offer price
   * @returns {Promise<Object>} Updated submission item
   */
  async updateItemQuote(sellerId, itemId, data) {
    try {
      const { counterOfferPrice } = data;

      if (counterOfferPrice === undefined) {
        throw new ApiError('counterOfferPrice is required', 400);
      }

      if (counterOfferPrice < 0) {
        throw new ApiError('Price cannot be negative', 400);
      }

      // Verify item belongs to seller
      const item = await prisma.submissionItem.findFirst({
        where: {
          id: itemId,
          submissionId: sellerId,
        },
      });

      if (!item) {
        throw new ApiError('Submission item not found', 404);
      }

      const updatedItem = await prisma.submissionItem.update({
        where: { id: itemId },
        data: {
          counterOfferPrice,
          status: 'COUNTER_OFFERED',
        },
        include: {
          release: true,
        },
      });

      logger.info('Item quote updated', { itemId, counterOfferPrice });
      return updatedItem;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating item quote', {
        sellerId,
        itemId,
        error: error.message,
      });
      throw new ApiError('Failed to update item quote', 500);
    }
  }

  /**
   * Accept or reject submission items
   * Updates submission status based on items
   * @param {string} sellerId - Seller submission ID
   * @param {string} itemId - Submission item ID
   * @param {string} action - 'accept' or 'reject'
   * @returns {Promise<Object>} Updated submission with new totals
   */
  async reviewSubmissionItem(sellerId, itemId, action) {
    try {
      if (!['accept', 'reject'].includes(action)) {
        throw new ApiError('Action must be accept or reject', 400);
      }

      const item = await prisma.submissionItem.findFirst({
        where: {
          id: itemId,
          submissionId: sellerId,
        },
      });

      if (!item) {
        throw new ApiError('Submission item not found', 404);
      }

      const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
      const finalPrice =
        action === 'accept' ? item.counterOfferPrice || item.autoOfferPrice : 0;

      await prisma.submissionItem.update({
        where: { id: itemId },
        data: {
          status: newStatus,
          finalOfferPrice: finalPrice,
        },
      });

      // Calculate new submission totals
      const submission = await prisma.sellerSubmission.findUnique({
        where: { id: sellerId },
        include: {
          items: true,
        },
      });

      const acceptedItems = submission.items.filter(
        (i) =>
          i.status === 'ACCEPTED' || (i.id === itemId && action === 'accept')
      );
      const totalAccepted = acceptedItems.reduce(
        (sum, i) => sum + Number(i.finalOfferPrice || i.autoOfferPrice),
        0
      );

      // Determine overall submission status
      let submissionStatus = submission.status;
      const allItemsReviewed = submission.items.every(
        (i) => ['ACCEPTED', 'REJECTED'].includes(i.status) || i.id === itemId
      );

      if (allItemsReviewed) {
        if (acceptedItems.length === submission.items.length) {
          submissionStatus = 'ACCEPTED';
        } else if (acceptedItems.length === 0) {
          submissionStatus = 'REJECTED';
        } else {
          submissionStatus = 'PARTIALLY_ACCEPTED';
        }
      }

      const updated = await prisma.sellerSubmission.update({
        where: { id: sellerId },
        data: {
          totalAccepted,
          status: submissionStatus,
          reviewedAt: allItemsReviewed ? new Date() : submission.reviewedAt,
        },
        include: {
          items: true,
        },
      });

      // Log status change if submission status changed
      if (submissionStatus !== submission.status) {
        await this.logStatusChange(
          sellerId,
          submission.status,
          submissionStatus,
          `Item ${itemId} ${action}`,
          null
        );
      }

      logger.info('Submission item reviewed', { itemId, action, newStatus });
      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error reviewing submission item', {
        sellerId,
        itemId,
        error: error.message,
      });
      throw new ApiError('Failed to review submission item', 500);
    }
  }

  /**
   * Get submission history and audit trail
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Object>} Submission with audit history
   */
  async getSubmissionHistory(submissionId) {
    try {
      const submission = await prisma.sellerSubmission.findUnique({
        where: { id: submissionId },
        include: {
          audits: {
            orderBy: {
              changedAt: 'desc',
            },
          },
          items: {
            include: {
              release: {
                select: {
                  id: true,
                  title: true,
                  artist: true,
                },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new ApiError('Submission not found', 404);
      }

      return submission;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting submission history', {
        submissionId,
        error: error.message,
      });
      throw new ApiError('Failed to get submission history', 500);
    }
  }
}

export default new SubmissionService();
