import axios from 'axios';
import crypto from 'crypto';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import { getOrSet, generateCacheKey } from '../utils/cache.js';
import discogsOAuthService from './discogsOAuthService.js';

const DISCOGS_API_BASE = 'https://api.discogs.com';

// Get token dynamically to support runtime environment variable loading
const getDiscogsToken = () => process.env.DISCOGS_API_TOKEN;

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
      const token = getDiscogsToken();
      if (token) {
        config.headers['Authorization'] = `Discogs token=${token}`;
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
          // Search for master releases first (have better marketplace data)
          const masterSearchParams = {
            type: 'master',
            per_page: 20,
            page,
          };

          if (query) {
            masterSearchParams.q = query;
          }
          if (barcode) {
            masterSearchParams.barcode = barcode;
          }
          if (year) {
            masterSearchParams.year = year;
          }

          let response = await this.client.get('/database/search', {
            params: masterSearchParams,
          });

          // If no master results, fallback to release search
          if (!response.data.results || response.data.results.length === 0) {
            masterSearchParams.type = 'release';
            response = await this.client.get('/database/search', {
              params: masterSearchParams,
            });
          }

          return {
            results: response.data.results.map((result) => ({
              id: result.id,
              title: result.title,
              type: result.type, // 'master' or 'release'
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
   * Get first release variation from a master release
   * @param {number} masterId - Discogs master ID
   * @returns {Promise<number>} - Release ID of first variation
   */
  async getFirstReleaseFromMaster(masterId) {
    try {
      const cacheKey = generateCacheKey('discogs', `master_first_release_${masterId}`, {});

      return await getOrSet(
        cacheKey,
        async () => {
          const response = await this.client.get(`/masters/${masterId}/versions`, {
            params: { per_page: 1 },
          });

          if (response.data.versions && response.data.versions.length > 0) {
            return response.data.versions[0].id;
          }

          throw new ApiError('No release variations found for master', 404);
        },
        3600 // Cache for 1 hour
      );
    } catch (error) {
      if (error.isApiError) throw error;
      logger.debug('Failed to get first release from master', {
        masterId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get master release metadata
   * @param {number} masterId - Discogs master ID
   * @returns {Promise<Object>} - Master metadata
   */
  async getMaster(masterId) {
    try {
      if (!masterId || typeof masterId !== 'number') {
        throw new ApiError('Invalid master ID', 400);
      }

      const cacheKey = generateCacheKey('discogs', `master_${masterId}`, {});

      return await getOrSet(
        cacheKey,
        async () => {
          const response = await this.client.get(`/masters/${masterId}`);

          return {
            id: response.data.id,
            title: response.data.title,
            artists: response.data.artists?.map((a) => ({
              name: a.name,
              resource_url: a.resource_url,
            })) || [],
            year: response.data.year,
            genres: response.data.genres,
            styles: response.data.styles,
            images: response.data.images?.map((i) => ({
              type: i.type,
              uri: i.uri,
              resource_url: i.resource_url,
              uri150: i.uri150,
            })) || [],
            resource_url: response.data.resource_url,
            uri: response.data.uri,
          };
        },
        7200 // Cache for 2 hours
      );
    } catch (error) {
      if (error.isApiError) throw error;
      logger.error('Failed to fetch Discogs master', {
        masterId,
        error: error.message,
      });
      throw new ApiError('Failed to fetch master metadata', 500);
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
   * Build OAuth 1.0a signed request for marketplace endpoints
   * @private
   */
  _buildOAuthHeader(method, url, oauthToken, oauthTokenSecret, consumerSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const params = {
      oauth_consumer_key: process.env.DISCOGS_CONSUMER_KEY,
      oauth_nonce: nonce,
      oauth_signature_method: 'PLAINTEXT',
      oauth_timestamp: timestamp,
      oauth_token: oauthToken,
      oauth_version: '1.0',
    };

    // PLAINTEXT signature: consumer_secret&token_secret
    params.oauth_signature = `${consumerSecret}&${oauthTokenSecret}`;

    // Build Authorization header
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}="${encodeURIComponent(params[key])}"`)
      .join(',');

    return `OAuth ${sortedParams}`;
  }

  /**
   * Get marketplace statistics for a release
   * Returns current marketplace state including lowest price and number for sale
   * @param {number} releaseId - Discogs release ID
   * @param {string} currencyCode - Optional currency code (e.g., 'EUR', 'USD', 'CAD')
   * @returns {Promise<Object>} - Marketplace statistics with pricing
   */
  async getMarketplaceStats(releaseId, currencyCode = 'USD') {
    try {
      if (!releaseId || typeof releaseId !== 'number') {
        throw new ApiError('Invalid release ID', 400);
      }

      const cacheKey = generateCacheKey('discogs', `marketplace_stats_${releaseId}_${currencyCode}`, {});

      return await getOrSet(
        cacheKey,
        async () => {
          try {
            logger.debug('Fetching marketplace stats', { releaseId, currencyCode });

            // Get OAuth token if available for authenticated requests
            const oauthToken = await discogsOAuthService.getLatestAccessToken();

            let headers = {
              'User-Agent': 'VinylCatalogAPI/1.0',
            };

            if (oauthToken && oauthToken.accessToken) {
              const authHeader = this._buildOAuthHeader(
                'GET',
                `${DISCOGS_API_BASE}/marketplace/stats/${releaseId}`,
                oauthToken.accessToken,
                oauthToken.accessTokenSecret,
                process.env.DISCOGS_CONSUMER_SECRET
              );
              headers['Authorization'] = authHeader;
            } else {
              // Fallback to token authentication
              const token = getDiscogsToken();
              if (token) {
                headers['Authorization'] = `Discogs token=${token}`;
              }
            }

            const url = `${DISCOGS_API_BASE}/marketplace/stats/${releaseId}?curr_abbr=${currencyCode}`;

            const response = await axios.get(url, { headers });

            logger.debug('Marketplace stats response', {
              releaseId,
              hasData: !!response.data,
              numForSale: response.data?.num_for_sale,
              lowestPrice: response.data?.lowest_price,
            });

            // If no listings available, return null
            if (!response.data.lowest_price || response.data.num_for_sale === 0) {
              return null;
            }

            return {
              release_id: releaseId,
              currency: currencyCode,
              lowest: parseFloat(response.data.lowest_price),
              num_for_sale: response.data.num_for_sale,
              blocked: response.data.blocked_from_sale || false,
            };
          } catch (statsError) {
            logger.debug('Failed to fetch marketplace stats', {
              releaseId,
              error: statsError.message,
            });
            return null;
          }
        },
        1800 // Cache for 30 minutes (marketplace prices change frequently)
      );
    } catch (error) {
      if (error.isApiError) throw error;
      logger.debug('Failed to process marketplace stats', {
        releaseId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get marketplace price suggestions for a release (requires OAuth)
   * @param {number} releaseId - Discogs release ID
   * @returns {Promise<Object>} - Price suggestions with marketplace data
   */
  async getPriceSuggestions(releaseId) {
    try {
      if (!releaseId || typeof releaseId !== 'number') {
        throw new ApiError('Invalid release ID', 400);
      }

      const cacheKey = generateCacheKey('discogs', `price_suggestions_${releaseId}`, {});

      return await getOrSet(
        cacheKey,
        async () => {
          try {
            // Try to use OAuth token for marketplace access
            const oauthToken = await discogsOAuthService.getLatestAccessToken();

            logger.debug('OAuth token lookup result', {
              releaseId,
              hasToken: !!oauthToken,
              tokenUser: oauthToken?.discogsUsername,
            });

            if (oauthToken && oauthToken.accessToken) {
              logger.debug('Using OAuth token for marketplace price suggestions', { releaseId });

              const url = `${DISCOGS_API_BASE}/marketplace/price_suggestions/${releaseId}`;
              const authHeader = this._buildOAuthHeader(
                'GET',
                url,
                oauthToken.accessToken,
                oauthToken.accessTokenSecret,
                process.env.DISCOGS_CONSUMER_SECRET
              );

              const response = await axios.get(url, {
                headers: {
                  'Authorization': authHeader,
                  'User-Agent': 'VinylCatalogAPI/1.0',
                },
              });

              // Price suggestions response format:
              // { "Mint (M)": {"value": 50, "currency": "USD"}, ... }
              if (!response.data || Object.keys(response.data).length === 0) {
                return null;
              }

              // Return aggregated price data from all conditions
              const prices = Object.values(response.data).map((p) => p.value).filter((v) => v);
              if (prices.length === 0) return null;

              return {
                release_id: releaseId,
                currency: Object.values(response.data)[0]?.currency || 'USD',
                lowest: Math.min(...prices),
                highest: Math.max(...prices),
                average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100,
                median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
              };
            } else {
              logger.debug('No OAuth token available for marketplace pricing, falling back to stats', {
                releaseId,
              });
              return null;
            }
          } catch (suggestionError) {
            // If price suggestions fail, fall back to stats endpoint
            logger.debug('OAuth marketplace price suggestions failed', {
              releaseId,
              error: suggestionError.message,
            });
            return null;
          }
        },
        1800 // Cache for 30 minutes
      );
    } catch (error) {
      if (error.isApiError) throw error;
      logger.debug('Failed to fetch price suggestions', {
        releaseId,
        error: error.message,
      });
      return null;
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

          logger.debug('Discogs price stats raw response', {
            releaseId,
            fullResponse: statsResponse.data,
            pricesObject: priceData,
            pricesKeys: priceData ? Object.keys(priceData) : null,
          });

          logger.debug('Discogs price stats fetched', {
            releaseId,
            hasData: !!priceData,
            currency: priceData?.currency,
          });

          // If no price data available, return null values
          if (!priceData) {
            return {
              release_id: releaseId,
              currency: null,
              lowest: null,
              highest: null,
              average: null,
              median: null,
              note: 'Price data not available for this release',
            };
          }

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

      logger.error('Failed to fetch price statistics', {
        releaseId,
        errorStatus: error.response?.status,
        errorMessage: error.message,
      });

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
