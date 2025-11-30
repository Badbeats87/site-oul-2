import buyerService from "../services/buyerService.js";
import recommendationService from "../services/recommendationService.js";

/**
 * List products with pagination and filtering
 */
export const listProducts = async (req, res, next) => {
  try {
    const {
      search,
      genre,
      conditions,
      minPrice,
      maxPrice,
      limit,
      page,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await buyerService.listProducts({
      search,
      genre,
      conditions,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit: limit ? parseInt(limit) : 20,
      page: page ? parseInt(page) : 1,
      sortBy: sortBy || "createdAt",
      sortOrder: sortOrder || "desc",
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product detail
 */
export const getProductDetail = async (req, res, next) => {
  try {
    const { inventoryLotId } = req.params;

    const product = await buyerService.getProductDetail(inventoryLotId);

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product recommendations
 */
export const getRecommendations = async (req, res, next) => {
  try {
    const { inventoryLotId } = req.params;
    const { limit = 5 } = req.query;

    const recommendations = await buyerService.getRecommendations(
      inventoryLotId,
      parseInt(limit),
    );

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search products
 */
export const searchProducts = async (req, res, next) => {
  try {
    const { query, limit, page } = req.query;

    const results = await buyerService.searchProducts({
      query,
      limit: limit ? parseInt(limit) : 20,
      page: page ? parseInt(page) : 1,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add product to wishlist
 */
export const addToWishlist = async (req, res, next) => {
  try {
    const { inventoryLotId } = req.body;
    const buyerId =
      req.session?.userId || req.headers["x-buyer-id"] || "anonymous";

    const item = await buyerService.addToWishlist(buyerId, inventoryLotId);

    res.json({
      success: true,
      data: item,
      message: "Added to wishlist",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove product from wishlist
 */
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { inventoryLotId } = req.params;
    const buyerId =
      req.session?.userId || req.headers["x-buyer-id"] || "anonymous";

    const result = await buyerService.removeFromWishlist(
      buyerId,
      inventoryLotId,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get similar items recommendations for a release
 */
export const getSimilarItems = async (req, res, next) => {
  try {
    const { releaseId } = req.params;
    const { limit = 5, variant = "control" } = req.query;

    const result = await recommendationService.getSimilarItems(releaseId, {
      limit: parseInt(limit),
      abVariant: variant,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get new arrivals recommendations
 */
export const getNewArrivals = async (req, res, next) => {
  try {
    const {
      limit = 10,
      daysBack = 30,
      genre = null,
      variant = "control",
    } = req.query;

    const result = await recommendationService.getNewArrivals({
      limit: parseInt(limit),
      daysBack: parseInt(daysBack),
      genre: genre || null,
      abVariant: variant,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get personalized recommendations based on wishlist
 */
export const getPersonalizedRecommendations = async (req, res, next) => {
  try {
    const { wishlistItems } = req.body; // Array of inventory lot IDs
    const { limit = 10, variant = "control" } = req.query;

    const result = await recommendationService.getPersonalizedRecommendations(
      wishlistItems || [],
      {
        limit: parseInt(limit),
        abVariant: variant,
      },
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get A/B test recommendation variants
 */
export const getRecommendationVariants = async (req, res, next) => {
  try {
    const { releaseId } = req.params;
    const { limit = 5 } = req.query;

    const result = await recommendationService.getRecommendationVariants(
      releaseId,
      {
        limit: parseInt(limit),
      },
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record recommendation click for conversion tracking
 */
export const recordRecommendationClick = async (req, res, next) => {
  try {
    const { recommendationTrackingId, variantName, itemId } = req.body;
    const buyerId =
      req.session?.userId || req.headers["x-buyer-id"] || "anonymous";

    const result = await recommendationService.recordRecommendationClick({
      recommendationTrackingId,
      variantName,
      itemId,
      buyerId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
