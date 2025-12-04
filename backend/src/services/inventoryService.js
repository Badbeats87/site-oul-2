import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import pricingService from './pricingService.js';
import notificationService from './notificationService.js';

/**
 * Inventory Service
 * Provides inventory statistics and condition breakdowns for releases
 */
class InventoryService {
  /**
   * Get inventory statistics for a single release
   * Calculates: available count, price range, condition distribution
   * @param {string} releaseId - Release UUID
   * @returns {Promise<Object>} Inventory stats
   */
  async getInventoryStats(releaseId) {
    try {
      const inventoryLots = await prisma.inventoryLot.findMany({
        where: {
          releaseId,
          status: 'LIVE',
        },
      });

      if (inventoryLots.length === 0) {
        return {
          availableCount: 0,
          lowestPrice: null,
          highestPrice: null,
          averagePrice: null,
          conditionBreakdown: {},
          isAvailable: false,
        };
      }

      // Calculate statistics
      const prices = inventoryLots.map((lot) => Number(lot.listPrice));
      const lowestPrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);
      const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      // Build condition breakdown
      const conditionBreakdown = {};
      inventoryLots.forEach((lot) => {
        const condition = lot.conditionMedia;
        conditionBreakdown[condition] =
          (conditionBreakdown[condition] || 0) + 1;
      });

      return {
        availableCount: inventoryLots.length,
        lowestPrice: parseFloat(lowestPrice.toFixed(2)),
        highestPrice: parseFloat(highestPrice.toFixed(2)),
        averagePrice: parseFloat(averagePrice.toFixed(2)),
        conditionBreakdown,
        isAvailable: inventoryLots.length > 0,
      };
    } catch (error) {
      logger.error('Error getting inventory stats', {
        releaseId,
        error: error.message,
      });
      throw new ApiError('Failed to get inventory stats', 500);
    }
  }

  /**
   * Batch load inventory stats for multiple releases
   * Optimized for performance with batch operations
   * @param {string[]} releaseIds - Array of Release UUIDs
   * @returns {Promise<Map<string, Object>>} Map of releaseId -> inventory stats
   */
  async getInventoryForReleases(releaseIds) {
    try {
      if (!releaseIds || releaseIds.length === 0) {
        return new Map();
      }

      // Fetch all inventory lots for these releases in one query
      const inventoryLots = await prisma.inventoryLot.findMany({
        where: {
          releaseId: { in: releaseIds },
          status: 'LIVE',
        },
        select: {
          releaseId: true,
          listPrice: true,
          conditionMedia: true,
        },
      });

      // Build map of releaseId -> inventory stats
      const statsMap = new Map();

      // Initialize all releases with empty stats
      releaseIds.forEach((id) => {
        statsMap.set(id, {
          availableCount: 0,
          lowestPrice: null,
          highestPrice: null,
          averagePrice: null,
          conditionBreakdown: {},
          isAvailable: false,
        });
      });

      // Group by releaseId and calculate stats
      const groupedByRelease = {};
      inventoryLots.forEach((lot) => {
        if (!groupedByRelease[lot.releaseId]) {
          groupedByRelease[lot.releaseId] = [];
        }
        groupedByRelease[lot.releaseId].push(lot);
      });

      // Calculate stats for each release
      Object.entries(groupedByRelease).forEach(([releaseId, lots]) => {
        const prices = lots.map((lot) => Number(lot.listPrice));
        const lowestPrice = Math.min(...prices);
        const highestPrice = Math.max(...prices);
        const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        const conditionBreakdown = {};
        lots.forEach((lot) => {
          const condition = lot.conditionMedia;
          conditionBreakdown[condition] =
            (conditionBreakdown[condition] || 0) + 1;
        });

        statsMap.set(releaseId, {
          availableCount: lots.length,
          lowestPrice: parseFloat(lowestPrice.toFixed(2)),
          highestPrice: parseFloat(highestPrice.toFixed(2)),
          averagePrice: parseFloat(averagePrice.toFixed(2)),
          conditionBreakdown,
          isAvailable: true,
        });
      });

      return statsMap;
    } catch (error) {
      logger.error('Error batch loading inventory', {
        count: releaseIds?.length,
        error: error.message,
      });
      throw new ApiError('Failed to load inventory', 500);
    }
  }

  /**
   * Get condition distribution for a release
   * Used for filtering by condition
   * @param {string} releaseId - Release UUID
   * @returns {Promise<Object>} Condition distribution
   */
  async getConditionDistribution(releaseId) {
    try {
      const distribution = await prisma.inventoryLot.groupBy({
        by: ['conditionMedia'],
        where: {
          releaseId,
          status: 'LIVE',
        },
        _count: true,
      });

      const result = {};
      distribution.forEach((item) => {
        result[item.conditionMedia] = item._count;
      });

      return result;
    } catch (error) {
      logger.error('Error getting condition distribution', {
        releaseId,
        error: error.message,
      });
      throw new ApiError('Failed to get condition distribution', 500);
    }
  }

  /**
   * Check if a release is a new arrival
   * New arrivals are releases that were listed in the last 30 days
   * @param {Date} createdAt - Release creation timestamp
   * @returns {boolean} True if release is within new arrival window
   */
  isNewArrival(createdAt) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdAt >= thirtyDaysAgo;
  }

  /**
   * Filter releases by inventory status
   * @param {string} status - Inventory status filter (LIVE, SOLD, AVAILABLE, etc.)
   * @param {number} limit - Max number of results
   * @returns {Promise<Object[]>} Filtered releases with inventory data
   */
  async getInventoryByStatus(status, limit = 50) {
    try {
      const validStatuses = ['LIVE', 'RESERVED', 'SOLD', 'DRAFT', 'REMOVED'];
      if (!validStatuses.includes(status)) {
        throw new ApiError(`Invalid status: ${status}`, 400);
      }

      const inventoryLots = await prisma.inventoryLot.findMany({
        where: { status },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          release: true,
        },
      });

      return inventoryLots.map((lot) => ({
        id: lot.id,
        releaseId: lot.releaseId,
        release: lot.release,
        status: lot.status,
        listPrice: parseFloat(lot.listPrice),
        costBasis: parseFloat(lot.costBasis),
        condition: {
          media: lot.conditionMedia,
          sleeve: lot.conditionSleeve,
        },
        createdAt: lot.createdAt,
        listedAt: lot.listedAt,
        soldAt: lot.soldAt,
      }));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting inventory by status', {
        status,
        error: error.message,
      });
      throw new ApiError('Failed to get inventory', 500);
    }
  }

  /**
   * Get price statistics across all inventory for a condition range
   * Useful for market analysis
   * @param {Object} filters - Filter criteria (condition, genre, priceMin, priceMax)
   * @returns {Promise<Object>} Price statistics
   */
  async getPriceStatistics(filters = {}) {
    try {
      const where = {
        status: 'LIVE',
      };

      if (filters.condition) {
        where.conditionMedia = filters.condition;
      }

      if (filters.genre) {
        where.release = { genre: filters.genre };
      }

      const lots = await prisma.inventoryLot.findMany({
        where,
        select: { listPrice: true },
      });

      if (lots.length === 0) {
        return {
          count: 0,
          low: null,
          median: null,
          high: null,
          average: null,
          stdDev: null,
        };
      }

      const prices = lots
        .map((lot) => Number(lot.listPrice))
        .sort((a, b) => a - b);
      const count = prices.length;
      const average = prices.reduce((a, b) => a + b, 0) / count;
      const median =
        count % 2 === 0
          ? (prices[count / 2 - 1] + prices[count / 2]) / 2
          : prices[Math.floor(count / 2)];

      // Calculate standard deviation
      const variance =
        prices.reduce((acc, price) => acc + Math.pow(price - average, 2), 0) /
        count;
      const stdDev = Math.sqrt(variance);

      return {
        count,
        low: parseFloat(prices[0].toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        high: parseFloat(prices[prices.length - 1].toFixed(2)),
        average: parseFloat(average.toFixed(2)),
        stdDev: parseFloat(stdDev.toFixed(2)),
      };
    } catch (error) {
      logger.error('Error calculating price statistics', {
        filters,
        error: error.message,
      });
      throw new ApiError('Failed to calculate price statistics', 500);
    }
  }

  /**
   * Create inventory record from accepted submission item
   * @param {string} submissionItemId - Submission item ID
   * @param {Object} options - Creation options
   * @param {string} options.channel - Sales channel (optional)
   * @returns {Promise<Object>} Created inventory lot
   */
  async createFromSubmissionItem(submissionItemId, options = {}) {
    try {
      const { channel = 'direct' } = options;

      // Get submission item with release and submission info
      const item = await prisma.submissionItem.findUnique({
        where: { id: submissionItemId },
        include: {
          release: true,
          submission: true,
        },
      });

      if (!item) {
        throw new ApiError('Submission item not found', 404);
      }

      if (item.status !== 'ACCEPTED') {
        throw new ApiError(
          `Cannot create inventory for item with status: ${item.status}`,
          400
        );
      }

      // Check if inventory already exists for this submission item
      const existingInventory = await prisma.inventoryLot.findFirst({
        where: {
          submissionItemId: item.id,
          status: { not: 'REMOVED' }, // Don't count removed items
        },
      });

      if (existingInventory) {
        logger.warn('Inventory already exists for submission item', {
          submissionItemId: item.id,
          existingLotId: existingInventory.id,
        });
        // Return existing inventory instead of creating duplicate
        return await this.getInventoryDetail(existingInventory.id);
      }

      // Use final offer price as cost basis (what we paid per buyer policy)
      const costBasis = Number(
        item.finalOfferPrice ||
          item.counterOfferPrice ||
          item.autoOfferPrice ||
          0
      );

      const sellPriceResult = await this.calculateSellPrice({
        releaseId: item.releaseId,
        conditionMedia: item.sellerConditionMedia,
        conditionSleeve: item.sellerConditionSleeve,
        costBasis,
      });

      // Create inventory lot
      const inventoryLot = await prisma.inventoryLot.create({
        data: {
          releaseId: item.releaseId,
          submissionItemId: item.id,
          conditionMedia: item.sellerConditionMedia,
          conditionSleeve: item.sellerConditionSleeve,
          costBasis,
          listPrice: sellPriceResult.price,
          channel,
          status: 'DRAFT',
          internalNotes: `Auto-created from submission by seller: ${item.submission.sellerContact}`,
        },
        include: {
          release: true,
        },
      });

      // Update submission item status to CONVERTED_TO_INVENTORY
      await prisma.submissionItem.update({
        where: { id: submissionItemId },
        data: {
          status: 'CONVERTED_TO_INVENTORY',
        },
      });

      logger.info('Inventory created from submission item', {
        inventoryLotId: inventoryLot.id,
        submissionItemId,
        releaseId: item.releaseId,
        costBasis: Number(costBasis),
        listPrice: Number(sellPriceResult.price),
      });

      return inventoryLot;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating inventory from submission', {
        submissionItemId,
        error: error.message,
      });
      throw new ApiError('Failed to create inventory record', 500);
    }
  }

  /**
   * Create inventory records for entire submission
   * @param {string} submissionId - Submission ID
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Result with created inventory records
   */
  async createFromSubmission(submissionId, options = {}) {
    try {
      const { channel = 'direct' } = options;

      // Get submission with all accepted items
      const submission = await prisma.sellerSubmission.findUnique({
        where: { id: submissionId },
        include: {
          items: {
            where: { status: 'ACCEPTED' },
            include: { release: true },
          },
        },
      });

      if (!submission) {
        throw new ApiError('Submission not found', 404);
      }

      if (submission.items.length === 0) {
        throw new ApiError('No accepted items in submission', 400);
      }

      const createdInventory = [];
      let totalInventoryValue = 0;

      // Create inventory for each accepted item
      for (const item of submission.items) {
        try {
          const lot = await this.createFromSubmissionItem(item.id, { channel });
          createdInventory.push(lot);
          totalInventoryValue += Number(lot.listPrice);
        } catch (error) {
          logger.error('Failed to create inventory for item', {
            itemId: item.id,
            error: error.message,
          });
          // Continue with next item instead of failing entire operation
        }
      }

      // Send seller notification
      await notificationService.notifyInventoryCreated({
        submissionId,
        sellerEmail: submission.sellerContact,
        itemCount: createdInventory.length,
        totalInventoryValue,
      });

      logger.info('Inventory created from submission', {
        submissionId,
        itemCount: createdInventory.length,
        totalValue: totalInventoryValue,
      });

      return {
        submissionId,
        inventoryLots: createdInventory,
        itemCount: createdInventory.length,
        totalInventoryValue,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating inventory from submission', {
        submissionId,
        error: error.message,
      });
      throw new ApiError('Failed to create inventory from submission', 500);
    }
  }

  /**
   * Calculate sell price for inventory item
   * @param {Object} release - Release object with pricing info
   * @param {string} conditionMedia - Media condition
   * @param {string} conditionSleeve - Sleeve condition
   * @returns {Promise<number>} Calculated sell price
   */
  async calculateSellPrice({
    releaseId,
    conditionMedia,
    conditionSleeve,
    costBasis,
  }) {
    try {
      if (!releaseId) {
        throw new ApiError(
          'Release ID is required for sell price calculation',
          400
        );
      }
      if (costBasis === undefined || costBasis === null) {
        throw new ApiError(
          'Cost basis is required to calculate sell price',
          400
        );
      }

      // Get active release-specific policy if available
      const policyLink = await prisma.releasePricingPolicy.findFirst({
        where: {
          releaseId,
          isActive: true,
        },
        include: { policy: true },
        orderBy: { priority: 'asc' },
      });

      let formula = policyLink?.policy?.sellFormula || null;

      if (!formula) {
        const sellerFormula = await pricingService.getSellerFormula();
        if (!sellerFormula) {
          throw new ApiError('No active seller pricing policy configured', 400);
        }
        formula = sellerFormula;
      }

      const sellPrice = await pricingService.calculateSellPrice({
        releaseId,
        mediaCondition: conditionMedia,
        sleeveCondition: conditionSleeve,
        costBasis: Number(costBasis),
        formula,
      });

      return {
        price: sellPrice.price,
        marginPercent: sellPrice.marginPercent,
        policyId: policyLink?.policyId || formula.policyId || null,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error calculating sell price', {
        releaseId,
        error: error.message,
      });
      throw new ApiError('Failed to calculate sell price', 500);
    }
  }

  /**
   * List inventory with advanced filtering and analytics
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by status (LIVE, RESERVED, SOLD, DRAFT, REMOVED)
   * @param {string|string[]} filters.conditions - Filter by condition grades
   * @param {string} filters.genre - Filter by release genre
   * @param {number} filters.minPrice - Minimum list price
   * @param {number} filters.maxPrice - Maximum list price
   * @param {string} filters.search - Search by album name, artist, or barcode
   * @param {number} filters.limit - Results per page
   * @param {number} filters.page - Page number
   * @param {string} filters.sortBy - Sort field (createdAt, listPrice, soldAt, listedAt)
   * @param {string} filters.sortOrder - Sort direction (asc, desc)
   * @returns {Promise<Object>} Paginated inventory with stats
   */
  async listInventory(filters = {}) {
    try {
      const {
        status,
        excludeStatus,
        conditions,
        genre,
        minPrice,
        maxPrice,
        search,
        limit = 50,
        page = 1,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      if (limit > 500) {
        throw new ApiError('Limit cannot exceed 500', 400);
      }

      const validSortFields = ['createdAt', 'listPrice', 'soldAt', 'listedAt'];
      const finalSortBy = validSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';
      const finalSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

      const where = {};
      if (status) {
        where.status = status;
      }
      if (excludeStatus) {
        where.status = { not: excludeStatus };
      }

      // Condition filtering
      if (conditions) {
        const grades = Array.isArray(conditions) ? conditions : [conditions];
        where.OR = [
          { conditionMedia: { in: grades } },
          { conditionSleeve: { in: grades } },
        ];
      }

      // Price range filtering
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.listPrice = {};
        if (minPrice !== undefined) {
          where.listPrice.gte = minPrice;
        }
        if (maxPrice !== undefined) {
          where.listPrice.lte = maxPrice;
        }
      }

      // Genre filtering via release relation
      if (genre) {
        where.release = { genre };
      }

      // Search by album, artist, or barcode
      if (search) {
        where.OR = where.OR || [];
        where.OR.push(
          { release: { title: { contains: search, mode: 'insensitive' } } },
          { release: { artist: { contains: search, mode: 'insensitive' } } },
          { release: { barcode: { contains: search, mode: 'insensitive' } } },
          { sku: { contains: search, mode: 'insensitive' } }
        );
      }

      const skip = (page - 1) * limit;
      const orderBy = {};
      orderBy[finalSortBy] = finalSortOrder;

      const [lots, total] = await Promise.all([
        prisma.inventoryLot.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            release: {
              select: {
                id: true,
                title: true,
                artist: true,
                coverArtUrl: true,
                releaseYear: true,
                label: true,
                catalogNumber: true,
                genre: true,
                discogsId: true,
                description: true,
              },
            },
            submissionItem: {
              include: {
                submission: {
                  select: {
                    id: true,
                    sellerContact: true,
                    sellerName: true,
                  },
                },
              },
            },
          },
        }),
        prisma.inventoryLot.count({ where }),
      ]);

      return {
        inventory: lots.map((lot) => ({
          id: lot.id,
          release: lot.release,
          sku: lot.sku,
          channel: lot.channel,
          status: lot.status,
          conditionMedia: lot.conditionMedia,
          conditionSleeve: lot.conditionSleeve,
          costBasis: lot.costBasis ? parseFloat(lot.costBasis) : null,
          listPrice: lot.listPrice ? parseFloat(lot.listPrice) : null,
          salePrice: lot.salePrice ? parseFloat(lot.salePrice) : null,
          createdAt: lot.createdAt,
          listedAt: lot.listedAt,
          soldAt: lot.soldAt,
          submission: lot.submissionItem
            ? {
                submissionId: lot.submissionItem.submission.id,
                sellerName:
                  lot.submissionItem.submission.sellerName ||
                  lot.submissionItem.submission.sellerContact,
              }
            : null,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error listing inventory', { error: error.message });
      throw new ApiError('Failed to list inventory', 500);
    }
  }

  /**
   * Get inventory lot detail
   * @param {string} inventoryLotId - Inventory lot ID
   * @returns {Promise<Object>} Detailed inventory lot
   */
  async getInventoryDetail(inventoryLotId) {
    try {
      const lot = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
        include: {
          release: true,
          submissionItem: {
            include: { submission: true },
          },
        },
      });

      if (!lot) {
        throw new ApiError('Inventory lot not found', 404);
      }

      return {
        id: lot.id,
        release: lot.release,
        submissionOrigin: lot.submissionItem
          ? {
              submissionId: lot.submissionItem.submission.id,
              sellerContact: lot.submissionItem.submission.sellerContact,
            }
          : null,
        sku: lot.sku,
        condition: {
          media: lot.conditionMedia,
          sleeve: lot.conditionSleeve,
        },
        pricing: {
          costBasis: parseFloat(lot.costBasis),
          listPrice: parseFloat(lot.listPrice),
          salePrice: lot.salePrice ? parseFloat(lot.salePrice) : null,
        },
        status: lot.status,
        channel: lot.channel,
        internalNotes: lot.internalNotes,
        publicDescription: lot.publicDescription,
        photoUrls: lot.photoUrls,
        timestamps: {
          createdAt: lot.createdAt,
          updatedAt: lot.updatedAt,
          listedAt: lot.listedAt,
          reservedAt: lot.reservedAt,
          soldAt: lot.soldAt,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting inventory detail', {
        inventoryLotId,
        error: error.message,
      });
      throw new ApiError('Failed to get inventory detail', 500);
    }
  }

  /**
   * Update inventory lot (price, status, notes, etc.)
   * @param {string} inventoryLotId - Inventory lot ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated inventory lot
   */
  async updateInventory(inventoryLotId, updates = {}) {
    try {
      const lot = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
      });

      if (!lot) {
        throw new ApiError('Inventory lot not found', 404);
      }

      const {
        listPrice,
        salePrice,
        status,
        internalNotes,
        publicDescription,
        sku,
        release: releaseUpdates,
      } = updates;

      // Validate status transitions
      const validStatuses = [
        'DRAFT',
        'LIVE',
        'RESERVED',
        'SOLD',
        'REMOVED',
        'RETURNED',
      ];
      if (status && !validStatuses.includes(status)) {
        throw new ApiError(`Invalid status: ${status}`, 400);
      }

      // Validate price updates
      if (listPrice !== undefined && listPrice < 0) {
        throw new ApiError('List price cannot be negative', 400);
      }
      if (salePrice !== undefined && salePrice < 0) {
        throw new ApiError('Sale price cannot be negative', 400);
      }

      // Build update data
      const updateData = {};
      if (listPrice !== undefined) updateData.listPrice = listPrice;
      if (salePrice !== undefined) updateData.salePrice = salePrice;
      if (status !== undefined) updateData.status = status;
      if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
      if (publicDescription !== undefined)
        updateData.publicDescription = publicDescription;
      if (sku !== undefined) {
        // Check SKU uniqueness if provided
        const existingSku = await prisma.inventoryLot.findUnique({
          where: { sku },
        });
        if (existingSku && existingSku.id !== inventoryLotId) {
          throw new ApiError('SKU must be unique', 400);
        }
        updateData.sku = sku;
      }

      // Handle status transition to LIVE
      if (status === 'LIVE' && lot.status !== 'LIVE') {
        updateData.listedAt = new Date();
      }

      // Handle status transition to SOLD
      if (status === 'SOLD' && lot.status !== 'SOLD') {
        updateData.soldAt = new Date();
      }

      if (releaseUpdates) {
        const allowedReleaseFields = [
          'label',
          'catalogNumber',
          'releaseYear',
          'genre',
          'description',
          'discogsId',
        ];
        const releaseData = {};
        for (const field of allowedReleaseFields) {
          if (releaseUpdates[field] !== undefined) {
            releaseData[field] =
              releaseUpdates[field] === '' ? null : releaseUpdates[field];
          }
        }
        if (
          releaseData.releaseYear !== undefined &&
          releaseData.releaseYear !== null
        ) {
          const year = Number(releaseData.releaseYear);
          if (Number.isNaN(year)) {
            throw new ApiError('releaseYear must be a number', 400);
          }
          releaseData.releaseYear = year;
        }
        if (releaseData.discogsId !== undefined) {
          if (releaseData.discogsId === null || releaseData.discogsId === '') {
            releaseData.discogsId = null;
          } else {
            const discogsNumericId = Number(releaseData.discogsId);
            if (Number.isNaN(discogsNumericId)) {
              throw new ApiError('discogsId must be a number', 400);
            }
            releaseData.discogsId = discogsNumericId;
          }
        }
        if (Object.keys(releaseData).length > 0) {
          await prisma.release.update({
            where: { id: lot.releaseId },
            data: releaseData,
          });
        }
      }

      await prisma.inventoryLot.update({
        where: { id: inventoryLotId },
        data: updateData,
      });

      logger.info('Inventory updated', {
        inventoryLotId,
        changes: Object.keys(updateData),
        releaseUpdated: !!releaseUpdates,
      });

      return this.getInventoryDetail(inventoryLotId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating inventory', {
        inventoryLotId,
        error: error.message,
      });
      throw new ApiError('Failed to update inventory', 500);
    }
  }

  /**
   * Delete/remove inventory lot
   * @param {string} inventoryLotId - Inventory lot ID
   * @param {string} reason - Reason for removal
   * @returns {Promise<Object>} Deleted inventory lot
   */
  async deleteInventory(inventoryLotId, reason = '') {
    try {
      const lot = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
      });

      if (!lot) {
        throw new ApiError('Inventory lot not found', 404);
      }

      // Mark as REMOVED instead of hard delete to maintain audit trail
      const updated = await prisma.inventoryLot.update({
        where: { id: inventoryLotId },
        data: {
          status: 'REMOVED',
          internalNotes: `${lot.internalNotes || ''}\\n[REMOVED: ${reason || 'No reason provided'}] - ${new Date().toISOString()}`,
        },
        include: { release: true },
      });

      logger.info('Inventory removed', { inventoryLotId, reason });
      return this.getInventoryDetail(inventoryLotId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error deleting inventory', {
        inventoryLotId,
        error: error.message,
      });
      throw new ApiError('Failed to delete inventory', 500);
    }
  }

  /**
   * Get inventory analytics and summary statistics
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Inventory statistics and alerts
   */
  async getInventoryAnalytics(options = {}) {
    try {
      // Get all inventory across all statuses
      const allLots = await prisma.inventoryLot.findMany({
        include: { release: true },
      });

      if (allLots.length === 0) {
        return {
          totalInventory: 0,
          byStatus: {},
          byCondition: {},
          priceStats: {},
          lowStockAlerts: [],
          topPerformers: [],
        };
      }

      // Status breakdown
      const byStatus = {};
      allLots.forEach((lot) => {
        byStatus[lot.status] = (byStatus[lot.status] || 0) + 1;
      });

      // Condition breakdown
      const byCondition = {};
      allLots.forEach((lot) => {
        const condition = lot.conditionMedia;
        byCondition[condition] = (byCondition[condition] || 0) + 1;
      });

      // Price statistics
      const prices = allLots.map((lot) => parseFloat(lot.listPrice));
      const priceStats = {
        average: parseFloat(
          (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
        ),
        min: parseFloat(Math.min(...prices).toFixed(2)),
        max: parseFloat(Math.max(...prices).toFixed(2)),
        median: parseFloat(
          prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)].toFixed(2)
        ),
        total: parseFloat(prices.reduce((a, b) => a + b, 0).toFixed(2)),
      };

      // Low stock alerts (less than 3 LIVE items per release)
      const releaseInventoryCounts = {};
      allLots.forEach((lot) => {
        if (lot.status === 'LIVE') {
          const key = lot.releaseId;
          releaseInventoryCounts[key] = (releaseInventoryCounts[key] || 0) + 1;
        }
      });

      const lowStockAlerts = [];
      Object.entries(releaseInventoryCounts).forEach(([releaseId, count]) => {
        if (count < 3) {
          const release = allLots.find(
            (l) => l.releaseId === releaseId
          )?.release;
          lowStockAlerts.push({
            releaseId,
            releaseTitle: release?.title,
            releaseArtist: release?.artist,
            liveCount: count,
            threshold: 3,
            message: `Low stock: Only ${count} copy/copies available`,
          });
        }
      });

      // Top performers (highest priced LIVE items)
      const topPerformers = allLots
        .filter((lot) => lot.status === 'LIVE')
        .sort((a, b) => parseFloat(b.listPrice) - parseFloat(a.listPrice))
        .slice(0, 10)
        .map((lot) => ({
          id: lot.id,
          sku: lot.sku,
          releaseTitle: lot.release?.title,
          releaseArtist: lot.release?.artist,
          condition: `${lot.conditionMedia}/${lot.conditionSleeve}`,
          listPrice: parseFloat(lot.listPrice),
          costBasis: parseFloat(lot.costBasis),
          margin: parseFloat(
            (
              ((parseFloat(lot.listPrice) - parseFloat(lot.costBasis)) /
                parseFloat(lot.costBasis)) *
              100
            ).toFixed(2)
          ),
        }));

      return {
        totalInventory: allLots.length,
        byStatus,
        byCondition,
        priceStats,
        lowStockAlerts,
        topPerformers,
      };
    } catch (error) {
      logger.error('Error getting inventory analytics', {
        error: error.message,
      });
      throw new ApiError('Failed to get inventory analytics', 500);
    }
  }

  /**
   * Get low-stock alerts for inventory items
   * @param {number} threshold - Stock threshold for alerts (default 3)
   * @returns {Promise<Array>} Low-stock alert items
   */
  async getLowStockAlerts(threshold = 3) {
    try {
      const releaseInventory = await prisma.inventoryLot.groupBy({
        by: ['releaseId'],
        where: { status: 'LIVE' },
        _count: { id: true },
      });

      const lowStockReleases = releaseInventory
        .filter((group) => group._count.id < threshold)
        .map((group) => group.releaseId);

      const alerts = await prisma.inventoryLot.findMany({
        where: {
          releaseId: { in: lowStockReleases },
          status: 'LIVE',
        },
        include: { release: true },
      });

      const grouped = {};
      alerts.forEach((lot) => {
        const key = lot.releaseId;
        if (!grouped[key]) {
          grouped[key] = {
            releaseId: lot.releaseId,
            releaseTitle: lot.release.title,
            releaseArtist: lot.release.artist,
            items: [],
          };
        }
        grouped[key].items.push({
          inventoryId: lot.id,
          sku: lot.sku,
          condition: `${lot.conditionMedia}/${lot.conditionSleeve}`,
          price: parseFloat(lot.listPrice),
        });
      });

      return Object.values(grouped).map((group) => ({
        ...group,
        stockCount: group.items.length,
        threshold,
      }));
    } catch (error) {
      logger.error('Error getting low-stock alerts', { error: error.message });
      throw new ApiError('Failed to get low-stock alerts', 500);
    }
  }

  /**
   * Calculate inventory sales velocity (items sold over time)
   * @returns {Promise<Object>} Sales velocity metrics
   */
  async calculateSalesVelocity() {
    try {
      // Get sold items
      const soldItems = await prisma.inventoryLot.findMany({
        where: { status: 'SOLD' },
        include: { release: true },
      });

      if (soldItems.length === 0) {
        return {
          totalSold: 0,
          totalRevenue: 0,
          averagePricePerItem: 0,
          soldByCondition: {},
          topSelling: [],
        };
      }

      // Sold by condition
      const soldByCondition = {};
      let totalRevenue = 0;

      soldItems.forEach((lot) => {
        const condition = lot.conditionMedia;
        soldByCondition[condition] = (soldByCondition[condition] || 0) + 1;
        totalRevenue += parseFloat(lot.salePrice || lot.listPrice);
      });

      // Top selling releases (by quantity sold)
      const releasesSold = {};
      soldItems.forEach((lot) => {
        const key = lot.releaseId;
        if (!releasesSold[key]) {
          releasesSold[key] = {
            releaseId: lot.releaseId,
            title: lot.release.title,
            artist: lot.release.artist,
            quantity: 0,
            revenue: 0,
          };
        }
        releasesSold[key].quantity += 1;
        releasesSold[key].revenue += parseFloat(lot.salePrice || lot.listPrice);
      });

      const topSelling = Object.values(releasesSold)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return {
        totalSold: soldItems.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averagePricePerItem: parseFloat(
          (totalRevenue / soldItems.length).toFixed(2)
        ),
        soldByCondition,
        topSelling,
      };
    } catch (error) {
      logger.error('Error calculating sales velocity', {
        error: error.message,
      });
      throw new ApiError('Failed to calculate sales velocity', 500);
    }
  }

  /**
   * Apply pricing policy to inventory items
   * @param {Object} options - Application options
   * @param {string} options.policyId - Pricing policy ID to apply
   * @param {Array} options.inventoryLotIds - Specific lot IDs to apply to (or use filters)
   * @param {Object} options.filters - Filter options (status, condition, etc.) for partial application
   * @param {boolean} options.dryRun - Preview changes without applying
   * @returns {Promise<Object>} Results with price updates and affected items
   */
  async applyPricingPolicy(options = {}) {
    try {
      const {
        policyId,
        inventoryLotIds,
        filters = {},
        dryRun = false,
      } = options;

      if (!policyId) {
        throw new ApiError('Policy ID is required', 400);
      }

      // Fetch the pricing policy
      const policy = await prisma.pricingPolicy.findUnique({
        where: { id: policyId },
      });

      if (!policy) {
        throw new ApiError('Pricing policy not found', 404);
      }

      if (!policy.isActive) {
        throw new ApiError('Pricing policy is not active', 400);
      }

      // Build WHERE clause for inventory selection
      const where = {};
      if (inventoryLotIds && inventoryLotIds.length > 0) {
        where.id = { in: inventoryLotIds };
      } else {
        // Apply filters if no specific IDs provided
        if (filters.status) {
          where.status = filters.status;
        }
        if (filters.conditions) {
          const grades = Array.isArray(filters.conditions)
            ? filters.conditions
            : [filters.conditions];
          where.OR = [
            { conditionMedia: { in: grades } },
            { conditionSleeve: { in: grades } },
          ];
        }
      }

      // Get inventory items to update with their releases
      const inventoryLots = await prisma.inventoryLot.findMany({
        where,
        include: { release: true },
      });

      if (inventoryLots.length === 0) {
        return {
          applied: false,
          dryRun: true,
          message: 'No inventory items matched the criteria',
          affectedCount: 0,
          updates: [],
        };
      }

      const updates = [];

      for (const lot of inventoryLots) {
        try {
          // Calculate new sell price using the policy
          const pricingResult = await pricingService.calculateSellPrice({
            releaseId: lot.releaseId,
            mediaCondition: lot.conditionMedia,
            sleeveCondition: lot.conditionSleeve,
            costBasis: Number(lot.costBasis),
            formula: policy,
          });
          const newListPrice = pricingResult.price;

          updates.push({
            inventoryLotId: lot.id,
            releaseId: lot.releaseId,
            sku: lot.sku,
            oldPrice: parseFloat(lot.listPrice),
            newPrice: parseFloat(newListPrice),
            priceDifference:
              parseFloat(newListPrice) - parseFloat(lot.listPrice),
            priceDifferencePercent: (
              ((parseFloat(newListPrice) - parseFloat(lot.listPrice)) /
                parseFloat(lot.listPrice)) *
              100
            ).toFixed(2),
          });
        } catch (error) {
          logger.error('Error calculating price for inventory lot', {
            inventoryLotId: lot.id,
            error: error.message,
          });
          updates.push({
            inventoryLotId: lot.id,
            error: `Failed to calculate price: ${error.message}`,
          });
        }
      }

      // If dry run, return preview without applying
      if (dryRun) {
        const successfulUpdates = updates.filter((u) => !u.error);
        const failedUpdates = updates.filter((u) => u.error);

        return {
          applied: false,
          dryRun: true,
          policyId,
          policyName: policy.name,
          affectedCount: successfulUpdates.length,
          updates: successfulUpdates,
          errors: failedUpdates,
          summary: {
            totalItems: updates.length,
            successfulCalculations: successfulUpdates.length,
            failedCalculations: failedUpdates.length,
            averagePriceChange:
              successfulUpdates.length > 0
                ? (
                    successfulUpdates.reduce(
                      (sum, u) => sum + u.priceDifference,
                      0
                    ) / successfulUpdates.length
                  ).toFixed(2)
                : 0,
          },
        };
      }

      // Apply the price updates
      const appliedUpdates = [];
      const failedUpdates = [];

      for (const update of updates) {
        if (update.error) {
          failedUpdates.push(update);
          continue;
        }

        try {
          const lot = inventoryLots.find((l) => l.id === update.inventoryLotId);
          await prisma.inventoryLot.update({
            where: { id: update.inventoryLotId },
            data: {
              listPrice: update.newPrice,
              internalNotes: `${lot.internalNotes || ''}\n[PRICE UPDATED by policy ${policy.name}] Old: $${update.oldPrice}, New: $${update.newPrice} - ${new Date().toISOString()}`,
            },
          });

          appliedUpdates.push(update);
        } catch (error) {
          failedUpdates.push({
            ...update,
            error: `Failed to apply update: ${error.message}`,
          });
        }
      }

      logger.info('Pricing policy applied to inventory', {
        policyId,
        policyName: policy.name,
        appliedCount: appliedUpdates.length,
        failedCount: failedUpdates.length,
        totalCount: updates.length,
      });

      return {
        applied: true,
        dryRun: false,
        policyId,
        policyName: policy.name,
        affectedCount: appliedUpdates.length,
        updates: appliedUpdates,
        errors: failedUpdates,
        summary: {
          totalItems: updates.length,
          appliedUpdates: appliedUpdates.length,
          failedUpdates: failedUpdates.length,
          averagePriceChange:
            appliedUpdates.length > 0
              ? (
                  appliedUpdates.reduce(
                    (sum, u) => sum + u.priceDifference,
                    0
                  ) / appliedUpdates.length
                ).toFixed(2)
              : 0,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error applying pricing policy to inventory', {
        error: error.message,
      });
      throw new ApiError('Failed to apply pricing policy', 500);
    }
  }

  /**
   * Get pricing history for an inventory lot
   * @param {string} inventoryLotId - Inventory lot ID
   * @returns {Promise<Array>} Pricing history entries
   */
  async getPricingHistory(inventoryLotId) {
    try {
      const lot = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
      });

      if (!lot) {
        throw new ApiError('Inventory lot not found', 404);
      }

      // Parse history from internal notes (stored as text with timestamps)
      const history = [];
      const lines = (lot.internalNotes || '').split('\n');

      for (const line of lines) {
        if (line.includes('[PRICE UPDATED')) {
          const match = line.match(
            /\[PRICE UPDATED by policy (.+?)\] Old: \$([0-9.]+), New: \$([0-9.]+) - (.+)/
          );
          if (match) {
            history.push({
              type: 'PRICE_UPDATE',
              policy: match[1],
              oldPrice: parseFloat(match[2]),
              newPrice: parseFloat(match[3]),
              timestamp: match[4],
            });
          }
        }
      }

      return history;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting pricing history', {
        inventoryLotId,
        error: error.message,
      });
      throw new ApiError('Failed to get pricing history', 500);
    }
  }

  /**
   * Bulk update inventory prices
   * @param {Array} updates - Array of {inventoryLotId, listPrice, salePrice}
   * @returns {Promise<Object>} Results with successful and failed updates
   */
  async bulkUpdatePrices(updates = []) {
    try {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new ApiError('Updates must be a non-empty array', 400);
      }

      if (updates.length > 500) {
        throw new ApiError('Cannot update more than 500 items at once', 400);
      }

      const results = {
        successful: [],
        failed: [],
      };

      for (const update of updates) {
        try {
          const { inventoryLotId, listPrice, salePrice } = update;

          if (!inventoryLotId) {
            results.failed.push({
              inventoryLotId,
              error: 'inventoryLotId is required',
            });
            continue;
          }

          if (listPrice !== undefined && listPrice < 0) {
            results.failed.push({
              inventoryLotId,
              error: 'List price cannot be negative',
            });
            continue;
          }

          const lot = await prisma.inventoryLot.update({
            where: { id: inventoryLotId },
            data: {
              ...(listPrice !== undefined && { listPrice }),
              ...(salePrice !== undefined && { salePrice }),
            },
          });

          results.successful.push({
            inventoryLotId,
            listPrice: lot.listPrice,
            salePrice: lot.salePrice,
          });
        } catch (error) {
          results.failed.push({
            inventoryLotId: update.inventoryLotId,
            error: error.message,
          });
        }
      }

      logger.info('Bulk price update completed', {
        totalRequests: updates.length,
        successful: results.successful.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error bulk updating prices', { error: error.message });
      throw new ApiError('Failed to bulk update prices', 500);
    }
  }

  /**
   * Reserve inventory for checkout
   * Transitions item from LIVE to RESERVED status
   * Uses optimistic locking to prevent race conditions
   * @param {string} inventoryLotId - Inventory lot ID
   * @param {string} orderId - Order ID to link reservation to
   * @returns {Promise<Object>} Reserved inventory lot
   */
  async reserveInventory(inventoryLotId, orderId) {
    try {
      if (!inventoryLotId || !orderId) {
        throw new ApiError('inventoryLotId and orderId are required', 400);
      }

      // Use updateMany with optimistic locking - only update if status is LIVE
      const result = await prisma.inventoryLot.updateMany({
        where: {
          id: inventoryLotId,
          status: 'LIVE', // CRITICAL: Only update if still LIVE
        },
        data: {
          status: 'RESERVED',
          reservedAt: new Date(),
          orderId: orderId,
        },
      });

      if (result.count === 0) {
        throw new ApiError('Item no longer available', 409);
      }

      // Fetch and return the updated lot
      const updatedLot = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
      });

      // Log to internal notes
      const timestamp = new Date().toISOString();
      await prisma.inventoryLot.update({
        where: { id: inventoryLotId },
        data: {
          internalNotes: `${updatedLot?.internalNotes || ''}\n[RESERVED for order ${orderId}] - ${timestamp}`,
        },
      });

      logger.info('Inventory reserved', {
        inventoryLotId,
        orderId,
        sku: updatedLot?.sku,
      });

      return updatedLot;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error reserving inventory', {
        inventoryLotId,
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to reserve inventory', 500);
    }
  }

  /**
   * Release reservation on inventory
   * Transitions item from RESERVED back to LIVE status
   * @param {string} inventoryLotId - Inventory lot ID
   * @param {string} reason - Reason for release (payment failure, timeout, etc)
   * @returns {Promise<Object>} Released inventory lot
   */
  async releaseReservation(inventoryLotId, reason = 'Manual release') {
    try {
      if (!inventoryLotId) {
        throw new ApiError('inventoryLotId is required', 400);
      }

      const lot = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
      });

      if (!lot) {
        throw new ApiError('Inventory lot not found', 404);
      }

      if (lot.status !== 'RESERVED') {
        throw new ApiError(
          `Cannot release inventory with status: ${lot.status}`,
          400
        );
      }

      const timestamp = new Date().toISOString();
      const updatedLot = await prisma.inventoryLot.update({
        where: { id: inventoryLotId },
        data: {
          status: 'LIVE',
          reservedAt: null,
          orderId: null,
          internalNotes: `${lot.internalNotes || ''}\n[RELEASED] Reason: ${reason} - ${timestamp}`,
        },
      });

      logger.info('Reservation released', {
        inventoryLotId,
        reason,
        sku: lot.sku,
      });

      return updatedLot;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error releasing reservation', {
        inventoryLotId,
        error: error.message,
      });
      throw new ApiError('Failed to release reservation', 500);
    }
  }

  /**
   * Mark inventory as sold
   * Transitions item from RESERVED to SOLD status
   * @param {string} inventoryLotId - Inventory lot ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Sold inventory lot
   */
  async markAsSold(inventoryLotId, orderId) {
    try {
      if (!inventoryLotId || !orderId) {
        throw new ApiError('inventoryLotId and orderId are required', 400);
      }

      const lot = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
      });

      if (!lot) {
        throw new ApiError('Inventory lot not found', 404);
      }

      if (lot.status !== 'RESERVED') {
        throw new ApiError(
          `Cannot mark as sold with status: ${lot.status}`,
          400
        );
      }

      const timestamp = new Date().toISOString();
      const updatedLot = await prisma.inventoryLot.update({
        where: { id: inventoryLotId },
        data: {
          status: 'SOLD',
          soldAt: new Date(),
          orderId: orderId,
          internalNotes: `${lot.internalNotes || ''}\n[SOLD in order ${orderId}] - ${timestamp}`,
        },
      });

      logger.info('Inventory marked as sold', {
        inventoryLotId,
        orderId,
        sku: lot.sku,
      });

      return updatedLot;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error marking inventory as sold', {
        inventoryLotId,
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to mark inventory as sold', 500);
    }
  }

  /**
   * Clean up expired reservations
   * Finds and releases all RESERVED items older than 15 minutes
   * Called by background job every 5 minutes
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupExpiredReservations() {
    try {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

      const expiredLots = await prisma.inventoryLot.findMany({
        where: {
          status: 'RESERVED',
          reservedAt: {
            lt: cutoff,
          },
        },
      });

      if (expiredLots.length === 0) {
        logger.debug('No expired reservations to clean up');
        return { releasedCount: 0, errors: [] };
      }

      const results = {
        releasedCount: 0,
        errors: [],
      };

      for (const lot of expiredLots) {
        try {
          await this.releaseReservation(
            lot.id,
            'Checkout timeout - 15 minutes expired'
          );
          results.releasedCount += 1;
        } catch (error) {
          results.errors.push({
            inventoryLotId: lot.id,
            error: error.message,
          });
        }
      }

      logger.info('Expired reservations cleaned up', {
        releasedCount: results.releasedCount,
        errorCount: results.errors.length,
      });

      return results;
    } catch (error) {
      logger.error('Error cleaning up expired reservations', {
        error: error.message,
      });
      // Don't throw - this is a background job and should fail gracefully
      return { releasedCount: 0, errors: [{ error: error.message }] };
    }
  }
}

export default new InventoryService();
