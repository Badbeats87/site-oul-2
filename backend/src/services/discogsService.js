import axios from 'axios';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import { getOrSet, generateCacheKey } from '../utils/cache.js';

const DISCOGS_API_BASE = 'https://api.discogs.com';
const DISCOGS_TOKEN = process.env.DISCOGS_API_TOKEN;

/**
 * Discogs API Integration Service
 * Handles search, metadata fetching, and price data from Discogs
 */
class DiscogsService {
  constructor() {
    this.client = axios.create({
      baseURL: DISCOGS_API_BASE,
      timeout: 10000,
      headers: {
        'User-Agent': 'VinylCatalogAPI/1.0',
      },
    });

    // Add request interceptor for auth and rate limiting
    this.client.interceptors.request.use((config) => {
      if (DISCOGS_TOKEN) {
        config.headers['Authorization'] = `Discogs token=${DISCOGS_TOKEN}`;
      }
      return config;
    });

    // Add response interceptor for error handling and rate limiting
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          logger.warn('Discogs rate limit exceeded, backing off');
          // Could implement exponential backoff here
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Search for releases on Discogs
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query (title, artist, etc.)
   * @param {string} params.barcode - UPC/barcode (optional)
   * @param {number} params.year - Release year (optional)
   * @param {number} params.page - Page number for pagination
   * @returns {Promise<Object>} - Search results
   */
  async search(params) {
    try {
      const { query, barcode, year, page = 1 } = params;

      if (!query && !barcode) {
        throw new ApiError('Either query or barcode is required', 400);
      }

      const cacheKey = generateCacheKey('discogs', 'search', params);

      return await getOrSet(
        cacheKey,
        async () => {
          const searchParams = { type: 'release', per_page: 20, page };

          if (query) {
            searchParams.q = query;
          }
          if (barcode) {
            searchParams.barcode = barcode;
          }
          if (year) {
            searchParams.year = year;
          }

          const response = await this.client.get('/database/search', {
            params: searchParams,
          });

          return {
            results: response.data.results.map((result) => ({
              id: result.id,
              title: result.title,
              type: result.type,
              resource_url: result.resource_url,
              uri: result.uri,
              basic_information: result.basic_information,
            })),
            pagination: {
              page: response.data.pagination.page,
              per_page: response.data.pagination.per_page,
              items: response.data.pagination.items,
              urls: response.data.pagination.urls,
            },
          };
        },
        3600 // Cache for 1 hour
      );
    } catch (error) {
      if (error.isApiError) throw error;
      logger.error('Discogs search failed', { error: error.message });
      throw new ApiError('Failed to search Discogs', 500);
    }
  }

  /**
   * Get detailed metadata for a specific release
   * @param {number} releaseId - Discogs release ID
   * @returns {Promise<Object>} - Release metadata
   */
  async getRelease(releaseId) {
    try {
      if (!releaseId || typeof releaseId !== 'number') {
        throw new ApiError('Invalid release ID', 400);
      }

      const cacheKey = generateCacheKey('discogs', `release_${releaseId}`, {});

      return await getOrSet(
        cacheKey,
        async () => {
          const response = await this.client.get(`/releases/${releaseId}`);

          return {
            id: response.data.id,
            title: response.data.title,
            artists: response.data.artists.map((a) => ({
              name: a.name,
              resource_url: a.resource_url,
            })),
            year: response.data.year,
            genres: response.data.genres,
            styles: response.data.styles,
            formats: response.data.formats.map((f) => ({
              name: f.name,
              qty: f.qty,
              descriptions: f.descriptions,
            })),
            labels: response.data.labels.map((l) => ({
              name: l.name,
              catalog_number: l.catalog_number,
              resource_url: l.resource_url,
            })),
            tracklist: response.data.tracklist.map((t) => ({
              position: t.position,
              title: t.title,
              duration: t.duration,
            })),
            images: response.data.images.map((i) => ({
              type: i.type,
              uri: i.uri,
              resource_url: i.resource_url,
              uri150: i.uri150,
            })),
            community: {
              have: response.data.community?.have,
              want: response.data.community?.want,
              rating: response.data.community?.rating?.average,
              votes: response.data.community?.rating?.count,
            },
            resource_url: response.data.resource_url,
            uri: response.data.uri,
          };
        },
        7200 // Cache for 2 hours
      );
    } catch (error) {
      if (error.isApiError) throw error;
      logger.error('Failed to fetch Discogs release', {
        releaseId,
        error: error.message,
      });
      throw new ApiError('Failed to fetch release metadata', 500);
    }
  }

  /**
   * Get price statistics for a release from sold listings
   * @param {number} releaseId - Discogs release ID
   * @returns {Promise<Object>} - Price statistics
   */
  async getPriceStatistics(releaseId) {
    try {
      if (!releaseId || typeof releaseId !== 'number') {
        throw new ApiError('Invalid release ID', 400);
      }

      const cacheKey = generateCacheKey('discogs', `prices_${releaseId}`, {});

      return await getOrSet(
        cacheKey,
        async () => {
          // Fetch the release to get market data
          const release = await this.getRelease(releaseId);

          if (!release) {
            throw new ApiError('Release not found', 404);
          }

          // Try to get price data from the community stats
          // Discogs includes price info in the marketplace stats
          const statsResponse = await this.client.get(
            `/releases/${releaseId}/stats`
          );

          const priceData = statsResponse.data.prices;

          return {
            release_id: releaseId,
            currency: priceData.currency,
            lowest: parseFloat(priceData.lowest) || null,
            highest: parseFloat(priceData.highest) || null,
            average: parseFloat(priceData.average) || null,
            median: parseFloat(priceData.median) || null,
          };
        },
        1800 // Cache for 30 minutes (prices change more frequently)
      );
    } catch (error) {
      if (error.isApiError) throw error;

      // If stats endpoint doesn't exist, return minimal data
      if (error.response?.status === 404) {
        logger.debug('Price stats not available for release', { releaseId });
        return {
          release_id: releaseId,
          currency: 'USD',
          lowest: null,
          highest: null,
          average: null,
          median: null,
          note: 'Price data not available',
        };
      }

      logger.error('Failed to fetch price statistics', {
        releaseId,
        error: error.message,
      });
      throw new ApiError('Failed to fetch price statistics', 500);
    }
  }

  /**
   * Search and return enriched release data
   * Combines search results with metadata and pricing
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} - Enriched releases
   */
  async searchEnriched(params) {
    try {
      const searchResults = await this.search(params);

      // Enrich with metadata for top results (limit to 5 to avoid rate limiting)
      const enrichedResults = await Promise.all(
        searchResults.results.slice(0, 5).map(async (result) => {
          try {
            const [metadata, prices] = await Promise.all([
              this.getRelease(result.id),
              this.getPriceStatistics(result.id),
            ]);

            return {
              ...result,
              metadata,
              prices,
            };
          } catch (error) {
            logger.warn('Failed to enrich search result', {
              resultId: result.id,
              error: error.message,
            });
            return result;
          }
        })
      );

      return {
        results: enrichedResults,
        pagination: searchResults.pagination,
      };
    } catch (error) {
      if (error.isApiError) throw error;
      logger.error('Enriched search failed', { error: error.message });
      throw new ApiError('Failed to perform enriched search', 500);
    }
  }
}

export default new DiscogsService();
