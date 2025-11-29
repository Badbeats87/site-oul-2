import request from 'supertest';
import app from '../../src/index.js';
import prisma from '../../src/utils/db.js';

describe('Catalog API Integration Tests', () => {
  let testReleaseId;

  beforeAll(async () => {
    // Clean database
    await prisma.marketSnapshot.deleteMany({});
    await prisma.release.deleteMany({});
  });

  afterAll(async () => {
    // Cleanup
    await prisma.marketSnapshot.deleteMany({});
    await prisma.release.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/v1/catalog', () => {
    it('should create a new release', async () => {
      const response = await request(app)
        .post('/api/v1/catalog')
        .send({
          title: 'Test Album',
          artist: 'Test Artist',
          label: 'Test Label',
          releaseYear: 2020,
          genre: 'Rock',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Album');
      expect(response.body.data.artist).toBe('Test Artist');

      testReleaseId = response.body.data.id;
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/catalog')
        .send({
          label: 'Test Label',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/catalog/:id', () => {
    it('should retrieve a release by ID', async () => {
      const response = await request(app).get(`/api/v1/catalog/${testReleaseId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testReleaseId);
      expect(response.body.data.title).toBe('Test Album');
    });

    it('should return 404 for non-existent release', async () => {
      const response = await request(app).get('/api/v1/catalog/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/catalog', () => {
    it('should list all releases with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/catalog')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.releases)).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('totalPages');
    });

    it('should filter by artist', async () => {
      const response = await request(app)
        .get('/api/v1/catalog')
        .query({ artist: 'Test Artist' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/v1/catalog/:id', () => {
    it('should update a release', async () => {
      const response = await request(app)
        .put(`/api/v1/catalog/${testReleaseId}`)
        .send({
          title: 'Updated Album',
          genre: 'Jazz',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Album');
      expect(response.body.data.genre).toBe('Jazz');
    });
  });

  describe('DELETE /api/v1/catalog/:id', () => {
    it('should delete a release', async () => {
      const response = await request(app).delete(`/api/v1/catalog/${testReleaseId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(true);
    });

    it('should return 404 when deleting non-existent release', async () => {
      const response = await request(app).delete('/api/v1/catalog/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/catalog/search', () => {
    beforeAll(async () => {
      // Create a test release for search
      await prisma.release.create({
        data: {
          title: 'Searchable Album',
          artist: 'Searchable Artist',
        },
      });
    });

    it('should search for releases by query', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search')
        .query({ q: 'Searchable' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should fail with query less than 2 characters', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search')
        .query({ q: 'a' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
