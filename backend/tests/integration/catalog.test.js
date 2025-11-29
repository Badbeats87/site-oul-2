import request from 'supertest';
import app from '../../src/index.js';
import prisma from '../../src/utils/db.js';
import { getTestAuthHeader } from '../fixtures/tokens.js';

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
        .set('Authorization', getTestAuthHeader())
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
        .set('Authorization', getTestAuthHeader())
        .send({
          label: 'Test Label',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/catalog/:id', () => {
    it('should retrieve a release by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/catalog/${testReleaseId}`)
        .set('Authorization', getTestAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testReleaseId);
      expect(response.body.data.title).toBe('Test Album');
    });

    it('should return 404 for non-existent release', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/non-existent-id')
        .set('Authorization', getTestAuthHeader());

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/catalog', () => {
    it('should list all releases with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/catalog')
        .set('Authorization', getTestAuthHeader())
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
        .set('Authorization', getTestAuthHeader())
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
        .set('Authorization', getTestAuthHeader())
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
      const response = await request(app)
        .delete(`/api/v1/catalog/${testReleaseId}`)
        .set('Authorization', getTestAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(true);
    });

    it('should return 404 when deleting non-existent release', async () => {
      const response = await request(app)
        .delete('/api/v1/catalog/non-existent-id')
        .set('Authorization', getTestAuthHeader());

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
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'Searchable' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('query');
      expect(response.body.data).toHaveProperty('results');
      expect(Array.isArray(response.body.data.results)).toBe(true);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should fail with query less than 2 characters', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'a' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/catalog/search/album-artist-label', () => {
    beforeAll(async () => {
      // Create test releases for album/artist/label search
      await prisma.release.create({
        data: {
          title: 'Pink Floyd Album',
          artist: 'Pink Floyd',
          label: 'Harvest Records',
        },
      });
      await prisma.release.create({
        data: {
          title: 'Floyd Chronicles',
          artist: 'Roger Waters',
          label: 'Pink Label',
        },
      });
    });

    it('should search by album title', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/album-artist-label')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'Pink Floyd Album' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('query');
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('searchType', 'album-artist-label');
      expect(Array.isArray(response.body.data.results)).toBe(true);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should search by artist name', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/album-artist-label')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'Pink Floyd' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should search by label', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/album-artist-label')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'Harvest' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should return results with relevance ranking', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/album-artist-label')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'Pink' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      if (response.body.data.results.length > 0) {
        expect(response.body.data.results[0]).toHaveProperty('_relevance');
        expect(typeof response.body.data.results[0]._relevance).toBe('number');
      }
    });

    it('should fail with query less than 2 characters', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/album-artist-label')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'a' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/album-artist-label')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'Album', limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/v1/catalog/search/fulltext', () => {
    beforeAll(async () => {
      // Create test releases for full-text search
      await prisma.release.create({
        data: {
          title: 'The Dark Side',
          artist: 'Prog Rock Band',
          label: 'Experimental Records',
          genre: 'Progressive Rock',
          description: 'A masterpiece of progressive rock music',
        },
      });
    });

    it('should perform full-text search across all fields', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/fulltext')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'progressive' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('query');
      expect(response.body.data).toHaveProperty('searchType', 'fulltext');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it('should search in description field', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/fulltext')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'masterpiece' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return results with relevance scores', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/fulltext')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'Dark' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      if (response.body.data.results.length > 0) {
        expect(response.body.data.results[0]).toHaveProperty('_relevance');
        expect(typeof response.body.data.results[0]._relevance).toBe('number');
      }
    });

    it('should fail with query less than 2 characters', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/fulltext')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'a' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/fulltext')
        .set('Authorization', getTestAuthHeader())
        .query({ q: 'Rock', limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results.length).toBeLessThanOrEqual(1);
    });
  });
});
