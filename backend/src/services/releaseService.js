import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';

class ReleaseService {
  async findAll(filters = {}, pagination = {}) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    try {
      const where = {};

      // Apply filters
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

      // Execute query and count in parallel
      const [releases, total] = await Promise.all([
        prisma.release.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            marketSnapshots: {
              take: 1,
              orderBy: { fetchedAt: 'desc' },
            },
          },
        }),
        prisma.release.count({ where }),
      ]);

      return {
        releases,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error finding releases', { error: error.message });
      throw new ApiError('Failed to find releases', 500);
    }
  }

  async findById(id) {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new ApiError('Invalid release ID format', 404);
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

      return release;
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

      logger.info('Release deleted', { releaseId: id });
      return { id, deleted: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error deleting release', { id, error: error.message });
      throw new ApiError('Failed to delete release', 500);
    }
  }

  async search(query) {
    try {
      const releases = await prisma.release.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { artist: { contains: query, mode: 'insensitive' } },
            { label: { contains: query, mode: 'insensitive' } },
            { barcode: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 50,
      });

      return releases;
    } catch (error) {
      logger.error('Error searching releases', { query, error: error.message });
      throw new ApiError('Failed to search releases', 500);
    }
  }
}

export default new ReleaseService();
