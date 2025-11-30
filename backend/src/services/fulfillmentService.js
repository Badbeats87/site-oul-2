import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import shippingService from './shippingService.js';
import orderService from './orderService.js';
import notificationService from './notificationService.js';

/**
 * Fulfillment Service
 * Manages the admin workflow for order fulfillment and shipment processing
 * Orchestrates: order preparation → label generation → approval → shipping
 */
class FulfillmentService {
  constructor() {
    logger.info('FulfillmentService initialized');
  }

  // ============================================================================
  // ORDER PREPARATION
  // ============================================================================

  /**
   * Get orders ready for shipment (PAYMENT_CONFIRMED status)
   * @param {Object} filters - Query filters {limit, page, sortBy}
   * @returns {Promise<Object>} Paginated orders with items
   */
  async getOrdersReadyToShip(filters = {}) {
    try {
      const { limit = 50, page = 1, sortBy = 'createdAt' } = filters;

      const skip = (page - 1) * limit;

      // Get orders with PAYMENT_CONFIRMED status
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: {
            status: 'PAYMENT_CONFIRMED',
          },
          include: {
            items: {
              include: {
                inventoryLot: {
                  include: {
                    release: true,
                  },
                },
              },
            },
          },
          orderBy: {
            [sortBy]: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.order.count({
          where: {
            status: 'PAYMENT_CONFIRMED',
          },
        }),
      ]);

      logger.info('Orders ready to ship retrieved', {
        count: orders.length,
        total,
        page,
      });

      return {
        orders,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting orders ready to ship', {
        error: error.message,
      });
      throw new ApiError('Failed to retrieve orders', 500);
    }
  }

  /**
   * Prepare order for shipment by creating Shipment record
   * @param {string} orderId - Order UUID
   * @param {string} shippingMethod - Shipping method (STANDARD, EXPRESS, OVERNIGHT)
   * @returns {Promise<Object>} Created shipment
   */
  async prepareOrderForShipment(orderId, shippingMethod = 'STANDARD') {
    try {
      if (!orderId) {
        throw new ApiError('orderId is required', 400);
      }

      // Validate order exists and is in correct state
      const order = await this.validateOrderForShipment(orderId);

      // Check if shipment already exists
      const existingShipment = await prisma.shipment.findUnique({
        where: { orderId },
      });

      if (existingShipment) {
        logger.info('Shipment already exists for order', { orderId });
        return existingShipment;
      }

      // Create shipment
      const shipment = await shippingService.createShipment(
        orderId,
        shippingMethod
      );

      logger.info('Order prepared for shipment', {
        orderId,
        shipmentId: shipment.id,
        shippingMethod,
      });

      return shipment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error preparing order for shipment', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to prepare order for shipment', 500);
    }
  }

  /**
   * Validate order is ready for shipment
   * @param {string} orderId - Order UUID
   * @returns {Promise<Object>} Order record
   */
  async validateOrderForShipment(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      if (order.status !== 'PAYMENT_CONFIRMED') {
        throw new ApiError(
          `Order status must be PAYMENT_CONFIRMED, got ${order.status}`,
          400
        );
      }

      if (!order.items || order.items.length === 0) {
        throw new ApiError('Order has no items', 400);
      }

      if (!order.shippingAddress) {
        throw new ApiError('Order missing shipping address', 400);
      }

      return order;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Order validation failed', 400);
    }
  }

  // ============================================================================
  // LABEL WORKFLOW
  // ============================================================================

  /**
   * Generate shipping labels for multiple orders
   * @param {Array} orderIds - Array of order UUIDs
   * @returns {Promise<Object>} Results {successful, failed}
   */
  async generateLabelsForOrders(orderIds) {
    try {
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw new ApiError('orderIds must be a non-empty array', 400);
      }

      const results = {
        successful: [],
        failed: [],
      };

      // Process each order
      for (const orderId of orderIds) {
        try {
          // Prepare order if not already done
          const shipment = await this.prepareOrderForShipment(orderId);

          // Generate label
          const label = await shippingService.generateShippingLabel(
            shipment.id
          );

          results.successful.push({
            orderId,
            shipmentId: shipment.id,
            trackingNumber: label.trackingNumber,
            labelUrl: label.labelUrl,
          });
        } catch (error) {
          results.failed.push({
            orderId,
            error: error.message,
          });
        }
      }

      logger.info('Batch label generation completed', {
        successful: results.successful.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in batch label generation', {
        error: error.message,
      });
      throw new ApiError('Failed to generate labels', 500);
    }
  }

  /**
   * Approve shipment for shipping (admin gate)
   * @param {string} shipmentId - Shipment UUID
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated shipment
   */
  async approveShipment(shipmentId, adminId) {
    try {
      if (!shipmentId || !adminId) {
        throw new ApiError('shipmentId and adminId are required', 400);
      }

      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
      });

      if (!shipment) {
        throw new ApiError('Shipment not found', 404);
      }

      if (shipment.shipmentStatus !== 'LABEL_GENERATED') {
        throw new ApiError(
          'Shipment must be in LABEL_GENERATED status to approve',
          400
        );
      }

      // Update shipment with approval
      const updated = await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          shipmentStatus: 'READY_TO_SHIP',
          approvedForShipment: true,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      });

      logger.info('Shipment approved', {
        shipmentId,
        approvedBy: adminId,
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error approving shipment', {
        shipmentId,
        error: error.message,
      });
      throw new ApiError('Failed to approve shipment', 500);
    }
  }

  /**
   * Reject shipment (requires regeneration)
   * @param {string} shipmentId - Shipment UUID
   * @param {string} adminId - Admin user ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated shipment
   */
  async rejectShipment(shipmentId, adminId, reason = '') {
    try {
      if (!shipmentId || !adminId) {
        throw new ApiError('shipmentId and adminId are required', 400);
      }

      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
      });

      if (!shipment) {
        throw new ApiError('Shipment not found', 404);
      }

      // Update shipment to PENDING_LABEL for regeneration
      const updated = await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          shipmentStatus: 'PENDING_LABEL',
          approvedForShipment: false,
          approvedBy: null,
          approvedAt: null,
        },
      });

      // Create tracking event for rejection
      await shippingService.createTrackingEvent(shipmentId, 'PENDING_LABEL', {
        statusDetail: 'Label rejected',
        message: `Rejected by admin: ${reason}`,
      });

      logger.info('Shipment rejected', {
        shipmentId,
        rejectedBy: adminId,
        reason,
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error rejecting shipment', {
        shipmentId,
        error: error.message,
      });
      throw new ApiError('Failed to reject shipment', 500);
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Batch generate labels for multiple orders
   * @param {Array} orderIds - Order UUIDs
   * @param {Object} packageDefaults - Default package settings
   * @returns {Promise<Object>} Results with success/failure breakdown
   */
  async batchGenerateLabels(orderIds, packageDefaults = {}) {
    try {
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw new ApiError('orderIds must be a non-empty array', 400);
      }

      logger.info('Batch generate labels started', {
        count: orderIds.length,
      });

      return await this.generateLabelsForOrders(orderIds);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in batch generate labels', {
        error: error.message,
      });
      throw new ApiError('Failed to batch generate labels', 500);
    }
  }

  /**
   * Batch approve shipments
   * @param {Array} shipmentIds - Shipment UUIDs
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Results {successful, failed}
   */
  async batchApproveShipments(shipmentIds, adminId) {
    try {
      if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
        throw new ApiError('shipmentIds must be a non-empty array', 400);
      }

      if (!adminId) {
        throw new ApiError('adminId is required', 400);
      }

      const results = {
        successful: [],
        failed: [],
      };

      for (const shipmentId of shipmentIds) {
        try {
          const approved = await this.approveShipment(shipmentId, adminId);
          results.successful.push(approved);
        } catch (error) {
          results.failed.push({
            shipmentId,
            error: error.message,
          });
        }
      }

      logger.info('Batch approve shipments completed', {
        successful: results.successful.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in batch approve shipments', {
        error: error.message,
      });
      throw new ApiError('Failed to batch approve shipments', 500);
    }
  }

  /**
   * Batch mark shipments as shipped
   * @param {Array} shipmentIds - Shipment UUIDs
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Results {successful, failed}
   */
  async batchMarkAsShipped(shipmentIds, adminId) {
    try {
      if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
        throw new ApiError('shipmentIds must be a non-empty array', 400);
      }

      if (!adminId) {
        throw new ApiError('adminId is required', 400);
      }

      const results = {
        successful: [],
        failed: [],
      };

      for (const shipmentId of shipmentIds) {
        try {
          const shipped = await this.markAsShipped(shipmentId, adminId);
          results.successful.push(shipped);
        } catch (error) {
          results.failed.push({
            shipmentId,
            error: error.message,
          });
        }
      }

      logger.info('Batch mark as shipped completed', {
        successful: results.successful.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in batch mark as shipped', {
        error: error.message,
      });
      throw new ApiError('Failed to batch mark as shipped', 500);
    }
  }

  // ============================================================================
  // PACKING & SHIPPING WORKFLOW
  // ============================================================================

  /**
   * Mark shipment as packed by admin
   * @param {string} shipmentId - Shipment UUID
   * @param {string} adminId - Admin user ID
   * @param {Object} packageDetails - Final package details
   * @returns {Promise<Object>} Updated shipment
   */
  async markAsPacked(shipmentId, adminId, packageDetails = {}) {
    try {
      if (!shipmentId || !adminId) {
        throw new ApiError('shipmentId and adminId are required', 400);
      }

      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
      });

      if (!shipment) {
        throw new ApiError('Shipment not found', 404);
      }

      if (shipment.shipmentStatus !== 'READY_TO_SHIP') {
        throw new ApiError(
          'Shipment must be in READY_TO_SHIP status to mark as packed',
          400
        );
      }

      // Update shipment - note: not changing status yet, just tracking packing
      const updated = await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          packedBy: adminId,
          packedAt: new Date(),
          weightOz: packageDetails.weightOz || shipment.weightOz,
          dimensions: packageDetails.dimensions || shipment.dimensions,
        },
      });

      logger.info('Shipment marked as packed', {
        shipmentId,
        packedBy: adminId,
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error marking shipment as packed', {
        shipmentId,
        error: error.message,
      });
      throw new ApiError('Failed to mark shipment as packed', 500);
    }
  }

  /**
   * Mark shipment as shipped and update order status
   * @param {string} shipmentId - Shipment UUID
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated shipment and order
   */
  async markAsShipped(shipmentId, adminId) {
    try {
      if (!shipmentId || !adminId) {
        throw new ApiError('shipmentId and adminId are required', 400);
      }

      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: { order: true },
      });

      if (!shipment) {
        throw new ApiError('Shipment not found', 404);
      }

      if (!shipment.order) {
        throw new ApiError('Shipment order not found', 404);
      }

      // Update shipment to IN_TRANSIT
      const updatedShipment = await prisma.$transaction(async (tx) => {
        // Update shipment status
        const updated = await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            shipmentStatus: 'IN_TRANSIT',
            shippedAt: new Date(),
          },
        });

        // Create tracking event
        await tx.shipmentTracking.create({
          data: {
            shipmentId,
            status: 'IN_TRANSIT',
            statusDetail: 'Package picked up',
            message: 'Package picked up from warehouse',
            eventTime: new Date(),
          },
        });

        // Update order to SHIPPED
        await tx.order.update({
          where: { id: shipment.orderId },
          data: {
            status: 'SHIPPED',
            shippedAt: new Date(),
          },
        });

        // Create order audit
        await tx.orderAudit.create({
          data: {
            orderId: shipment.orderId,
            fromStatus: 'PROCESSING',
            toStatus: 'SHIPPED',
            changeReason: `Shipped with tracking ${updated.trackingNumber}`,
            changedBy: adminId,
          },
        });

        return updated;
      });

      logger.info('Shipment marked as shipped', {
        shipmentId,
        orderId: shipment.orderId,
        trackingNumber: shipment.trackingNumber,
        shippedBy: adminId,
      });

      // Send notification to buyer
      try {
        await notificationService.notifyShipmentShipped({
          orderId: shipment.orderId,
          trackingNumber: shipment.trackingNumber,
          trackingUrl: shipment.trackingUrl,
          estimatedDelivery: shipment.estimatedDeliveryDate,
          buyerEmail: shipment.order.buyerEmail,
          buyerName: shipment.order.buyerName,
        });
      } catch (error) {
        logger.warn('Failed to send shipment notification', {
          orderId: shipment.orderId,
          error: error.message,
        });
      }

      return updatedShipment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error marking shipment as shipped', {
        shipmentId,
        error: error.message,
      });
      throw new ApiError('Failed to mark shipment as shipped', 500);
    }
  }

  // ============================================================================
  // ANALYTICS & REPORTING
  // ============================================================================

  /**
   * Get fulfillment statistics
   * @returns {Promise<Object>} Stats on orders and shipments
   */
  async getFulfillmentStats() {
    try {
      const [
        ordersAwaitingShipment,
        shipmentsAwaitingApproval,
        shipmentsInTransit,
        shipmentsDelivered,
        shipmentsWithIssues,
      ] = await Promise.all([
        prisma.order.count({ where: { status: 'PAYMENT_CONFIRMED' } }),
        prisma.shipment.count({
          where: { shipmentStatus: 'LABEL_GENERATED' },
        }),
        prisma.shipment.count({ where: { shipmentStatus: 'IN_TRANSIT' } }),
        prisma.shipment.count({ where: { shipmentStatus: 'DELIVERED' } }),
        prisma.shipment.count({
          where: {
            shipmentStatus: {
              in: ['FAILED_DELIVERY', 'EXCEPTION', 'RETURNED'],
            },
          },
        }),
      ]);

      const stats = {
        ordersAwaitingShipment,
        shipmentsAwaitingApproval,
        shipmentsInTransit,
        shipmentsDelivered,
        shipmentsWithIssues,
        totalShipmentsProcessed: shipmentsDelivered + shipmentsWithIssues,
      };

      logger.info('Fulfillment stats retrieved', stats);

      return stats;
    } catch (error) {
      logger.error('Error getting fulfillment stats', {
        error: error.message,
      });
      throw new ApiError('Failed to retrieve fulfillment statistics', 500);
    }
  }

  /**
   * Get shipments by status with pagination
   * @param {string} status - Shipment status filter
   * @param {Object} filters - Query filters {limit, page, sortBy}
   * @returns {Promise<Object>} Paginated shipments
   */
  async getShipmentsByStatus(status, filters = {}) {
    try {
      const { limit = 50, page = 1, sortBy = 'createdAt' } = filters;

      const skip = (page - 1) * limit;

      const [shipments, total] = await Promise.all([
        prisma.shipment.findMany({
          where: { shipmentStatus: status },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                buyerEmail: true,
              },
            },
            trackingEvents: {
              take: 5,
              orderBy: { eventTime: 'desc' },
            },
          },
          orderBy: {
            [sortBy]: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.shipment.count({
          where: { shipmentStatus: status },
        }),
      ]);

      logger.info('Shipments by status retrieved', {
        status,
        count: shipments.length,
        total,
      });

      return {
        shipments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting shipments by status', {
        status,
        error: error.message,
      });
      throw new ApiError('Failed to retrieve shipments', 500);
    }
  }

  /**
   * Get shipment detail with related data
   */
  async getShipmentDetail(shipmentId) {
    try {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          order: {
            include: {
              items: {
                include: {
                  inventoryLot: {
                    include: {
                      release: true,
                    },
                  },
                },
              },
            },
          },
          trackingEvents: {
            orderBy: { eventTime: 'desc' },
          },
        },
      });

      if (!shipment) {
        throw new ApiError('Shipment not found', 404);
      }

      return shipment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting shipment detail', {
        shipmentId,
        error: error.message,
      });
      throw new ApiError('Failed to retrieve shipment', 500);
    }
  }
}

export default new FulfillmentService();
