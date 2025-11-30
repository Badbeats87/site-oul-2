import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import orderService from './orderService.js';
import paymentService from './paymentService.js';
import inventoryService from './inventoryService.js';
import * as inventoryReservationService from './inventoryReservationService.js';

/**
 * Checkout Service
 * Orchestrates the entire checkout flow including cart, inventory reservation, and payment
 */
class CheckoutService {
  // Shipping constants
  SHIPPING_RATES = {
    STANDARD: 5.99,
    EXPRESS: 14.99,
    OVERNIGHT: 29.99,
  };

  // Tax rate (simplified - in production use address-based calculation)
  DEFAULT_TAX_RATE = 0.08;

  /**
   * Get or create a cart order for guest/buyer
   * @param {string} buyerEmail - Buyer email
   * @param {string} buyerName - Buyer name (optional)
   * @param {string} sessionId - Session ID for guest tracking (optional)
   * @returns {Promise<Object>} Cart order
   */
  async getOrCreateCart(buyerEmail, buyerName = null, sessionId = null) {
    try {
      if (!buyerEmail) {
        throw new ApiError('buyerEmail is required', 400);
      }

      // Look for existing CART order for this buyer/session
      let cart;

      if (sessionId) {
        // Guest checkout - use session ID
        cart = await prisma.order.findFirst({
          where: {
            sessionId,
            status: 'CART',
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
        });
      } else {
        // Registered buyer - use email
        cart = await prisma.order.findFirst({
          where: {
            buyerEmail,
            status: 'CART',
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
        });
      }

      // Create new cart if none exists
      if (!cart) {
        cart = await orderService.createOrder({
          buyerEmail,
          buyerName,
          sessionId,
        });

        logger.info('New cart created', {
          orderId: cart.id,
          buyerEmail,
          sessionId: sessionId || 'registered',
        });
      }

      return cart;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting or creating cart', {
        buyerEmail,
        error: error.message,
      });
      throw new ApiError('Failed to get or create cart', 500);
    }
  }

  /**
   * Add item to cart
   * @param {string} orderId - Order ID
   * @param {string} inventoryLotId - Inventory lot ID to add
   * @returns {Promise<Object>} Updated cart with new item
   */
  async addToCart(orderId, inventoryLotId) {
    try {
      if (!orderId || !inventoryLotId) {
        throw new ApiError('orderId and inventoryLotId are required', 400);
      }

      // Get order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      if (order.status !== 'CART') {
        throw new ApiError('Order is not in CART status', 400);
      }

      // Get inventory lot
      const inventoryLot = await prisma.inventoryLot.findUnique({
        where: { id: inventoryLotId },
        include: {
          release: true,
        },
      });

      if (!inventoryLot) {
        throw new ApiError('Inventory lot not found', 404);
      }

      if (inventoryLot.status !== 'LIVE') {
        throw new ApiError('Item is not available for purchase', 409);
      }

      // Check if item already in cart
      const existingItem = await prisma.orderItem.findFirst({
        where: {
          orderId,
          inventoryLotId,
        },
      });

      if (existingItem) {
        throw new ApiError('Item already in cart', 409);
      }

      // Add item to cart
      await prisma.orderItem.create({
        data: {
          orderId,
          inventoryLotId,
          priceAtPurchase: inventoryLot.listPrice,
          releaseTitle: inventoryLot.release?.title || '',
          releaseArtist: inventoryLot.release?.artist || '',
          conditionMedia: inventoryLot.conditionMedia,
          conditionSleeve: inventoryLot.conditionSleeve,
        },
      });

      // Create inventory hold to prevent double-booking
      try {
        await inventoryReservationService.createHold(inventoryLotId, {
          orderId,
          quantity: 1,
          durationMinutes: 30, // 30-minute hold for cart items
        });
      } catch (error) {
        // If hold creation fails, remove the item from cart
        await prisma.orderItem.deleteMany({
          where: {
            orderId,
            inventoryLotId,
          },
        });
        logger.error('Failed to create inventory hold, item removed from cart', {
          orderId,
          inventoryLotId,
          error: error.message,
        });
        throw error;
      }

      logger.info('Item added to cart with hold', {
        orderId,
        inventoryLotId,
        price: inventoryLot.listPrice,
      });

      // Recalculate cart totals
      const updatedCart = await this.recalculateCartTotals(orderId);

      return updatedCart;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error adding to cart', {
        orderId,
        inventoryLotId,
        error: error.message,
      });
      throw new ApiError('Failed to add item to cart', 500);
    }
  }

  /**
   * Remove item from cart
   * @param {string} orderId - Order ID
   * @param {string} inventoryLotId - Inventory lot ID to remove
   * @returns {Promise<Object>} Updated cart
   */
  async removeFromCart(orderId, inventoryLotId) {
    try {
      if (!orderId || !inventoryLotId) {
        throw new ApiError('orderId and inventoryLotId are required', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      if (order.status !== 'CART') {
        throw new ApiError('Order is not in CART status', 400);
      }

      // Release inventory hold for this item
      try {
        const holds = await inventoryReservationService.getHoldsForInventory(
          inventoryLotId
        );
        const holdForThisOrder = holds.find((h) => h.orderId === orderId);
        if (holdForThisOrder) {
          await inventoryReservationService.releaseHold(
            holdForThisOrder.id,
            'Item removed from cart'
          );
        }
      } catch (error) {
        logger.warn('Failed to release inventory hold during cart removal', {
          orderId,
          inventoryLotId,
          error: error.message,
        });
        // Continue with item removal even if hold release fails
      }

      // Delete order item
      const deleted = await prisma.orderItem.deleteMany({
        where: {
          orderId,
          inventoryLotId,
        },
      });

      if (deleted.count === 0) {
        throw new ApiError('Item not found in cart', 404);
      }

      logger.info('Item removed from cart and hold released', {
        orderId,
        inventoryLotId,
      });

      // Recalculate totals
      const updatedCart = await this.recalculateCartTotals(orderId);

      return updatedCart;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error removing from cart', {
        orderId,
        inventoryLotId,
        error: error.message,
      });
      throw new ApiError('Failed to remove item from cart', 500);
    }
  }

  /**
   * Get cart summary
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Cart with items and totals
   */
  async getCartSummary(orderId) {
    try {
      if (!orderId) {
        throw new ApiError('orderId is required', 400);
      }

      const cart = await prisma.order.findUnique({
        where: { id: orderId },
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
      });

      if (!cart) {
        throw new ApiError('Order not found', 404);
      }

      if (cart.status !== 'CART') {
        throw new ApiError('Order is not in CART status', 400);
      }

      return {
        orderId: cart.id,
        orderNumber: cart.orderNumber,
        buyerEmail: cart.buyerEmail,
        items: cart.items,
        subtotal: parseFloat(cart.subtotal),
        tax: parseFloat(cart.tax),
        shipping: parseFloat(cart.shipping),
        total: parseFloat(cart.total),
        itemCount: cart.items.length,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting cart summary', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to get cart summary', 500);
    }
  }

  /**
   * Recalculate cart totals (subtotal, tax, shipping, total)
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Updated order with recalculated totals
   */
  async recalculateCartTotals(orderId, shippingMethod = 'STANDARD') {
    try {
      if (!orderId) {
        throw new ApiError('orderId is required', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      // Calculate subtotal
      let subtotal = 0;
      if (order.items && order.items.length > 0) {
        subtotal = order.items.reduce((sum, item) => {
          return sum + parseFloat(item.priceAtPurchase);
        }, 0);
      }

      // Get shipping rate
      const shipping =
        this.SHIPPING_RATES[shippingMethod] || this.SHIPPING_RATES.STANDARD;

      // Calculate tax on subtotal + shipping
      const taxBase = subtotal + shipping;
      const tax = parseFloat((taxBase * this.DEFAULT_TAX_RATE).toFixed(2));

      // Calculate total
      const total = subtotal + tax + shipping;

      // Update order with new totals
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax,
          shipping,
          total: parseFloat(total.toFixed(2)),
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
      });

      logger.debug('Cart totals recalculated', {
        orderId,
        subtotal,
        tax,
        shipping,
        total,
      });

      // Convert Decimal fields to numbers for JSON serialization
      return {
        ...updatedOrder,
        subtotal: parseFloat(updatedOrder.subtotal),
        tax: parseFloat(updatedOrder.tax),
        shipping: parseFloat(updatedOrder.shipping),
        total: parseFloat(updatedOrder.total),
        items: updatedOrder.items.map(item => ({
          ...item,
          priceAtPurchase: parseFloat(item.priceAtPurchase),
        })),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error recalculating cart totals', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to recalculate cart totals', 500);
    }
  }

  /**
   * Validate cart before checkout
   * Ensures all items are still available
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Validation result with any issues
   */
  async validateCart(orderId) {
    try {
      if (!orderId) {
        throw new ApiError('orderId is required', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
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
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      if (order.status !== 'CART') {
        throw new ApiError('Order is not in CART status', 400);
      }

      if (!order.items || order.items.length === 0) {
        throw new ApiError('Cart is empty', 400);
      }

      // Check each item's availability
      const unavailableItems = [];
      const priceChanges = [];

      for (const item of order.items) {
        const currentLot = await prisma.inventoryLot.findUnique({
          where: { id: item.inventoryLotId },
        });

        if (!currentLot) {
          unavailableItems.push({
            inventoryLotId: item.inventoryLotId,
            reason: 'Item no longer exists',
          });
        } else if (currentLot.status !== 'LIVE') {
          unavailableItems.push({
            inventoryLotId: item.inventoryLotId,
            reason: `Item status changed to ${currentLot.status}`,
          });
        } else if (
          parseFloat(currentLot.price) !== parseFloat(item.priceAtPurchase)
        ) {
          priceChanges.push({
            inventoryLotId: item.inventoryLotId,
            oldPrice: parseFloat(item.priceAtPurchase),
            newPrice: parseFloat(currentLot.price),
          });
        }
      }

      return {
        isValid: unavailableItems.length === 0,
        itemCount: order.items.length,
        unavailableItems,
        priceChanges,
        currentTotal: parseFloat(order.total),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error validating cart', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to validate cart', 500);
    }
  }

  /**
   * Initiate checkout - reserve inventory and create payment intent
   * @param {string} orderId - Order ID
   * @param {number} total - Expected total for verification
   * @returns {Promise<Object>} Payment intent and order details
   */
  async initiateCheckout(orderId, total) {
    try {
      if (!orderId) {
        throw new ApiError('orderId is required', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      if (order.status !== 'CART') {
        throw new ApiError('Order is not in CART status', 400);
      }

      if (order.items.length === 0) {
        throw new ApiError('Cart is empty', 400);
      }

      // Verify total
      if (total && Math.abs(parseFloat(order.total) - total) > 0.01) {
        throw new ApiError(
          'Total mismatch. Please refresh cart and try again.',
          400
        );
      }

      // Reserve all inventory items atomically
      const reservedItems = [];
      const failedReservations = [];

      for (const item of order.items) {
        try {
          await inventoryService.reserveInventory(item.inventoryLotId, orderId);
          reservedItems.push(item.inventoryLotId);
        } catch (error) {
          failedReservations.push({
            inventoryLotId: item.inventoryLotId,
            error: error.message,
          });
        }
      }

      // If any reservations failed, release all successful ones and error
      if (failedReservations.length > 0) {
        logger.warn('Some inventory items could not be reserved', {
          orderId,
          reservedCount: reservedItems.length,
          failedCount: failedReservations.length,
        });

        // Release successfully reserved items
        for (const inventoryLotId of reservedItems) {
          try {
            await inventoryService.releaseReservation(
              inventoryLotId,
              'Checkout reservation failed due to other items unavailable'
            );
          } catch (releaseError) {
            logger.error('Error releasing reservation during rollback', {
              inventoryLotId,
              error: releaseError.message,
            });
          }
        }

        throw new ApiError(
          `Unable to reserve all items: ${failedReservations.map((f) => f.error).join(', ')}`,
          409
        );
      }

      // Create payment intent
      const amountInCents = Math.round(parseFloat(order.total) * 100);
      const paymentIntent = await paymentService.createPaymentIntent(
        orderId,
        amountInCents,
        order.buyerEmail
      );

      // Update order to PAYMENT_PENDING
      const updatedOrder = await orderService.transitionToPaymentPending(
        orderId,
        paymentIntent.id
      );

      logger.info('Checkout initiated', {
        orderId,
        paymentIntentId: paymentIntent.id,
        itemCount: order.items.length,
        total: order.total,
      });

      return {
        order: updatedOrder,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
        reservedItems: reservedItems.length,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error initiating checkout', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to initiate checkout', 500);
    }
  }

  /**
   * Complete checkout - confirm payment and mark items as sold
   * Called after Stripe webhook confirms payment
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Completed order
   */
  async completeCheckout(orderId) {
    try {
      if (!orderId) {
        throw new ApiError('orderId is required', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      if (order.status !== 'PAYMENT_CONFIRMED') {
        throw new ApiError(
          'Order must be in PAYMENT_CONFIRMED status to complete checkout',
          400
        );
      }

      // Mark all reserved items as SOLD and convert holds to sales
      const soldItems = [];
      const failedSales = [];

      for (const item of order.items) {
        try {
          await inventoryService.markAsSold(item.inventoryLotId, orderId);
          soldItems.push(item.inventoryLotId);

          // Convert hold to sale
          try {
            const holds = await inventoryReservationService.getHoldsForInventory(
              item.inventoryLotId
            );
            const holdForThisOrder = holds.find((h) => h.orderId === orderId);
            if (holdForThisOrder) {
              await inventoryReservationService.convertHoldToSale(
                holdForThisOrder.id,
                'Order payment confirmed'
              );
            }
          } catch (error) {
            logger.warn('Failed to convert hold to sale', {
              inventoryLotId: item.inventoryLotId,
              orderId,
              error: error.message,
            });
            // Continue processing other items even if hold conversion fails
          }
        } catch (error) {
          failedSales.push({
            inventoryLotId: item.inventoryLotId,
            error: error.message,
          });
        }
      }

      if (failedSales.length > 0) {
        logger.error('Failed to mark some items as sold', {
          orderId,
          failedCount: failedSales.length,
        });
        throw new ApiError('Failed to complete purchase for some items', 500);
      }

      logger.info('Checkout completed with holds converted to sales', {
        orderId,
        soldItemCount: soldItems.length,
      });

      // Return updated order
      const completedOrder = await orderService.getOrderById(orderId);
      return completedOrder;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error completing checkout', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to complete checkout', 500);
    }
  }

  /**
   * Cancel checkout - release inventory and payment intent
   * @param {string} orderId - Order ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled order
   */
  async cancelCheckout(orderId, reason = 'Checkout cancelled by user') {
    try {
      if (!orderId) {
        throw new ApiError('orderId is required', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      if (order.status !== 'PAYMENT_PENDING') {
        throw new ApiError('Only PAYMENT_PENDING orders can be cancelled', 400);
      }

      // Release all inventory holds and reserved inventory
      try {
        await inventoryReservationService.releaseAllHoldsForOrder(
          orderId,
          reason
        );
      } catch (error) {
        logger.warn('Error releasing all holds during checkout cancellation', {
          orderId,
          error: error.message,
        });
        // Continue with checkout cancellation even if hold release fails
      }

      for (const item of order.items) {
        try {
          await inventoryService.releaseReservation(
            item.inventoryLotId,
            reason
          );
        } catch (error) {
          logger.warn(
            'Error releasing inventory during checkout cancellation',
            {
              inventoryLotId: item.inventoryLotId,
              error: error.message,
            }
          );
          // Continue releasing other items even if one fails
        }
      }

      // Cancel payment intent if it exists
      if (order.stripePaymentIntentId) {
        try {
          await paymentService.cancelPaymentIntent(
            order.stripePaymentIntentId,
            reason
          );
        } catch (error) {
          logger.warn('Error cancelling payment intent', {
            paymentIntentId: order.stripePaymentIntentId,
            error: error.message,
          });
        }
      }

      // Update order to CANCELLED
      const cancelledOrder = await orderService.transitionToCancelled(
        orderId,
        reason
      );

      logger.info('Checkout cancelled', {
        orderId,
        reason,
      });

      return cancelledOrder;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error cancelling checkout', {
        orderId,
        error: error.message,
      });
      throw new ApiError('Failed to cancel checkout', 500);
    }
  }
}

export default new CheckoutService();
