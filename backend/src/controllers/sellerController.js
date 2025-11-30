import sellerService from "../services/sellerService.js";
import logger from "../../config/logger.js";

/**
 * POST /api/v1/sellers/register
 * Register a new seller and create submission
 */
export const registerSeller = async (req, res, next) => {
  try {
    const { email, name, phone, notes } = req.body;

    const seller = await sellerService.registerSeller({
      email,
      name,
      phone,
      notes,
    });

    res.status(201).json({
      success: true,
      data: seller,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/sellers/:id
 * Get seller information by ID
 */
export const getSellerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const seller = await sellerService.getSellerById(id);

    res.json({
      success: true,
      data: seller,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/sellers/:id
 * Update seller information
 */
export const updateSeller = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, notes } = req.body;

    const seller = await sellerService.updateSeller(id, { name, notes });

    res.json({
      success: true,
      data: seller,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/sellers
 * List all sellers (admin only)
 */
export const listSellers = async (req, res, next) => {
  try {
    const { status, limit, page } = req.query;

    const result = await sellerService.listSellers({
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      page: page ? parseInt(page, 10) : 1,
    });

    res.json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/sellers/:id/quote
 * Get seller quote summary
 */
export const getSellerQuote = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quote = await sellerService.getSellerQuote(id);

    res.json({
      success: true,
      data: quote,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};
