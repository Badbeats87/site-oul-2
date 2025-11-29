import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';

class SellerService {
  /**
   * Register a new seller
   * Creates a seller contact record and returns seller ID for future submissions
   * @param {Object} data - Seller data
   * @param {string} data.email - Seller email (required)
   * @param {string} data.name - Seller name (optional)
   * @param {string} data.phone - Seller phone (optional)
   * @param {string} data.notes - Seller notes/instructions (optional)
   * @returns {Promise<Object>} Created seller submission record
   */
  async registerSeller(data) {
    try {
      const { email, name, phone, notes } = data;

      if (!email || email.trim().length === 0) {
        throw new ApiError('Email is required', 400);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ApiError('Invalid email format', 400);
      }

      // Create seller submission with 30-day expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const seller = await prisma.sellerSubmission.create({
        data: {
          sellerContact: email,
          sellerName: name || null,
          sellerNotes: notes || null,
          channel: 'direct',
          status: 'PENDING_REVIEW',
          expiresAt,
        },
      });

      logger.info('Seller registered', {
        sellerId: seller.id,
        email: seller.sellerContact,
        name: seller.sellerName,
      });

      return {
        id: seller.id,
        email: seller.sellerContact,
        name: seller.sellerName,
        status: seller.status,
        expiresAt: seller.expiresAt,
        createdAt: seller.createdAt,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error registering seller', { error: error.message });
      throw new ApiError('Failed to register seller', 500);
    }
  }

  /**
   * Get seller info by ID
   * @param {string} sellerId - Seller submission ID
   * @returns {Promise<Object>} Seller information
   */
  async getSellerById(sellerId) {
    try {
      const seller = await prisma.sellerSubmission.findUnique({
        where: { id: sellerId },
        include: {
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

      if (!seller) {
        throw new ApiError('Seller not found', 404);
      }

      // Check if submission expired
      if (new Date() > seller.expiresAt && seller.status === 'PENDING_REVIEW') {
        await prisma.sellerSubmission.update({
          where: { id: sellerId },
          data: { status: 'EXPIRED' },
        });
        throw new ApiError('Submission has expired', 410);
      }

      return seller;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting seller', { sellerId, error: error.message });
      throw new ApiError('Failed to get seller information', 500);
    }
  }

  /**
   * Update seller information
   * @param {string} sellerId - Seller submission ID
   * @param {Object} data - Updated seller data
   * @returns {Promise<Object>} Updated seller information
   */
  async updateSeller(sellerId, data) {
    try {
      const { name, notes } = data;

      const seller = await prisma.sellerSubmission.findUnique({
        where: { id: sellerId },
      });

      if (!seller) {
        throw new ApiError('Seller not found', 404);
      }

      const updated = await prisma.sellerSubmission.update({
        where: { id: sellerId },
        data: {
          sellerName: name !== undefined ? name : seller.sellerName,
          sellerNotes: notes !== undefined ? notes : seller.sellerNotes,
        },
      });

      logger.info('Seller updated', { sellerId });
      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating seller', { sellerId, error: error.message });
      throw new ApiError('Failed to update seller information', 500);
    }
  }

  /**
   * List all sellers with optional filtering
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by status
   * @param {number} filters.limit - Results per page
   * @param {number} filters.page - Page number
   * @returns {Promise<Object>} Paginated list of sellers
   */
  async listSellers(filters = {}) {
    try {
      const {
        status,
        limit = 50,
        page = 1,
      } = filters;

      if (limit > 500) {
        throw new ApiError('Limit cannot exceed 500', 400);
      }

      const where = {};
      if (status) {
        where.status = status;
      }

      const skip = (page - 1) * limit;

      const [sellers, total] = await Promise.all([
        prisma.sellerSubmission.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.sellerSubmission.count({ where }),
      ]);

      return {
        sellers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error listing sellers', { error: error.message });
      throw new ApiError('Failed to list sellers', 500);
    }
  }

  /**
   * Get seller quote (calculated offers for submission items)
   * @param {string} sellerId - Seller submission ID
   * @returns {Promise<Object>} Quote summary with item offers
   */
  async getSellerQuote(sellerId) {
    try {
      const seller = await this.getSellerById(sellerId);

      if (!seller.items || seller.items.length === 0) {
        return {
          sellerId,
          items: [],
          totalOffered: 0,
          totalAccepted: seller.totalAccepted || 0,
          status: seller.status,
          expiresAt: seller.expiresAt,
        };
      }

      return {
        sellerId,
        items: seller.items,
        totalOffered: seller.totalOffered || 0,
        totalAccepted: seller.totalAccepted || 0,
        status: seller.status,
        expiresAt: seller.expiresAt,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting seller quote', { sellerId, error: error.message });
      throw new ApiError('Failed to get seller quote', 500);
    }
  }
}

export default new SellerService();
