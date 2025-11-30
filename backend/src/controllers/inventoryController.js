import inventoryService from '../services/inventoryService.js';
import logger from '../../config/logger.js';

/**
 * List inventory with pagination and filtering
 */
export const listInventory = async (req, res, next) => {
  try {
    const { status, limit, page, sortBy, sortOrder } = req.query;

    const result = await inventoryService.listInventory({
      status,
      limit: limit ? parseInt(limit) : 50,
      page: page ? parseInt(page) : 1,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
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
 * Get inventory lot detail
 */
export const getInventoryDetail = async (req, res, next) => {
  try {
    const { inventoryLotId } = req.params;

    const lot = await inventoryService.getInventoryDetail(inventoryLotId);

    res.json({
      success: true,
      data: lot,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update inventory lot
 */
export const updateInventory = async (req, res, next) => {
  try {
    const { inventoryLotId } = req.params;
    const {
      listPrice,
      salePrice,
      status,
      internalNotes,
      publicDescription,
      sku,
    } = req.body;

    const updated = await inventoryService.updateInventory(inventoryLotId, {
      listPrice,
      salePrice,
      status,
      internalNotes,
      publicDescription,
      sku,
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete/remove inventory lot
 */
export const deleteInventory = async (req, res, next) => {
  try {
    const { inventoryLotId } = req.params;
    const { reason } = req.body;

    const deleted = await inventoryService.deleteInventory(
      inventoryLotId,
      reason,
    );

    res.json({
      success: true,
      data: deleted,
      message: 'Inventory lot removed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply pricing policy to inventory items
 */
export const applyPricingPolicy = async (req, res, next) => {
  try {
    const { policyId, inventoryLotIds, filters, dryRun } = req.body;

    const result = await inventoryService.applyPricingPolicy({
      policyId,
      inventoryLotIds,
      filters: filters || {},
      dryRun: dryRun === true,
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
 * Get pricing history for an inventory lot
 */
export const getPricingHistory = async (req, res, next) => {
  try {
    const { inventoryLotId } = req.params;

    const history = await inventoryService.getPricingHistory(inventoryLotId);

    res.json({
      success: true,
      data: {
        inventoryLotId,
        history,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory analytics
 */
export const getInventoryAnalytics = async (req, res, next) => {
  try {
    const analytics = await inventoryService.getInventoryAnalytics();

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get low-stock alerts
 */
export const getLowStockAlerts = async (req, res, next) => {
  try {
    const { threshold = 3 } = req.query;

    const alerts = await inventoryService.getLowStockAlerts(
      parseInt(threshold),
    );

    res.json({
      success: true,
      data: {
        alerts,
        threshold: parseInt(threshold),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate sales velocity
 */
export const calculateSalesVelocity = async (req, res, next) => {
  try {
    const velocity = await inventoryService.calculateSalesVelocity();

    res.json({
      success: true,
      data: velocity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update inventory prices
 */
export const bulkUpdatePrices = async (req, res, next) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Updates must be an array',
      });
    }

    const result = await inventoryService.bulkUpdatePrices(updates);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
