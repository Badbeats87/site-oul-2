import request from 'supertest';
import app from '../../src/index.js';
import prisma from '../../src/utils/db.js';
import { getTestAuthHeader } from '../fixtures/tokens.js';

describe('Faceted Search API Integration Tests', () => {
  let testReleases = [];

  beforeAll(async () => {

    // Create test releases with different genres and years
    const releaseData = [
      {
        title: 'Rock Album 1',
        artist: 'Rock Artist',
        genre: 'Rock',
        releaseYear: 1990,
      },
      {
        title: 'Jazz Album 1',
        artist: 'Jazz Artist',
        genre: 'Jazz',
        releaseYear: 1980,
      },
      {
        title: 'Pop Album 1',
        artist: 'Pop Artist',
        genre: 'Pop',
        releaseYear: 2000,
      },
      {
        title: 'Rock Album 2',
        artist: 'Another Rock Artist',
        genre: 'Rock',
        releaseYear: 1995,
      },
    ];

    for (const data of releaseData) {
      const response = await request(app)
        .post('/api/v1/catalog')
        .set('Authorization', getTestAuthHeader())
        .send(data);

      if (response.status === 201) {
        testReleases.push(response.body.data);
      }
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testReleases.length > 0) {
      await prisma.release.deleteMany({
        where: {
          id: { in: testReleases.map(r => r.id) },
        },
      });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/v1/catalog/search/faceted', () => {
    it('should return faceted search results without filters', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('facets');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it('should return genre facets with counts', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.data.facets).toHaveProperty('genres');
      expect(Array.isArray(response.body.data.facets.genres)).toBe(true);

      // Check that genres have value and count
      if (response.body.data.facets.genres.length > 0) {
        const genreFacet = response.body.data.facets.genres[0];
        expect(genreFacet).toHaveProperty('value');
        expect(genreFacet).toHaveProperty('count');
        expect(typeof genreFacet.count).toBe('number');
      }
    });

    it.skip('should filter by genre', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted?genres=Rock')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results.length).toBeGreaterThan(0);

      // Verify all results match the genre filter
      response.body.data.results.forEach(release => {
        expect(release.genre).toBe('Rock');
      });
    });

    it('should filter by multiple genres', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted?genres=Rock&genres=Jazz')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify all results match one of the genre filters
      if (response.body.data.results.length > 0) {
        response.body.data.results.forEach(release => {
          expect(['Rock', 'Jazz']).toContain(release.genre);
        });
      }
    });

    it('should filter by year range', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted?yearMin=1985&yearMax=1995')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify all results are within year range
      if (response.body.data.results.length > 0) {
        response.body.data.results.forEach(release => {
          expect(release.releaseYear).toBeGreaterThanOrEqual(1985);
          expect(release.releaseYear).toBeLessThanOrEqual(1995);
        });
      }
    });

    it('should include inventory information in results', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check that results include inventory structure (even if not available)
      if (response.body.data.results.length > 0) {
        const release = response.body.data.results[0];
        expect(release).toHaveProperty('inventory');
        expect(release.inventory).toHaveProperty('available');
        expect(release.inventory).toHaveProperty('count');
      }
    });

    it('should return price range facets', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.data.facets).toHaveProperty('priceRanges');
      expect(Array.isArray(response.body.data.facets.priceRanges)).toBe(true);

      // Check price range structure
      if (response.body.data.facets.priceRanges.length > 0) {
        const priceRange = response.body.data.facets.priceRanges[0];
        expect(priceRange).toHaveProperty('label');
        expect(priceRange).toHaveProperty('min');
        expect(priceRange).toHaveProperty('max');
        expect(priceRange).toHaveProperty('count');
      }
    });

    it('should return condition facets', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.data.facets).toHaveProperty('conditions');
      expect(Array.isArray(response.body.data.facets.conditions)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted?limit=2&page=1')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should combine text search with filters', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted?q=Rock&genres=Rock')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify results match both text search and genre filter
      if (response.body.data.results.length > 0) {
        response.body.data.results.forEach(release => {
          expect(release.genre).toBe('Rock');
        });
      }
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted?priceMin=20&priceMax=50')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.success).toBe(true);
      // Price filter will return empty results if no inventory with prices in range
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it('should handle limit over maximum gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted?limit=500')
        .set('Authorization', getTestAuthHeader());

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('200');
    });

    it('should return empty results for non-matching filters', async () => {
      const response = await request(app)
        .get('/api/v1/catalog/search/faceted?genres=NonExistentGenre')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results.length).toBe(0);
    });
  });
});
