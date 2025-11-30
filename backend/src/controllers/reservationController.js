/**
 * Inventory Reservation Controller
 * REST API endpoints for inventory holds and reservations
 */

import * as inventoryReservationService from '../services/inventoryReservationService.js';

/**
 * POST /api/v1/inventory/reserves
 * Create a hold on an inventory lot
 */
export async function createReservation(req, res, next) {
  try {
    const { inventoryLotId, orderId, sessionId, quantity = 1, durationMinutes } = req.body;

    // Validation
    if (!inventoryLotId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'inventoryLotId is required',
        },
      });
    }

    if (!orderId && !sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Either orderId or sessionId is required',
        },
      });
    }

    // Create hold
    const hold = await inventoryReservationService.createHold(inventoryLotId, {
      orderId,
      sessionId,
      quantity,
      durationMinutes,
      createdBy: req.user?.id,
    });

    res.status(201).json({
      success: true,
      data: {
        id: hold.id,
        inventoryLotId: hold.inventoryLotId,
        orderId: hold.orderId,
        sessionId: hold.sessionId,
        holdStatus: hold.holdStatus,
        quantity: hold.quantity,
        expiresAt: hold.expiresAt,
        createdAt: hold.createdAt,
        inventoryLot: {
          id: hold.inventoryLot.id,
          sku: hold.inventoryLot.sku,
          status: hold.inventoryLot.status,
          release: {
            id: hold.inventoryLot.release?.id,
            title: hold.inventoryLot.release?.title,
            artist: hold.inventoryLot.release?.artist,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/inventory/reserves/:holdId
 * Release a hold on inventory
 */
export async function releaseReservation(req, res, next) {
  try {
    const { holdId } = req.params;
    const { reason } = req.body;

    if (!holdId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'holdId is required',
        },
      });
    }

    // Release hold
    const hold = await inventoryReservationService.releaseHold(
      holdId,
      reason || 'Released via API',
      req.user?.id
    );

    res.status(200).json({
      success: true,
      data: {
        id: hold.id,
        inventoryLotId: hold.inventoryLotId,
        holdStatus: hold.holdStatus,
        releasedAt: hold.releasedAt,
        releasedReason: hold.releasedReason,
        updatedAt: hold.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/reserves/:inventoryLotId/check
 * Check if an inventory lot has an active hold
 */
export async function checkReservation(req, res, next) {
  try {
    const { inventoryLotId } = req.params;

    if (!inventoryLotId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'inventoryLotId is required',
        },
      });
    }

    // Check for active holds
    const holds = await inventoryReservationService.getHoldsForInventory(inventoryLotId);
    const hasHold = holds.length > 0;

    res.status(200).json({
      success: true,
      data: {
        inventoryLotId,
        isReserved: hasHold,
        activeHolds: holds.length,
        holds: holds.map((hold) => ({
          id: hold.id,
          orderId: hold.orderId,
          sessionId: hold.sessionId,
          holdStatus: hold.holdStatus,
          expiresAt: hold.expiresAt,
          createdAt: hold.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/reserves/order/:orderId
 * Get all holds for a specific order/cart
 */
export async function getOrderReservations(req, res, next) {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'orderId is required',
        },
      });
    }

    // Get holds for order
    const holds = await inventoryReservationService.getHoldsForOrder(orderId);

    res.status(200).json({
      success: true,
      data: {
        orderId,
        totalHolds: holds.length,
        holds: holds.map((hold) => ({
          id: hold.id,
          holdStatus: hold.holdStatus,
          quantity: hold.quantity,
          expiresAt: hold.expiresAt,
          createdAt: hold.createdAt,
          inventoryLot: {
            id: hold.inventoryLot.id,
            sku: hold.inventoryLot.sku,
            status: hold.inventoryLot.status,
            price: hold.inventoryLot.listPrice,
            release: {
              id: hold.inventoryLot.release?.id,
              title: hold.inventoryLot.release?.title,
              artist: hold.inventoryLot.release?.artist,
            },
          },
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/reserves/session/:sessionId
 * Get all holds for a guest session
 */
export async function getSessionReservations(req, res, next) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'sessionId is required',
        },
      });
    }

    // Get holds for session
    const holds = await inventoryReservationService.getHoldsForSession(sessionId);

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        totalHolds: holds.length,
        holds: holds.map((hold) => ({
          id: hold.id,
          holdStatus: hold.holdStatus,
          quantity: hold.quantity,
          expiresAt: hold.expiresAt,
          createdAt: hold.createdAt,
          inventoryLot: {
            id: hold.inventoryLot.id,
            sku: hold.inventoryLot.sku,
            status: hold.inventoryLot.status,
            price: hold.inventoryLot.listPrice,
            release: {
              id: hold.inventoryLot.release?.id,
              title: hold.inventoryLot.release?.title,
              artist: hold.inventoryLot.release?.artist,
            },
          },
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/holds/:holdId/history
 * Get audit history for a hold
 */
export async function getReservationHistory(req, res, next) {
  try {
    const { holdId } = req.params;

    if (!holdId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'holdId is required',
        },
      });
    }

    // Get audit history
    const history = await inventoryReservationService.getHoldAuditHistory(holdId);

    res.status(200).json({
      success: true,
      data: {
        holdId,
        historyCount: history.length,
        history: history.map((entry) => ({
          id: entry.id,
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          reason: entry.reason,
          changedBy: entry.changedBy,
          changedAt: entry.changedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/inventory/reserves/stats
 * Get hold statistics
 */
export async function getReservationStats(req, res, next) {
  try {
    const stats = await inventoryReservationService.getHoldStatistics();

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats.byStatus,
        expiringSoon: stats.expiringSoon,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/inventory/reserves/:holdId/convert
 * Convert a hold to a completed sale (admin only)
 */
export async function convertReservationToSale(req, res, next) {
  try {
    const { holdId } = req.params;
    const { reason } = req.body;

    if (!holdId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'holdId is required',
        },
      });
    }

    // Convert hold to sale
    const hold = await inventoryReservationService.convertHoldToSale(
      holdId,
      reason || 'Converted to sale',
      req.user?.id
    );

    res.status(200).json({
      success: true,
      data: {
        id: hold.id,
        holdStatus: hold.holdStatus,
        orderId: hold.orderId,
        inventoryLotId: hold.inventoryLotId,
        releasedAt: hold.releasedAt,
        updatedAt: hold.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export default {
  createReservation,
  releaseReservation,
  checkReservation,
  getOrderReservations,
  getSessionReservations,
  getReservationHistory,
  getReservationStats,
  convertReservationToSale,
};
