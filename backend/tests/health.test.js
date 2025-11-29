import request from 'supertest';
import app from '../src/index.js';

describe('Health Check Endpoints', () => {
  describe('GET /api/v1/health', () => {
    it('should return 200 with health status', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
    });

    it('should include request ID in response headers', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return 200 for readiness check', async () => {
      const response = await request(app).get('/api/v1/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ready');
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('should return 200 for liveness check', async () => {
      const response = await request(app).get('/api/v1/health/live');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('alive');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app).get('/api/v1/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });
  });
});
