import express from 'express';
import {
  getCart,
  addToCart,
  removeFromCart,
  getCartSummary,
  recalculateCart,
  validateCart,
  initiateCheckout,
  completeCheckout,
  cancelCheckout,
  handleStripeWebhook,
  getOrder,
  getOrders,
  getOrderHistory,
  getPaymentIntent,
} from '../controllers/checkoutController.js';

const router = express.Router();

// ============================================================================
// CART MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/v1/checkout/cart:
 *   get:
 *     summary: Get or create cart for buyer
 *     description: Get existing CART order or create new one for guest/buyer
 *     tags:
 *       - Checkout
 *     parameters:
 *       - in: query
 *         name: buyerEmail
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Buyer email address
 *       - in: query
 *         name: buyerName
 *         schema:
 *           type: string
 *         description: Buyer name (optional)
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Session ID for guest checkout tracking
 *     responses:
 *       200:
 *         description: Cart order
 *       400:
 *         description: Missing required parameters
 */
router.get('/cart', getCart);

/**
 * @swagger
 * /api/v1/checkout/cart/summary:
 *   get:
 *     summary: Get cart summary
 *     description: Get current cart with items and calculated totals
 *     tags:
 *       - Checkout
 *     parameters:
 *       - in: query
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cart summary with items and totals
 *       404:
 *         description: Order not found
 */
router.get('/cart/summary', getCartSummary);

/**
 * @swagger
 * /api/v1/checkout/cart/items:
 *   post:
 *     summary: Add item to cart
 *     description: Add a product (inventory lot) to the shopping cart
 *     tags:
 *       - Checkout
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - inventoryLotId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *               inventoryLotId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Updated cart
 *       400:
 *         description: Invalid parameters or item already in cart
 *       409:
 *         description: Item not available
 */
router.post('/cart/items', addToCart);

/**
 * @swagger
 * /api/v1/checkout/cart/items/{inventoryLotId}:
 *   delete:
 *     summary: Remove item from cart
 *     description: Remove a product from the shopping cart
 *     tags:
 *       - Checkout
 *     parameters:
 *       - in: path
 *         name: inventoryLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Updated cart
 *       404:
 *         description: Item not found in cart
 */
router.delete('/cart/items/:inventoryLotId', removeFromCart);

/**
 * @swagger
 * /api/v1/checkout/cart/recalculate:
 *   post:
 *     summary: Recalculate cart totals
 *     description: Recalculate subtotal, tax, shipping, and total for cart
 *     tags:
 *       - Checkout
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *               shippingMethod:
 *                 type: string
 *                 enum: [STANDARD, EXPRESS, OVERNIGHT]
 *                 default: STANDARD
 *     responses:
 *       200:
 *         description: Updated cart with recalculated totals
 */
router.post('/cart/recalculate', recalculateCart);

/**
 * @swagger
 * /api/v1/checkout/cart/validate:
 *   post:
 *     summary: Validate cart
 *     description: Validate that all items in cart are still available and prices haven't changed
 *     tags:
 *       - Checkout
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Cart validation result
 *       400:
 *         description: Cart validation failed with details
 */
router.post('/cart/validate', validateCart);

// ============================================================================
// CHECKOUT FLOW
// ============================================================================

/**
 * @swagger
 * /api/v1/checkout/initiate:
 *   post:
 *     summary: Initiate checkout
 *     description: Reserve inventory items and create Stripe payment intent
 *     tags:
 *       - Checkout
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *               total:
 *                 type: number
 *                 description: Expected total for verification (optional)
 *     responses:
 *       200:
 *         description: Checkout initiated with payment intent
 *       409:
 *         description: Unable to reserve items
 */
router.post('/initiate', initiateCheckout);

/**
 * @swagger
 * /api/v1/checkout/complete:
 *   post:
 *     summary: Complete checkout
 *     description: Mark inventory items as sold after payment confirmation
 *     tags:
 *       - Checkout
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Checkout completed
 *       400:
 *         description: Order not in PAYMENT_CONFIRMED status
 */
router.post('/complete', completeCheckout);

/**
 * @swagger
 * /api/v1/checkout/cancel:
 *   post:
 *     summary: Cancel checkout
 *     description: Release reserved inventory and cancel payment intent
 *     tags:
 *       - Checkout
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *     responses:
 *       200:
 *         description: Checkout cancelled
 */
router.post('/cancel', cancelCheckout);

// ============================================================================
// WEBHOOK
// ============================================================================

/**
 * @swagger
 * /api/v1/checkout/webhook:
 *   post:
 *     summary: Stripe webhook handler
 *     description: Handle Stripe webhook events for payment confirmation
 *     tags:
 *       - Checkout
 *     parameters:
 *       - in: header
 *         name: stripe-signature
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: {}
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 *       401:
 *         description: Invalid webhook signature
 */
router.post('/webhook', handleStripeWebhook);

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/v1/checkout/orders/{orderId}:
 *   get:
 *     summary: Get order details
 *     description: Retrieve complete order information including items and audit trail
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/orders/:orderId', getOrder);

/**
 * @swagger
 * /api/v1/checkout/orders:
 *   get:
 *     summary: Get orders by buyer
 *     description: List all orders for a buyer with optional filtering
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: query
 *         name: buyerEmail
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [CART, PAYMENT_PENDING, PAYMENT_CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, PAYMENT_FAILED, REFUNDED]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: List of orders with pagination
 */
router.get('/orders', getOrders);

/**
 * @swagger
 * /api/v1/checkout/orders/{orderId}/history:
 *   get:
 *     summary: Get order history
 *     description: Get complete audit trail of order status changes
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order audit history
 */
router.get('/orders/:orderId/history', getOrderHistory);

// ============================================================================
// PAYMENT INTENT
// ============================================================================

/**
 * @swagger
 * /api/v1/checkout/payment-intent/{paymentIntentId}:
 *   get:
 *     summary: Get payment intent details
 *     description: Retrieve Stripe payment intent details for an order
 *     tags:
 *       - Payment
 *     parameters:
 *       - in: path
 *         name: paymentIntentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment intent details
 *       404:
 *         description: Payment intent not found
 */
router.get('/payment-intent/:paymentIntentId', getPaymentIntent);

export default router;
