import request from 'supertest';
import app from '../../src/index.js';
import { getTestAuthHeader } from '../fixtures/tokens.js';
import { clearCache } from '../../src/utils/cache.js';

describe('eBay Integration API', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('Endpoint Validation', () => {
    it('should return 400 when search query is missing', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/ebay/search')
        .set('Authorization', authHeader)
        .query({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for sold-listings without query', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/ebay/sold-listings')
        .set('Authorization', authHeader)
        .query({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for prices without query', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/ebay/prices')
        .set('Authorization', authHeader)
        .query({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for search-enriched without query', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/ebay/search-enriched')
        .set('Authorization', authHeader)
        .query({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/integrations/ebay/search?q=test'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject sold-listings without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/integrations/ebay/sold-listings?q=test'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject prices without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/integrations/ebay/prices?q=test'
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    it('should include requestId in error response', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/ebay/search')
        .set('Authorization', authHeader)
        .query({});

      expect(response.body).toHaveProperty('requestId');
      expect(response.body.requestId).toBeTruthy();
    });

    it('should include success flag in error response', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/ebay/search')
        .set('Authorization', authHeader)
        .query({});

      expect(response.body.success).toBe(false);
      expect(typeof response.body.success).toBe('boolean');
    });

    it('should include error details in response', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/ebay/search')
        .set('Authorization', authHeader)
        .query({});

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('eBay endpoints should have rate limiting configured', async () => {
      const authHeader = getTestAuthHeader();

      // Make a request to check rate limit headers are present
      const response = await request(app)
        .get('/api/v1/integrations/ebay/search')
        .set('Authorization', authHeader)
        .query({});

      // Even on error, rate limiting headers should be present
      expect(response.headers).toHaveProperty('ratelimit-limit');
    });
  });
});
