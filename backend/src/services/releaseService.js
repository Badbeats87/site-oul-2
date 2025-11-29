import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import { getCached, setCached, deleteCached, getOrSet } from '../utils/cache.js';
import inventoryService from './inventoryService.js';

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
      const releaseIds = releases.map(r => r.id);
      const inventoryMap = await inventoryService.getInventoryForReleases(releaseIds);

      // Enhance releases with inventory data
      const enhancedReleases = releases.map(release => ({
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
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
      const { title, artist, label, catalogNumber, barcode, releaseYear, genre, coverArtUrl, description } = data;

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
      logger.info('Release created', { releaseId: release.id, title: release.title });
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
          releaseYear: data.releaseYear ? parseInt(data.releaseYear, 10) : release.releaseYear,
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
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
        .map(r => r[searchField])
        .filter(v => v) // Remove nulls
        .map(value => ({
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
      logger.error('Error getting autocomplete suggestions', { query, field, error: error.message });
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
      const cached = getCached(cacheKey);
      if (cached) {
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
      const scored = releases.map(release => {
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
          if (release.artist?.toLowerCase().split(/\s+/).includes(searchQuery)) {
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

      const result = {
        query,
        total: sorted.length,
        results: sorted,
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
}

export default new ReleaseService();
