import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import { getCached, setCached } from '../utils/cache.js';

/**
 * Recommendation Service
 * Provides recommendation algorithms including similar items, personalized, and new arrivals
 */
class RecommendationService {
  /**
   * Get similar item recommendations based on genre, era, and artist
   * Uses a weighted scoring algorithm to rank items by relevance
   *
   * @param {string} releaseId - Current release ID
   * @param {Object} options - Options
   * @param {number} options.limit - Number of recommendations (default: 5)
   * @param {string} options.abVariant - A/B test variant (control, experimental, etc.)
   * @returns {Promise<Object>} Similar items with scores
   */
  async getSimilarItems(releaseId, options = {}) {
    try {
      const { limit = 5, abVariant = 'control' } = options;

      if (limit > 50) {
        throw new ApiError('Limit cannot exceed 50', 400);
      }

      // Check cache first
      const cacheKey = `recommendations:similar:${releaseId}:${abVariant}`;
      const cached = getCached(cacheKey);
      if (cached) {
        logger.debug('Cache hit for similar items recommendations', {
          releaseId,
        });
        return cached;
      }

      // Get the current release
      const currentRelease = await prisma.release.findUnique({
        where: { id: releaseId },
        select: {
          id: true,
          genre: true,
          artist: true,
          releaseYear: true,
        },
      });

      if (!currentRelease) {
        throw new ApiError('Release not found', 404);
      }

      // Find candidates: same genre or artist, different release
      const candidates = await prisma.inventoryLot.findMany({
        where: {
          AND: [
            { status: 'LIVE' },
            {
              release: {
                AND: [
                  { id: { not: releaseId } },
                  {
                    OR: [
                      { genre: currentRelease.genre },
                      { artist: currentRelease.artist },
                    ],
                  },
                ],
              },
            },
          ],
        },
        include: {
          release: {
            select: {
              id: true,
              title: true,
              artist: true,
              genre: true,
              releaseYear: true,
              coverArtUrl: true,
            },
          },
        },
        take: limit * 3, // Get more to score and filter
      });

      // Score and rank recommendations
      const scored = candidates.map((item) => ({
        ...item,
        _score: this._calculateSimilarityScore(
          currentRelease,
          item.release,
          abVariant
        ),
      }));

      // Sort by score and take top N
      const recommended = scored
        .sort((a, b) => b._score - a._score)
        .slice(0, limit)
        .map(({ _score, ...item }) => ({
          ...item,
          _relevanceScore: _score,
        }));

      const result = {
        releaseId,
        recommendations: recommended,
        algorithm: 'similarity-scoring',
        abVariant,
        count: recommended.length,
        generatedAt: new Date(),
      };

      // Cache for 1 hour
      setCached(cacheKey, result, 3600);
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting similar items', {
        releaseId,
        error: error.message,
      });
      throw new ApiError('Failed to get similar items', 500);
    }
  }

  /**
   * Get new arrivals recommendations
   * Returns recently listed items from the past N days
   *
   * @param {Object} options - Options
   * @param {number} options.limit - Number of recommendations (default: 10)
   * @param {number} options.daysBack - How many days back to look (default: 30)
   * @param {string} options.genre - Optional genre filter
   * @param {string} options.abVariant - A/B test variant
   * @returns {Promise<Object>} New arrivals
   */
  async getNewArrivals(options = {}) {
    try {
      const {
        limit = 10,
        daysBack = 30,
        genre = null,
        abVariant = 'control',
      } = options;

      if (limit > 100) {
        throw new ApiError('Limit cannot exceed 100', 400);
      }

      // Check cache
      const cacheKey = `recommendations:new-arrivals:${genre || 'all'}:${abVariant}`;
      const cached = getCached(cacheKey);
      if (cached) {
        logger.debug('Cache hit for new arrivals', { genre });
        return cached;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const where = {
        AND: [
          { status: 'LIVE' },
          { listedAt: { gte: cutoffDate } },
          genre ? { release: { genre } } : {},
        ],
      };

      const items = await prisma.inventoryLot.findMany({
        where,
        include: {
          release: {
            select: {
              id: true,
              title: true,
              artist: true,
              genre: true,
              releaseYear: true,
              coverArtUrl: true,
            },
          },
        },
        orderBy: { listedAt: 'desc' },
        take: limit,
      });

      const result = {
        recommendations: items.map((item) => ({
          ...item,
          _daysListed: this._daysSince(item.listedAt),
        })),
        genre: genre || 'all',
        algorithm: 'new-arrivals',
        abVariant,
        count: items.length,
        generatedAt: new Date(),
      };

      // Cache for 4 hours
      setCached(cacheKey, result, 14400);
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting new arrivals', { error: error.message });
      throw new ApiError('Failed to get new arrivals', 500);
    }
  }

  /**
   * Get personalized recommendations based on wishlist
   * Returns items similar to wishlist items
   *
   * @param {Array<string>} wishlistItemIds - List of wishlist inventory lot IDs
   * @param {Object} options - Options
   * @param {number} options.limit - Number of recommendations (default: 10)
   * @param {string} options.abVariant - A/B test variant
   * @returns {Promise<Object>} Personalized recommendations
   */
  async getPersonalizedRecommendations(wishlistItemIds, options = {}) {
    try {
      const { limit = 10, abVariant = 'control' } = options;

      if (!wishlistItemIds || wishlistItemIds.length === 0) {
        // Return new arrivals if no wishlist
        return this.getNewArrivals({ limit, abVariant });
      }

      if (limit > 100) {
        throw new ApiError('Limit cannot exceed 100', 400);
      }

      // Get wishlist release IDs
      const wishlistItems = await prisma.inventoryLot.findMany({
        where: { id: { in: wishlistItemIds } },
        include: { release: true },
      });

      if (wishlistItems.length === 0) {
        return this.getNewArrivals({ limit, abVariant });
      }

      // Extract genres and artists from wishlist
      const wishlistGenres = new Set();
      const wishlistArtists = new Set();
      const wishlistReleaseIds = new Set();

      wishlistItems.forEach((item) => {
        if (item.release.genre) wishlistGenres.add(item.release.genre);
        if (item.release.artist) wishlistArtists.add(item.release.artist);
        wishlistReleaseIds.add(item.release.id);
      });

      // Find similar items
      const recommendations = await prisma.inventoryLot.findMany({
        where: {
          AND: [
            { status: 'LIVE' },
            {
              release: {
                AND: [
                  { id: { notIn: Array.from(wishlistReleaseIds) } },
                  {
                    OR: [
                      { genre: { in: Array.from(wishlistGenres) } },
                      { artist: { in: Array.from(wishlistArtists) } },
                    ],
                  },
                ],
              },
            },
          ],
        },
        include: {
          release: {
            select: {
              id: true,
              title: true,
              artist: true,
              genre: true,
              releaseYear: true,
              coverArtUrl: true,
            },
          },
        },
        take: limit * 2,
      });

      // Score based on wishlist matches
      const scored = recommendations.map((item) => ({
        ...item,
        _score: this._calculatePersonalizationScore(
          item.release,
          Array.from(wishlistGenres),
          Array.from(wishlistArtists)
        ),
      }));

      const result = {
        recommendations: scored
          .sort((a, b) => b._score - a._score)
          .slice(0, limit)
          .map(({ _score, ...item }) => ({
            ...item,
            _relevanceScore: _score,
          })),
        algorithm: 'personalized',
        abVariant,
        count: scored.length,
        generatedAt: new Date(),
      };

      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting personalized recommendations', {
        error: error.message,
      });
      throw new ApiError('Failed to get personalized recommendations', 500);
    }
  }

  /**
   * Get recommendation variants for A/B testing
   * Returns multiple algorithm variants to test effectiveness
   *
   * @param {string} releaseId - Current release ID (for similar items)
   * @param {Object} options - Options
   * @param {number} options.limit - Recommendations per variant (default: 5)
   * @returns {Promise<Object>} Multiple recommendation variants
   */
  async getRecommendationVariants(releaseId, options = {}) {
    try {
      const { limit = 5 } = options;

      logger.debug('Generating A/B test variants', { releaseId });

      // Generate control variant (similar items)
      const controlVariant = await this.getSimilarItems(releaseId, {
        limit,
        abVariant: 'control',
      });

      // Generate experimental variant (similar items with different scoring)
      const experimentalVariant = await this.getSimilarItems(releaseId, {
        limit,
        abVariant: 'experimental',
      });

      // Experimental variant uses a different scoring mechanism
      // In the _calculateSimilarityScore, we adjust weights based on variant

      return {
        releaseId,
        variants: [
          {
            name: 'control',
            description: 'Standard similarity scoring',
            recommendations: controlVariant.recommendations,
            algorithm: 'similarity-scoring',
          },
          {
            name: 'experimental',
            description: 'Enhanced genre-weighted scoring',
            recommendations: experimentalVariant.recommendations,
            algorithm: 'similarity-scoring-v2',
          },
        ],
        trackingId: `${releaseId}-${Date.now()}`,
        generatedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error generating recommendation variants', {
        releaseId,
        error: error.message,
      });
      throw new ApiError('Failed to generate recommendation variants', 500);
    }
  }

  /**
   * Record recommendation click for conversion tracking
   * Used for A/B testing and analytics
   *
   * @param {Object} clickData - Click tracking data
   * @param {string} clickData.recommendationTrackingId - Tracking ID
   * @param {string} clickData.variantName - Variant that was clicked
   * @param {string} clickData.itemId - Item that was clicked
   * @param {string} clickData.buyerId - Buyer identifier
   * @returns {Promise<Object>} Click recorded
   */
  async recordRecommendationClick(clickData) {
    try {
      const { recommendationTrackingId, variantName, itemId, buyerId } =
        clickData;

      if (!recommendationTrackingId || !variantName || !itemId) {
        throw new ApiError('trackingId, variant, and itemId are required', 400);
      }

      // In production, this would write to a RecommendationClick model
      logger.info('Recommendation click recorded', {
        trackingId: recommendationTrackingId,
        variant: variantName,
        itemId,
        buyerId: buyerId || 'anonymous',
        timestamp: new Date(),
      });

      return {
        success: true,
        trackingId: recommendationTrackingId,
        variant: variantName,
        itemId,
        recordedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error recording recommendation click', {
        error: error.message,
      });
      throw new ApiError('Failed to record click', 500);
    }
  }

  /**
   * Calculate similarity score between two releases
   * @private
   */
  _calculateSimilarityScore(currentRelease, candidateRelease, abVariant) {
    let score = 0;

    // Genre match (primary factor)
    if (
      currentRelease.genre &&
      candidateRelease.genre === currentRelease.genre
    ) {
      score += abVariant === 'experimental' ? 60 : 40; // Experimental weights genre higher
    }

    // Artist match (secondary factor)
    if (
      currentRelease.artist &&
      candidateRelease.artist === currentRelease.artist
    ) {
      score += 30;
    }

    // Era match (within 10 years) - tertiary factor
    if (
      currentRelease.releaseYear &&
      candidateRelease.releaseYear &&
      Math.abs(currentRelease.releaseYear - candidateRelease.releaseYear) <= 10
    ) {
      score += 15;
    }

    // Slight randomization for experimental variant to create diversity
    if (abVariant === 'experimental') {
      score += Math.random() * 5; // Add 0-5 random points
    }

    return score;
  }

  /**
   * Calculate personalization score based on wishlist preferences
   * @private
   */
  _calculatePersonalizationScore(release, wishedGenres, wishedArtists) {
    let score = 0;

    // Genre match
    if (release.genre && wishedGenres.includes(release.genre)) {
      score += 50;
    }

    // Artist match
    if (release.artist && wishedArtists.includes(release.artist)) {
      score += 40;
    }

    // Bonus for recent items
    if (release.createdAt) {
      const daysOld = Math.floor(
        (Date.now() - release.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysOld < 30) {
        score += Math.max(10 - Math.floor(daysOld / 3), 0);
      }
    }

    return score;
  }

  /**
   * Calculate days since a date
   * @private
   */
  _daysSince(date) {
    if (!date) return null;
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export default new RecommendationService();
