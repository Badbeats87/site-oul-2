import checkoutService from '../services/checkoutService.js';
import paymentService from '../services/paymentService.js';
import orderService from '../services/orderService.js';
import logger from '../../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Checkout Controller
 * Handles all checkout-related HTTP requests
 */

/**
 * Get or create cart for current buyer/session
 * GET /api/v1/checkout/cart
 */
export async function getCart(req, res, next) {
  try {
    const { buyerEmail, sessionId } = req.query;
    const buyerName = req.query.buyerName || null;

    if (!buyerEmail) {
      throw new ApiError('buyerEmail is required', 400);
    }

    const cart = await checkoutService.getOrCreateCart(
      buyerEmail,
      buyerName,
      sessionId
    );

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add item to cart
 * POST /api/v1/checkout/cart/items
 */
export async function addToCart(req, res, next) {
  try {
    const { orderId, inventoryLotId } = req.body;

    if (!orderId || !inventoryLotId) {
      throw new ApiError('orderId and inventoryLotId are required', 400);
    }

    const updatedCart = await checkoutService.addToCart(
      orderId,
      inventoryLotId
    );

    logger.info('Item added to cart via API', {
      orderId,
      inventoryLotId,
    });

    res.json({
      success: true,
      data: updatedCart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove item from cart
 * DELETE /api/v1/checkout/cart/items/:inventoryLotId
 */
export async function removeFromCart(req, res, next) {
  try {
    const { inventoryLotId } = req.params;
    const { orderId } = req.body;

    if (!orderId || !inventoryLotId) {
      throw new ApiError('orderId and inventoryLotId are required', 400);
    }

    const updatedCart = await checkoutService.removeFromCart(
      orderId,
      inventoryLotId
    );

    logger.info('Item removed from cart via API', {
      orderId,
      inventoryLotId,
    });

    res.json({
      success: true,
      data: updatedCart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get cart summary with items and totals
 * GET /api/v1/checkout/cart/summary
 */
export async function getCartSummary(req, res, next) {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      throw new ApiError('orderId is required', 400);
    }

    const summary = await checkoutService.getCartSummary(orderId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Recalculate cart totals
 * POST /api/v1/checkout/cart/recalculate
 */
export async function recalculateCart(req, res, next) {
  try {
    const { orderId, shippingMethod } = req.body;

    if (!orderId) {
      throw new ApiError('orderId is required', 400);
    }

    const updatedCart = await checkoutService.recalculateCartTotals(
      orderId,
      shippingMethod || 'STANDARD'
    );

    res.json({
      success: true,
      data: updatedCart,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Validate cart before checkout
 * POST /api/v1/checkout/cart/validate
 */
export async function validateCart(req, res, next) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      throw new ApiError('orderId is required', 400);
    }

    const validation = await checkoutService.validateCart(orderId);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Cart validation failed',
        data: validation,
      });
    }

    res.json({
      success: true,
      message: 'Cart is valid',
      data: validation,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Initiate checkout - reserve inventory and create payment intent
 * POST /api/v1/checkout/initiate
 */
export async function initiateCheckout(req, res, next) {
  try {
    const { orderId, total } = req.body;

    if (!orderId) {
      throw new ApiError('orderId is required', 400);
    }

    const checkoutResult = await checkoutService.initiateCheckout(
      orderId,
      total
    );

    logger.info('Checkout initiated via API', {
      orderId,
      paymentIntentId: checkoutResult.paymentIntent.id,
    });

    res.json({
      success: true,
      data: checkoutResult,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Complete checkout - mark items as sold after payment confirmation
 * POST /api/v1/checkout/complete
 */
export async function completeCheckout(req, res, next) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      throw new ApiError('orderId is required', 400);
    }

    const completedOrder = await checkoutService.completeCheckout(orderId);

    logger.info('Checkout completed via API', {
      orderId,
      orderNumber: completedOrder.orderNumber,
    });

    res.json({
      success: true,
      message: 'Checkout completed successfully',
      data: completedOrder,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel checkout - release inventory and payment intent
 * POST /api/v1/checkout/cancel
 */
export async function cancelCheckout(req, res, next) {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      throw new ApiError('orderId is required', 400);
    }

    const cancelledOrder = await checkoutService.cancelCheckout(
      orderId,
      reason
    );

    logger.info('Checkout cancelled via API', {
      orderId,
      reason,
    });

    res.json({
      success: true,
      message: 'Checkout cancelled',
      data: cancelledOrder,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle Stripe webhook events
 * POST /api/v1/checkout/webhook
 */
export async function handleStripeWebhook(req, res) {
  try {
    // Get raw body and signature from request
    const rawBody = req.rawBody; // Set by middleware
    const signature = req.headers['stripe-signature'];

    if (!rawBody || !signature) {
      logger.warn('Missing webhook body or signature', {
        hasBody: !!rawBody,
        hasSignature: !!signature,
      });
      throw new ApiError('Missing webhook body or signature', 400);
    }

    // Process webhook
    const result = await paymentService.processWebhook(rawBody, signature);

    logger.info('Webhook processed successfully', {
      eventId: result.eventId,
      eventType: result.eventType,
    });

    // Always return 200 to acknowledge receipt
    res.json({
      success: true,
      acknowledged: true,
      eventId: result.eventId,
    });
  } catch (error) {
    // Log error but still return 200 to prevent Stripe retries
    logger.error('Error processing webhook', {
      error: error.message,
    });

    if (error instanceof ApiError && error.statusCode === 401) {
      // Invalid signature - return 401
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    // Return 200 for other errors to prevent infinite retries
    res.json({
      success: false,
      acknowledged: true,
      message: 'Webhook received but processing failed',
    });
  }
}

/**
 * Get order details
 * GET /api/v1/checkout/orders/:orderId
 */
export async function getOrder(req, res, next) {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      throw new ApiError('orderId is required', 400);
    }

    const order = await orderService.getOrderById(orderId);

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get orders by buyer email
 * GET /api/v1/checkout/orders
 */
export async function getOrders(req, res, next) {
  try {
    const { buyerEmail, status, limit = 50, page = 1 } = req.query;

    if (!buyerEmail) {
      throw new ApiError('buyerEmail is required', 400);
    }

    const result = await orderService.getOrdersByBuyer(buyerEmail, {
      status,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
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
 * Get order history (audit trail)
 * GET /api/v1/checkout/orders/:orderId/history
 */
export async function getOrderHistory(req, res, next) {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      throw new ApiError('orderId is required', 400);
    }

    const history = await orderService.getOrderHistory(orderId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get payment intent details
 * GET /api/v1/checkout/payment-intent/:paymentIntentId
 */
export async function getPaymentIntent(req, res, next) {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      throw new ApiError('paymentIntentId is required', 400);
    }

    const details =
      await paymentService.getPaymentIntentDetails(paymentIntentId);

    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
}
