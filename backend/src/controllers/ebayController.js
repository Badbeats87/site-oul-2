import ebayService from '../services/ebayService.js';
import logger from '../../config/logger.js';

/**
 * Search eBay for items
 * GET /api/v1/integrations/ebay/search
 */
export async function searchEbay(req, res, next) {
  try {
    const { q: query, category, limit, offset } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter is required',
        },
        requestId: req.id,
      });
    }

    const results = await ebayService.search({
      query,
      category,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });

    logger.info('eBay search completed', {
      requestId: req.id,
      query,
      resultCount: results.results.length,
    });

    res.json({
      success: true,
      data: results,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get sold listings from eBay for price comparables
 * GET /api/v1/integrations/ebay/sold-listings
 */
export async function getSoldListingsEbay(req, res, next) {
  try {
    const { q: query, limit } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter is required',
        },
        requestId: req.id,
      });
    }

    const listings = await ebayService.getSoldListings({
      query,
      limit: limit ? parseInt(limit) : 20,
    });

    logger.info('eBay sold listings fetched', {
      requestId: req.id,
      query,
      resultCount: listings.soldListings.length,
    });

    res.json({
      success: true,
      data: listings,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get price statistics from eBay sold listings
 * GET /api/v1/integrations/ebay/prices
 */
export async function getPricesEbay(req, res, next) {
  try {
    const { q: query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter is required',
        },
        requestId: req.id,
      });
    }

    const prices = await ebayService.getPriceStatistics({
      query,
    });

    logger.info('eBay price statistics fetched', {
      requestId: req.id,
      query,
      sampleSize: prices.sampleSize,
    });

    res.json({
      success: true,
      data: prices,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Enriched search - combines search with price statistics
 * GET /api/v1/integrations/ebay/search-enriched
 */
export async function searchEbayEnriched(req, res, next) {
  try {
    const { q: query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter is required',
        },
        requestId: req.id,
      });
    }

    const results = await ebayService.searchEnriched({
      query,
    });

    logger.info('eBay enriched search completed', {
      requestId: req.id,
      query,
      resultCount: results.results.length,
    });

    res.json({
      success: true,
      data: results,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
