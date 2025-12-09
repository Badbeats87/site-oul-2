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
 * Simple request throttler to respect Discogs rate limits
 * Discogs allows 60 requests per minute, so we throttle to ~1 request per 1000ms
 */
class RequestThrottler {
  constructor(minDelayMs = 1000) {
    this.minDelayMs = minDelayMs;
    this.lastRequestTime = 0;
  }

  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelayMs) {
      const delayNeeded = this.minDelayMs - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delayNeeded));
    }
    this.lastRequestTime = Date.now();
  }
}

/**
 * Discogs API Integration Service
 * Handles search, metadata fetching, and price data from Discogs
 */
class DiscogsService {
  constructor() {
    this.throttler = new RequestThrottler(3000); // 3 seconds between requests to respect rate limits
    this.client = axios.create({
      baseURL: DISCOGS_API_BASE,
      timeout: 30000, // 30s timeout to allow for rate limit retries
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
          // Store rate limit info for retry logic
          error.isRateLimited = true;
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Retry with exponential backoff for rate-limited requests
   * @param {Function} fn - Async function to retry
   * @param {number} maxRetries - Maximum number of retries (default: 3)
   * @param {number} baseDelay - Base delay in ms (default: 1000)
   * @returns {Promise} - Result of the function
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Only retry on rate limit (429) errors
        if (error.response?.status !== 429) {
          throw error;
        }

        // Don't retry after last attempt
        if (attempt === maxRetries) {
          throw error;
        }

        // Calculate exponential backoff: baseDelay * 2^attempt
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(
          `Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          {
            endpoint: error.config?.url,
            delay,
          }
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
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

          // Throttle requests to respect Discogs rate limits
          await this.throttler.wait();

          // Search for both masters and releases, combining results
          const masterSearchParams2 = { ...masterSearchParams };
          const releaseSearchParams = { ...masterSearchParams };
          releaseSearchParams.type = 'release';

          let masterResults = [];
          let releaseResults = [];

          // Search for masters
          try {
            const masterResponse = await this.retryWithBackoff(
              () =>
                this.client.get('/database/search', {
                  params: masterSearchParams2,
                }),
              3,
              1500
            );
            masterResults = masterResponse.data.results || [];
            logger.debug('Master search results', {
              query,
              masterCount: masterResults.length,
            });
          } catch (error) {
            logger.warn('Master search failed, continuing with releases', {
              error: error.message,
            });
          }

          // If limited master results, also search for releases
          if (!masterResults || masterResults.length < 5) {
            try {
              await this.throttler.wait();
              const releaseResponse = await this.retryWithBackoff(
                () =>
                  this.client.get('/database/search', {
                    params: releaseSearchParams,
                  }),
                3,
                1500
              );
              releaseResults = releaseResponse.data.results || [];
              logger.debug('Release search results', {
                query,
                releaseCount: releaseResults.length,
              });
            } catch (error) {
              logger.warn('Release search failed', {
                error: error.message,
              });
            }
          }

          // Combine results: masters first, then releases
          // Avoid duplicates by filtering releases that don't have corresponding masters
          const combinedResults = [
            ...masterResults,
            ...releaseResults.filter(
              (rel) =>
                !masterResults.some(
                  (mas) =>
                    mas.id === rel.master_id ||
                    mas.basic_information?.master_id === rel.id
                )
            ),
          ];

          // If we have releases without masters, try to find their masters
          const enrichedResults = await Promise.all(
            combinedResults.map(async (result) => {
              // If it's a release without a master_id, try to find its master
              if (
                result.type === 'release' &&
                !result.master_id &&
                result.resource_url
              ) {
                try {
                  // Extract release ID from resource URL and fetch full details
                  const releaseIdMatch =
                    result.resource_url.match(/\/releases\/(\d+)/);
                  if (releaseIdMatch) {
                    const releaseId = parseInt(releaseIdMatch[1]);
                    await this.throttler.wait();
                    const releaseResponse = await this.client.get(
                      `/releases/${releaseId}`
                    );
                    if (releaseResponse.data.master_id) {
                      logger.debug('Found master_id for release', {
                        releaseId,
                        masterId: releaseResponse.data.master_id,
                      });
                      return {
                        ...result,
                        master_id: releaseResponse.data.master_id,
                      };
                    }
                  }
                } catch (error) {
                  logger.debug('Failed to enrich release with master_id', {
                    releaseId: result.id,
                    error: error.message,
                  });
                }
              }
              return result;
            })
          );

          return {
            results: enrichedResults.map((result) => ({
              id: result.id,
              master_id: result.master_id,
              title: result.title,
              type: result.type, // 'master' or 'release'
              resource_url: result.resource_url,
              uri: result.uri,
              basic_information: result.basic_information,
            })),
            pagination: {
              page: masterResults.length > 0 ? page : 1,
              per_page: 20,
              items: enrichedResults.length,
              urls: {},
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
      const cacheKey = generateCacheKey(
        'discogs',
        `master_first_release_${masterId}`,
        {}
      );

      return await getOrSet(
        cacheKey,
        async () => {
          const response = await this.client.get(
            `/masters/${masterId}/versions`,
            {
              params: { per_page: 1 },
            }
          );

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

          // Also fetch all vinyl versions
          let vinylVersions = [];
          try {
            vinylVersions = await this.getMasterVinylVersions(masterId);
          } catch (error) {
            logger.warn('Failed to fetch vinyl versions for master', {
              masterId,
            });
            // Continue without vinyl versions
          }

          return {
            id: response.data.id,
            title: response.data.title,
            artists:
              response.data.artists?.map((a) => ({
                name: a.name,
                resource_url: a.resource_url,
              })) || [],
            year: response.data.year,
            genres: response.data.genres,
            styles: response.data.styles,
            images:
              response.data.images?.map((i) => ({
                type: i.type,
                uri: i.uri,
                resource_url: i.resource_url,
                uri150: i.uri150,
              })) || [],
            resource_url: response.data.resource_url,
            uri: response.data.uri,
            vinyl_versions: vinylVersions,
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
   * Get all vinyl versions of a master release
   * Useful for getting catalog numbers of all pressings in vinyl format
   * @param {number} masterId - Discogs master ID
   * @returns {Promise<Array>} - Array of vinyl versions with catalog numbers
   */
  async getMasterVinylVersions(masterId) {
    try {
      if (!masterId || typeof masterId !== 'number') {
        throw new ApiError('Invalid master ID', 400);
      }

      const cacheKey = generateCacheKey(
        'discogs',
        `master_versions_${masterId}`,
        {}
      );

      return await getOrSet(
        cacheKey,
        async () => {
          const versions = [];
          let page = 1;
          let hasMore = true;

          // Paginate through all versions
          while (hasMore && page <= 5) {
            // Limit to 5 pages to avoid excessive requests
            try {
              await this.throttler.wait();
              const response = await this.client.get(
                `/masters/${masterId}/versions`,
                {
                  params: {
                    page,
                    per_page: 100,
                  },
                }
              );

              const pageVersions = response.data.versions || [];

              // Filter for vinyl formats only (exclude digital/CD/etc)
              const vinylVersions = pageVersions
                .filter((v) => {
                  const format = v.format?.toLowerCase() || '';
                  // Exclude obvious non-vinyl formats
                  const isNonVinyl =
                    /cd|digital|download|mp3|flac|stream|cassette|vhs|dvd|blu-?ray|box set/i.test(
                      format
                    );

                  if (isNonVinyl) {
                    logger.debug('Skipping non-vinyl version', {
                      format: v.format,
                      catno: v.catno,
                    });
                  }
                  // Include if it's not explicitly non-vinyl
                  return !isNonVinyl;
                })
                .map((v) => ({
                  id: v.id,
                  country: v.country,
                  title: v.title,
                  format: v.format,
                  label: v.label,
                  catno: v.catno,
                  released: v.released,
                  resource_url: v.resource_url,
                }));

              logger.debug('Vinyl versions found', {
                page,
                pageVersionsCount: pageVersions.length,
                vinylVersionsCount: vinylVersions.length,
                allFormats: pageVersions.map((v) => ({
                  catno: v.catno,
                  format: v.format,
                })),
                vinylCatalogNumbers: vinylVersions.map((v) => v.catno),
              });

              versions.push(...vinylVersions);

              // Check if there are more pages
              hasMore = response.data.pagination?.pages > page;
              page++;
            } catch (error) {
              if (error.response?.status === 404) {
                hasMore = false; // No more versions
              } else {
                throw error;
              }
            }
          }

          return versions;
        },
        7200 // Cache for 2 hours
      );
    } catch (error) {
      if (error.isApiError) throw error;
      logger.error('Failed to fetch master versions', {
        masterId,
        error: error.message,
      });
      throw new ApiError('Failed to fetch master versions', 500);
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
          let response;
          let releaseData;

          // Try to fetch as release first
          try {
            response = await this.client.get(`/releases/${releaseId}`);
            releaseData = response.data;
            logger.info('Fetched as release successfully', {
              releaseId,
              resource_url: releaseData.resource_url,
              dataType: releaseData.resource_url?.includes('/releases/')
                ? 'release'
                : 'other',
            });
          } catch (error) {
            // If release fetch fails, try as master
            logger.info('Release not found, trying as master', {
              releaseId,
              error: error.message,
            });
            try {
              response = await this.client.get(`/masters/${releaseId}`);
              releaseData = response.data;
              // Fetch vinyl versions for this master
              let vinylVersions = [];
              try {
                vinylVersions = await this.getMasterVinylVersions(releaseId);
              } catch (e) {
                logger.warn('Failed to fetch vinyl versions for master', {
                  masterId: releaseId,
                  error: e.message,
                });
              }
              return {
                id: releaseData.id,
                master_id: releaseData.id, // Master's ID is its own ID
                title: releaseData.title,
                artists: (releaseData.artists || []).map((a) => ({
                  name: a.name,
                  resource_url: a.resource_url,
                })),
                year: releaseData.year,
                genres: releaseData.genres || [],
                styles: releaseData.styles || [],
                formats: [],
                labels: [],
                tracklist: [],
                images: (releaseData.images || []).map((i) => ({
                  type: i.type,
                  uri: i.uri,
                  resource_url: i.resource_url,
                  uri150: i.uri150,
                })),
                community: {
                  have: releaseData.community?.have,
                  want: releaseData.community?.want,
                  rating: releaseData.community?.rating?.average,
                  votes: releaseData.community?.rating?.count,
                },
                resource_url: releaseData.resource_url,
                uri: releaseData.uri,
                vinyl_versions: vinylVersions,
              };
            } catch (masterError) {
              logger.error('Failed to fetch as both release and master', {
                releaseId,
                releaseError: error.message,
                masterError: masterError.message,
              });
              throw error;
            }
          }

          // Fetch master release if available for better metadata
          let masterData = null;
          let vinylVersions = [];

          // Check if the fetched data is actually a master (by resource_url)
          const isFetchedDataMaster =
            releaseData.resource_url?.includes('/masters/');

          // If what we fetched is actually a master, fetch vinyl versions directly
          if (isFetchedDataMaster) {
            try {
              vinylVersions = await this.getMasterVinylVersions(releaseId);
            } catch (e) {
              logger.warn('Failed to fetch vinyl versions for master', {
                masterId: releaseId,
                error: e.message,
              });
            }
          } else if (releaseData.master_id) {
            try {
              await this.throttler.wait();
              const masterResponse = await this.client.get(
                `/masters/${releaseData.master_id}`
              );
              masterData = masterResponse.data;

              // Also fetch all vinyl versions of this master
              try {
                vinylVersions = await this.getMasterVinylVersions(
                  releaseData.master_id
                );
              } catch (error) {
                logger.warn('Failed to fetch vinyl versions', {
                  masterId: releaseData.master_id,
                  error: error.message,
                  stack: error.stack,
                });
                // Continue without vinyl versions
              }
            } catch (error) {
              logger.warn('Failed to fetch master release', {
                masterId: releaseData.master_id,
                error: error.message,
              });
              // Continue without master data
            }
          } else {
            logger.info('Release has no master_id', { releaseId });
            // If release has no master_id, try to find its master by searching
            try {
              logger.info('Searching for master by title and artist', {
                releaseId,
                title: releaseData.title,
                artists: releaseData.artists?.map((a) => a.name).join(', '),
              });
              const searchQuery = [
                releaseData.title,
                releaseData.artists?.[0]?.name,
              ]
                .filter(Boolean)
                .join(' ');

              const searchResponse = await this.search({
                query: searchQuery,
              });

              // Find a master result
              const masterResult = searchResponse.results?.find(
                (r) => r.type === 'master'
              );

              if (masterResult && masterResult.master_id) {
                logger.info('Found master for release', {
                  releaseId,
                  masterId: masterResult.master_id,
                });
                await this.throttler.wait();
                const masterResponse = await this.client.get(
                  `/masters/${masterResult.master_id}`
                );
                masterData = masterResponse.data;

                // Fetch vinyl versions
                try {
                  vinylVersions = await this.getMasterVinylVersions(
                    masterResult.master_id
                  );
                  logger.info('Fetched vinyl versions from found master', {
                    releaseId,
                    masterId: masterResult.master_id,
                    vinylVersionCount: vinylVersions.length,
                  });
                } catch (error) {
                  logger.warn(
                    'Failed to fetch vinyl versions from found master',
                    {
                      masterId: masterResult.master_id,
                      error: error.message,
                    }
                  );
                }
              }
            } catch (error) {
              logger.warn('Failed to search for master', {
                releaseId,
                error: error.message,
              });
            }
          }

          // Use master data for most metadata (more complete/accurate)
          // But use RELEASE data for pressing-specific info (labels, catalog numbers, formats, notes)
          const data = masterData || releaseData;
          const labelSource = releaseData.labels ? releaseData : data;
          const formatSource = releaseData.formats ? releaseData : data;
          const imageSource = releaseData.images ? releaseData : data;
          const tracelistSource = releaseData.tracklist ? releaseData : data;

          return {
            id: releaseData.id,
            master_id: isFetchedDataMaster
              ? releaseData.id
              : releaseData.master_id,
            // Use master title/artists/year when available (more accurate)
            title: data.title,
            artists: (data.artists || []).map((a) => ({
              name: a.name,
              resource_url: a.resource_url,
            })),
            year: data.year,
            // Master genres/styles are most accurate
            genres: data.genres || [],
            styles: data.styles || [],
            // RELEASE formats, labels, and notes are pressing-specific and should not come from master
            formats: (formatSource.formats || []).map((f) => ({
              name: f.name,
              qty: f.qty,
              descriptions: f.descriptions || [],
            })),
            // ALWAYS use RELEASE labels for catalog numbers (pressing-specific)
            labels: (labelSource.labels || []).map((l) => ({
              name: l.name,
              catalog_number: l.catno || l.catalog_number,
              resource_url: l.resource_url,
            })),
            // Use release tracklist (release-specific)
            tracklist: (tracelistSource.tracklist || []).map((t) => ({
              position: t.position,
              title: t.title,
              duration: t.duration,
            })),
            // Use release images
            images: (imageSource.images || []).map((i) => ({
              type: i.type,
              uri: i.uri,
              resource_url: i.resource_url,
              uri150: i.uri150,
            })),
            // Community stats from master (aggregated across all pressings)
            community: {
              have: masterData?.community?.have || releaseData.community?.have,
              want: masterData?.community?.want || releaseData.community?.want,
              rating:
                masterData?.community?.rating?.average ||
                releaseData.community?.rating?.average,
              votes:
                masterData?.community?.rating?.count ||
                releaseData.community?.rating?.count,
            },
            // Release-specific notes and details
            notes: releaseData.notes || data.notes,
            country: releaseData.country || data.country,
            status: releaseData.status || data.status,
            resource_url: releaseData.resource_url || data.resource_url,
            uri: releaseData.uri || data.uri,
            // All vinyl versions of this master - for catalog number suggestions
            vinyl_versions: vinylVersions,
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

      const cacheKey = generateCacheKey(
        'discogs',
        `marketplace_stats_${releaseId}_${currencyCode}`,
        {}
      );

      // Cache for 5 minutes in development, 30 minutes in production
      // Marketplace prices change frequently and short cache helps with testing
      const cacheTTL = process.env.NODE_ENV === 'development' ? 300 : 1800;

      return await getOrSet(
        cacheKey,
        async () => {
          try {
            logger.debug('Fetching marketplace stats', {
              releaseId,
              currencyCode,
            });

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

            const url = `${DISCOGS_API_BASE}/marketplace/stats/${releaseId}?curr_abbr=${currencyCode}&format=Vinyl`;

            const response = await this.retryWithBackoff(
              () => axios.get(url, { headers }),
              3,
              1500
            );

            logger.debug('Marketplace stats response', {
              releaseId,
              hasData: !!response.data,
              numForSale: response.data?.num_for_sale,
              lowestPrice: response.data?.lowest_price,
              rawResponse: response.data,
            });

            // Discogs returns lowest_price as either:
            // 1. A number directly: lowest_price: 19.99
            // 2. An object: lowest_price: { value: 19.99, currency: "USD" }
            let lowestPrice = null;
            if (response.data.lowest_price) {
              if (typeof response.data.lowest_price === 'object') {
                lowestPrice = response.data.lowest_price.value;
              } else {
                lowestPrice = parseFloat(response.data.lowest_price);
              }
            }

            // If no listings available, return null
            if (!lowestPrice || response.data.num_for_sale === 0) {
              return null;
            }

            return {
              release_id: releaseId,
              currency: currencyCode,
              lowest: parseFloat(lowestPrice),
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
        cacheTTL
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
   * Get marketplace stats for vinyl format only by checking vinyl variants sequentially
   * Discogs /marketplace/stats doesn't support format filtering, so we need to:
   * 1. Fetch all variants of the master
   * 2. Filter for vinyl format
   * 3. Fetch marketplace stats for each vinyl variant sequentially (respecting rate limits)
   * 4. Return the lowest priced vinyl
   * @param {number} masterId - Discogs master ID
   * @param {string} currencyCode - Currency code (default: 'USD')
   * @returns {Promise<Object>} - Lowest vinyl marketplace stats
   */
  async getVinylMarketplaceStats(masterId, currencyCode = 'USD') {
    try {
      if (!masterId || typeof masterId !== 'number') {
        throw new ApiError('Invalid master ID', 400);
      }

      const cacheKey = generateCacheKey(
        'discogs',
        `vinyl_marketplace_stats_${masterId}_${currencyCode}`,
        {}
      );

      return await getOrSet(
        cacheKey,
        async () => {
          try {
            logger.debug('Fetching vinyl variants for master', { masterId });

            // Get all vinyl variants of this master
            const response = await this.retryWithBackoff(
              () =>
                this.client.get(`/masters/${masterId}/versions`, {
                  params: { per_page: 500 },
                }),
              3,
              1500
            );

            if (
              !response.data.versions ||
              response.data.versions.length === 0
            ) {
              return null;
            }

            // Filter for vinyl format only (check if format contains LP, Vinyl, or 12"/7"/10" etc)
            const vinylVariants = response.data.versions.filter((v) => {
              if (!v.format) return false;
              const formatLower = v.format.toLowerCase();
              // Match: lp, vinyl, 12", 7", 10", 33 RPM, 45 RPM, 78 RPM
              return (
                formatLower.includes('lp') ||
                formatLower.includes('vinyl') ||
                formatLower.includes('12"') ||
                formatLower.includes('7"') ||
                formatLower.includes('10"') ||
                formatLower.includes('33') || // 33 RPM
                formatLower.includes('45') || // 45 RPM
                formatLower.includes('78') // 78 RPM
              );
            });

            if (vinylVariants.length === 0) {
              logger.debug('No vinyl variants found for master', { masterId });
              return null;
            }

            logger.debug('Found vinyl variants', {
              masterId,
              count: vinylVariants.length,
            });

            // First pass: get aggregate stats for first few variants to find the best candidate
            // Limit to first 5 variants to avoid excessive API calls and rate limiting
            let bestVariant = null;
            let lowestPrice = Infinity;
            const variantsToCheck = Math.min(5, vinylVariants.length);

            for (let i = 0; i < variantsToCheck; i++) {
              const variant = vinylVariants[i];
              try {
                const stats = await this.getMarketplaceStats(
                  variant.id,
                  currencyCode
                );

                if (stats && stats.lowest && stats.lowest < lowestPrice) {
                  lowestPrice = stats.lowest;
                  bestVariant = variant;
                  logger.debug('Found lower vinyl variant', {
                    masterId,
                    releaseId: variant.id,
                    price: stats.lowest,
                    variantIndex: i,
                  });
                }

                // Add small delay between requests to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 100));
              } catch (err) {
                logger.debug('Failed to fetch aggregate stats for vinyl variant', {
                  masterId,
                  releaseId: variant.id,
                  variantIndex: i,
                  error: err.message,
                });
                // Continue to next variant
              }
            }

            // Second pass: if we found a best variant, try to get detailed listing stats for it
            let lowestStats = null;
            if (bestVariant) {
              try {
                logger.debug('Fetching detailed listing stats for best variant', {
                  masterId,
                  releaseId: bestVariant.id,
                });
                const listingStats = await this.getMarketplaceListingStats(
                  bestVariant.id,
                  currencyCode
                );

                if (listingStats && listingStats.lowest) {
                  lowestStats = listingStats;
                  logger.debug('Successfully fetched detailed listing stats for vinyl variant', {
                    masterId,
                    releaseId: bestVariant.id,
                    price: listingStats.lowest,
                    median: listingStats.median,
                    highest: listingStats.highest,
                    numForSale: listingStats.num_for_sale,
                  });
                }
              } catch (err) {
                logger.debug('Failed to fetch listing stats for best variant, falling back to aggregate', {
                  masterId,
                  releaseId: bestVariant.id,
                  error: err.message,
                });
                // Fall back to aggregate stats for the best variant
                try {
                  const fallbackStats = await this.getMarketplaceStats(
                    bestVariant.id,
                    currencyCode
                  );
                  lowestStats = fallbackStats;
                  logger.debug('Using fallback aggregate stats for best vinyl variant', {
                    masterId,
                    releaseId: bestVariant.id,
                    price: fallbackStats?.lowest,
                  });
                } catch (fallbackErr) {
                  logger.debug('Fallback to aggregate stats also failed', {
                    masterId,
                    releaseId: bestVariant.id,
                    error: fallbackErr.message,
                  });
                }
              }
            }

            if (lowestStats) {
              logger.debug('Found lowest vinyl marketplace price', {
                masterId,
                price: lowestStats.lowest,
                median: lowestStats.median,
                highest: lowestStats.highest,
                currency: lowestStats.currency,
                numForSale: lowestStats.num_for_sale,
              });
            }

            return lowestStats;
          } catch (error) {
            logger.debug('Failed to fetch vinyl marketplace stats', {
              masterId,
              error: error.message,
            });
            return null;
          }
        },
        process.env.NODE_ENV === 'development' ? 300 : 1800 // Cache for 5 min (dev) or 30 min (prod)
      );
    } catch (error) {
      if (error.isApiError) throw error;
      logger.debug('Failed to process vinyl marketplace stats', {
        masterId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get marketplace listing statistics by fetching all current listings for a release
   * Calculates LOW, MEDIAN, and HIGH prices from actual marketplace listings
   * @param {number} releaseId - Discogs release ID
   * @param {string} currencyCode - Optional currency code (default 'USD')
   * @returns {Promise<Object>} - Statistics with lowest, median, highest prices and sample size
   */
  async getMarketplaceListingStats(releaseId, currencyCode = 'USD') {
    try {
      if (!releaseId || typeof releaseId !== 'number') {
        throw new ApiError('Invalid release ID', 400);
      }

      const cacheKey = generateCacheKey(
        'discogs',
        `marketplace_listing_stats_${releaseId}_${currencyCode}`,
        {}
      );

      return await getOrSet(
        cacheKey,
        async () => {
          try {
            logger.debug('Fetching marketplace listings for release', {
              releaseId,
              currencyCode,
            });

            const prices = [];
            let page = 1;
            let hasMore = true;
            const maxPages = 50; // Safety limit to avoid infinite loops

            // Fetch all listings with pagination
            while (hasMore && page <= maxPages) {
              try {
                const response = await this.retryWithBackoff(
                  () =>
                    this.client.get(`/releases/${releaseId}/listings`, {
                      params: {
                        per_page: 100,
                        page,
                        status: 'For Sale',
                      },
                    }),
                  3,
                  1500
                );

                if (!response.data.listings || response.data.listings.length === 0) {
                  hasMore = false;
                  break;
                }

                // Extract prices from listings
                response.data.listings.forEach((listing) => {
                  if (listing.price && typeof listing.price === 'number' && listing.price > 0) {
                    prices.push(parseFloat(listing.price));
                  }
                });

                // Check if there are more pages
                if (!response.data.pagination || response.data.pagination.pages <= page) {
                  hasMore = false;
                }

                page++;

                // Add small delay between requests to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 100));
              } catch (pageErr) {
                logger.debug('Error fetching listings page', {
                  releaseId,
                  page,
                  error: pageErr.message,
                });
                // Continue to next page or stop if it's a hard error
                if (pageErr.response?.status === 404) {
                  hasMore = false;
                } else if (page === 1) {
                  // If first page fails, return null
                  return null;
                } else {
                  // If later pages fail, just use what we have
                  hasMore = false;
                }
              }
            }

            // If no prices found, return null
            if (prices.length === 0) {
              logger.debug('No marketplace listings found for release', {
                releaseId,
              });
              return null;
            }

            // Sort prices to calculate statistics
            prices.sort((a, b) => a - b);

            const lowest = prices[0];
            const highest = prices[prices.length - 1];
            const median =
              prices.length % 2 === 0
                ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
                : prices[Math.floor(prices.length / 2)];

            const stats = {
              release_id: releaseId,
              currency: currencyCode,
              lowest: parseFloat(lowest.toFixed(2)),
              median: parseFloat(median.toFixed(2)),
              highest: parseFloat(highest.toFixed(2)),
              average: parseFloat((prices.reduce((a, b) => a + b) / prices.length).toFixed(2)),
              num_for_sale: prices.length,
            };

            logger.debug('Calculated marketplace listing statistics', {
              releaseId,
              stats,
            });

            return stats;
          } catch (error) {
            logger.debug('Failed to fetch marketplace listing stats', {
              releaseId,
              error: error.message,
            });
            return null;
          }
        },
        process.env.NODE_ENV === 'development' ? 300 : 900 // Cache for 5 min (dev) or 15 min (prod) - prices change frequently
      );
    } catch (error) {
      if (error.isApiError) throw error;
      logger.debug('Failed to process marketplace listing stats', {
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

      const cacheKey = generateCacheKey(
        'discogs',
        `price_suggestions_${releaseId}`,
        {}
      );

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
              logger.debug(
                'Using OAuth token for marketplace price suggestions',
                { releaseId }
              );

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
                  Authorization: authHeader,
                  'User-Agent': 'VinylCatalogAPI/1.0',
                },
              });

              // Price suggestions response format:
              // { "Mint (M)": {"value": 50, "currency": "USD"}, ... }
              if (!response.data || Object.keys(response.data).length === 0) {
                return null;
              }

              // Return aggregated price data from all conditions
              const prices = Object.values(response.data)
                .map((p) => p.value)
                .filter((v) => v);
              if (prices.length === 0) return null;

              return {
                release_id: releaseId,
                currency: Object.values(response.data)[0]?.currency || 'USD',
                lowest: Math.min(...prices),
                highest: Math.max(...prices),
                average:
                  Math.round(
                    (prices.reduce((a, b) => a + b, 0) / prices.length) * 100
                  ) / 100,
                median: prices.sort((a, b) => a - b)[
                  Math.floor(prices.length / 2)
                ],
              };
            } else {
              logger.debug(
                'No OAuth token available for marketplace pricing, falling back to stats',
                {
                  releaseId,
                }
              );
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
            // Use getMaster if it's a master type OR if it's a release with a master_id
            const isMaster = result.type === 'master' || !!result.master_id;
            const metadataId = isMaster
              ? result.master_id || result.id
              : result.id;
            const metadataPromise = isMaster
              ? this.getMaster(metadataId)
              : this.getRelease(metadataId);

            logger.debug('Enriching search result', {
              resultId: result.id,
              resultType: result.type,
              masterId: result.master_id,
              fetchingMaster: isMaster,
              metadataId,
            });

            const [metadata, prices] = await Promise.all([
              metadataPromise,
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
              resultType: result.type,
              masterId: result.master_id,
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
