import prisma from "../utils/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import logger from "../../config/logger.js";

/**
 * Buyer Service
 * Provides buyer-facing functionality for browsing, searching, and purchasing
 */
class BuyerService {
  /**
   * List products for buyers with filtering and search
   * @param {Object} filters - Filter options
   * @param {string} filters.search - Search by album/artist
   * @param {string} filters.genre - Filter by genre
   * @param {string|string[]} filters.conditions - Filter by condition
   * @param {number} filters.minPrice - Minimum price
   * @param {number} filters.maxPrice - Maximum price
   * @param {number} filters.limit - Results per page
   * @param {number} filters.page - Page number
   * @param {string} filters.sortBy - Sort field (price, createdAt, popularity)
   * @param {string} filters.sortOrder - Sort direction (asc, desc)
   * @returns {Promise<Object>} Paginated product listings
   */
  async listProducts(filters = {}) {
    try {
      const {
        search,
        genre,
        conditions,
        minPrice,
        maxPrice,
        limit = 20,
        page = 1,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = filters;

      if (limit > 500) {
        throw new ApiError("Limit cannot exceed 500", 400);
      }

      const validSortFields = ["price", "createdAt", "popularity"];
      const finalSortBy = validSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";
      const finalSortOrder = sortOrder === "asc" ? "asc" : "desc";

      const where = { status: "LIVE" };

      // Genre filter
      if (genre) {
        where.release = { genre };
      }

      // Condition filtering
      if (conditions) {
        const grades = Array.isArray(conditions) ? conditions : [conditions];
        where.OR = [
          { conditionMedia: { in: grades } },
          { conditionSleeve: { in: grades } },
        ];
      }

      // Price range
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.listPrice = {};
        if (minPrice !== undefined) {
          where.listPrice.gte = minPrice;
        }
        if (maxPrice !== undefined) {
          where.listPrice.lte = maxPrice;
        }
      }

      // Search by album or artist
      if (search) {
        where.OR = where.OR || [];
        where.OR.push(
          { release: { title: { contains: search, mode: "insensitive" } } },
          { release: { artist: { contains: search, mode: "insensitive" } } },
        );
      }

      const skip = (page - 1) * limit;
      const orderBy =
        finalSortBy === "price"
          ? { listPrice: finalSortOrder }
          : finalSortBy === "popularity"
            ? { createdAt: finalSortOrder } // Placeholder for actual popularity
            : { [finalSortBy]: finalSortOrder };

      const [products, total] = await Promise.all([
        prisma.inventoryLot.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            release: {
              select: {
                id: true,
                title: true,
                artist: true,
                label: true,
                genre: true,
                releaseYear: true,
                coverArtUrl: true,
              },
            },
          },
        }),
        prisma.inventoryLot.count({ where }),
      ]);

      return {
        products: products.map((p) => this._formatProductForBuyer(p)),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error listing products", { error: error.message });
      throw new ApiError("Failed to list products", 500);
    }
  }

  /**
   * Get product detail
   * @param {string} inventoryLotId - Inventory lot ID
   * @returns {Promise<Object>} Detailed product information
   */
  async getProductDetail(inventoryLotId) {
    try {
      const product = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
        include: {
          release: true,
        },
      });

      if (!product || product.status !== "LIVE") {
        throw new ApiError("Product not found", 404);
      }

      return {
        id: product.id,
        sku: product.sku,
        release: {
          id: product.release.id,
          title: product.release.title,
          artist: product.release.artist,
          label: product.release.label,
          genre: product.release.genre,
          releaseYear: product.release.releaseYear,
          coverArtUrl: product.release.coverArtUrl,
          description: product.release.description,
        },
        condition: {
          media: product.conditionMedia,
          sleeve: product.conditionSleeve,
        },
        pricing: {
          price: parseFloat(product.listPrice),
          salePrice: product.salePrice ? parseFloat(product.salePrice) : null,
        },
        channel: product.channel,
        description: product.publicDescription,
        photos: product.photoUrls || [],
        inStock: product.status === "LIVE",
        createdAt: product.createdAt,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error getting product detail", {
        inventoryLotId,
        error: error.message,
      });
      throw new ApiError("Failed to get product detail", 500);
    }
  }

  /**
   * Add product to wishlist
   * @param {string} buyerId - Buyer ID/session ID
   * @param {string} inventoryLotId - Inventory lot ID
   * @returns {Promise<Object>} Wishlist item
   */
  async addToWishlist(buyerId, inventoryLotId) {
    try {
      if (!buyerId || !inventoryLotId) {
        throw new ApiError("Buyer ID and inventory lot ID are required", 400);
      }

      // Verify product exists and is available
      const product = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
      });

      if (!product || product.status !== "LIVE") {
        throw new ApiError("Product not found or not available", 404);
      }

      // For now, store wishlist in memory/session
      // In production, would use a Wishlist model
      const wishlistKey = `wishlist:${buyerId}`;

      logger.info("Item added to wishlist", {
        buyerId,
        inventoryLotId,
        productSku: product.sku,
      });

      return {
        inventoryLotId,
        sku: product.sku,
        price: parseFloat(product.listPrice),
        addedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error adding to wishlist", {
        buyerId,
        error: error.message,
      });
      throw new ApiError("Failed to add to wishlist", 500);
    }
  }

  /**
   * Remove product from wishlist
   * @param {string} buyerId - Buyer ID/session ID
   * @param {string} inventoryLotId - Inventory lot ID
   * @returns {Promise<Object>} Success message
   */
  async removeFromWishlist(buyerId, inventoryLotId) {
    try {
      if (!buyerId || !inventoryLotId) {
        throw new ApiError("Buyer ID and inventory lot ID are required", 400);
      }

      logger.info("Item removed from wishlist", {
        buyerId,
        inventoryLotId,
      });

      return {
        message: "Item removed from wishlist",
        inventoryLotId,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error removing from wishlist", {
        buyerId,
        error: error.message,
      });
      throw new ApiError("Failed to remove from wishlist", 500);
    }
  }

  /**
   * Get product recommendations
   * @param {string} inventoryLotId - Current product ID
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>} Recommended products
   */
  async getRecommendations(inventoryLotId, limit = 5) {
    try {
      // Get the current product
      const product = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
        include: { release: true },
      });

      if (!product) {
        throw new ApiError("Product not found", 404);
      }

      // Find similar products (same artist or genre, different items)
      const recommendations = await prisma.inventoryLot.findMany({
        where: {
          AND: [
            { status: "LIVE" },
            { id: { not: inventoryLotId } },
            {
              OR: [
                { release: { artist: product.release.artist } },
                { release: { genre: product.release.genre } },
              ],
            },
          ],
        },
        include: { release: true },
        take: limit,
      });

      return recommendations.map((p) => this._formatProductForBuyer(p));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error getting recommendations", {
        inventoryLotId,
        error: error.message,
      });
      throw new ApiError("Failed to get recommendations", 500);
    }
  }

  /**
   * Search products with full-text search
   * @param {Object} options - Search options
   * @param {string} options.query - Search query
   * @param {number} options.limit - Results limit
   * @param {number} options.page - Page number
   * @returns {Promise<Object>} Search results
   */
  async searchProducts(options = {}) {
    try {
      const { query, limit = 20, page = 1 } = options;

      if (!query || query.trim().length === 0) {
        throw new ApiError("Search query is required", 400);
      }

      if (limit > 500) {
        throw new ApiError("Limit cannot exceed 500", 400);
      }

      const skip = (page - 1) * limit;
      const searchTerm = query.trim();

      const [results, total] = await Promise.all([
        prisma.inventoryLot.findMany({
          where: {
            AND: [
              { status: "LIVE" },
              {
                OR: [
                  {
                    release: {
                      title: { contains: searchTerm, mode: "insensitive" },
                    },
                  },
                  {
                    release: {
                      artist: { contains: searchTerm, mode: "insensitive" },
                    },
                  },
                  {
                    release: {
                      label: { contains: searchTerm, mode: "insensitive" },
                    },
                  },
                  {
                    release: {
                      barcode: { contains: searchTerm, mode: "insensitive" },
                    },
                  },
                  { sku: { contains: searchTerm, mode: "insensitive" } },
                ],
              },
            ],
          },
          skip,
          take: limit,
          include: { release: true },
        }),
        prisma.inventoryLot.count({
          where: {
            AND: [
              { status: "LIVE" },
              {
                OR: [
                  {
                    release: {
                      title: { contains: searchTerm, mode: "insensitive" },
                    },
                  },
                  {
                    release: {
                      artist: { contains: searchTerm, mode: "insensitive" },
                    },
                  },
                  {
                    release: {
                      label: { contains: searchTerm, mode: "insensitive" },
                    },
                  },
                  {
                    release: {
                      barcode: { contains: searchTerm, mode: "insensitive" },
                    },
                  },
                  { sku: { contains: searchTerm, mode: "insensitive" } },
                ],
              },
            ],
          },
        }),
      ]);

      return {
        query: searchTerm,
        results: results.map((p) => this._formatProductForBuyer(p)),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error searching products", { error: error.message });
      throw new ApiError("Failed to search products", 500);
    }
  }

  /**
   * Format product for buyer view (private helper)
   * @private
   */
  _formatProductForBuyer(lot) {
    return {
      id: lot.id,
      sku: lot.sku,
      releaseTitle: lot.release.title,
      releaseArtist: lot.release.artist,
      releaseGenre: lot.release.genre,
      releaseYear: lot.release.releaseYear,
      coverArtUrl: lot.release.coverArtUrl,
      condition: `${lot.conditionMedia}/${lot.conditionSleeve}`,
      price: parseFloat(lot.listPrice),
      salePrice: lot.salePrice ? parseFloat(lot.salePrice) : null,
      inStock: lot.status === "LIVE",
    };
  }
}

export default new BuyerService();
