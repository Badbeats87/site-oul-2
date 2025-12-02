import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import submissionService from './submissionService.js';
import inventoryService from './inventoryService.js';

class AdminSubmissionService {
  /**
   * Get paginated submission queue for admin review with advanced filtering
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by submission status (PENDING_REVIEW, ACCEPTED, etc.)
   * @param {string} filters.sellerSearch - Search by seller email or name (partial match)
   * @param {string} filters.startDate - Filter submissions created on/after this date (ISO string)
   * @param {string} filters.endDate - Filter submissions created on/before this date (ISO string)
   * @param {string|string[]} filters.conditionGrades - Filter by vinyl condition grades (MINT, NM, VG_PLUS, etc.)
   * @param {number} filters.minValue - Filter submissions with totalOffered >= this value
   * @param {number} filters.maxValue - Filter submissions with totalOffered <= this value
   * @param {number} filters.limit - Results per page (max 500)
   * @param {number} filters.page - Page number
   * @param {string} filters.sortBy - Sort field (createdAt, totalOffered, totalAccepted, updatedAt)
   * @param {string} filters.sortOrder - Sort direction (asc, desc)
   * @returns {Promise<Object>} Paginated submissions with filter stats
   */
  async getSubmissionQueue(filters = {}) {
    try {
      const {
        status,
        sellerSearch,
        startDate,
        endDate,
        conditionGrades,
        minValue,
        maxValue,
        limit = 50,
        page = 1,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      if (limit > 500) {
        throw new ApiError('Limit cannot exceed 500', 400);
      }

      // Validate sort field to prevent injection
      const validSortFields = [
        'createdAt',
        'totalOffered',
        'totalAccepted',
        'updatedAt',
      ];
      const finalSortBy = validSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';
      const finalSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

      // Build WHERE clause dynamically
      const where = {};

      // Status filter
      if (status) {
        where.status = status;
      }

      // Seller search (email or name - case insensitive)
      if (sellerSearch) {
        where.OR = [
          { sellerContact: { contains: sellerSearch, mode: 'insensitive' } },
          { sellerName: { contains: sellerSearch, mode: 'insensitive' } },
        ];
      }

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // Include entire end day
          where.createdAt.lte = end;
        }
      }

      // Value range filter
      if (minValue !== undefined || maxValue !== undefined) {
        where.totalOffered = {};
        if (minValue !== undefined) {
          where.totalOffered.gte = minValue;
        }
        if (maxValue !== undefined) {
          where.totalOffered.lte = maxValue;
        }
      }

      // Condition grade filter - requires items relationship filter
      let itemsFilter = {
        select: {
          id: true,
          status: true,
          autoOfferPrice: true,
          counterOfferPrice: true,
          sellerConditionMedia: true,
          sellerConditionSleeve: true,
        },
      };

      if (conditionGrades) {
        const grades = Array.isArray(conditionGrades)
          ? conditionGrades
          : [conditionGrades];
        itemsFilter.where = {
          OR: [
            { sellerConditionMedia: { in: grades } },
            { sellerConditionSleeve: { in: grades } },
          ],
        };
      }

      const skip = (page - 1) * limit;
      const orderBy = {};
      orderBy[finalSortBy] = finalSortOrder;

      // Execute parallel queries
      const [submissions, total] = await Promise.all([
        prisma.sellerSubmission.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: { items: itemsFilter },
        }),
        prisma.sellerSubmission.count({ where }),
      ]);

      return {
        submissions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        appliedFilters: {
          status: status || null,
          sellerSearch: sellerSearch || null,
          dateRange: startDate || endDate ? { startDate, endDate } : null,
          valueRange:
            minValue !== undefined || maxValue !== undefined
              ? { minValue, maxValue }
              : null,
          conditions: conditionGrades || null,
          sortBy: finalSortBy,
          sortOrder: finalSortOrder,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting submission queue', { error: error.message });
      throw new ApiError('Failed to get submission queue', 500);
    }
  }

  /**
   * Get detailed submission with all related data
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Object>} Complete submission details
   */
  async getSubmissionDetail(submissionId) {
    try {
      const submission = await prisma.sellerSubmission.findUnique({
        where: { id: submissionId },
        include: {
          items: {
            select: {
              id: true,
              status: true,
              quantity: true,
              autoOfferPrice: true,
              counterOfferPrice: true,
              finalOfferPrice: true,
              sellerConditionMedia: true,
              sellerConditionSleeve: true,
              release: {
                select: {
                  id: true,
                  title: true,
                  artist: true,
                  label: true,
                  releaseYear: true,
                  coverArtUrl: true,
                },
              },
            },
          },
          audits: {
            orderBy: { changedAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!submission) {
        throw new ApiError('Submission not found', 404);
      }

      return submission;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting submission detail', {
        submissionId,
        error: error.message,
      });
      throw new ApiError('Failed to get submission detail', 500);
    }
  }

  /**
   * Accept entire submission
   * @param {string} submissionId - Submission ID
   * @param {string} notes - Admin notes
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated submission
   */
  async acceptSubmission(submissionId, notes, adminId) {
    try {
      const submission = await prisma.sellerSubmission.findUnique({
        where: { id: submissionId },
        include: { items: true },
      });

      if (!submission) {
        throw new ApiError('Submission not found', 404);
      }

      // Accept all items
      const itemIds = submission.items.map((i) => i.id);
      for (const itemId of itemIds) {
        await submissionService.reviewSubmissionItem(
          submissionId,
          itemId,
          'accept'
        );
      }

      // Update with admin notes
      if (notes) {
        await prisma.sellerSubmission.update({
          where: { id: submissionId },
          data: {
            sellerNotes:
              (submission.sellerNotes || '') +
              `\n[Admin: ${new Date().toISOString()}] ${notes}`,
          },
        });
      }

      // Log audit
      await submissionService.logStatusChange(
        submissionId,
        submission.status,
        'ACCEPTED',
        'Bulk acceptance by admin',
        adminId
      );

      // Create inventory records for accepted items
      let inventoryResult = null;
      try {
        inventoryResult =
          await inventoryService.createFromSubmission(submissionId);
        logger.info('Inventory created from accepted submission', {
          submissionId,
          inventoryCount: inventoryResult.itemCount,
          totalValue: inventoryResult.totalInventoryValue,
        });
      } catch (error) {
        logger.error('Warning: Failed to create inventory from submission', {
          submissionId,
          error: error.message,
        });
        // Don't fail the acceptance if inventory creation fails - seller was already accepted
      }

      return this.getSubmissionDetail(submissionId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error accepting submission', {
        submissionId,
        error: error.message,
      });
      throw new ApiError('Failed to accept submission', 500);
    }
  }

  /**
   * Reject entire submission
   * @param {string} submissionId - Submission ID
   * @param {string} reason - Rejection reason
   * @param {string} notes - Admin notes
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated submission
   */
  async rejectSubmission(submissionId, reason, notes, adminId) {
    try {
      const submission = await prisma.sellerSubmission.findUnique({
        where: { id: submissionId },
        include: { items: true },
      });

      if (!submission) {
        throw new ApiError('Submission not found', 404);
      }

      // Reject all items
      const itemIds = submission.items.map((i) => i.id);
      for (const itemId of itemIds) {
        await submissionService.reviewSubmissionItem(
          submissionId,
          itemId,
          'reject'
        );
      }

      // Update with rejection notes
      const fullNotes = `[REJECTED: ${reason || 'No reason provided'}] ${notes || ''}`;
      await prisma.sellerSubmission.update({
        where: { id: submissionId },
        data: {
          sellerNotes:
            (submission.sellerNotes || '') +
            `\n[Admin: ${new Date().toISOString()}] ${fullNotes}`,
        },
      });

      // Log audit
      await submissionService.logStatusChange(
        submissionId,
        submission.status,
        'REJECTED',
        `Bulk rejection by admin: ${reason || 'No reason'}`,
        adminId
      );

      return this.getSubmissionDetail(submissionId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error rejecting submission', {
        submissionId,
        error: error.message,
      });
      throw new ApiError('Failed to reject submission', 500);
    }
  }

  /**
   * Create counter-offers for multiple items
   * @param {string} submissionId - Submission ID
   * @param {Array} items - Array of {itemId, counterOfferPrice}
   * @param {string} notes - Admin notes
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated submission
   */
  async createCounterOffer(submissionId, items, notes, adminId) {
    try {
      const submission = await prisma.sellerSubmission.findUnique({
        where: { id: submissionId },
        include: { items: true },
      });

      if (!submission) {
        throw new ApiError('Submission not found', 404);
      }

      // Validate all items exist in submission
      const submissionItemIds = new Set(submission.items.map((i) => i.id));
      for (const item of items) {
        if (!submissionItemIds.has(item.itemId)) {
          throw new ApiError(
            `Item ${item.itemId} not found in submission`,
            404
          );
        }
        if (item.counterOfferPrice < 0) {
          throw new ApiError('Counter-offer price cannot be negative', 400);
        }
      }

      // Update all items with counter-offers
      let totalCounterOffered = 0;
      for (const item of items) {
        const updated = await submissionService.updateItemQuote(
          submissionId,
          item.itemId,
          { counterOfferPrice: item.counterOfferPrice }
        );
        totalCounterOffered += Number(item.counterOfferPrice);
      }

      // Update submission status to COUNTER_OFFERED
      await prisma.sellerSubmission.update({
        where: { id: submissionId },
        data: { status: 'COUNTER_OFFERED' },
      });

      // Add admin notes
      if (notes) {
        await prisma.sellerSubmission.update({
          where: { id: submissionId },
          data: {
            sellerNotes:
              (submission.sellerNotes || '') +
              `\n[Admin: ${new Date().toISOString()}] Counter-offer: ${notes}`,
          },
        });
      }

      // Log audit
      await submissionService.logStatusChange(
        submissionId,
        submission.status,
        'COUNTER_OFFERED',
        `Counter-offers created for ${items.length} items`,
        adminId
      );

      logger.info('Counter-offers created', {
        submissionId,
        itemCount: items.length,
        totalCounterOffered,
      });

      return this.getSubmissionDetail(submissionId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating counter-offer', {
        submissionId,
        error: error.message,
      });
      throw new ApiError('Failed to create counter-offer', 500);
    }
  }

  /**
   * Accept individual submission item
   * @param {string} submissionId - Submission ID
   * @param {string} itemId - Item ID
   * @param {string} notes - Admin notes
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated submission
   */
  async acceptSubmissionItem(submissionId, itemId, notes, adminId) {
    try {
      const result = await submissionService.reviewSubmissionItem(
        submissionId,
        itemId,
        'accept'
      );

      if (notes) {
        await prisma.sellerSubmission.update({
          where: { id: submissionId },
          data: {
            sellerNotes:
              (result.sellerNotes || '') +
              `\n[Admin: ${new Date().toISOString()}] Item accepted: ${notes}`,
          },
        });
      }

      let inventoryLot = null;
      try {
        inventoryLot = await inventoryService.createFromSubmissionItem(itemId);
        logger.info('Inventory created for accepted item', {
          submissionId,
          itemId,
          inventoryLotId: inventoryLot.id,
        });
      } catch (error) {
        logger.error('Warning: Failed to create inventory for accepted item', {
          submissionId,
          itemId,
          error: error.message,
        });
        // Do not block acceptance if inventory creation fails.
      }

      logger.info('Item accepted', {
        submissionId,
        itemId,
        inventoryLotId: inventoryLot?.id || null,
      });
      return this.getSubmissionDetail(submissionId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error accepting item', {
        submissionId,
        itemId,
        error: error.message,
      });
      throw new ApiError('Failed to accept item', 500);
    }
  }

  /**
   * Reject individual submission item
   * @param {string} submissionId - Submission ID
   * @param {string} itemId - Item ID
   * @param {string} reason - Rejection reason
   * @param {string} notes - Admin notes
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated submission
   */
  async rejectSubmissionItem(submissionId, itemId, reason, notes, adminId) {
    try {
      const result = await submissionService.reviewSubmissionItem(
        submissionId,
        itemId,
        'reject'
      );

      const fullNotes = `Item rejected: ${reason || 'No reason'} - ${notes || ''}`;
      await prisma.sellerSubmission.update({
        where: { id: submissionId },
        data: {
          sellerNotes:
            (result.sellerNotes || '') +
            `\n[Admin: ${new Date().toISOString()}] ${fullNotes}`,
        },
      });

      logger.info('Item rejected', { submissionId, itemId, reason });
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error rejecting item', {
        submissionId,
        itemId,
        error: error.message,
      });
      throw new ApiError('Failed to reject item', 500);
    }
  }

  /**
   * Update counter-offer for specific item
   * @param {string} submissionId - Submission ID
   * @param {string} itemId - Item ID
   * @param {number} counterOfferPrice - New counter-offer price
   * @param {string} notes - Admin notes
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated submission
   */
  async updateItemCounterOffer(
    submissionId,
    itemId,
    counterOfferPrice,
    notes,
    adminId
  ) {
    try {
      const result = await submissionService.updateItemQuote(
        submissionId,
        itemId,
        {
          counterOfferPrice,
        }
      );

      if (notes) {
        const submission = await prisma.sellerSubmission.findUnique({
          where: { id: submissionId },
        });

        await prisma.sellerSubmission.update({
          where: { id: submissionId },
          data: {
            sellerNotes:
              (submission.sellerNotes || '') +
              `\n[Admin: ${new Date().toISOString()}] Counter-offer updated to $${counterOfferPrice}: ${notes}`,
          },
        });
      }

      logger.info('Counter-offer updated', {
        submissionId,
        itemId,
        counterOfferPrice,
      });
      return await this.getSubmissionDetail(submissionId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating counter-offer', {
        submissionId,
        itemId,
        error: error.message,
      });
      throw new ApiError('Failed to update counter-offer', 500);
    }
  }

  /**
   * Update admin notes on submission
   * @param {string} submissionId - Submission ID
   * @param {string} notes - Admin notes
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated submission
   */
  async updateSubmissionNotes(submissionId, notes, adminId) {
    try {
      const submission = await prisma.sellerSubmission.findUnique({
        where: { id: submissionId },
      });

      if (!submission) {
        throw new ApiError('Submission not found', 404);
      }

      const timestamp = new Date().toISOString();
      const fullNotes = `${submission.sellerNotes || ''}\n[Admin: ${timestamp}] ${notes}`;

      const updated = await prisma.sellerSubmission.update({
        where: { id: submissionId },
        data: { sellerNotes: fullNotes },
      });

      logger.info('Submission notes updated', { submissionId, adminId });
      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating notes', {
        submissionId,
        error: error.message,
      });
      throw new ApiError('Failed to update submission notes', 500);
    }
  }

  /**
   * Get full audit trail for submission
   * @param {string} submissionId - Submission ID
   * @returns {Promise<Object>} Submission with complete audit history
   */
  async getSubmissionAudit(submissionId) {
    try {
      const submission = await prisma.sellerSubmission.findUnique({
        where: { id: submissionId },
        include: {
          audits: {
            orderBy: { changedAt: 'desc' },
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
      logger.error('Error getting audit trail', {
        submissionId,
        error: error.message,
      });
      throw new ApiError('Failed to get audit trail', 500);
    }
  }
}

export default new AdminSubmissionService();
