import axios from 'axios';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import { getOrSet, generateCacheKey } from '../utils/cache.js';

const EBAY_API_BASE = 'https://api.ebay.com';
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;

/**
 * eBay API Integration Service
 * Handles search, sold listings, and price data from eBay
 */
class EbayService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;

    this.client = axios.create({
      baseURL: EBAY_API_BASE,
      timeout: 10000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          logger.warn('eBay rate limit exceeded, backing off');
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Get OAuth2 access token from eBay
   * Tokens are cached for their lifetime to avoid repeated requests
   * @returns {Promise<string>} - Valid eBay OAuth2 token
   */
  async getAccessToken() {
    try {
      // Return cached token if still valid
      if (this.accessToken && this.tokenExpiry > Date.now()) {
        return this.accessToken;
      }

      if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
        logger.warn('eBay credentials not configured');
        throw new ApiError('eBay API not configured', 503);
      }

      const auth = Buffer.from(
        `${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`,
      ).toString('base64');

      const response = await axios.post(
        'https://api.ebay.com/identity/v1/oauth2/token',
        'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000; // Refresh 1 min before expiry

      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get eBay access token', { error: error.message });
      throw new ApiError('Failed to authenticate with eBay', 503);
    }
  }

  /**
   * Search for items on eBay
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query (title, keywords)
   * @param {string} params.category - eBay category filter (optional)
   * @param {number} params.limit - Number of results (default: 20)
   * @param {number} params.offset - Pagination offset (default: 0)
   * @returns {Promise<Object>} - Search results
   */
  async search(params) {
    try {
      const { query, category, limit = 20, offset = 0 } = params;

      if (!query) {
        throw new ApiError('Search query is required', 400);
      }

      const cacheKey = generateCacheKey('ebay', 'search', params);

      return await getOrSet(
        cacheKey,
        async () => {
          const token = await this.getAccessToken();

          // Build eBay API search filter
          const filter = [query];
          if (category) {
            filter.push(`categoryIds:{${category}}`);
          }

          const response = await this.client.get(
            '/buy/browse/v1/item_summary/search',
            {
              params: {
                q: query,
                limit: Math.min(limit, 100), // eBay max is 100
                offset,
                sort: '-price',
              },
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          return {
            results: (response.data.itemSummaries || []).map((item) => ({
              id: item.itemId,
              title: item.title,
              price: item.price?.value,
              currency: item.price?.currency,
              image: item.image?.imageUrl,
              condition: item.condition,
              seller: item.seller?.username,
              itemWebUrl: item.itemWebUrl,
            })),
            total: response.data.total || 0,
            limit,
            offset,
          };
        },
        3600, // Cache for 1 hour
      );
    } catch (error) {
      if (error.isApiError) throw error;
      logger.error('eBay search failed', { error: error.message });
      throw new ApiError('Failed to search eBay', 500);
    }
  }

  /**
   * Get sold listings for similar items (for price comparables)
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query for similar items
   * @param {number} params.limit - Number of sold listings (default: 20)
   * @returns {Promise<Object>} - Sold listings
   */
  async getSoldListings(params) {
    try {
      const { query, limit = 20 } = params;

      if (!query) {
        throw new ApiError('Search query is required', 400);
      }

      const cacheKey = generateCacheKey('ebay', 'sold_listings', params);

      return await getOrSet(
        cacheKey,
        async () => {
          const token = await this.getAccessToken();

          // Search for completed/sold listings
          const response = await this.client.get(
            '/buy/browse/v1/item_summary/search',
            {
              params: {
                q: query,
                limit: Math.min(limit, 100),
                filter: 'buyingOptions:{AUCTION}',
                sort: '-endDate',
              },
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          return {
            soldListings: (response.data.itemSummaries || []).map((item) => ({
              id: item.itemId,
              title: item.title,
              soldPrice: item.price?.value,
              currency: item.price?.currency,
              condition: item.condition,
              sellerRating: item.seller?.sellerAccountStatus,
            })),
            total: response.data.total || 0,
          };
        },
        1800, // Cache for 30 minutes (sold listings change more frequently)
      );
    } catch (error) {
      if (error.isApiError) throw error;

      // eBay API might return 400 if no results - treat gracefully
      if (error.response?.status === 400) {
        logger.debug('No sold listings found', { query: params.query });
        return {
          soldListings: [],
          total: 0,
          note: 'No sold listings available for this search',
        };
      }

      logger.error('Failed to fetch eBay sold listings', {
        error: error.message,
      });
      throw new ApiError('Failed to fetch sold listings', 500);
    }
  }

  /**
   * Get price statistics from sold listings
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query for similar items
   * @returns {Promise<Object>} - Price statistics
   */
  async getPriceStatistics(params) {
    try {
      const { query } = params;

      if (!query) {
        throw new ApiError('Search query is required', 400);
      }

      const listings = await this.getSoldListings({
        query,
        limit: 50,
      });

      if (!listings.soldListings || listings.soldListings.length === 0) {
        return {
          query,
          currency: 'USD',
          lowest: null,
          highest: null,
          average: null,
          median: null,
          sampleSize: 0,
          note: 'No sold listings available',
        };
      }

      // Extract prices
      const prices = listings.soldListings
        .map((item) => parseFloat(item.soldPrice))
        .filter((p) => !isNaN(p))
        .sort((a, b) => a - b);

      if (prices.length === 0) {
        return {
          query,
          currency: 'USD',
          lowest: null,
          highest: null,
          average: null,
          median: null,
          sampleSize: 0,
        };
      }

      const sum = prices.reduce((a, b) => a + b, 0);
      const avg = sum / prices.length;
      const mid = Math.floor(prices.length / 2);
      const median =
        prices.length % 2 !== 0
          ? prices[mid]
          : (prices[mid - 1] + prices[mid]) / 2;

      return {
        query,
        currency: 'USD',
        lowest: Math.min(...prices),
        highest: Math.max(...prices),
        average: parseFloat(avg.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        sampleSize: prices.length,
      };
    } catch (error) {
      if (error.isApiError) throw error;
      logger.error('Failed to calculate eBay price statistics', {
        error: error.message,
      });
      throw new ApiError('Failed to calculate price statistics', 500);
    }
  }

  /**
   * Search eBay and get enriched data with price statistics
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @returns {Promise<Object>} - Enriched search results with pricing
   */
  async searchEnriched(params) {
    try {
      const { query } = params;

      const [searchResults, priceStats] = await Promise.all([
        this.search({ query, limit: 10 }),
        this.getPriceStatistics({ query }),
      ]);

      return {
        results: searchResults.results,
        priceStatistics: priceStats,
        total: searchResults.total,
      };
    } catch (error) {
      if (error.isApiError) throw error;
      logger.error('eBay enriched search failed', { error: error.message });
      throw new ApiError('Failed to perform enriched search', 500);
    }
  }
}

export default new EbayService();
