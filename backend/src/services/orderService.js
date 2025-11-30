import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';

/**
 * Order Service
 * Manages order CRUD operations and state machine transitions
 */
class OrderService {
  // Valid state transitions for orders
  VALID_TRANSITIONS = {
    CART: ['PAYMENT_PENDING', 'CANCELLED'],
    PAYMENT_PENDING: ['PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'CANCELLED'],
    PAYMENT_CONFIRMED: ['PROCESSING', 'REFUNDED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    PAYMENT_FAILED: ['CART', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: [],
    REFUNDED: [],
  };

  /**
   * Create a new order
   * @param {Object} data - Order data
   * @param {string} data.buyerEmail - Buyer email
   * @param {string} data.buyerName - Buyer name (optional)
   * @param {string} data.sessionId - Session ID for guest checkout
   * @returns {Promise<Object>} Created order
   */
  async createOrder(data) {
    try {
      const { buyerEmail, buyerName, sessionId } = data;

      if (!buyerEmail) {
        throw new ApiError('buyerEmail is required', 400);
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      const order = await prisma.order.create({
        data: {
          orderNumber,
          buyerEmail,
          buyerName: buyerName || null,
          sessionId: sessionId || null,
          status: 'CART',
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0,
        },
        include: {
          items: true,
          audits: true,
        },
      });

      logger.info('Order created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        buyerEmail,
      });

      return order;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating order', { error: error.message });
      throw new ApiError('Failed to create order', 500);
    }
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order with items and audit trail
   */
  async getOrderById(orderId) {
    try {
      if (!orderId) {
        throw new ApiError('orderId is required', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              inventoryLot: true,
            },
          },
          audits: {
            orderBy: { changedAt: 'desc' },
          },
        },
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      return order;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting order', { orderId, error: error.message });
      throw new ApiError('Failed to get order', 500);
    }
  }

  /**
   * Get orders by buyer email
   * @param {string} buyerEmail - Buyer email
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of orders
   */
  async getOrdersByBuyer(buyerEmail, filters = {}) {
    try {
      if (!buyerEmail) {
        throw new ApiError('buyerEmail is required', 400);
      }

      const { status, limit = 50, page = 1 } = filters;

      const where = { buyerEmail };
      if (status) {
        where.status = status;
      }

      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            audits: true,
          },
        }),
        prisma.order.count({ where }),
      ]);

      return {
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting orders by buyer', {
        buyerEmail,
        error: error.message,
      });
      throw new ApiError('Failed to get orders', 500);
    }
  }

  /**
   * Update order status with validation
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New status
   * @param {string} reason - Reason for status change
   * @param {string} changedBy - Admin user ID who made the change
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderStatus(orderId, newStatus, reason = null, changedBy = null) {
    try {
      if (!orderId || !newStatus) {
        throw new ApiError('orderId and newStatus are required', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      // Validate transition
      this.validateStatusTransition(order.status, newStatus);

      // Update order and create audit
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            // Update relevant timestamps based on new status
            ...(newStatus === 'PAYMENT_PENDING' && {
              checkoutStartedAt: new Date(),
            }),
            ...(newStatus === 'PAYMENT_CONFIRMED' && {
              paymentConfirmedAt: new Date(),
            }),
            ...(newStatus === 'SHIPPED' && { shippedAt: new Date() }),
            ...(newStatus === 'DELIVERED' && { deliveredAt: new Date() }),
          },
          include: { items: true, audits: true },
        });

        // Create audit record
        await tx.orderAudit.create({
          data: {
            orderId,
            fromStatus: order.status,
            toStatus: newStatus,
            changeReason: reason,
            changedBy,
          },
        });

        return updated;
      });

      logger.info('Order status updated', {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        reason,
      });

      return updatedOrder;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating order status', {
        orderId,
        newStatus,
        error: error.message,
      });
      throw new ApiError('Failed to update order status', 500);
    }
  }

  /**
   * Validate that a status transition is allowed
   * @param {string} fromStatus - Current status
   * @param {string} toStatus - Desired status
   * @throws {ApiError} If transition is invalid
   */
  validateStatusTransition(fromStatus, toStatus) {
    const validTransitions = this.VALID_TRANSITIONS[fromStatus];

    if (!validTransitions) {
      throw new ApiError(`Unknown status: ${fromStatus}`, 400);
    }

    if (!validTransitions.includes(toStatus)) {
      throw new ApiError(
        `Cannot transition from ${fromStatus} to ${toStatus}`,
        400
      );
    }
  }

  /**
   * Transition order to PAYMENT_PENDING status
   * @param {string} orderId - Order ID
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} Updated order
   */
  async transitionToPaymentPending(orderId, paymentIntentId) {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAYMENT_PENDING',
          stripePaymentIntentId: paymentIntentId,
          checkoutStartedAt: new Date(),
        },
        include: { items: true, audits: true },
      });

      // Create audit
      await prisma.orderAudit.create({
        data: {
          orderId,
          fromStatus: 'CART',
          toStatus: 'PAYMENT_PENDING',
          changeReason: 'Checkout initiated',
        },
      });

      return order;
    } catch (error) {
      logger.error('Error transitioning to PAYMENT_PENDING', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to transition order status', 500);
    }
  }

  /**
   * Transition order to PAYMENT_CONFIRMED status
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Updated order
   */
  async transitionToPaymentConfirmed(orderId) {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAYMENT_CONFIRMED',
          paymentConfirmedAt: new Date(),
        },
        include: { items: true, audits: true },
      });

      // Create audit
      await prisma.orderAudit.create({
        data: {
          orderId,
          fromStatus: 'PAYMENT_PENDING',
          toStatus: 'PAYMENT_CONFIRMED',
          changeReason: 'Payment processed successfully',
        },
      });

      return order;
    } catch (error) {
      logger.error('Error transitioning to PAYMENT_CONFIRMED', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to transition order status', 500);
    }
  }

  /**
   * Transition order to PAYMENT_FAILED status
   * @param {string} orderId - Order ID
   * @param {string} reason - Failure reason
   * @returns {Promise<Object>} Updated order
   */
  async transitionToPaymentFailed(orderId, reason = 'Payment declined') {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAYMENT_FAILED',
          stripePaymentStatus: 'failed',
        },
        include: { items: true, audits: true },
      });

      // Create audit
      await prisma.orderAudit.create({
        data: {
          orderId,
          fromStatus: 'PAYMENT_PENDING',
          toStatus: 'PAYMENT_FAILED',
          changeReason: reason,
        },
      });

      return order;
    } catch (error) {
      logger.error('Error transitioning to PAYMENT_FAILED', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to transition order status', 500);
    }
  }

  /**
   * Transition order to PROCESSING status
   * @param {string} orderId - Order ID
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated order
   */
  async transitionToProcessing(orderId, adminId) {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PROCESSING' },
        include: { items: true, audits: true },
      });

      await prisma.orderAudit.create({
        data: {
          orderId,
          fromStatus: 'PAYMENT_CONFIRMED',
          toStatus: 'PROCESSING',
          changeReason: 'Order moved to processing',
          changedBy: adminId,
        },
      });

      return order;
    } catch (error) {
      logger.error('Error transitioning to PROCESSING', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to transition order status', 500);
    }
  }

  /**
   * Transition order to SHIPPED status
   * @param {string} orderId - Order ID
   * @param {string} trackingNumber - Tracking number
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated order
   */
  async transitionToShipped(orderId, trackingNumber = null, adminId) {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'SHIPPED',
          shippedAt: new Date(),
        },
        include: { items: true, audits: true },
      });

      await prisma.orderAudit.create({
        data: {
          orderId,
          fromStatus: 'PROCESSING',
          toStatus: 'SHIPPED',
          changeReason: trackingNumber
            ? `Shipped with tracking ${trackingNumber}`
            : 'Order shipped',
          changedBy: adminId,
        },
      });

      return order;
    } catch (error) {
      logger.error('Error transitioning to SHIPPED', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to transition order status', 500);
    }
  }

  /**
   * Transition order to DELIVERED status
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Updated order
   */
  async transitionToDelivered(orderId) {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
        include: { items: true, audits: true },
      });

      await prisma.orderAudit.create({
        data: {
          orderId,
          fromStatus: 'SHIPPED',
          toStatus: 'DELIVERED',
          changeReason: 'Order delivered',
        },
      });

      return order;
    } catch (error) {
      logger.error('Error transitioning to DELIVERED', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to transition order status', 500);
    }
  }

  /**
   * Transition order to CANCELLED status
   * @param {string} orderId - Order ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Updated order
   */
  async transitionToCancelled(orderId, reason = 'Manual cancellation') {
    try {
      const order = await prisma.order.findUnique({ where: { id: orderId } });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
        include: { items: true, audits: true },
      });

      await prisma.orderAudit.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          changeReason: reason,
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error transitioning to CANCELLED', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to transition order status', 500);
    }
  }

  /**
   * Transition order to REFUNDED status
   * @param {string} orderId - Order ID
   * @param {string} reason - Refund reason
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Updated order
   */
  async transitionToRefunded(orderId, reason = 'Refund processed', adminId) {
    try {
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'REFUNDED' },
        include: { items: true, audits: true },
      });

      await prisma.orderAudit.create({
        data: {
          orderId,
          fromStatus: 'PAYMENT_CONFIRMED',
          toStatus: 'REFUNDED',
          changeReason: reason,
          changedBy: adminId,
        },
      });

      return order;
    } catch (error) {
      logger.error('Error transitioning to REFUNDED', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to transition order status', 500);
    }
  }

  /**
   * Get complete order history (all audit records)
   * @param {string} orderId - Order ID
   * @returns {Promise<Array>} Audit records
   */
  async getOrderHistory(orderId) {
    try {
      const audits = await prisma.orderAudit.findMany({
        where: { orderId },
        orderBy: { changedAt: 'desc' },
      });

      return audits;
    } catch (error) {
      logger.error('Error getting order history', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to get order history', 500);
    }
  }

  /**
   * Generate unique order number
   * Format: OUL-YYYYMMDD-XXXX (4 random digits)
   * @returns {Promise<string>} Order number
   */
  async generateOrderNumber() {
    try {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');

      return `OUL-${dateStr}-${random}`;
    } catch (error) {
      logger.error('Error generating order number', { error: error.message });
      throw new ApiError('Failed to generate order number', 500);
    }
  }
}

export default new OrderService();
