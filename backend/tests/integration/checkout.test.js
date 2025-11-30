import request from 'supertest';
import app from '../../src/index.js';
import prisma from '../../src/utils/db.js';
import { getTestAuthHeader } from '../fixtures/tokens.js';

const authHeader = getTestAuthHeader();

describe('Checkout API Integration Tests', () => {
  let testRelease;
  let testInventoryLot;
  let testBuyerEmail = `buyer-${Date.now()}@test.com`;

  beforeAll(async () => {
    try {
      // Create test release
      testRelease = await prisma.release.create({
        data: {
          title: 'Test Album',
          artist: 'Test Artist',
          genre: 'Rock',
          releaseYear: 2020,
          label: 'Test Label',
          barcode: `TEST-${Date.now()}`,
        },
      });
      expect(testRelease).toBeDefined();
      expect(testRelease.id).toBeDefined();

      // Create test inventory lot
      testInventoryLot = await prisma.inventoryLot.create({
        data: {
          releaseId: testRelease.id,
          status: 'LIVE',
          conditionMedia: 'VG_PLUS',
          conditionSleeve: 'VG',
          costBasis: 10.00,
          listPrice: 25.99,
        },
      });
      expect(testInventoryLot).toBeDefined();
      expect(testInventoryLot.id).toBeDefined();
    } catch (error) {
      console.error('Error in beforeAll:', error);
      throw error;
    }
  });

  afterEach(async () => {
    // Clean up after each test to prevent holds from interfering with subsequent tests
    await prisma.inventoryHold.deleteMany({
      where: {
        inventoryLotId: testInventoryLot.id,
      },
    });
  });

  afterAll(async () => {
    try {
      // Clean up test data
      // First, release all holds on the test inventory lot
      await prisma.inventoryHold.deleteMany({
        where: {
          inventoryLotId: testInventoryLot.id,
        },
      });

      // Delete all order items for this inventory lot
      await prisma.orderItem.deleteMany({
        where: {
          inventoryLotId: testInventoryLot.id,
        },
      });

      // Delete all orders created during these tests
      await prisma.order.deleteMany({
        where: {
          // Only delete orders created by THIS test suite (with these specific email patterns)
          OR: [
            { buyerEmail: { contains: 'buyer-' } },
            { buyerEmail: { contains: 'empty-' } },
            { buyerEmail: { contains: 'notfound-' } },
            { buyerEmail: { contains: 'initiate-' } },
            { buyerEmail: { contains: 'history-test-' } },
          ],
        },
      });

      // Delete the test inventory lot
      if (testInventoryLot?.id) {
        await prisma.inventoryLot.deleteMany({
          where: { id: testInventoryLot.id },
        });
      }

      // Delete the test release
      if (testRelease?.id) {
        await prisma.release.delete({
          where: { id: testRelease.id },
        });
      }
    } catch (error) {
      console.error('Error in checkout test cleanup:', error);
      // Continue cleanup even if some deletions fail
    }

    await prisma.$disconnect();
  });

  // ============================================================================
  // CART MANAGEMENT TESTS
  // ============================================================================

  describe('GET /api/v1/checkout/cart', () => {
    it('should create a new cart for guest buyer', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: testBuyerEmail,
          buyerName: 'Test Buyer',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('orderNumber');
      expect(response.body.data.status).toBe('CART');
      expect(response.body.data.buyerEmail).toBe(testBuyerEmail);
    });

    it('should return existing cart for same email', async () => {
      // Create first cart
      const response1 = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({ buyerEmail: testBuyerEmail })
        .expect(200);

      const cartId1 = response1.body.data.id;

      // Get cart again
      const response2 = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({ buyerEmail: testBuyerEmail })
        .expect(200);

      const cartId2 = response2.body.data.id;

      // Should be same cart
      expect(cartId1).toBe(cartId2);
    });

    it('should return 400 without buyerEmail', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({ buyerName: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('buyerEmail');
    });
  });

  describe('POST /api/v1/checkout/cart/items', () => {
    let cartId;

    beforeEach(async () => {
      // Create a fresh cart for each test
      const response = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: `buyer-${Date.now()}-${Math.random()}@test.com`,
        });

      cartId = response.body.data.id;
    });

    it('should add item to cart', async () => {
      const response = await request(app)
        .post('/api/v1/checkout/cart/items')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          inventoryLotId: testInventoryLot.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].inventoryLotId).toBe(testInventoryLot.id);
    });

    it('should not allow duplicate items in cart', async () => {
      // Add item first time
      await request(app)
        .post('/api/v1/checkout/cart/items')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          inventoryLotId: testInventoryLot.id,
        })
        .expect(200);

      // Try to add same item again
      const response = await request(app)
        .post('/api/v1/checkout/cart/items')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          inventoryLotId: testInventoryLot.id,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/checkout/cart/items')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          // Missing inventoryLotId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/checkout/cart/items/:inventoryLotId', () => {
    let cartId;

    beforeEach(async () => {
      // Create cart and add item
      const cartResponse = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: `buyer-${Date.now()}-${Math.random()}@test.com`,
        });

      cartId = cartResponse.body.data.id;

      await request(app)
        .post('/api/v1/checkout/cart/items')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          inventoryLotId: testInventoryLot.id,
        });
    });

    it('should remove item from cart', async () => {
      const response = await request(app)
        .delete(`/api/v1/checkout/cart/items/${testInventoryLot.id}`)
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
    });
  });

  describe('POST /api/v1/checkout/cart/recalculate', () => {
    let cartId;

    beforeEach(async () => {
      const cartResponse = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: `buyer-${Date.now()}-${Math.random()}@test.com`,
        });

      cartId = cartResponse.body.data.id;

      await request(app)
        .post('/api/v1/checkout/cart/items')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          inventoryLotId: testInventoryLot.id,
        });
    });

    it('should recalculate cart totals', async () => {
      const response = await request(app)
        .post('/api/v1/checkout/cart/recalculate')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          shippingMethod: 'STANDARD',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('subtotal');
      expect(response.body.data).toHaveProperty('tax');
      expect(response.body.data).toHaveProperty('shipping');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data.subtotal).toBeGreaterThan(0);
    });

    it('should include shipping cost in total', async () => {
      const response = await request(app)
        .post('/api/v1/checkout/cart/recalculate')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          shippingMethod: 'STANDARD',
        })
        .expect(200);

      const { subtotal, shipping, total } = response.body.data;
      expect(total).toBeGreaterThanOrEqual(subtotal + shipping);
    });
  });

  describe('POST /api/v1/checkout/cart/validate', () => {
    let cartId;

    beforeEach(async () => {
      const cartResponse = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: `buyer-${Date.now()}-${Math.random()}@test.com`,
        });

      cartId = cartResponse.body.data.id;

      await request(app)
        .post('/api/v1/checkout/cart/items')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          inventoryLotId: testInventoryLot.id,
        });
    });

    it('should validate cart successfully', async () => {
      const response = await request(app)
        .post('/api/v1/checkout/cart/validate')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data.isValid).toBe(true);
    });
  });

  // ============================================================================
  // ORDER RETRIEVAL TESTS
  // ============================================================================

  describe('GET /api/v1/checkout/orders/:orderId', () => {
    let orderId;

    beforeAll(async () => {
      // Create a cart that will be our order
      const cartResponse = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: testBuyerEmail,
        });

      orderId = cartResponse.body.data.id;

      // Add item to cart
      await request(app)
        .post('/api/v1/checkout/cart/items')
        .set('Authorization', authHeader)
        .send({
          orderId: orderId,
          inventoryLotId: testInventoryLot.id,
        });
    });

    it('should get order details', async () => {
      const response = await request(app)
        .get(`/api/v1/checkout/orders/${orderId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('orderNumber');
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/checkout/orders/${fakeId}`)
        .set('Authorization', authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/checkout/orders', () => {
    it('should list orders by buyer email', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/orders')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: testBuyerEmail,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.orders)).toBe(true);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/orders')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: testBuyerEmail,
          status: 'CART',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.orders.forEach(order => {
        expect(order.status).toBe('CART');
      });
    });

    it('should return 400 without buyerEmail', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/orders')
        .set('Authorization', authHeader)
        .query({
          status: 'CART',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/checkout/orders/:orderId/history', () => {
    let orderId;

    beforeAll(async () => {
      const cartResponse = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: `history-test-${Date.now()}@test.com`,
        });

      orderId = cartResponse.body.data.id;
    });

    it('should get order audit history', async () => {
      const response = await request(app)
        .get(`/api/v1/checkout/orders/${orderId}/history`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ============================================================================
  // CHECKOUT FLOW TESTS
  // ============================================================================

  describe('POST /api/v1/checkout/initiate', () => {
    let cartId;

    beforeEach(async () => {
      const cartResponse = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: `initiate-${Date.now()}-${Math.random()}@test.com`,
        });

      cartId = cartResponse.body.data.id;

      await request(app)
        .post('/api/v1/checkout/cart/items')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          inventoryLotId: testInventoryLot.id,
        });

      await request(app)
        .post('/api/v1/checkout/cart/recalculate')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          shippingMethod: 'STANDARD',
        });
    });

    it('should initiate checkout with payment intent', async () => {
      const response = await request(app)
        .post('/api/v1/checkout/initiate')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('paymentIntent');
      expect(response.body.data.paymentIntent).toHaveProperty('id');
      expect(response.body.data.paymentIntent).toHaveProperty('clientSecret');
      expect(response.body.data).toHaveProperty('order');
      expect(response.body.data.order.status).toBe('PAYMENT_PENDING');
    });

    it('should return 400 for empty cart', async () => {
      // Create empty cart
      const emptyCartResponse = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: `empty-${Date.now()}@test.com`,
        });

      const emptyCartId = emptyCartResponse.body.data.id;

      const response = await request(app)
        .post('/api/v1/checkout/initiate')
        .set('Authorization', authHeader)
        .send({
          orderId: emptyCartId,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error handling', () => {
    it('should handle invalid order ID gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/checkout/orders/invalid-id')
        .set('Authorization', authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle inventory lot not found', async () => {
      const cartResponse = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({
          buyerEmail: `notfound-${Date.now()}@test.com`,
        });

      const cartId = cartResponse.body.data.id;
      const fakeInventoryId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post('/api/v1/checkout/cart/items')
        .set('Authorization', authHeader)
        .send({
          orderId: cartId,
          inventoryLotId: fakeInventoryId,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
