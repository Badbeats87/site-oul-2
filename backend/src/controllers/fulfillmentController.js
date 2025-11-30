import fulfillmentService from "../services/fulfillmentService.js";
import logger from "../../config/logger.js";
import { ApiError } from "../middleware/errorHandler.js";

/**
 * Fulfillment Controller
 * Handles admin fulfillment workflow for orders and shipments
 */

/**
 * Get orders ready to ship (PAYMENT_CONFIRMED status)
 * GET /api/v1/fulfillment/orders/ready-to-ship
 */
export async function getOrdersReadyToShip(req, res, next) {
  try {
    const { limit, page, status, sortBy, sortOrder } = req.query;

    const result = await fulfillmentService.getOrdersReadyToShip({
      filters: { status },
      limit: limit ? parseInt(limit) : 50,
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
}

/**
 * Prepare order for shipment
 * POST /api/v1/fulfillment/orders/:orderId/prepare
 */
export async function prepareOrderForShipment(req, res, next) {
  try {
    const { orderId } = req.params;
    const { shippingMethod } = req.body;

    if (!orderId || !shippingMethod) {
      throw new ApiError("orderId and shippingMethod are required", 400);
    }

    const result = await fulfillmentService.prepareOrderForShipment(
      orderId,
      shippingMethod,
    );

    logger.info("Order prepared for shipment via API", {
      orderId,
      shippingMethod,
    });

    res.json({
      success: true,
      data: result,
      message: "Order prepared for shipment",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate shipping labels for orders
 * POST /api/v1/fulfillment/labels/generate
 */
export async function generateLabelsForOrders(req, res, next) {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new ApiError("orderIds (non-empty array) is required", 400);
    }

    const result = await fulfillmentService.batchGenerateLabels(orderIds);

    logger.info("Labels generated via API", {
      orderCount: orderIds.length,
      successCount: result.success,
      failureCount: result.failed,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Approve shipment (move from LABEL_GENERATED to READY_TO_SHIP)
 * POST /api/v1/fulfillment/shipments/:shipmentId/approve
 */
export async function approveShipment(req, res, next) {
  try {
    const { shipmentId } = req.params;
    const adminId = req.user?.id;

    if (!shipmentId) {
      throw new ApiError("shipmentId is required", 400);
    }

    if (!adminId) {
      throw new ApiError("Admin ID required", 401);
    }

    const result = await fulfillmentService.approveShipment(
      shipmentId,
      adminId,
    );

    logger.info("Shipment approved via API", { shipmentId, adminId });

    res.json({
      success: true,
      data: result,
      message: "Shipment approved",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject shipment (move back to PENDING_LABEL)
 * POST /api/v1/fulfillment/shipments/:shipmentId/reject
 */
export async function rejectShipment(req, res, next) {
  try {
    const { shipmentId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    if (!shipmentId || !reason) {
      throw new ApiError("shipmentId and reason are required", 400);
    }

    if (!adminId) {
      throw new ApiError("Admin ID required", 401);
    }

    const result = await fulfillmentService.rejectShipment(
      shipmentId,
      adminId,
      reason,
    );

    logger.info("Shipment rejected via API", { shipmentId, adminId, reason });

    res.json({
      success: true,
      data: result,
      message: "Shipment rejected",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Batch approve shipments
 * POST /api/v1/fulfillment/shipments/batch/approve
 */
export async function batchApproveShipments(req, res, next) {
  try {
    const { shipmentIds } = req.body;
    const adminId = req.user?.id;

    if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      throw new ApiError("shipmentIds (non-empty array) is required", 400);
    }

    if (!adminId) {
      throw new ApiError("Admin ID required", 401);
    }

    const result = await fulfillmentService.batchApproveShipments(
      shipmentIds,
      adminId,
    );

    logger.info("Batch shipments approved via API", {
      shipmentCount: shipmentIds.length,
      successCount: result.success,
      failureCount: result.failed,
      adminId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark shipment as packed
 * POST /api/v1/fulfillment/shipments/:shipmentId/pack
 */
export async function markAsPacked(req, res, next) {
  try {
    const { shipmentId } = req.params;
    const { packageDetails } = req.body;
    const adminId = req.user?.id;

    if (!shipmentId) {
      throw new ApiError("shipmentId is required", 400);
    }

    if (!adminId) {
      throw new ApiError("Admin ID required", 401);
    }

    const result = await fulfillmentService.markAsPacked(
      shipmentId,
      adminId,
      packageDetails,
    );

    logger.info("Shipment marked as packed via API", { shipmentId, adminId });

    res.json({
      success: true,
      data: result,
      message: "Shipment marked as packed",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark shipment as shipped
 * POST /api/v1/fulfillment/shipments/:shipmentId/ship
 */
export async function markAsShipped(req, res, next) {
  try {
    const { shipmentId } = req.params;
    const adminId = req.user?.id;

    if (!shipmentId) {
      throw new ApiError("shipmentId is required", 400);
    }

    if (!adminId) {
      throw new ApiError("Admin ID required", 401);
    }

    const result = await fulfillmentService.markAsShipped(shipmentId, adminId);

    logger.info("Shipment marked as shipped via API", { shipmentId, adminId });

    res.json({
      success: true,
      data: result,
      message: "Shipment marked as shipped",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Batch mark shipments as shipped
 * POST /api/v1/fulfillment/shipments/batch/ship
 */
export async function batchMarkAsShipped(req, res, next) {
  try {
    const { shipmentIds } = req.body;
    const adminId = req.user?.id;

    if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      throw new ApiError("shipmentIds (non-empty array) is required", 400);
    }

    if (!adminId) {
      throw new ApiError("Admin ID required", 401);
    }

    const result = await fulfillmentService.batchMarkAsShipped(
      shipmentIds,
      adminId,
    );

    logger.info("Batch shipments marked as shipped via API", {
      shipmentCount: shipmentIds.length,
      successCount: result.success,
      failureCount: result.failed,
      adminId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get fulfillment statistics
 * GET /api/v1/fulfillment/stats
 */
export async function getFulfillmentStats(req, res, next) {
  try {
    const stats = await fulfillmentService.getFulfillmentStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get shipments by status
 * GET /api/v1/fulfillment/shipments
 */
export async function getShipmentsByStatus(req, res, next) {
  try {
    const { status, limit, page, sortBy, sortOrder } = req.query;

    if (!status) {
      throw new ApiError("status is required", 400);
    }

    const result = await fulfillmentService.getShipmentsByStatus(status, {
      limit: limit ? parseInt(limit) : 50,
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
}

/**
 * Get shipment detail
 * GET /api/v1/fulfillment/shipments/:shipmentId
 */
export async function getShipmentDetail(req, res, next) {
  try {
    const { shipmentId } = req.params;

    if (!shipmentId) {
      throw new ApiError("shipmentId is required", 400);
    }

    const shipment = await fulfillmentService.getShipmentDetail(shipmentId);

    res.json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    next(error);
  }
}
