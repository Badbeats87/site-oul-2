import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import checkoutService from '../../src/services/checkoutService.js';
import prisma from '../../src/utils/db.js';
import orderService from '../../src/services/orderService.js';
import paymentService from '../../src/services/paymentService.js';
import inventoryService from '../../src/services/inventoryService.js';

// Mock dependencies
jest.mock('../../src/utils/db.js');
jest.mock('../../src/services/orderService.js');
jest.mock('../../src/services/paymentService.js');
jest.mock('../../src/services/inventoryService.js');

describe('CheckoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart for registered buyer', async () => {
      const mockCart = {
        id: 'order-1',
        buyerEmail: 'buyer@example.com',
        status: 'CART',
        items: [],
      };

      prisma.order.findFirst.mockResolvedValue(mockCart);

      const result = await checkoutService.getOrCreateCart(
        'buyer@example.com'
      );

      expect(result).toEqual(mockCart);
    });

    it('should create new cart if none exists', async () => {
      const mockNewOrder = {
        id: 'order-1',
        buyerEmail: 'buyer@example.com',
        status: 'CART',
        items: [],
      };

      prisma.order.findFirst.mockResolvedValue(null);
      orderService.createOrder.mockResolvedValue(mockNewOrder);

      const result = await checkoutService.getOrCreateCart(
        'buyer@example.com'
      );

      expect(result).toEqual(mockNewOrder);
      expect(orderService.createOrder).toHaveBeenCalled();
    });

    it('should use sessionId for guest checkout', async () => {
      const mockCart = {
        id: 'order-1',
        sessionId: 'session-123',
        status: 'CART',
        items: [],
      };

      prisma.order.findFirst.mockResolvedValue(mockCart);

      await checkoutService.getOrCreateCart(
        'guest@example.com',
        null,
        'session-123'
      );

      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sessionId: 'session-123',
            status: 'CART',
          },
        })
      );
    });

    it('should throw error when buyerEmail is missing', async () => {
      await expect(checkoutService.getOrCreateCart(null)).rejects.toThrow(
        'buyerEmail is required'
      );
    });
  });

  describe('addToCart', () => {
    it('should add item to cart', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
        items: [],
      };

      const mockInventoryLot = {
        id: 'lot-1',
        status: 'LIVE',
        price: 19.99,
        release: {
          title: 'Album Title',
          artist: 'Artist Name',
        },
      };

      const mockUpdatedOrder = {
        id: 'order-1',
        status: 'CART',
        items: [{ inventoryLotId: 'lot-1', priceAtPurchase: 19.99 }],
        subtotal: 19.99,
        total: 19.99,
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.inventoryLot.findUnique.mockResolvedValue(mockInventoryLot);
      prisma.orderItem.findFirst.mockResolvedValue(null);
      prisma.orderItem.create.mockResolvedValue({});
      checkoutService.recalculateCartTotals = jest
        .fn()
        .mockResolvedValue(mockUpdatedOrder);

      const result = await checkoutService.addToCart('order-1', 'lot-1');

      expect(result).toEqual(mockUpdatedOrder);
    });

    it('should throw error if item not available', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
      };

      const mockInventoryLot = {
        id: 'lot-1',
        status: 'RESERVED',
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.inventoryLot.findUnique.mockResolvedValue(mockInventoryLot);

      await expect(
        checkoutService.addToCart('order-1', 'lot-1')
      ).rejects.toThrow('Item is not available for purchase');
    });

    it('should throw error if item already in cart', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
      };

      const mockInventoryLot = {
        id: 'lot-1',
        status: 'LIVE',
        price: 19.99,
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.inventoryLot.findUnique.mockResolvedValue(mockInventoryLot);
      prisma.orderItem.findFirst.mockResolvedValue({ id: 'item-1' });

      await expect(
        checkoutService.addToCart('order-1', 'lot-1')
      ).rejects.toThrow('Item already in cart');
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
        items: [],
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.orderItem.deleteMany.mockResolvedValue({ count: 1 });
      checkoutService.recalculateCartTotals = jest
        .fn()
        .mockResolvedValue(mockOrder);

      const result = await checkoutService.removeFromCart('order-1', 'lot-1');

      expect(result).toEqual(mockOrder);
    });

    it('should throw error if item not in cart', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.orderItem.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        checkoutService.removeFromCart('order-1', 'lot-1')
      ).rejects.toThrow('Item not found in cart');
    });
  });

  describe('recalculateCartTotals', () => {
    it('should calculate correct totals', async () => {
      const mockOrder = {
        id: 'order-1',
        items: [
          { priceAtPurchase: 10.0 },
          { priceAtPurchase: 15.0 },
        ],
      };

      const mockUpdatedOrder = {
        id: 'order-1',
        subtotal: 25.0,
        shipping: 5.99,
        tax: 2.47, // (25 + 5.99) * 0.08
        total: 33.46,
        items: mockOrder.items,
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue(mockUpdatedOrder);

      const result = await checkoutService.recalculateCartTotals('order-1');

      expect(result.subtotal).toBe(25.0);
      expect(result.shipping).toBe(5.99);
      expect(result.tax).toBeCloseTo(2.47, 2);
      expect(result.total).toBeCloseTo(33.46, 2);
    });

    it('should support different shipping methods', async () => {
      const mockOrder = {
        id: 'order-1',
        items: [{ priceAtPurchase: 20.0 }],
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({});

      await checkoutService.recalculateCartTotals(
        'order-1',
        'OVERNIGHT'
      );

      const callArgs = prisma.order.update.mock.calls[0][0];
      expect(callArgs.data.shipping).toBe(29.99);
    });
  });

  describe('validateCart', () => {
    it('should validate cart successfully', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
        items: [
          {
            inventoryLotId: 'lot-1',
            priceAtPurchase: 19.99,
          },
        ],
        total: 25.0,
      };

      const mockLot = {
        id: 'lot-1',
        status: 'LIVE',
        price: 19.99,
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.inventoryLot.findUnique.mockResolvedValue(mockLot);

      const result = await checkoutService.validateCart('order-1');

      expect(result.isValid).toBe(true);
      expect(result.unavailableItems).toEqual([]);
      expect(result.priceChanges).toEqual([]);
    });

    it('should detect unavailable items', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
        items: [
          {
            inventoryLotId: 'lot-1',
            priceAtPurchase: 19.99,
          },
        ],
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.inventoryLot.findUnique.mockResolvedValue(null);

      const result = await checkoutService.validateCart('order-1');

      expect(result.isValid).toBe(false);
      expect(result.unavailableItems).toHaveLength(1);
    });

    it('should detect price changes', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
        items: [
          {
            inventoryLotId: 'lot-1',
            priceAtPurchase: 19.99,
          },
        ],
      };

      const mockLot = {
        id: 'lot-1',
        status: 'LIVE',
        price: 24.99,
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.inventoryLot.findUnique.mockResolvedValue(mockLot);

      const result = await checkoutService.validateCart('order-1');

      expect(result.priceChanges).toHaveLength(1);
      expect(result.priceChanges[0].oldPrice).toBe(19.99);
      expect(result.priceChanges[0].newPrice).toBe(24.99);
    });
  });

  describe('initiateCheckout', () => {
    it('should reserve inventory and create payment intent', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
        buyerEmail: 'buyer@example.com',
        total: 50.0,
        items: [
          { inventoryLotId: 'lot-1' },
        ],
      };

      const mockPaymentIntent = {
        id: 'pi_123',
        clientSecret: 'secret_123',
        amount: 5000,
        currency: 'usd',
      };

      const mockUpdatedOrder = {
        id: 'order-1',
        status: 'PAYMENT_PENDING',
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      inventoryService.reserveInventory.mockResolvedValue({});
      paymentService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
      orderService.transitionToPaymentPending.mockResolvedValue(
        mockUpdatedOrder
      );

      const result = await checkoutService.initiateCheckout('order-1', 50.0);

      expect(result.order).toEqual(mockUpdatedOrder);
      expect(result.paymentIntent.id).toBe('pi_123');
      expect(inventoryService.reserveInventory).toHaveBeenCalledWith(
        'lot-1',
        'order-1'
      );
    });

    it('should release reservations if payment intent creation fails', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
        total: 50.0,
        items: [
          { inventoryLotId: 'lot-1' },
        ],
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      inventoryService.reserveInventory.mockResolvedValue({});
      paymentService.createPaymentIntent.mockRejectedValue(
        new Error('Stripe error')
      );
      inventoryService.releaseReservation.mockResolvedValue({});

      await expect(
        checkoutService.initiateCheckout('order-1')
      ).rejects.toThrow();

      expect(inventoryService.releaseReservation).toHaveBeenCalled();
    });
  });

  describe('completeCheckout', () => {
    it('should mark items as sold', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'PAYMENT_CONFIRMED',
        items: [
          { inventoryLotId: 'lot-1' },
        ],
      };

      const mockCompletedOrder = {
        id: 'order-1',
        status: 'PAYMENT_CONFIRMED',
        items: [],
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      inventoryService.markAsSold.mockResolvedValue({});
      orderService.getOrderById.mockResolvedValue(mockCompletedOrder);

      const result = await checkoutService.completeCheckout('order-1');

      expect(result).toEqual(mockCompletedOrder);
      expect(inventoryService.markAsSold).toHaveBeenCalledWith('lot-1', 'order-1');
    });
  });

  describe('cancelCheckout', () => {
    it('should release inventory and cancel payment intent', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'PAYMENT_PENDING',
        stripePaymentIntentId: 'pi_123',
        items: [
          { inventoryLotId: 'lot-1' },
        ],
      };

      const mockCancelledOrder = {
        id: 'order-1',
        status: 'CANCELLED',
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      inventoryService.releaseReservation.mockResolvedValue({});
      paymentService.cancelPaymentIntent.mockResolvedValue({});
      orderService.transitionToCancelled.mockResolvedValue(
        mockCancelledOrder
      );

      const result = await checkoutService.cancelCheckout(
        'order-1',
        'User cancelled'
      );

      expect(result).toEqual(mockCancelledOrder);
      expect(inventoryService.releaseReservation).toHaveBeenCalled();
      expect(paymentService.cancelPaymentIntent).toHaveBeenCalled();
    });
  });
});
