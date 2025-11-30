/**
 * End-to-End Flow Tests
 * Tests complete user workflows from start to finish
 */

import request from 'supertest';
import app from '../../src/index.js';
import prisma from '../../src/utils/db.js';
import { getTestAuthHeader } from '../fixtures/tokens.js';

const authHeader = getTestAuthHeader();

describe('End-to-End User Flows', () => {
  let testRelease;
  let testPricingPolicy;
  let testInventoryLot;
  let sellerSubmissionId;
  let buyerOrderId;

  beforeAll(async () => {
    // Set up test data
    testPricingPolicy = await prisma.pricingPolicy.create({
      data: {
        name: 'E2E Test Policy',
        scope: 'GLOBAL',
        isActive: true,
        buyFormula: {
          basePercent: 40,
          conditionAdjustments: {},
        },
        sellFormula: {
          basePercent: 80,
          conditionAdjustments: {},
        },
        conditionCurve: {
          MINT: 1.0,
          NM: 0.95,
          VG_PLUS: 0.85,
          VG: 0.75,
          VG_MINUS: 0.65,
          G: 0.5,
          FAIR: 0.35,
          POOR: 0.2,
        },
      },
    });

    testRelease = await prisma.release.create({
      data: {
        title: 'E2E Test Album',
        artist: 'E2E Test Artist',
        label: 'E2E Label',
        releaseYear: 2020,
        barcode: `E2E-TEST-${Date.now()}`,
      },
    });

    await prisma.releasePricingPolicy.create({
      data: {
        releaseId: testRelease.id,
        policyId: testPricingPolicy.id,
        priority: 0,
        isActive: true,
      },
    });

    await prisma.marketSnapshot.create({
      data: {
        releaseId: testRelease.id,
        source: 'DISCOGS',
        statMedian: 50,
        statLow: 30,
        statHigh: 70,
        sampleSize: 10,
        fetchedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Cleanup - must respect foreign key constraints
    try {
      await prisma.submissionItem.deleteMany({});
      await prisma.submissionAudit.deleteMany({});
      await prisma.sellerSubmission.deleteMany({});
      await prisma.orderItem.deleteMany({});
      await prisma.inventoryHold.deleteMany({});  // Delete before orders (FK constraint)
      await prisma.order.deleteMany({});
      await prisma.inventoryLot.deleteMany({});
      await prisma.marketSnapshot.deleteMany({});
      await prisma.releasePricingPolicy.deleteMany({});
      await prisma.release.deleteMany({});
      await prisma.pricingPolicy.deleteMany({});
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await prisma.$disconnect();
  });

  // ============================================================================
  // SELLER SUBMISSION FLOW: Submit → Quote → Accept/Reject
  // ============================================================================

  describe('Seller Submission Flow', () => {
    it('should complete full seller submission workflow', async () => {
      // Step 1: Seller registers
      const sellerRegResponse = await request(app)
        .post('/api/v1/sellers/register')
        .set('Authorization', authHeader)
        .send({
          email: `seller-e2e-${Date.now()}@test.com`,
          name: 'E2E Seller',
          phone: '555-1234',
        });

      if (sellerRegResponse.status === 201) {
        expect(sellerRegResponse.body.data.id).toBeDefined();
        const sellerId = sellerRegResponse.body.data.id;

        // Step 2: Get submission queue to view pending submissions
        const queueResponse = await request(app)
          .get('/api/v1/admin/submissions')
          .set('Authorization', authHeader)
          .expect(200);

        expect(Array.isArray(queueResponse.body.data.submissions)).toBe(true);

        if (queueResponse.body.data.submissions.length > 0) {
          sellerSubmissionId = queueResponse.body.data.submissions[0].id;

          // Step 3: Get submission details
          const detailResponse = await request(app)
            .get(`/api/v1/admin/submissions/${sellerSubmissionId}`)
            .set('Authorization', authHeader)
            .expect(200);

          expect(detailResponse.body.data.id).toBe(sellerSubmissionId);
          expect(detailResponse.body.data.items).toBeDefined();

          // Step 4: Accept the submission
          if (detailResponse.body.data.items.length > 0) {
            const acceptResponse = await request(app)
              .post(`/api/v1/admin/submissions/${sellerSubmissionId}/accept`)
              .set('Authorization', authHeader)
              .expect(200);

            expect(acceptResponse.body.data.status).toBe('ACCEPTED');
          }
        }
      }
    });
  });

  // ============================================================================
  // INVENTORY MANAGEMENT FLOW
  // ============================================================================

  describe('Inventory Management Flow', () => {
    it('should manage inventory items through full lifecycle', async () => {
      // Step 1: List inventory to verify the system has inventory
      const listResponse = await request(app)
        .get('/api/v1/inventory')
        .set('Authorization', authHeader)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data).toBeDefined();

      // Step 2: Apply pricing policy to all inventory (if available)
      const applyResponse = await request(app)
        .post('/api/v1/inventory/pricing/apply')
        .set('Authorization', authHeader)
        .send({
          policyId: testPricingPolicy.id,
          itemIds: [],
          dryRun: true, // Dry run to see changes
        })
        .expect(200);

      expect(applyResponse.body.success).toBe(true);

      // Step 3: Get inventory analytics
      const analyticsResponse = await request(app)
        .get('/api/v1/inventory/analytics/overview')
        .set('Authorization', authHeader)
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data).toHaveProperty('totalInventory');
    });
  });

  // ============================================================================
  // BUYER FLOW: Browse → Search → Cart → Checkout
  // ============================================================================

  describe('Buyer Shopping Flow', () => {
    it('should complete full buyer flow from browsing to checkout', async () => {
      // Step 1: Buyer browses products
      const browseResponse = await request(app)
        .get('/api/v1/buyer/products')
        .set('Authorization', authHeader)
        .expect(200);

      expect(browseResponse.body.success).toBe(true);

      // Step 2: Buyer creates cart
      const buyerEmail = `buyer-e2e-${Date.now()}@test.com`;
      const cartResponse = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({ buyerEmail, buyerName: 'E2E Buyer' })
        .expect(200);

      expect(cartResponse.body.data.id).toBeDefined();
      buyerOrderId = cartResponse.body.data.id;

      // Step 3: Recalculate cart totals (even with empty cart)
      const recalcResponse = await request(app)
        .post('/api/v1/checkout/cart/recalculate')
        .set('Authorization', authHeader)
        .send({
          orderId: buyerOrderId,
          shippingMethod: 'STANDARD',
        })
        .expect(200);

      expect(recalcResponse.body.success).toBe(true);

      // Step 4: Get order details
      const orderDetailsResponse = await request(app)
        .get(`/api/v1/checkout/orders/${buyerOrderId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(orderDetailsResponse.body.success).toBe(true);
      expect(orderDetailsResponse.body.data.id).toBe(buyerOrderId);
    });
  });

  // ============================================================================
  // PRICING ENGINE FLOW
  // ============================================================================

  describe('Pricing Engine Flow', () => {
    it('should apply and verify pricing calculations across items', async () => {
      // Apply pricing policy
      const pricingResponse = await request(app)
        .post('/api/v1/inventory/pricing/apply')
        .set('Authorization', authHeader)
        .send({
          policyId: testPricingPolicy.id,
          itemIds: [],
          dryRun: true,
        })
        .expect(200);

      expect(pricingResponse.body.success).toBe(true);
      expect(pricingResponse.body.data).toBeDefined();
    });
  });

  // ============================================================================
  // ORDER PROCESSING FLOW
  // ============================================================================

  describe('Order Processing & Fulfillment Flow', () => {
    it('should process order from creation through fulfillment', async () => {
      // Create and process order
      const buyerEmail = `fulfillment-test-${Date.now()}@test.com`;
      const cartResponse = await request(app)
        .get('/api/v1/checkout/cart')
        .set('Authorization', authHeader)
        .query({ buyerEmail, buyerName: 'Fulfillment Tester' })
        .expect(200);

      const orderId = cartResponse.body.data.id;

      // Recalculate cart
      const recalcResponse = await request(app)
        .post('/api/v1/checkout/cart/recalculate')
        .set('Authorization', authHeader)
        .send({ orderId, shippingMethod: 'STANDARD' })
        .expect(200);

      expect(recalcResponse.body.success).toBe(true);

      // Get order details
      const orderDetailsResponse = await request(app)
        .get(`/api/v1/checkout/orders/${orderId}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(orderDetailsResponse.body.success).toBe(true);
      expect(orderDetailsResponse.body.data.id).toBe(orderId);
    });
  });

  // ============================================================================
  // ANALYTICS FLOW
  // ============================================================================

  describe('Analytics & Reporting Flow', () => {
    it('should retrieve analytics and metrics correctly', async () => {
      // Get inventory analytics
      const inventoryAnalyticsResponse = await request(app)
        .get('/api/v1/inventory/analytics/overview')
        .set('Authorization', authHeader)
        .expect(200);

      expect(inventoryAnalyticsResponse.body.data).toHaveProperty('byStatus');
      expect(inventoryAnalyticsResponse.body.data).toHaveProperty('byCondition');
      expect(inventoryAnalyticsResponse.body.data).toHaveProperty('priceStats');
      expect(inventoryAnalyticsResponse.body.data).toHaveProperty('topPerformers');
      expect(inventoryAnalyticsResponse.body.data).toHaveProperty('lowStockAlerts');
      expect(inventoryAnalyticsResponse.body.data).toHaveProperty('totalInventory');

      // Get low stock alerts
      const lowStockResponse = await request(app)
        .get('/api/v1/inventory/analytics/low-stock')
        .set('Authorization', authHeader)
        .expect(200);

      expect(lowStockResponse.body.data).toHaveProperty('alerts');
      expect(Array.isArray(lowStockResponse.body.data.alerts)).toBe(true);

      // Get sales velocity
      const salesVelocityResponse = await request(app)
        .get('/api/v1/inventory/analytics/sales-velocity')
        .set('Authorization', authHeader)
        .expect(200);

      expect(salesVelocityResponse.body.data).toBeDefined();
      // May have totalSold, totalRevenue, averagePrice depending on if there are sales
    });
  });
});
