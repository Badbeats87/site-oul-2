import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  getCart,
  addToCart,
  removeFromCart,
  getCartSummary,
  validateCart,
  initiateCheckout,
  completeCheckout,
  cancelCheckout,
  handleStripeWebhook,
  getOrder,
  getOrders,
  getOrderHistory,
  getPaymentIntent,
} from '../../src/controllers/checkoutController.js';
import checkoutService from '../../src/services/checkoutService.js';
import paymentService from '../../src/services/paymentService.js';
import orderService from '../../src/services/orderService.js';

// Mock services
jest.mock('../../src/services/checkoutService.js');
jest.mock('../../src/services/paymentService.js');
jest.mock('../../src/services/orderService.js');

describe('CheckoutController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
      params: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('getCart', () => {
    it('should return cart for buyer', async () => {
      const mockCart = {
        id: 'order-1',
        buyerEmail: 'buyer@example.com',
        status: 'CART',
        items: [],
      };

      req.query = {
        buyerEmail: 'buyer@example.com',
      };

      checkoutService.getOrCreateCart.mockResolvedValue(mockCart);

      await getCart(req, res, next);

      expect(checkoutService.getOrCreateCart).toHaveBeenCalledWith(
        'buyer@example.com',
        null,
        undefined
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCart,
      });
    });

    it('should throw error when buyerEmail missing', async () => {
      req.query = {};

      await getCart(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('buyerEmail'),
        })
      );
    });
  });

  describe('addToCart', () => {
    it('should add item to cart', async () => {
      const mockUpdatedCart = {
        id: 'order-1',
        items: [{ inventoryLotId: 'lot-1' }],
      };

      req.body = {
        orderId: 'order-1',
        inventoryLotId: 'lot-1',
      };

      checkoutService.addToCart.mockResolvedValue(mockUpdatedCart);

      await addToCart(req, res, next);

      expect(checkoutService.addToCart).toHaveBeenCalledWith(
        'order-1',
        'lot-1'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedCart,
      });
    });

    it('should handle errors', async () => {
      req.body = {
        orderId: 'order-1',
        inventoryLotId: 'lot-1',
      };

      const error = new Error('Item not available');
      checkoutService.addToCart.mockRejectedValue(error);

      await addToCart(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      const mockUpdatedCart = {
        id: 'order-1',
        items: [],
      };

      req.params = { inventoryLotId: 'lot-1' };
      req.body = { orderId: 'order-1' };

      checkoutService.removeFromCart.mockResolvedValue(mockUpdatedCart);

      await removeFromCart(req, res, next);

      expect(checkoutService.removeFromCart).toHaveBeenCalledWith(
        'order-1',
        'lot-1'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedCart,
      });
    });
  });

  describe('getCartSummary', () => {
    it('should return cart summary', async () => {
      const mockSummary = {
        orderId: 'order-1',
        itemCount: 2,
        subtotal: 40.0,
        tax: 3.2,
        shipping: 5.99,
        total: 49.19,
      };

      req.query = { orderId: 'order-1' };

      checkoutService.getCartSummary.mockResolvedValue(mockSummary);

      await getCartSummary(req, res, next);

      expect(checkoutService.getCartSummary).toHaveBeenCalledWith('order-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary,
      });
    });
  });

  describe('validateCart', () => {
    it('should validate cart successfully', async () => {
      const mockValidation = {
        isValid: true,
        itemCount: 2,
        unavailableItems: [],
        priceChanges: [],
      };

      req.body = { orderId: 'order-1' };

      checkoutService.validateCart.mockResolvedValue(mockValidation);

      await validateCart(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cart is valid',
        data: mockValidation,
      });
    });

    it('should return error if validation fails', async () => {
      const mockValidation = {
        isValid: false,
        unavailableItems: [{ inventoryLotId: 'lot-1', reason: 'Not available' }],
      };

      req.body = { orderId: 'order-1' };

      checkoutService.validateCart.mockResolvedValue(mockValidation);

      await validateCart(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cart validation failed',
        data: mockValidation,
      });
    });
  });

  describe('initiateCheckout', () => {
    it('should initiate checkout successfully', async () => {
      const mockCheckoutResult = {
        order: {
          id: 'order-1',
          status: 'PAYMENT_PENDING',
        },
        paymentIntent: {
          id: 'pi_123',
          clientSecret: 'secret_123',
          amount: 5000,
          currency: 'usd',
        },
        reservedItems: 2,
      };

      req.body = { orderId: 'order-1', total: 50.0 };

      checkoutService.initiateCheckout.mockResolvedValue(mockCheckoutResult);

      await initiateCheckout(req, res, next);

      expect(checkoutService.initiateCheckout).toHaveBeenCalledWith(
        'order-1',
        50.0
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCheckoutResult,
      });
    });
  });

  describe('completeCheckout', () => {
    it('should complete checkout successfully', async () => {
      const mockCompletedOrder = {
        id: 'order-1',
        status: 'PAYMENT_CONFIRMED',
      };

      req.body = { orderId: 'order-1' };

      checkoutService.completeCheckout.mockResolvedValue(mockCompletedOrder);

      await completeCheckout(req, res, next);

      expect(checkoutService.completeCheckout).toHaveBeenCalledWith('order-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Checkout completed successfully',
        data: mockCompletedOrder,
      });
    });
  });

  describe('cancelCheckout', () => {
    it('should cancel checkout successfully', async () => {
      const mockCancelledOrder = {
        id: 'order-1',
        status: 'CANCELLED',
      };

      req.body = { orderId: 'order-1', reason: 'User cancelled' };

      checkoutService.cancelCheckout.mockResolvedValue(mockCancelledOrder);

      await cancelCheckout(req, res, next);

      expect(checkoutService.cancelCheckout).toHaveBeenCalledWith(
        'order-1',
        'User cancelled'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Checkout cancelled',
        data: mockCancelledOrder,
      });
    });
  });

  describe('handleStripeWebhook', () => {
    it('should process webhook successfully', async () => {
      const mockWebhookResult = {
        acknowledged: true,
        eventId: 'evt_123',
        eventType: 'payment_intent.succeeded',
      };

      req.rawBody = JSON.stringify({ type: 'payment_intent.succeeded' });
      req.headers['stripe-signature'] = 'sig_123';

      paymentService.processWebhook.mockResolvedValue(mockWebhookResult);

      await handleStripeWebhook(req, res, next);

      expect(paymentService.processWebhook).toHaveBeenCalledWith(
        req.rawBody,
        'sig_123'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        acknowledged: true,
        eventId: 'evt_123',
      });
    });

    it('should handle invalid signature', async () => {
      req.rawBody = JSON.stringify({});
      req.headers['stripe-signature'] = 'invalid_sig';

      const error = new Error('Invalid signature');
      error.statusCode = 401;
      paymentService.processWebhook.mockRejectedValue(error);

      await handleStripeWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should acknowledge webhook even if processing fails', async () => {
      req.rawBody = JSON.stringify({});
      req.headers['stripe-signature'] = 'sig_123';

      paymentService.processWebhook.mockRejectedValue(new Error('Processing error'));

      await handleStripeWebhook(req, res, next);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getOrder', () => {
    it('should return order details', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'PAYMENT_CONFIRMED',
        items: [],
      };

      req.params = { orderId: 'order-1' };

      orderService.getOrderById.mockResolvedValue(mockOrder);

      await getOrder(req, res, next);

      expect(orderService.getOrderById).toHaveBeenCalledWith('order-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
      });
    });
  });

  describe('getOrders', () => {
    it('should return orders for buyer', async () => {
      const mockResult = {
        orders: [
          {
            id: 'order-1',
            status: 'CART',
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      };

      req.query = { buyerEmail: 'buyer@example.com' };

      orderService.getOrdersByBuyer.mockResolvedValue(mockResult);

      await getOrders(req, res, next);

      expect(orderService.getOrdersByBuyer).toHaveBeenCalledWith(
        'buyer@example.com',
        {
          status: undefined,
          limit: 50,
          page: 1,
        }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });
  });

  describe('getOrderHistory', () => {
    it('should return order audit history', async () => {
      const mockHistory = [
        {
          id: 'audit-1',
          fromStatus: 'CART',
          toStatus: 'PAYMENT_PENDING',
          changedAt: new Date(),
        },
      ];

      req.params = { orderId: 'order-1' };

      orderService.getOrderHistory.mockResolvedValue(mockHistory);

      await getOrderHistory(req, res, next);

      expect(orderService.getOrderHistory).toHaveBeenCalledWith('order-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory,
      });
    });
  });

  describe('getPaymentIntent', () => {
    it('should return payment intent details', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
      };

      req.params = { paymentIntentId: 'pi_123' };

      paymentService.getPaymentIntentDetails.mockResolvedValue(
        mockPaymentIntent
      );

      await getPaymentIntent(req, res, next);

      expect(paymentService.getPaymentIntentDetails).toHaveBeenCalledWith(
        'pi_123'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPaymentIntent,
      });
    });
  });
});
