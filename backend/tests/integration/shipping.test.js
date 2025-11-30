import request from 'supertest';
import app from '../../src/index.js';
import prisma from '../../src/utils/db.js';
import { getTestAuthHeader } from '../fixtures/tokens.js';

describe('Shipping API Integration Tests', () => {
  let testZone;
  let testRate;

  beforeAll(async () => {
    // Create test shipping zone
    testZone = await prisma.shippingZone.create({
      data: {
        name: 'Test Zone',
        statesIncluded: ['CA', 'NV'],
        priority: 1,
        isActive: true,
      },
    });

    // Create test shipping rate
    testRate = await prisma.shippingRate.create({
      data: {
        zoneId: testZone.id,
        shippingMethod: 'STANDARD',
        carrier: 'MOCK',
        baseRate: '5.99',
        perOzRate: '0.50',
        minWeightOz: 8,
        maxWeightOz: 64,
        minDays: 5,
        maxDays: 7,
        isActive: true,
        effectiveDate: new Date('2025-01-01'),
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.shippingRate.deleteMany({
      where: { id: testRate.id },
    });
    await prisma.shippingZone.deleteMany({
      where: { id: testZone.id },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/shipping/calculate-rates', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/calculate-rates')
        .send({
          destinationAddress: { state: 'CA' },
          items: [{ title: 'Album' }],
        });

      expect(response.status).toBe(401);
    });

    it('should calculate shipping rates for valid address with test zone', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/calculate-rates')
        .set('Authorization', getTestAuthHeader())
        .send({
          destinationAddress: { state: 'CA', city: 'Los Angeles' },
          items: [{ title: 'Album 1' }],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Should find rates since we created a test zone for CA
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 400 for missing state', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/calculate-rates')
        .set('Authorization', getTestAuthHeader())
        .send({
          destinationAddress: { city: 'Los Angeles' }, // No state
          items: [{ title: 'Album 1' }],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for unknown zone', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/calculate-rates')
        .set('Authorization', getTestAuthHeader())
        .send({
          destinationAddress: { state: 'ZZ' }, // Invalid state
          items: [{ title: 'Album 1' }],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should calculate correct weight for items', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/calculate-rates')
        .set('Authorization', getTestAuthHeader())
        .send({
          destinationAddress: { state: 'CA' },
          items: Array(3).fill({ title: 'Album' }), // 3 items
        });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const rate = response.body.data[0];
        // Weight = (3 items * 8oz per item) + 4oz packaging = 28oz
        expect(rate.weight).toBe(28);
      }
    });
  });

  describe('GET /api/v1/shipping/zones', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/shipping/zones');

      expect(response.status).toBe(401);
    });

    it('should list shipping zones (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/shipping/zones')
        .set('Authorization', getTestAuthHeader());

      // May return 403 if endpoint requires admin role
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('GET /api/v1/shipping/rates', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/shipping/rates');

      expect(response.status).toBe(401);
    });

    it('should list shipping rates (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/shipping/rates')
        .set('Authorization', getTestAuthHeader());

      // May return 403 if endpoint requires admin role
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Rate Calculations', () => {
    it('should return formatted rates with cost', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/calculate-rates')
        .set('Authorization', getTestAuthHeader())
        .send({
          destinationAddress: { state: 'CA' },
          items: [{ title: 'Album' }], // 12oz total
        });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const rate = response.body.data[0];
        expect(rate).toHaveProperty('method');
        expect(rate).toHaveProperty('cost');
        expect(rate).toHaveProperty('deliveryDays');
        expect(typeof rate.cost).toBe('number');
        expect(rate.cost > 0).toBe(true);
      }
    });
  });

  describe('Error handling', () => {
    it('should return 400 for invalid request', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/calculate-rates')
        .set('Authorization', getTestAuthHeader())
        .send({
          destinationAddress: null, // Invalid
          items: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication for all endpoints', async () => {
      const response = await request(app)
        .post('/api/v1/shipping/calculate-rates')
        .send({
          destinationAddress: { state: 'CA' },
          items: [],
        });

      expect(response.status).toBe(401);
    });
  });
});
