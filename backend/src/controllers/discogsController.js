import discogsService from "../services/discogsService.js";
import logger from "../../config/logger.js";

/**
 * Search Discogs for releases
 * GET /api/v1/integrations/discogs/search
 */
export async function searchDiscogs(req, res, next) {
  try {
    const { q: query, barcode, year, page } = req.query;

    if (!query && !barcode) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Either query or barcode parameter is required",
        },
        requestId: req.id,
      });
    }

    const results = await discogsService.search({
      query,
      barcode,
      year: year ? parseInt(year) : undefined,
      page: page ? parseInt(page) : 1,
    });

    logger.info("Discogs search completed", {
      requestId: req.id,
      query: query || barcode,
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
 * Get detailed release information from Discogs
 * GET /api/v1/integrations/discogs/releases/:id
 */
export async function getDiscogsRelease(req, res, next) {
  try {
    const { id } = req.params;

    const release = await discogsService.getRelease(parseInt(id));

    logger.info("Discogs release fetched", {
      requestId: req.id,
      releaseId: id,
    });

    res.json({
      success: true,
      data: release,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get price statistics for a release
 * GET /api/v1/integrations/discogs/prices/:id
 */
export async function getDiscogsPrices(req, res, next) {
  try {
    const { id } = req.params;

    const prices = await discogsService.getPriceStatistics(parseInt(id));

    logger.info("Discogs price statistics fetched", {
      requestId: req.id,
      releaseId: id,
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
 * Enriched search - combines search with metadata and pricing
 * GET /api/v1/integrations/discogs/search-enriched
 */
export async function searchDiscogsEnriched(req, res, next) {
  try {
    const { q: query, barcode, year, page } = req.query;

    if (!query && !barcode) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Either query or barcode parameter is required",
        },
        requestId: req.id,
      });
    }

    const results = await discogsService.searchEnriched({
      query,
      barcode,
      year: year ? parseInt(year) : undefined,
      page: page ? parseInt(page) : 1,
    });

    logger.info("Discogs enriched search completed", {
      requestId: req.id,
      query: query || barcode,
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
