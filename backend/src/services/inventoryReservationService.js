/**
 * Inventory Reservation Service
 * Manages inventory holds and reservations for checkout flow
 * Handles hold creation, release, expiration, and conversion to sales
 */

import prisma from '../utils/db.js';
import logger from '../../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

const HOLD_DURATION_MINUTES = 30; // How long holds last before expiring

/**
 * Create a hold on an inventory lot for a cart/order
 * Prevents the item from being purchased by another buyer
 */
export async function createHold(inventoryLotId, options = {}) {
  const {
    orderId = null,
    sessionId = null,
    quantity = 1,
    durationMinutes = HOLD_DURATION_MINUTES,
    createdBy = null,
  } = options;

  // Must have either orderId or sessionId (for guest carts)
  if (!orderId && !sessionId) {
    throw new ApiError(
      400,
      'Either orderId or sessionId is required for hold creation'
    );
  }

  try {
    // Check if inventory lot exists and is available
    const inventoryLot = await prisma.inventoryLot.findUnique({
      where: { id: inventoryLotId },
    });

    if (!inventoryLot) {
      throw new ApiError(404, `Inventory lot ${inventoryLotId} not found`);
    }

    if (inventoryLot.status !== 'LIVE') {
      throw new ApiError(
        409,
        `Inventory lot is not available (status: ${inventoryLot.status})`
      );
    }

    // Check for existing active holds on this inventory
    const existingHold = await prisma.inventoryHold.findFirst({
      where: {
        inventoryLotId,
        holdStatus: 'ACTIVE',
      },
    });

    if (existingHold) {
      throw new ApiError(409, 'This item is already reserved by another buyer');
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    // Create the hold
    const hold = await prisma.inventoryHold.create({
      data: {
        inventoryLotId,
        orderId: orderId || null,
        sessionId: sessionId || null,
        quantity,
        holdStatus: 'ACTIVE',
        expiresAt,
        createdBy,
      },
      include: {
        inventoryLot: {
          include: {
            release: true,
          },
        },
      },
    });

    logger.info('Inventory hold created', {
      holdId: hold.id,
      inventoryLotId,
      orderId,
      sessionId,
      expiresAt: expiresAt.toISOString(),
    });

    return hold;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error creating inventory hold:', error);
    throw new ApiError(500, 'Failed to create inventory hold');
  }
}

/**
 * Release a hold and make the item available again
 */
export async function releaseHold(holdId, reason = null, releasedBy = null) {
  try {
    const hold = await prisma.inventoryHold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      throw new ApiError(404, `Hold ${holdId} not found`);
    }

    if (hold.holdStatus !== 'ACTIVE') {
      throw new ApiError(
        400,
        `Cannot release hold with status: ${hold.holdStatus}`
      );
    }

    const now = new Date();

    // Release the hold
    const updatedHold = await prisma.inventoryHold.update({
      where: { id: holdId },
      data: {
        holdStatus: 'RELEASED',
        releasedAt: now,
        releasedReason: reason,
      },
      include: {
        inventoryLot: true,
      },
    });

    // Create audit entry
    await createHoldAudit(holdId, 'ACTIVE', 'RELEASED', reason, releasedBy);

    logger.info('Inventory hold released', {
      holdId,
      inventoryLotId: hold.inventoryLotId,
      reason,
    });

    return updatedHold;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error releasing inventory hold:', error);
    throw new ApiError(500, 'Failed to release inventory hold');
  }
}

/**
 * Convert a hold to a completed sale (order confirmed)
 */
export async function convertHoldToSale(
  holdId,
  reason = 'Order payment confirmed',
  convertedBy = null
) {
  try {
    const hold = await prisma.inventoryHold.findUnique({
      where: { id: holdId },
      include: {
        inventoryLot: true,
      },
    });

    if (!hold) {
      throw new ApiError(404, `Hold ${holdId} not found`);
    }

    if (hold.holdStatus !== 'ACTIVE') {
      throw new ApiError(
        400,
        `Cannot convert hold with status: ${hold.holdStatus}`
      );
    }

    // Update inventory lot status to RESERVED (pending sale)
    const updatedHold = await prisma.inventoryHold.update({
      where: { id: holdId },
      data: {
        holdStatus: 'CONVERTED_TO_SALE',
        releasedAt: new Date(),
      },
      include: {
        inventoryLot: true,
        order: true,
      },
    });

    // Create audit entry
    await createHoldAudit(
      holdId,
      'ACTIVE',
      'CONVERTED_TO_SALE',
      reason,
      convertedBy
    );

    logger.info('Inventory hold converted to sale', {
      holdId,
      inventoryLotId: hold.inventoryLotId,
      orderId: hold.orderId,
    });

    return updatedHold;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error converting inventory hold to sale:', error);
    throw new ApiError(500, 'Failed to convert hold to sale');
  }
}

/**
 * Find and release all expired holds
 * Should be run periodically via job scheduler
 */
export async function releaseExpiredHolds() {
  try {
    const now = new Date();

    // Find all expired active holds
    const expiredHolds = await prisma.inventoryHold.findMany({
      where: {
        holdStatus: 'ACTIVE',
        expiresAt: {
          lte: now,
        },
      },
    });

    if (expiredHolds.length === 0) {
      logger.debug('No expired holds to release');
      return [];
    }

    // Release all expired holds
    const releasedHolds = [];
    for (const hold of expiredHolds) {
      const updated = await releaseHold(
        hold.id,
        'Hold expired - cart abandoned',
        null
      );
      releasedHolds.push(updated);
    }

    logger.info('Released expired holds', {
      count: releasedHolds.length,
    });

    return releasedHolds;
  } catch (error) {
    logger.error('Error releasing expired holds:', error);
    // Don't throw - this is a background job, we want it to continue
    return [];
  }
}

/**
 * Get all active holds for a specific inventory lot
 */
export async function getHoldsForInventory(inventoryLotId) {
  try {
    const holds = await prisma.inventoryHold.findMany({
      where: {
        inventoryLotId,
        holdStatus: 'ACTIVE',
      },
      include: {
        order: true,
      },
    });

    return holds;
  } catch (error) {
    logger.error('Error fetching holds for inventory:', error);
    throw new ApiError(500, 'Failed to fetch inventory holds');
  }
}

/**
 * Get all active holds for an order/cart
 */
export async function getHoldsForOrder(orderId) {
  try {
    const holds = await prisma.inventoryHold.findMany({
      where: {
        orderId,
        holdStatus: 'ACTIVE',
      },
      include: {
        inventoryLot: {
          include: {
            release: true,
          },
        },
      },
    });

    return holds;
  } catch (error) {
    logger.error('Error fetching holds for order:', error);
    throw new ApiError(500, 'Failed to fetch holds for order');
  }
}

/**
 * Get all active holds for a guest session
 */
export async function getHoldsForSession(sessionId) {
  try {
    const holds = await prisma.inventoryHold.findMany({
      where: {
        sessionId,
        holdStatus: 'ACTIVE',
      },
      include: {
        inventoryLot: {
          include: {
            release: true,
          },
        },
      },
    });

    return holds;
  } catch (error) {
    logger.error('Error fetching holds for session:', error);
    throw new ApiError(500, 'Failed to fetch holds for session');
  }
}

/**
 * Check if an inventory lot has an active hold
 */
export async function hasActiveHold(inventoryLotId) {
  try {
    const hold = await prisma.inventoryHold.findFirst({
      where: {
        inventoryLotId,
        holdStatus: 'ACTIVE',
      },
    });

    return !!hold;
  } catch (error) {
    logger.error('Error checking for active hold:', error);
    return false;
  }
}

/**
 * Get hold audit history for an inventory hold
 */
export async function getHoldAuditHistory(holdId) {
  try {
    const history = await prisma.inventoryHoldAudit.findMany({
      where: { holdId },
      orderBy: { changedAt: 'desc' },
    });

    return history;
  } catch (error) {
    logger.error('Error fetching hold audit history:', error);
    throw new ApiError(500, 'Failed to fetch hold audit history');
  }
}

/**
 * Get aggregate hold statistics
 */
export async function getHoldStatistics() {
  try {
    const stats = await prisma.inventoryHold.groupBy({
      by: ['holdStatus'],
      _count: true,
    });

    // Get active holds about to expire (within 5 minutes)
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const expiringSoon = await prisma.inventoryHold.count({
      where: {
        holdStatus: 'ACTIVE',
        expiresAt: {
          lte: fiveMinutesFromNow,
          gt: now,
        },
      },
    });

    return {
      byStatus: stats,
      expiringSoon,
    };
  } catch (error) {
    logger.error('Error fetching hold statistics:', error);
    throw new ApiError(500, 'Failed to fetch hold statistics');
  }
}

/**
 * Release all holds for an order (order cancelled)
 */
export async function releaseAllHoldsForOrder(
  orderId,
  reason = 'Order cancelled',
  releasedBy = null
) {
  try {
    const holds = await getHoldsForOrder(orderId);

    const releasedHolds = [];
    for (const hold of holds) {
      const released = await releaseHold(hold.id, reason, releasedBy);
      releasedHolds.push(released);
    }

    logger.info('Released all holds for order', {
      orderId,
      count: releasedHolds.length,
    });

    return releasedHolds;
  } catch (error) {
    logger.error('Error releasing holds for order:', error);
    throw new ApiError(500, 'Failed to release holds for order');
  }
}

/**
 * Create an audit entry for hold status change
 */
async function createHoldAudit(
  holdId,
  fromStatus,
  toStatus,
  reason = null,
  changedBy = null
) {
  try {
    await prisma.inventoryHoldAudit.create({
      data: {
        holdId,
        fromStatus,
        toStatus,
        reason,
        changedBy,
      },
    });
  } catch (error) {
    logger.error('Error creating hold audit entry:', error);
    // Don't throw - audit is non-critical
  }
}

export default {
  createHold,
  releaseHold,
  convertHoldToSale,
  releaseExpiredHolds,
  getHoldsForInventory,
  getHoldsForOrder,
  getHoldsForSession,
  hasActiveHold,
  getHoldAuditHistory,
  getHoldStatistics,
  releaseAllHoldsForOrder,
};
