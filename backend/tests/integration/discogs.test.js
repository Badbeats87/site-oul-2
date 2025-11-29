import request from 'supertest';
import app from '../../src/index.js';
import { getTestAuthHeader } from '../fixtures/tokens.js';
import { clearCache } from '../../src/utils/cache.js';

describe('Discogs Integration API', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('Endpoint Validation', () => {
    it('should return 400 when search query and barcode are missing', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/discogs/search')
        .set('Authorization', authHeader)
        .query({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/integrations/discogs/search?q=test');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    it('should always include requestId in error response', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/discogs/search')
        .set('Authorization', authHeader)
        .query({});

      expect(response.body).toHaveProperty('requestId');
      expect(response.body.requestId).toBeTruthy();
    });

    it('should include proper success flag in error response', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/discogs/search')
        .set('Authorization', authHeader)
        .query({});

      expect(response.body.success).toBe(false);
      expect(typeof response.body.success).toBe('boolean');
    });

    it('should include error details in response', async () => {
      const authHeader = getTestAuthHeader();
      const response = await request(app)
        .get('/api/v1/integrations/discogs/search')
        .set('Authorization', authHeader)
        .query({});

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });
  });
});
