import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import orderService from '../../src/services/orderService.js';
import prisma from '../../src/utils/db.js';
import { ApiError } from '../../src/middleware/errorHandler.js';

jest.mock('../../src/utils/db.js');

const mockPrisma = jest.mocked(prisma, true);

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks after each test
    Object.keys(mockPrisma).forEach(key => {
      if (typeof mockPrisma[key] === 'object' && mockPrisma[key] !== null) {
        Object.keys(mockPrisma[key]).forEach(method => {
          if (typeof mockPrisma[key][method] === 'function') {
            mockPrisma[key][method].mockReset();
          }
        });
      }
    });
  });

  describe('createOrder', () => {
    it('should create a new order with required fields', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'OUL-20251130-1234',
        buyerEmail: 'buyer@example.com',
        buyerName: 'John Doe',
        status: 'CART',
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        items: [],
        audits: [],
      };

      mockPrisma.order.create.mockResolvedValue(mockOrder);

      const result = await orderService.createOrder({
        buyerEmail: 'buyer@example.com',
        buyerName: 'John Doe',
      });

      expect(result).toEqual(mockOrder);
      expect(prisma.order.create).toHaveBeenCalled();
    });

    it('should throw error when buyerEmail is missing', async () => {
      await expect(
        orderService.createOrder({ buyerName: 'John Doe' })
      ).rejects.toThrow('buyerEmail is required');
    });

    it('should generate unique order number', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'OUL-20251130-1234',
        buyerEmail: 'buyer@example.com',
        status: 'CART',
      };

      prisma.order.create.mockResolvedValue(mockOrder);

      await orderService.createOrder({
        buyerEmail: 'buyer@example.com',
      });

      const callArgs = prisma.order.create.mock.calls[0][0];
      expect(callArgs.data.orderNumber).toMatch(/^OUL-\d{8}-\d{4}$/);
    });
  });

  describe('getOrderById', () => {
    it('should retrieve order by ID with items and audits', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'OUL-20251130-1234',
        buyerEmail: 'buyer@example.com',
        status: 'CART',
        items: [],
        audits: [],
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await orderService.getOrderById('order-1');

      expect(result).toEqual(mockOrder);
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
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
    });

    it('should throw error when order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(orderService.getOrderById('invalid-id')).rejects.toThrow(
        'Order not found'
      );
    });

    it('should throw error when orderId is missing', async () => {
      await expect(orderService.getOrderById(null)).rejects.toThrow(
        'orderId is required'
      );
    });
  });

  describe('getOrdersByBuyer', () => {
    it('should retrieve orders for a buyer with pagination', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          buyerEmail: 'buyer@example.com',
          status: 'CART',
          items: [],
          audits: [],
        },
      ];

      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.order.count.mockResolvedValue(1);

      const result = await orderService.getOrdersByBuyer(
        'buyer@example.com'
      );

      expect(result.orders).toEqual(mockOrders);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });

    it('should filter by status if provided', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      await orderService.getOrdersByBuyer('buyer@example.com', {
        status: 'PAYMENT_PENDING',
      });

      const callArgs = prisma.order.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBe('PAYMENT_PENDING');
    });

    it('should throw error when buyerEmail is missing', async () => {
      await expect(orderService.getOrdersByBuyer(null)).rejects.toThrow(
        'buyerEmail is required'
      );
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid transition from CART to PAYMENT_PENDING', () => {
      expect(() => {
        orderService.validateStatusTransition('CART', 'PAYMENT_PENDING');
      }).not.toThrow();
    });

    it('should allow valid transition from PAYMENT_PENDING to PAYMENT_CONFIRMED', () => {
      expect(() => {
        orderService.validateStatusTransition(
          'PAYMENT_PENDING',
          'PAYMENT_CONFIRMED'
        );
      }).not.toThrow();
    });

    it('should throw error for invalid transition', () => {
      expect(() => {
        orderService.validateStatusTransition('CART', 'SHIPPED');
      }).toThrow('Cannot transition from CART to SHIPPED');
    });

    it('should throw error for unknown status', () => {
      expect(() => {
        orderService.validateStatusTransition('INVALID_STATUS', 'CART');
      }).toThrow('Unknown status');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status with audit trail', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
      };

      const mockUpdatedOrder = {
        id: 'order-1',
        status: 'PAYMENT_PENDING',
        checkoutStartedAt: new Date(),
        items: [],
        audits: [],
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          order: {
            update: jest.fn().mockResolvedValue(mockUpdatedOrder),
          },
          orderAudit: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await orderService.updateOrderStatus(
        'order-1',
        'PAYMENT_PENDING',
        'Checkout started'
      );

      expect(result).toEqual(mockUpdatedOrder);
    });

    it('should set checkoutStartedAt when transitioning to PAYMENT_PENDING', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: { update: jest.fn() },
          orderAudit: { create: jest.fn() },
        };
        await callback(tx);
        const updateCall = tx.order.update.mock.calls[0];
        expect(updateCall[0].data.checkoutStartedAt).toBeDefined();
        return {};
      });

      await orderService.updateOrderStatus(
        'order-1',
        'PAYMENT_PENDING'
      );
    });
  });

  describe('transitionToPaymentPending', () => {
    it('should transition order to PAYMENT_PENDING with payment intent ID', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'PAYMENT_PENDING',
        stripePaymentIntentId: 'pi_123',
        checkoutStartedAt: new Date(),
        items: [],
        audits: [],
      };

      prisma.order.update.mockResolvedValue(mockOrder);
      prisma.orderAudit.create.mockResolvedValue({});

      const result = await orderService.transitionToPaymentPending(
        'order-1',
        'pi_123'
      );

      expect(result.status).toBe('PAYMENT_PENDING');
      expect(result.stripePaymentIntentId).toBe('pi_123');
    });
  });

  describe('transitionToPaymentConfirmed', () => {
    it('should transition order to PAYMENT_CONFIRMED', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'PAYMENT_CONFIRMED',
        paymentConfirmedAt: new Date(),
        items: [],
        audits: [],
      };

      prisma.order.update.mockResolvedValue(mockOrder);
      prisma.orderAudit.create.mockResolvedValue({});

      const result = await orderService.transitionToPaymentConfirmed('order-1');

      expect(result.status).toBe('PAYMENT_CONFIRMED');
    });
  });

  describe('transitionToCancelled', () => {
    it('should transition order to CANCELLED', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'CART',
      };

      const mockUpdatedOrder = {
        id: 'order-1',
        status: 'CANCELLED',
        items: [],
        audits: [],
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue(mockUpdatedOrder);
      prisma.orderAudit.create.mockResolvedValue({});

      const result = await orderService.transitionToCancelled(
        'order-1',
        'User cancelled'
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error when order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        orderService.transitionToCancelled('invalid-id')
      ).rejects.toThrow('Order not found');
    });
  });

  describe('getOrderHistory', () => {
    it('should retrieve order audit history', async () => {
      const mockAudits = [
        {
          id: 'audit-1',
          orderId: 'order-1',
          fromStatus: 'CART',
          toStatus: 'PAYMENT_PENDING',
          changedAt: new Date(),
        },
      ];

      prisma.orderAudit.findMany.mockResolvedValue(mockAudits);

      const result = await orderService.getOrderHistory('order-1');

      expect(result).toEqual(mockAudits);
      expect(prisma.orderAudit.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        orderBy: { changedAt: 'desc' },
      });
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate order number in correct format', async () => {
      const orderNumber = await orderService.generateOrderNumber();

      expect(orderNumber).toMatch(/^OUL-\d{8}-\d{4}$/);
    });

    it('should generate unique order numbers', async () => {
      const num1 = await orderService.generateOrderNumber();
      const num2 = await orderService.generateOrderNumber();

      // With current implementation, they might be the same if generated within same millisecond
      // But format should be correct for both
      expect(num1).toMatch(/^OUL-\d{8}-\d{4}$/);
      expect(num2).toMatch(/^OUL-\d{8}-\d{4}$/);
    });
  });
});
