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
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Search query must be at least 2 characters',
          status: 400,
        },
      });
    }

    const results = await releaseService.search(q);

    res.json({
      success: true,
      data: results,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};
