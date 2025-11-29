import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';

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
      const prices = inventoryLots.map(lot => Number(lot.listPrice));
      const lowestPrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);
      const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      // Build condition breakdown
      const conditionBreakdown = {};
      inventoryLots.forEach(lot => {
        const condition = lot.conditionMedia;
        conditionBreakdown[condition] = (conditionBreakdown[condition] || 0) + 1;
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
      logger.error('Error getting inventory stats', { releaseId, error: error.message });
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
      releaseIds.forEach(id => {
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
      inventoryLots.forEach(lot => {
        if (!groupedByRelease[lot.releaseId]) {
          groupedByRelease[lot.releaseId] = [];
        }
        groupedByRelease[lot.releaseId].push(lot);
      });

      // Calculate stats for each release
      Object.entries(groupedByRelease).forEach(([releaseId, lots]) => {
        const prices = lots.map(lot => Number(lot.listPrice));
        const lowestPrice = Math.min(...prices);
        const highestPrice = Math.max(...prices);
        const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        const conditionBreakdown = {};
        lots.forEach(lot => {
          const condition = lot.conditionMedia;
          conditionBreakdown[condition] = (conditionBreakdown[condition] || 0) + 1;
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
      logger.error('Error batch loading inventory', { count: releaseIds?.length, error: error.message });
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
      distribution.forEach(item => {
        result[item.conditionMedia] = item._count;
      });

      return result;
    } catch (error) {
      logger.error('Error getting condition distribution', { releaseId, error: error.message });
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

      return inventoryLots.map(lot => ({
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
      logger.error('Error getting inventory by status', { status, error: error.message });
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

      const prices = lots.map(lot => Number(lot.listPrice)).sort((a, b) => a - b);
      const count = prices.length;
      const average = prices.reduce((a, b) => a + b, 0) / count;
      const median = count % 2 === 0
        ? (prices[count / 2 - 1] + prices[count / 2]) / 2
        : prices[Math.floor(count / 2)];

      // Calculate standard deviation
      const variance = prices.reduce((acc, price) => acc + Math.pow(price - average, 2), 0) / count;
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
      logger.error('Error calculating price statistics', { filters, error: error.message });
      throw new ApiError('Failed to calculate price statistics', 500);
    }
  }
}

export default new InventoryService();
