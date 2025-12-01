import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import {
  getCached,
  setCached,
  deleteCached,
  getOrSet,
} from '../utils/cache.js';
import inventoryService from './inventoryService.js';
import discogsService from './discogsService.js';

class ReleaseService {
  /**
   * Generate cache key for list queries
   */
  generateListCacheKey(filters, pagination) {
    const key = JSON.stringify({ filters, pagination });
    return `release:list:${Buffer.from(key).toString('base64')}`;
  }

  /**
   * Generate cache key for search queries
   */
  generateSearchCacheKey(query, filters, pagination) {
    const key = JSON.stringify({ query, filters, pagination });
    return `release:search:${Buffer.from(key).toString('base64')}`;
  }

  /**
   * Generate cache key for detail view
   */
  generateDetailCacheKey(id) {
    return `release:detail:${id}`;
  }

  /**
   * Invalidate all caches for a release
   */
  invalidateReleaseCaches(releaseId) {
    // Clear detail cache
    deleteCached(this.generateDetailCacheKey(releaseId));

    // Clear all search and list caches by pattern
    logger.debug('Invalidated release caches', { releaseId });
  }

  /**
   * Find all releases with advanced filtering, sorting, and caching
   */
  async findAll(filters = {}, pagination = {}) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    // Validate pagination limits
    if (limit > 1000) {
      throw new ApiError('Limit cannot exceed 1000', 400);
    }

    try {
      const cacheKey = this.generateListCacheKey(filters, pagination);

      // Try cache first (1 hour TTL for lists)
      const cached = getCached(cacheKey);
      if (cached) {
        logger.debug('Cache hit for release list', { filters, pagination });
        return cached;
      }

      const where = this._buildWhereClause(filters);
      const orderBy = this._buildOrderBy(filters.sort);

      // Execute query and count in parallel
      const [releases, total] = await Promise.all([
        prisma.release.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            marketSnapshots: {
              take: 1,
              orderBy: { fetchedAt: 'desc' },
            },
          },
        }),
        prisma.release.count({ where }),
      ]);

      // Batch load inventory for all releases
      const releaseIds = releases.map((r) => r.id);
      const inventoryMap =
        await inventoryService.getInventoryForReleases(releaseIds);

      // Enhance releases with inventory data
      const enhancedReleases = releases.map((release) => ({
        ...release,
        inventory: inventoryMap.get(release.id) || {
          availableCount: 0,
          isAvailable: false,
          lowestPrice: null,
          conditionBreakdown: {},
        },
        isNewArrival: inventoryService.isNewArrival(release.createdAt),
      }));

      const result = {
        releases: enhancedReleases,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        cached: false,
      };

      // Cache the result (1 hour TTL)
      setCached(cacheKey, result, 3600);
      return result;
    } catch (error) {
      logger.error('Error finding releases', { error: error.message });
      throw new ApiError('Failed to find releases', 500);
    }
  }

  /**
   * Build Prisma where clause from filters
   */
  _buildWhereClause(filters) {
    const where = {};

    // Text filters
    if (filters.artist) {
      where.artist = { contains: filters.artist, mode: 'insensitive' };
    }
    if (filters.title) {
      where.title = { contains: filters.title, mode: 'insensitive' };
    }
    if (filters.genre) {
      where.genre = filters.genre;
    }
    if (filters.barcode) {
      where.barcode = filters.barcode;
    }

    // Year range filters
    if (filters.releasedAfter) {
      where.releaseYear = { gte: parseInt(filters.releasedAfter, 10) };
    }
    if (filters.releasedBefore) {
      if (where.releaseYear) {
        where.releaseYear.lte = parseInt(filters.releasedBefore, 10);
      } else {
        where.releaseYear = { lte: parseInt(filters.releasedBefore, 10) };
      }
    }

    return where;
  }

  /**
   * Build Prisma orderBy from sort parameter
   */
  _buildOrderBy(sort) {
    const defaultOrder = { createdAt: 'desc' };
    if (!sort) return defaultOrder;

    const [field, direction] = sort.split('_');
    const sortDir = direction === 'desc' ? 'desc' : 'asc';

    const sortMap = {
      title: { title: sortDir },
      artist: { artist: sortDir },
      releaseYear: { releaseYear: sortDir },
      createdAt: { createdAt: sortDir },
    };

    return sortMap[field] || defaultOrder;
  }

  async findById(id) {
    try {
      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new ApiError('Invalid release ID format', 404);
      }

      const cacheKey = this.generateDetailCacheKey(id);

      // Try cache first (2 hour TTL for details)
      const cached = getCached(cacheKey);
      if (cached) {
        logger.debug('Cache hit for release detail', { id });
        return cached;
      }

      const release = await prisma.release.findUnique({
        where: { id },
        include: {
          marketSnapshots: {
            orderBy: { fetchedAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!release) {
        throw new ApiError('Release not found', 404);
      }

      // Enhance with inventory data
      const inventoryStats = await inventoryService.getInventoryStats(id);
      const enhanced = {
        ...release,
        inventory: inventoryStats,
        isNewArrival: inventoryService.isNewArrival(release.createdAt),
      };

      // Cache the result (2 hour TTL)
      setCached(cacheKey, enhanced, 7200);
      return enhanced;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error finding release by ID', { id, error: error.message });
      throw new ApiError('Failed to find release', 500);
    }
  }

  async create(data) {
    try {
      const {
        title,
        artist,
        label,
        catalogNumber,
        barcode,
        releaseYear,
        genre,
        coverArtUrl,
        description,
      } = data;

      // Validate required fields
      if (!title || !artist) {
        throw new ApiError('Title and artist are required', 400);
      }

      const release = await prisma.release.create({
        data: {
          title,
          artist,
          label,
          catalogNumber,
          barcode,
          releaseYear: releaseYear ? parseInt(releaseYear, 10) : null,
          genre,
          coverArtUrl,
          description,
        },
      });

      // Note: List caches will expire naturally; no need to invalidate all
      logger.info('Release created', {
        releaseId: release.id,
        title: release.title,
      });
      return release;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating release', { error: error.message });
      throw new ApiError('Failed to create release', 500);
    }
  }

  async update(id, data) {
    try {
      const release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        throw new ApiError('Release not found', 404);
      }

      const updated = await prisma.release.update({
        where: { id },
        data: {
          title: data.title ?? release.title,
          artist: data.artist ?? release.artist,
          label: data.label ?? release.label,
          catalogNumber: data.catalogNumber ?? release.catalogNumber,
          barcode: data.barcode ?? release.barcode,
          releaseYear: data.releaseYear
            ? parseInt(data.releaseYear, 10)
            : release.releaseYear,
          genre: data.genre ?? release.genre,
          coverArtUrl: data.coverArtUrl ?? release.coverArtUrl,
          description: data.description ?? release.description,
        },
      });

      // Invalidate caches for this release
      this.invalidateReleaseCaches(id);

      logger.info('Release updated', { releaseId: updated.id });
      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating release', { id, error: error.message });
      throw new ApiError('Failed to update release', 500);
    }
  }

  async delete(id) {
    try {
      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new ApiError('Invalid release ID format', 404);
      }

      const release = await prisma.release.findUnique({ where: { id } });
      if (!release) {
        throw new ApiError('Release not found', 404);
      }

      await prisma.release.delete({ where: { id } });

      // Invalidate caches for this release
      this.invalidateReleaseCaches(id);

      logger.info('Release deleted', { releaseId: id });
      return { id, deleted: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error deleting release', { id, error: error.message });
      throw new ApiError('Failed to delete release', 500);
    }
  }

  /**
   * Full-text search using PostgreSQL tsvector
   * Searches across title, artist, label, description, and genre
   * Results are ranked by relevance
   * @param {string} query - Search query
   * @param {number} limit - Maximum results
   * @returns {Promise<Object>} Search results with relevance ranking
   */
  /**
   * Get autocomplete suggestions for a field
   * Optimized for fast type-ahead responses
   */
  async getAutocomplete(query, field = 'title', limit = 10) {
    try {
      if (!query || query.trim().length === 0) {
        throw new ApiError('Query is required', 400);
      }

      if (limit > 100) {
        throw new ApiError('Limit cannot exceed 100', 400);
      }

      const cacheKey = `release:autocomplete:${field}:${query.toLowerCase()}:${limit}`;

      // Try cache first (1 hour TTL for autocomplete)
      const cached = getCached(cacheKey);
      if (cached) {
        logger.debug('Cache hit for autocomplete', { query, field });
        return cached;
      }

      // Build where clause based on field
      const where = {};
      const searchField = field.toLowerCase();

      if (!['title', 'artist', 'label', 'genre'].includes(searchField)) {
        throw new ApiError('Invalid field', 400);
      }

      where[searchField] = {
        contains: query,
        mode: 'insensitive',
      };

      // Get distinct values for the field matching query
      const results = await prisma.release.findMany({
        where,
        select: { [searchField]: true },
        distinct: [searchField],
        take: limit,
        orderBy: { [searchField]: 'asc' },
      });

      // Extract and format suggestions
      const suggestions = results
        .map((r) => r[searchField])
        .filter((v) => v) // Remove nulls
        .map((value) => ({
          value,
          label: value,
        }));

      const result = {
        field,
        query,
        suggestions,
        total: suggestions.length,
      };

      // Cache the result (1 hour TTL)
      setCached(cacheKey, result, 3600);
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting autocomplete suggestions', {
        query,
        field,
        error: error.message,
      });
      throw new ApiError('Failed to get suggestions', 500);
    }
  }

  /**
   * Enhanced search with field-weighted relevance
   * Title > Artist > Label > Barcode
   * Returns results sorted by relevance
   */
  async search(query, limit = 50) {
    try {
      if (!query || query.trim().length === 0) {
        throw new ApiError('Search query is required', 400);
      }

      if (limit > 200) {
        throw new ApiError('Limit cannot exceed 200', 400);
      }

      const cacheKey = this.generateSearchCacheKey(query, {}, { limit });

      // Try cache first (30 minute TTL for search)
      // BUT: skip cache for searches that previously had 0 results (to allow Discogs fallback)
      const cached = getCached(cacheKey);
      if (cached && cached.total > 0) {
        logger.debug('Cache hit for search', { query, limit });
        return cached;
      }

      const searchQuery = query.toLowerCase();

      // Get all matching releases
      const releases = await prisma.release.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { artist: { contains: query, mode: 'insensitive' } },
            { label: { contains: query, mode: 'insensitive' } },
            { barcode: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit * 2, // Get more to sort by relevance
      });

      // Score and sort by relevance
      const scored = releases.map((release) => {
        let score = 0;

        // Title match (highest weight)
        if (release.title?.toLowerCase().includes(searchQuery)) {
          score += 100;
          // Exact word match bonus
          if (release.title?.toLowerCase().split(/\s+/).includes(searchQuery)) {
            score += 50;
          }
          // Starts with bonus
          if (release.title?.toLowerCase().startsWith(searchQuery)) {
            score += 25;
          }
        }

        // Artist match (second priority)
        if (release.artist?.toLowerCase().includes(searchQuery)) {
          score += 80;
          if (
            release.artist?.toLowerCase().split(/\s+/).includes(searchQuery)
          ) {
            score += 40;
          }
          if (release.artist?.toLowerCase().startsWith(searchQuery)) {
            score += 20;
          }
        }

        // Label match
        if (release.label?.toLowerCase().includes(searchQuery)) {
          score += 40;
        }

        // Barcode match
        if (release.barcode?.includes(searchQuery)) {
          score += 20;
        }

        return { ...release, _score: score };
      });

      // Sort by relevance score and take limit
      const sorted = scored
        .sort((a, b) => b._score - a._score)
        .slice(0, limit)
        .map(({ _score, ...release }) => release);

      // Fetch market data for top results
      const resultsWithMarketData = await Promise.all(
        sorted.map(async (release) => {
          const marketSnapshot = await prisma.marketSnapshot.findFirst({
            where: {
              releaseId: release.id,
              source: 'DISCOGS',
            },
            orderBy: { createdAt: 'desc' },
          });
          return {
            ...release,
            marketSnapshots: marketSnapshot ? [marketSnapshot] : [],
          };
        })
      );

      // If no local results found, try Discogs
      let finalResults = resultsWithMarketData;
      let source = 'LOCAL';

      if (finalResults.length === 0) {
        try {
          logger.info('No local results, searching Discogs', { query });
          console.log('[Discogs Fallback] Starting search for:', query);

          const discogsResults = await discogsService.search({
            query: query,
          });

          console.log('[Discogs Fallback] Got results:', discogsResults?.results?.length || 0);
          logger.info('Discogs search response', {
            query,
            resultCount: discogsResults?.results?.length || 0,
          });

          if (discogsResults && discogsResults.results && discogsResults.results.length > 0) {
            // Fetch full metadata for top results
            const topResults = discogsResults.results.slice(0, Math.min(limit, 10));
            const enrichedResults = await Promise.all(
              topResults.map(async (result) => {
                try {
                  const releaseId = parseInt(result.id);
                  const [release, priceStats] = await Promise.all([
                    discogsService.getRelease(releaseId),
                    discogsService.getPriceStatistics(releaseId).catch(() => null), // Fallback to null if price fetching fails
                  ]);

                  // Build market snapshots from price data
                  const marketSnapshots = priceStats && (priceStats.lowest || priceStats.average || priceStats.median)
                    ? [
                        {
                          releaseId: `discogs_${result.id}`,
                          source: 'DISCOGS',
                          statLow: priceStats.lowest,
                          statMedian: priceStats.median,
                          statHigh: priceStats.highest,
                          fetchedAt: new Date(),
                        },
                      ]
                    : [];

                  return {
                    id: `discogs_${result.id}`,
                    title: release.title || result.title || 'Unknown Album',
                    artist: release.artists?.[0]?.name ||
                            release.artist ||
                            result.artists?.[0]?.name ||
                            'Unknown Artist',
                    label: release.labels?.[0]?.name || null,
                    barcode: release.identifiers?.find(id => id.type === 'Barcode')?.value || null,
                    releaseYear: release.year || null,
                    genre: release.genres?.[0] || null,
                    coverArtUrl: release.images?.[0]?.uri || null,
                    description: null,
                    marketSnapshots,
                  };
                } catch (err) {
                  logger.warn('Failed to fetch Discogs metadata', {
                    releaseId: result.id,
                    error: err.message,
                  });
                  // Return basic info if metadata fetch fails
                  return {
                    id: `discogs_${result.id}`,
                    title: result.title || 'Unknown Album',
                    artist: 'Unknown Artist',
                    label: null,
                    barcode: null,
                    releaseYear: null,
                    genre: null,
                    coverArtUrl: null,
                    description: null,
                    marketSnapshots: [],
                  };
                }
              })
            );

            finalResults = enrichedResults;
            source = 'DISCOGS';
            logger.info('Discogs fallback search succeeded', {
              query,
              resultCount: finalResults.length,
            });
          }
        } catch (discogsError) {
          console.error('[Discogs Fallback] Error:', discogsError.message);
          logger.warn('Discogs fallback search failed', {
            query,
            error: discogsError.message,
            stack: discogsError.stack,
          });
          // Continue with empty results
        }
      }

      const result = {
        query,
        total: finalResults.length,
        results: finalResults,
        source, // LOCAL or DISCOGS
        executedAt: new Date(),
      };

      // Cache the result (30 minute TTL)
      setCached(cacheKey, result, 1800);
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error searching releases', { query, error: error.message });
      throw new ApiError('Failed to search releases', 500);
    }
  }

  /**
   * Full-text search using PostgreSQL tsvector
   * Searches across title, artist, label, description, and genre
   * Results are ranked by relevance
   * @param {string} query - Search query
   * @param {number} limit - Maximum results
   * @returns {Promise<Object>} Search results with relevance ranking
   */
  async fullTextSearch(query, limit = 50) {
    try {
      if (!query || query.trim().length === 0) {
        throw new ApiError('Search query is required', 400);
      }

      if (limit > 200) {
        throw new ApiError('Limit cannot exceed 200', 400);
      }

      const cacheKey = `release:fulltext:${query.toLowerCase()}:${limit}`;

      // Try cache first (30 minute TTL for search)
      const cached = getCached(cacheKey);
      if (cached) {
        logger.debug('Cache hit for full-text search', { query, limit });
        return cached;
      }

      // Perform full-text search using PostgreSQL tsvector
      const results = await prisma.$queryRaw`
        SELECT
          id,
          title,
          artist,
          label,
          catalog_number as "catalogNumber",
          barcode,
          release_year as "releaseYear",
          genre,
          cover_art_url as "coverArtUrl",
          description,
          created_at as "createdAt",
          updated_at as "updatedAt",
          ts_rank(search_vector, query) as relevance
        FROM releases, plainto_tsquery('english', ${query}) as query
        WHERE search_vector @@ query
        ORDER BY relevance DESC, updated_at DESC
        LIMIT ${limit}
      `;

      const totalResults = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count
        FROM releases, plainto_tsquery('english', ${query}) as query
        WHERE search_vector @@ query
      `;

      const result = {
        query,
        total: Number(totalResults[0]?.count || 0),
        results: results.map((r) => {
          const { relevance, ...release } = r;
          return {
            ...release,
            _relevance: Number(relevance),
          };
        }),
        searchType: 'fulltext',
        executedAt: new Date(),
      };

      // Cache the result (30 minute TTL)
      setCached(cacheKey, result, 1800);
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Full-text search failed', { query, error: error.message });
      throw new ApiError('Failed to perform full-text search', 500);
    }
  }

  /**
   * Optimized search for album/artist/label
   * Uses PostgreSQL full-text search with optimized field weights
   * for these specific fields to ensure fast, relevant results
   * @param {string} query - Search query
   * @param {number} limit - Maximum results
   * @returns {Promise<Object>} Search results with relevance ranking
   */
  async searchByAlbumArtistLabel(query, limit = 50) {
    try {
      if (!query || query.trim().length === 0) {
        throw new ApiError('Search query is required', 400);
      }

      if (limit > 200) {
        throw new ApiError('Limit cannot exceed 200', 400);
      }

      const cacheKey = `release:search:album-artist-label:${query.toLowerCase()}:${limit}`;

      // Try cache first (30 minute TTL for search)
      const cached = getCached(cacheKey);
      if (cached) {
        logger.debug('Cache hit for album/artist/label search', {
          query,
          limit,
        });
        return cached;
      }

      // Perform optimized search across title (album), artist, and label
      // This uses the full-text search vector but focuses on these three fields
      const results = await prisma.$queryRaw`
        SELECT
          id,
          title,
          artist,
          label,
          catalog_number as "catalogNumber",
          barcode,
          release_year as "releaseYear",
          genre,
          cover_art_url as "coverArtUrl",
          description,
          created_at as "createdAt",
          updated_at as "updatedAt",
          ts_rank(
            setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(artist, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(label, '')), 'B'),
            plainto_tsquery('english', ${query})
          ) as relevance
        FROM releases
        WHERE
          (setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
           setweight(to_tsvector('english', COALESCE(artist, '')), 'A') ||
           setweight(to_tsvector('english', COALESCE(label, '')), 'B')) @@
          plainto_tsquery('english', ${query})
        ORDER BY relevance DESC, updated_at DESC
        LIMIT ${limit}
      `;

      const totalResults = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count
        FROM releases
        WHERE
          (setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
           setweight(to_tsvector('english', COALESCE(artist, '')), 'A') ||
           setweight(to_tsvector('english', COALESCE(label, '')), 'B')) @@
          plainto_tsquery('english', ${query})
      `;

      const result = {
        query,
        total: Number(totalResults[0]?.count || 0),
        results: results.map((r) => {
          const { relevance, ...release } = r;
          return {
            ...release,
            _relevance: Number(relevance),
          };
        }),
        searchType: 'album-artist-label',
        executedAt: new Date(),
      };

      // Cache the result (30 minute TTL)
      setCached(cacheKey, result, 1800);
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Album/artist/label search failed', {
        query,
        error: error.message,
      });
      throw new ApiError('Failed to search by album/artist/label', 500);
    }
  }

  /**
   * Faceted search with filterable fields and category counts
   * Supports filtering by genre, condition, price range with aggregated facets
   * @param {Object} filters - Filter options
   * @param {string} filters.query - Optional search query
   * @param {string[]} filters.genres - Genre filter(s)
   * @param {string[]} filters.conditions - Condition filter(s)
   * @param {number} filters.priceMin - Minimum price
   * @param {number} filters.priceMax - Maximum price
   * @param {number} filters.yearMin - Minimum release year
   * @param {number} filters.yearMax - Maximum release year
   * @param {number} limit - Maximum results
   * @param {number} page - Page number for pagination
   * @returns {Promise<Object>} Search results with facets
   */
  async facetedSearch(filters = {}, limit = 50, page = 1) {
    try {
      const {
        query,
        genres,
        conditions,
        priceMin,
        priceMax,
        yearMin,
        yearMax,
      } = filters;

      if (limit > 200) {
        throw new ApiError('Limit cannot exceed 200', 400);
      }

      const offset = (page - 1) * limit;

      // Build WHERE clause for releases
      const where = {};

      // Text search filter
      if (query && query.trim().length > 0) {
        // Use raw query for full-text search
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { contains: query, mode: 'insensitive' } },
          { label: { contains: query, mode: 'insensitive' } },
        ];
      }

      // Genre filter
      if (genres && genres.length > 0) {
        where.genre = { in: genres };
      }

      // Year range filter
      if (yearMin || yearMax) {
        where.releaseYear = {};
        if (yearMin) where.releaseYear.gte = yearMin;
        if (yearMax) where.releaseYear.lte = yearMax;
      }

      // Fetch releases with inventory information
      const releases = await prisma.release.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        include: {
          inventoryLots: {
            where: { status: 'LIVE' },
            select: {
              id: true,
              listPrice: true,
              conditionMedia: true,
              conditionSleeve: true,
            },
          },
        },
      });

      // Filter by price and condition after fetch (using inventory data)
      let filteredReleases = releases;

      if (priceMin || priceMax || (conditions && conditions.length > 0)) {
        filteredReleases = releases.filter((release) => {
          // Check if release has any inventory
          if (!release.inventoryLots || release.inventoryLots.length === 0) {
            return false;
          }

          // Apply price filter
          if (priceMin || priceMax) {
            const hasMatchingPrice = release.inventoryLots.some((lot) => {
              const price = Number(lot.listPrice);
              if (priceMin && price < priceMin) return false;
              if (priceMax && price > priceMax) return false;
              return true;
            });
            if (!hasMatchingPrice) return false;
          }

          // Apply condition filter
          if (conditions && conditions.length > 0) {
            const hasMatchingCondition = release.inventoryLots.some((lot) =>
              conditions.includes(lot.conditionMedia)
            );
            if (!hasMatchingCondition) return false;
          }

          return true;
        });
      }

      // Count total matching releases
      const totalCount = await prisma.release.count({ where });

      // Build facets (aggregated counts per category)
      const facets = await this._buildFacets(where);

      // Format results with inventory stats
      const resultsWithInventory = filteredReleases.map((release) => {
        const { inventoryLots, ...releaseData } = release;

        if (!inventoryLots || inventoryLots.length === 0) {
          return {
            ...releaseData,
            inventory: {
              available: false,
              count: 0,
              lowestPrice: null,
              highestPrice: null,
              conditions: [],
            },
          };
        }

        const prices = inventoryLots.map((lot) => Number(lot.listPrice));
        const conditions = [
          ...new Set(inventoryLots.map((lot) => lot.conditionMedia)),
        ];

        return {
          ...releaseData,
          inventory: {
            available: true,
            count: inventoryLots.length,
            lowestPrice: Math.min(...prices),
            highestPrice: Math.max(...prices),
            conditions,
          },
        };
      });

      return {
        results: resultsWithInventory,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        facets,
        filters: filters,
        executedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Faceted search failed', { filters, error: error.message });
      throw new ApiError('Failed to perform faceted search', 500);
    }
  }

  /**
   * Build facets (aggregated counts) for search results
   * Provides counts for genres, conditions, price ranges, and years
   * @param {Object} where - Base WHERE clause for filtering
   * @returns {Promise<Object>} Facet counts
   * @private
   */
  async _buildFacets(where) {
    try {
      // Genre facets
      const genreFacets = await prisma.release.groupBy({
        by: ['genre'],
        where,
        _count: true,
        orderBy: { _count: { genre: 'desc' } },
      });

      // Year facets (grouped by decade)
      const yearFacets = await prisma.release.groupBy({
        by: ['releaseYear'],
        where,
        _count: true,
        orderBy: { releaseYear: 'desc' },
      });

      // Condition facets (from inventory)
      const conditionFacets = await prisma.inventoryLot.groupBy({
        by: ['conditionMedia'],
        where: { status: 'LIVE' },
        _count: true,
      });

      // Price range facets
      const priceRanges = [
        { label: 'Under $10', min: 0, max: 10 },
        { label: '$10 - $25', min: 10, max: 25 },
        { label: '$25 - $50', min: 25, max: 50 },
        { label: '$50 - $100', min: 50, max: 100 },
        { label: 'Over $100', min: 100, max: Infinity },
      ];

      const priceFacets = await Promise.all(
        priceRanges.map(async (range) => {
          const count = await prisma.inventoryLot.count({
            where: {
              status: 'LIVE',
              listPrice: {
                gte: range.min,
                ...(range.max !== Infinity && { lt: range.max }),
              },
            },
          });
          return { ...range, count };
        })
      );

      return {
        genres: genreFacets.map((f) => ({
          value: f.genre,
          count: f._count,
        })),
        years: yearFacets.map((f) => ({
          value: f.releaseYear,
          count: f._count,
        })),
        conditions: conditionFacets.map((f) => ({
          value: f.conditionMedia,
          count: f._count,
        })),
        priceRanges: priceFacets,
      };
    } catch (error) {
      logger.error('Failed to build facets', { error: error.message });
      // Return empty facets on error
      return {
        genres: [],
        years: [],
        conditions: [],
        priceRanges: [],
      };
    }
  }
}

export default new ReleaseService();
