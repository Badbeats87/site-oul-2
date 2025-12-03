import discogsService from './discogsService.js';
import ebayService from './ebayService.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import prisma from '../utils/db.js';

/**
 * Pricing Engine for Vinyl Catalog
 * Handles buy price calculations (offers to sellers) and sell price calculations (listing prices)
 */
class PricingService {
  constructor() {
    // Default condition curves
    this.defaultConditionCurve = {
      MINT: 1.1,
      NM: 1.0,
      VG_PLUS: 0.85,
      VG: 0.6,
      VG_MINUS: 0.45,
      G: 0.3,
      FAIR: 0.2,
      POOR: 0.1,
    };

    // Default condition weights
    this.defaultWeights = {
      media: 0.6,
      sleeve: 0.4,
    };

    // Default pricing parameters
    this.defaults = {
      buyPercentage: 0.55,
      sellPercentage: 1.25,
      minProfitMargin: 0.3,
      buyFloor: 5.0,
      buyCeiling: 500.0,
      sellFloor: 10.0,
      sellCeiling: 999.99,
      roundIncrement: 0.25,
      markdownSchedule: {
        30: 0.1,
        60: 0.2,
      },
    };

    // Policy cache to avoid repeated database queries
    this.policyCache = new Map();
    this.policyCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Fetch active pricing policy by type (BUYER or SELLER)
   * @param {string} policyType - 'BUYER' or 'SELLER'
   * @param {Object} context - Optional context { genre, label, channel }
   * @returns {Promise<Object|null>} Pricing policy or null if not found
   */
  async getActivePricingPolicy(policyType, context = {}) {
    try {
      const cacheKey = `${policyType}:${JSON.stringify(context)}`;

      // Check cache
      if (this.policyCache.has(cacheKey)) {
        const cached = this.policyCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.policyCacheTTL) {
          return cached.data;
        }
        this.policyCache.delete(cacheKey);
      }

      // Fetch from database
      const policy = await prisma.pricingPolicy.findFirst({
        where: {
          isActive: true,
          scope: policyType,
          // TODO: Add scope-specific filters (genre, label, channel)
        },
        orderBy: {
          version: 'desc',
        },
      });

      // Cache the result
      if (policy) {
        this.policyCache.set(cacheKey, {
          data: policy,
          timestamp: Date.now(),
        });
      }

      return policy || null;
    } catch (error) {
      logger.warn('Failed to fetch pricing policy', {
        policyType,
        context,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get buyer pricing formula with database policy overrides
   * @param {Object} context - Optional context for policy selection
   * @returns {Promise<Object>} Buyer formula configuration
   */
  async getBuyerFormula(context = {}) {
    const policy = await this.getActivePricingPolicy('BUYER', context);

    if (policy && policy.buyFormula) {
      // Normalize field names from database to internal format
      // Handle both 'percentage' (old) and 'buyPercentage' (new) naming conventions
      const buyPercentage =
        policy.buyFormula.buyPercentage ??
        policy.buyFormula.percentage ??
        this.defaults.buyPercentage;

      // Handle weights: could be 'weights' object or separate 'mediaWeight'/'sleeveWeight' fields
      const weights = policy.buyFormula.weights || {
        media: policy.buyFormula.mediaWeight ?? this.defaultWeights.media,
        sleeve: policy.buyFormula.sleeveWeight ?? this.defaultWeights.sleeve,
      };

      logger.debug('getBuyerFormula loaded from database', {
        policyId: policy.id,
        buyPercentage,
        weights,
      });

      return {
        ...this.defaults,
        buyPercentage,
        ...policy.buyFormula,
        policyId: policy.id,
        conditionCurve: policy.conditionCurve || this.defaultConditionCurve,
        weights,
      };
    }

    logger.debug('getBuyerFormula using defaults (no policy found)');
    return {
      ...this.defaults,
      conditionCurve: this.defaultConditionCurve,
      weights: this.defaultWeights,
    };
  }

  /**
   * Get seller pricing formula with database policy overrides
   * @param {Object} context - Optional context for policy selection
   * @returns {Promise<Object>} Seller formula configuration
   */
  async getSellerFormula(context = {}) {
    const policy = await this.getActivePricingPolicy('SELLER', context);

    if (policy && policy.sellFormula) {
      // Normalize field names from database to internal format
      // Handle both 'percentage' (old) and 'sellPercentage' (new) naming conventions
      const sellPercentage =
        policy.sellFormula.sellPercentage ??
        policy.sellFormula.percentage ??
        this.defaults.sellPercentage;

      // Handle weights: could be 'weights' object or separate 'mediaWeight'/'sleeveWeight' fields
      const weights = policy.sellFormula.weights || {
        media: policy.sellFormula.mediaWeight ?? this.defaultWeights.media,
        sleeve: policy.sellFormula.sleeveWeight ?? this.defaultWeights.sleeve,
      };

      logger.debug('getSellerFormula loaded from database', {
        policyId: policy.id,
        sellPercentage,
        weights,
      });

      return {
        ...this.defaults,
        sellPercentage,
        ...policy.sellFormula,
        policyId: policy.id,
        conditionCurve: policy.conditionCurve || this.defaultConditionCurve,
        weights,
      };
    }

    logger.debug('getSellerFormula using defaults (no policy found)');
    return {
      ...this.defaults,
      conditionCurve: this.defaultConditionCurve,
      weights: this.defaultWeights,
    };
  }

  /**
   * Clear policy cache (call after policy updates)
   */
  clearPolicyCache() {
    this.policyCache.clear();
    logger.info('Pricing policy cache cleared');
  }

  /**
   * Calculate buy offer price for a vinyl record
   * Formula: market_stat × buy_percentage × condition_adjustments
   * @param {Object} params
   * @param {string} params.releaseId - Release UUID
   * @param {string} params.mediaCondition - Media condition enum (MINT, NM, VG_PLUS, VG, VG_MINUS, G, FAIR, POOR)
   * @param {string} params.sleeveCondition - Sleeve condition enum
   * @param {string} params.marketSource - Market data source (DISCOGS, EBAY, HYBRID)
   * @param {string} params.marketStatistic - Price statistic to use (low, median, high)
   * @param {Object} params.formula - Optional buy formula override
   * @returns {Promise<Object>} { price, breakdown, policyUsed, marketData }
   */
  async calculateBuyPrice(params) {
    const {
      releaseId,
      mediaCondition,
      sleeveCondition,
      marketSource = 'HYBRID',
      marketStatistic = 'median',
      formula = {},
    } = params;

    try {
      // Validate inputs
      this._validateCondition(mediaCondition);
      this._validateCondition(sleeveCondition);

      // Merge with defaults
      const config = {
        buyPercentage: formula.buyPercentage ?? this.defaults.buyPercentage,
        roundIncrement: formula.roundIncrement ?? this.defaults.roundIncrement,
        buyFloor: formula.buyFloor ?? this.defaults.buyFloor,
        buyCeiling: formula.buyCeiling ?? this.defaults.buyCeiling,
      };

      // Get market stat - first try from database snapshots, then from external sources
      let marketStat = await this._getMarketStatFromDatabase(
        releaseId,
        marketStatistic
      );

      if (!marketStat) {
        marketStat = await this._getMarketStat(
          releaseId,
          marketSource,
          marketStatistic
        );
      }

      if (!marketStat) {
        throw new ApiError('Market data not available for pricing', 404);
      }

      // Get condition curve
      const curve = formula.conditionCurve || this.defaultConditionCurve;
      const weights = formula.weights || this.defaultWeights;

      // Calculate step by step
      const baseOffer = marketStat * config.buyPercentage;
      const adjustedPrice = this.applyConditionCurve(
        baseOffer,
        mediaCondition,
        sleeveCondition,
        curve,
        weights
      );
      const rounded = this.roundToIncrement(
        adjustedPrice,
        config.roundIncrement
      );
      const final = this.applyFloorAndCeiling(
        rounded,
        config.buyFloor,
        config.buyCeiling
      );

      logger.debug('Buy price calculated', {
        releaseId,
        conditions: { media: mediaCondition, sleeve: sleeveCondition },
        marketStat,
        finalPrice: final,
      });

      return {
        price: parseFloat(final.toFixed(2)),
        breakdown: {
          marketStat,
          marketSource,
          marketStatistic,
          baseOffer: parseFloat(baseOffer.toFixed(2)),
          mediaCondition,
          sleeveCondition,
          mediaAdjustment: parseFloat(
            (baseOffer * curve[mediaCondition] * weights.media).toFixed(2)
          ),
          sleeveAdjustment: parseFloat(
            (baseOffer * curve[sleeveCondition] * weights.sleeve).toFixed(2)
          ),
          beforeRounding: parseFloat(adjustedPrice.toFixed(2)),
          afterRounding: parseFloat(rounded.toFixed(2)),
          floorApplied: final === config.buyFloor,
          ceilingApplied: final === config.buyCeiling,
        },
        policyUsed: formula.policyId || 'default',
      };
    } catch (error) {
      if (error.isApiError) throw error;
      logger.error('Buy price calculation failed', {
        releaseId,
        error: error.message,
      });
      throw new ApiError('Failed to calculate buy price', 500);
    }
  }

  /**
   * Calculate sell listing price for a vinyl record
   * Formula: market_stat × sell_percentage × condition_adjustments, with minimum profit margin
   * @param {Object} params
   * @param {string} params.releaseId - Release UUID
   * @param {string} params.mediaCondition - Media condition enum
   * @param {string} params.sleeveCondition - Sleeve condition enum
   * @param {number} params.costBasis - What we paid for it (required for margin validation)
   * @param {string} params.marketSource - Market data source
   * @param {string} params.marketStatistic - Price statistic
   * @param {Object} params.formula - Optional sell formula override
   * @returns {Promise<Object>} { price, marginPercent, breakdown }
   */
  async calculateSellPrice(params) {
    const {
      releaseId,
      mediaCondition,
      sleeveCondition,
      costBasis,
      marketSource = 'HYBRID',
      marketStatistic = 'median',
      formula = {},
    } = params;

    try {
      // Validate inputs
      if (!costBasis || costBasis < 0) {
        throw new ApiError(
          'Valid cost basis is required for sell price calculation',
          400
        );
      }

      this._validateCondition(mediaCondition);
      this._validateCondition(sleeveCondition);

      // Merge with defaults
      const config = {
        sellPercentage: formula.sellPercentage ?? this.defaults.sellPercentage,
        minProfitMargin:
          formula.minProfitMargin ?? this.defaults.minProfitMargin,
        roundIncrement: formula.roundIncrement ?? this.defaults.roundIncrement,
        sellFloor: formula.sellFloor ?? this.defaults.sellFloor,
        sellCeiling: formula.sellCeiling ?? this.defaults.sellCeiling,
      };

      // Get market stat - prefer stored snapshots, fallback to external sources
      let marketStat = await this._getMarketStatFromDatabase(
        releaseId,
        marketStatistic
      );

      if (!marketStat) {
        marketStat = await this._getMarketStat(
          releaseId,
          marketSource,
          marketStatistic
        );
      }

      if (!marketStat) {
        throw new ApiError('Market data not available for pricing', 404);
      }

      // Get condition curve
      const curve = formula.conditionCurve || this.defaultConditionCurve;
      const weights = formula.weights || this.defaultWeights;

      // Calculate suggested price
      const listSuggestion = marketStat * config.sellPercentage;
      const adjustedPrice = this.applyConditionCurve(
        listSuggestion,
        mediaCondition,
        sleeveCondition,
        curve,
        weights
      );
      let rounded = this.roundToIncrement(adjustedPrice, config.roundIncrement);

      // Validate minimum profit margin
      const minAcceptablePrice = costBasis * (1 + config.minProfitMargin);
      if (rounded < minAcceptablePrice) {
        rounded = minAcceptablePrice;
      }

      const final = this.applyFloorAndCeiling(
        rounded,
        config.sellFloor,
        config.sellCeiling
      );

      // Calculate margin
      const marginPercent =
        costBasis > 0 ? ((final - costBasis) / costBasis) * 100 : 0;

      logger.debug('Sell price calculated', {
        releaseId,
        costBasis,
        conditions: { media: mediaCondition, sleeve: sleeveCondition },
        marketStat,
        finalPrice: final,
        marginPercent,
      });

      return {
        price: parseFloat(final.toFixed(2)),
        marginPercent: parseFloat(marginPercent.toFixed(2)),
        breakdown: {
          marketStat,
          marketSource,
          marketStatistic,
          costBasis: parseFloat(costBasis.toFixed(2)),
          listSuggestion: parseFloat(listSuggestion.toFixed(2)),
          mediaCondition,
          sleeveCondition,
          beforeRounding: parseFloat(adjustedPrice.toFixed(2)),
          minMarginApplied: final >= minAcceptablePrice,
          minAcceptablePrice: parseFloat(minAcceptablePrice.toFixed(2)),
          afterRounding: parseFloat(rounded.toFixed(2)),
          floorApplied: final === config.sellFloor,
          ceilingApplied: final === config.sellCeiling,
        },
        policyUsed: formula.policyId || 'default',
      };
    } catch (error) {
      if (error.isApiError) throw error;
      logger.error('Sell price calculation failed', {
        releaseId,
        error: error.message,
      });
      throw new ApiError('Failed to calculate sell price', 500);
    }
  }

  /**
   * Calculate markdown for unsold inventory
   * @param {Object} params
   * @param {number} params.currentPrice - Current list price
   * @param {Date} params.listedAt - When item was listed
   * @param {number} params.costBasis - Cost basis to prevent loss
   * @param {Object} params.markdownSchedule - { 30: 0.10, 60: 0.20 } (days: discount percentage)
   * @returns {Object} { newPrice, discountPercent, daysListed }
   */
  calculateMarkdown(params) {
    const { currentPrice, listedAt, costBasis, markdownSchedule } = params;

    if (!currentPrice || currentPrice < 0) {
      throw new ApiError('Valid current price is required', 400);
    }

    if (!listedAt || !(listedAt instanceof Date)) {
      throw new ApiError('Valid listedAt date is required', 400);
    }

    // Calculate days listed
    const now = new Date();
    const daysListed = Math.floor((now - listedAt) / (1000 * 60 * 60 * 24));

    // Determine applicable markdown
    let discountPercent = 0;
    const schedule = markdownSchedule || this.defaults.markdownSchedule;

    // Apply the highest applicable markdown
    for (const [days, discount] of Object.entries(schedule).sort(
      (a, b) => parseInt(b[0]) - parseInt(a[0])
    )) {
      if (daysListed >= parseInt(days)) {
        discountPercent = discount;
        break;
      }
    }

    // Calculate new price
    const newPrice = currentPrice * (1 - discountPercent);

    // Floor to cost basis to prevent losses
    const finalPrice = Math.min(newPrice, currentPrice);

    return {
      newPrice: parseFloat(finalPrice.toFixed(2)),
      discountPercent: parseFloat((discountPercent * 100).toFixed(1)),
      daysListed,
      originalPrice: parseFloat(currentPrice.toFixed(2)),
      marginProtected: finalPrice >= costBasis,
    };
  }

  /**
   * Apply condition curve adjustments to a base price
   * Weighted combination of media and sleeve conditions
   * @param {number} basePrice
   * @param {string} mediaCondition
   * @param {string} sleeveCondition
   * @param {Object} curve - Condition multipliers
   * @param {Object} weights - { media: 0.6, sleeve: 0.4 }
   * @returns {number} Adjusted price
   */
  applyConditionCurve(
    basePrice,
    mediaCondition,
    sleeveCondition,
    curve,
    weights
  ) {
    const mediaWeights = weights || this.defaultWeights;
    const curve_ = curve || this.defaultConditionCurve;

    const mediaMultiplier = curve_[mediaCondition] || 1.0;
    const sleeveMultiplier = curve_[sleeveCondition] || 1.0;

    const mediaAdjustment = basePrice * mediaMultiplier * mediaWeights.media;
    const sleeveAdjustment = basePrice * sleeveMultiplier * mediaWeights.sleeve;

    return mediaAdjustment + sleeveAdjustment;
  }

  /**
   * Round price to nearest increment
   * @param {number} price
   * @param {number} increment - e.g., 0.25 for quarter increments
   * @returns {number} Rounded price
   */
  roundToIncrement(price, increment = 0.25) {
    if (increment <= 0) return price;
    return Math.round(price / increment) * increment;
  }

  /**
   * Apply floor and ceiling constraints
   * @param {number} price
   * @param {number} floor - Minimum price
   * @param {number} ceiling - Maximum price
   * @returns {number} Constrained price
   */
  applyFloorAndCeiling(price, floor, ceiling) {
    if (price < floor) return floor;
    if (price > ceiling) return ceiling;
    return price;
  }

  /**
   * Calculate profit margin percentage
   * @param {number} sellPrice
   * @param {number} costBasis
   * @returns {number} Margin percentage
   */
  calculateProfitMargin(sellPrice, costBasis) {
    if (costBasis <= 0) return 0;
    return ((sellPrice - costBasis) / costBasis) * 100;
  }

  /**
   * Validate minimum profit margin
   * @param {number} sellPrice
   * @param {number} costBasis
   * @param {number} minMargin - e.g., 0.30 for 30%
   * @returns {boolean} True if margin meets minimum
   */
  validateMinimumMargin(sellPrice, costBasis, minMargin = 0.3) {
    const margin = this.calculateProfitMargin(sellPrice, costBasis);
    return margin >= minMargin * 100;
  }

  /**
   * Get market statistic from appropriate source
   * @private
   * @param {string} releaseId
   * @param {string} source - DISCOGS, EBAY, or HYBRID
   * @param {string} statistic - low, median, or high
   * @returns {Promise<number>} Market price
   */
  async _getMarketStatFromDatabase(releaseId, statistic) {
    try {
      logger.debug('Looking for market snapshot in database', {
        releaseId,
        statistic,
      });

      // Get the most recent market snapshot for this release
      const snapshot = await prisma.marketSnapshot.findFirst({
        where: { releaseId },
        orderBy: { fetchedAt: 'desc' },
      });

      if (!snapshot) {
        logger.debug('No market snapshot found in database', {
          releaseId,
        });
        return null;
      }

      logger.debug('Found market snapshot in database', {
        releaseId,
        snapshot: {
          statLow: snapshot.statLow,
          statMedian: snapshot.statMedian,
          statHigh: snapshot.statHigh,
        },
      });

      // Return the requested statistic with sensible fallbacks
      const stat = (statistic || 'median').toLowerCase();
      let result = null;

      if (stat === 'low') {
        result =
          snapshot.statLow || snapshot.statMedian || snapshot.statHigh || null;
      } else if (stat === 'high') {
        result =
          snapshot.statHigh || snapshot.statMedian || snapshot.statLow || null;
      } else {
        // Median path with fallback to low/high
        result =
          snapshot.statMedian || snapshot.statLow || snapshot.statHigh || null;
      }
      logger.debug('Returning market stat from database', {
        releaseId,
        statistic,
        result,
      });
      return result;
    } catch (error) {
      logger.debug('Failed to fetch market stat from database', {
        releaseId,
        error: error.message,
      });
      return null;
    }
  }

  async _getMarketStat(releaseId, source, statistic) {
    try {
      const stat = statistic.toLowerCase();

      if (source === 'DISCOGS') {
        const data = await discogsService.getPriceStatistics(
          parseInt(releaseId)
        );
        return data?.[stat] || null;
      }

      if (source === 'EBAY') {
        const data = await ebayService.getPriceStatistics({ query: releaseId });
        return data?.[stat] || null;
      }

      if (source === 'HYBRID') {
        return await this._getHybridMarketStat(releaseId, stat);
      }

      return null;
    } catch (error) {
      logger.warn('Failed to fetch market stat', {
        releaseId,
        source,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get hybrid market statistic (average of Discogs and eBay)
   * @private
   * @param {string} releaseId
   * @param {string} statistic
   * @returns {Promise<number>} Average price
   */
  async _getHybridMarketStat(releaseId, statistic) {
    let discogsPrice = null;
    let ebayPrice = null;

    try {
      const discogsData = await discogsService.getPriceStatistics(
        parseInt(releaseId)
      );
      discogsPrice = discogsData?.[statistic];
    } catch (error) {
      logger.debug('Discogs data unavailable for hybrid pricing', {
        releaseId,
      });
    }

    try {
      const ebayData = await ebayService.getPriceStatistics({
        query: releaseId,
      });
      ebayPrice = ebayData?.[statistic];
    } catch (error) {
      logger.debug('eBay data unavailable for hybrid pricing', { releaseId });
    }

    // Return average if both available
    if (discogsPrice && ebayPrice) {
      return (discogsPrice + ebayPrice) / 2;
    }

    // Fallback to whichever is available
    return discogsPrice || ebayPrice || null;
  }

  /**
   * Validate condition enum value
   * @private
   * @param {string} condition
   * @throws {ApiError} If condition is invalid
   */
  _validateCondition(condition) {
    const validConditions = [
      'MINT',
      'NM',
      'VG_PLUS',
      'VG',
      'VG_MINUS',
      'G',
      'FAIR',
      'POOR',
    ];
    if (!validConditions.includes(condition)) {
      throw new ApiError(
        `Invalid condition: ${condition}. Must be one of: ${validConditions.join(', ')}`,
        400
      );
    }
  }
}

export default new PricingService();
