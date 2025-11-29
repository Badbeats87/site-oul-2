import releaseService from '../services/releaseService.js';
import logger from '../../config/logger.js';

export const getAllReleases = async (req, res, next) => {
  try {
    const { page, limit, artist, title, genre, barcode } = req.query;

    const filters = {
      ...(artist && { artist }),
      ...(title && { title }),
      ...(genre && { genre }),
      ...(barcode && { barcode }),
    };

    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    };

    const result = await releaseService.findAll(filters, pagination);

    res.json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const getReleaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const release = await releaseService.findById(id);

    res.json({
      success: true,
      data: release,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const createRelease = async (req, res, next) => {
  try {
    const { title, artist, label, catalogNumber, barcode, releaseYear, genre, coverArtUrl, description } = req.body;

    const release = await releaseService.create({
      title,
      artist,
      label,
      catalogNumber,
      barcode,
      releaseYear,
      genre,
      coverArtUrl,
      description,
    });

    res.status(201).json({
      success: true,
      data: release,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRelease = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, artist, label, catalogNumber, barcode, releaseYear, genre, coverArtUrl, description } = req.body;

    const release = await releaseService.update(id, {
      title,
      artist,
      label,
      catalogNumber,
      barcode,
      releaseYear,
      genre,
      coverArtUrl,
      description,
    });

    res.json({
      success: true,
      data: release,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRelease = async (req, res, next) => {
  try {
    const { id } = req.params;

    await releaseService.delete(id);

    res.json({
      success: true,
      data: { id, deleted: true },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

export const searchReleases = async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Search query must be at least 2 characters',
          status: 400,
        },
      });
    }

    const results = await releaseService.search(q, limit ? parseInt(limit, 10) : 50);

    res.json({
      success: true,
      data: results,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Autocomplete endpoint for fast type-ahead suggestions
 * Returns matching values for specified field (title, artist, label)
 */
export const autocomplete = async (req, res, next) => {
  try {
    const { q, field = 'title', limit = 10 } = req.query;

    if (!q || q.length < 1) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Query parameter is required',
          status: 400,
        },
      });
    }

    const validFields = ['title', 'artist', 'label', 'genre'];
    if (!validFields.includes(field)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Field must be one of: ${validFields.join(', ')}`,
          status: 400,
        },
      });
    }

    const suggestions = await releaseService.getAutocomplete(q, field, parseInt(limit, 10));

    res.json({
      success: true,
      data: suggestions,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Optimized search for album/artist/label using PostgreSQL full-text search
 * Provides fast, relevant results specifically for these three fields
 */
export const searchByAlbumArtistLabel = async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Search query must be at least 2 characters',
          status: 400,
        },
      });
    }

    const results = await releaseService.searchByAlbumArtistLabel(q, limit ? parseInt(limit, 10) : 50);

    res.json({
      success: true,
      data: results,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Full-text search endpoint using PostgreSQL tsvector
 * Searches across title, artist, label, description, and genre
 */
export const fullTextSearch = async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Search query must be at least 2 characters',
          status: 400,
        },
      });
    }

    const results = await releaseService.fullTextSearch(q, limit ? parseInt(limit, 10) : 50);

    res.json({
      success: true,
      data: results,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};
