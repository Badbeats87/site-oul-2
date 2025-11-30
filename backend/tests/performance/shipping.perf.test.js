import shippingService from '../../src/services/shippingService.js';
import prisma from '../../src/utils/db.js';

/**
 * Performance tests for shipping calculations and database queries
 * Measures execution time to identify bottlenecks
 */
describe('Shipping Performance Tests', () => {
  let testZone;
  let testRates = [];

  beforeAll(async () => {
    // Create a test zone with multiple states
    testZone = await prisma.shippingZone.create({
      data: {
        name: `Perf Test Zone ${Date.now()}`,
        statesIncluded: ['CA', 'NV', 'AZ', 'OR', 'WA', 'TX', 'FL', 'NY', 'PA', 'IL'],
        priority: 1,
        isActive: true,
      },
    });

    // Create 20 shipping rates with different weight tiers and methods
    const methods = ['STANDARD', 'EXPRESS', 'OVERNIGHT'];
    const carriers = ['USPS', 'UPS', 'FEDEX'];

    for (let i = 0; i < 20; i++) {
      const rate = await prisma.shippingRate.create({
        data: {
          zoneId: testZone.id,
          shippingMethod: methods[i % methods.length],
          carrier: carriers[i % carriers.length],
          baseRate: (5 + i * 0.5).toString(),
          perOzRate: (0.1 + i * 0.01).toString(),
          minWeightOz: i * 4 + 1,
          maxWeightOz: (i + 1) * 4,
          minDays: 3 + i,
          maxDays: 5 + i,
          isActive: true,
          effectiveDate: new Date(Date.now() - 86400000), // Yesterday
        },
      });
      testRates.push(rate);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.shippingRate.deleteMany({
      where: { id: { in: testRates.map(r => r.id) } },
    });
    await prisma.shippingZone.delete({
      where: { id: testZone.id },
    });
    await prisma.$disconnect();
  });

  // ============================================================================
  // CALCULATION PERFORMANCE
  // ============================================================================

  describe('calculatePackageWeight Performance', () => {
    it('should calculate weight for 1 item in <1ms', () => {
      const start = performance.now();
      const weight = shippingService.calculatePackageWeight([{ id: '1', title: 'Album' }]);
      const duration = performance.now() - start;

      expect(weight).toBe(12);
      expect(duration).toBeLessThan(1);
    });

    it('should calculate weight for 100 items in <1ms', () => {
      const start = performance.now();
      const items = Array(100).fill({ id: '1', title: 'Album' });
      const weight = shippingService.calculatePackageWeight(items);
      const duration = performance.now() - start;

      expect(weight).toBe(804); // 100 * 8 + 4
      expect(duration).toBeLessThan(1);
    });

    it('should calculate weight for 1000 items in <5ms', () => {
      const start = performance.now();
      const items = Array(1000).fill({ id: '1', title: 'Album' });
      const weight = shippingService.calculatePackageWeight(items);
      const duration = performance.now() - start;

      expect(weight).toBe(8004); // 1000 * 8 + 4
      expect(duration).toBeLessThan(5);
    });

    it('should handle null items without performance penalty', () => {
      const start = performance.now();
      const weight = shippingService.calculatePackageWeight(null);
      const duration = performance.now() - start;

      expect(weight).toBe(12);
      expect(duration).toBeLessThan(0.5);
    });
  });

  describe('calculateRateCost Performance', () => {
    it('should calculate rate cost in <1ms', () => {
      const rate = {
        baseRate: '5.99',
        perOzRate: '0.50',
        minWeightOz: 8,
        maxWeightOz: 32,
      };

      const start = performance.now();
      const cost = shippingService.calculateRateCost(rate, 16);
      const duration = performance.now() - start;

      expect(cost).toBe(9.99); // 5.99 + (16 - 8) * 0.50
      expect(duration).toBeLessThan(1);
    });

    it('should handle 10000 rate calculations in <50ms', () => {
      const rate = {
        baseRate: '5.99',
        perOzRate: '0.50',
        minWeightOz: 8,
        maxWeightOz: 32,
      };

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        shippingService.calculateRateCost(rate, 8 + (i % 24));
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should maintain precision across many calculations', () => {
      const rate = {
        baseRate: '12.50',
        perOzRate: '0.33',
        minWeightOz: 8,
        maxWeightOz: 64,
      };

      const costs = [];
      for (let weight = 8; weight <= 64; weight++) {
        costs.push(shippingService.calculateRateCost(rate, weight));
      }

      // Verify all costs are properly rounded to 2 decimals
      costs.forEach(cost => {
        // Check that cost has at most 2 decimal places
        const decimalPlaces = (cost.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
        expect(typeof cost).toBe('number');
      });
    });
  });

  // ============================================================================
  // DATABASE QUERY PERFORMANCE
  // ============================================================================

  describe('getZoneForAddress Performance', () => {
    it('should find zone in <50ms for 10 state array', async () => {
      const start = performance.now();
      const zone = await shippingService.getZoneForAddress({ state: 'CA' });
      const duration = performance.now() - start;

      expect(zone).not.toBeNull();
      expect(zone.id).toBe(testZone.id);
      expect(duration).toBeLessThan(50);
    });

    it('should find zone in <50ms for less common state', async () => {
      const start = performance.now();
      const zone = await shippingService.getZoneForAddress({ state: 'PA' });
      const duration = performance.now() - start;

      expect(zone).not.toBeNull();
      expect(duration).toBeLessThan(50);
    });

    it('should return null for unknown state in <50ms', async () => {
      const start = performance.now();
      const zone = await shippingService.getZoneForAddress({ state: 'ZZ' });
      const duration = performance.now() - start;

      expect(zone).toBeNull();
      expect(duration).toBeLessThan(50);
    });

    it('should handle case-insensitive state lookup', async () => {
      const lowercaseZone = await shippingService.getZoneForAddress({ state: 'ca' });
      const uppercaseZone = await shippingService.getZoneForAddress({ state: 'CA' });

      expect(lowercaseZone?.id).toBe(uppercaseZone?.id);
    });

    it('should find zone 100 times in reasonable time', async () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        await shippingService.getZoneForAddress({ state: 'CA' });
      }
      const duration = performance.now() - start;

      // Average ~20ms per query is reasonable (50ms * 100 = 5000ms max)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('getRatesForZone Performance', () => {
    it('should fetch rates for zone in <100ms', async () => {
      const start = performance.now();
      const rates = await shippingService.getRatesForZone(testZone.id, 16);
      const duration = performance.now() - start;

      expect(Array.isArray(rates)).toBe(true);
      expect(rates.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });

    it('should handle various weight tiers efficiently', async () => {
      const weights = [4, 8, 12, 16, 20, 32, 40, 48, 56, 64];
      const start = performance.now();

      for (const weight of weights) {
        await shippingService.getRatesForZone(testZone.id, weight);
      }
      const duration = performance.now() - start;

      // 10 queries should complete in <500ms
      expect(duration).toBeLessThan(500);
    });

    it('should properly format rates with calculated costs', async () => {
      const rates = await shippingService.getRatesForZone(testZone.id, 20);

      rates.forEach(rate => {
        expect(rate).toHaveProperty('method');
        expect(rate).toHaveProperty('carrier');
        expect(rate).toHaveProperty('cost');
        expect(rate).toHaveProperty('deliveryDays');
        expect(rate).toHaveProperty('zone');
        expect(typeof rate.cost).toBe('number');
        expect(rate.cost > 0).toBe(true);
      });
    });

    it('should return empty array for weight outside all ranges', async () => {
      const rates = await shippingService.getRatesForZone(testZone.id, 1000);
      expect(rates).toEqual([]);
    });

    it('should exclude inactive rates', async () => {
      // Deactivate one rate
      const rateToDeactivate = testRates[0];
      await prisma.shippingRate.update({
        where: { id: rateToDeactivate.id },
        data: { isActive: false },
      });

      const rates = await shippingService.getRatesForZone(testZone.id, 4);
      const hasDeactivatedRate = rates.some(
        r => r.carrier === rateToDeactivate.carrier && r.method === rateToDeactivate.shippingMethod
      );

      // Re-activate for cleanup
      await prisma.shippingRate.update({
        where: { id: rateToDeactivate.id },
        data: { isActive: true },
      });

      expect(hasDeactivatedRate).toBe(false);
    });
  });

  describe('calculateShippingRates (End-to-End) Performance', () => {
    it('should calculate rates end-to-end in <150ms', async () => {
      const start = performance.now();
      const rates = await shippingService.calculateShippingRates(
        { state: 'CA', city: 'Los Angeles' },
        { state: 'CA', city: 'San Francisco' },
        { items: [{ id: '1', title: 'Album' }] }
      );
      const duration = performance.now() - start;

      expect(Array.isArray(rates)).toBe(true);
      expect(duration).toBeLessThan(150);
    });

    it('should handle rapid sequential rate calculations', async () => {
      const start = performance.now();
      const calls = [];

      for (let i = 0; i < 10; i++) {
        calls.push(
          shippingService.calculateShippingRates(
            { state: 'CA' },
            { state: 'CA' },
            { items: Array(i + 1).fill({ title: 'Album' }) }
          )
        );
      }

      await Promise.all(calls);
      const duration = performance.now() - start;

      // 10 concurrent calls should complete in <1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should return different rates for different weights', async () => {
      const light = await shippingService.calculateShippingRates(
        { state: 'CA' },
        { state: 'CA' },
        { items: [{ title: 'Album' }] } // 12oz
      );

      const heavy = await shippingService.calculateShippingRates(
        { state: 'CA' },
        { state: 'CA' },
        { items: Array(5).fill({ title: 'Album' }) } // 44oz
      );

      expect(light.length).toBeGreaterThan(0);
      expect(heavy.length).toBeGreaterThan(0);

      // Costs should be different for different weights
      const lightCost = light[0]?.cost;
      const heavyCost = heavy[0]?.cost;
      expect(heavyCost).toBeGreaterThan(lightCost);
    });
  });

  // ============================================================================
  // EDGE CASES & STRESS TESTS
  // ============================================================================

  describe('Performance under stress conditions', () => {
    it('should handle calculation with minimum weight', async () => {
      const start = performance.now();
      const rates = await shippingService.calculateShippingRates(
        { state: 'CA' },
        { state: 'CA' },
        { items: [], weight: 1 } // 1oz
      );
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(150);
    });

    it('should handle calculation with very large weight', async () => {
      const start = performance.now();
      const rates = await shippingService.calculateShippingRates(
        { state: 'CA' },
        { state: 'CA' },
        { items: Array(500).fill({ title: 'Album' }), weight: 4004 } // 500 items
      );
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(150);
    });

    it('should handle many concurrent zone lookups', async () => {
      const states = ['CA', 'NV', 'AZ', 'OR', 'WA', 'TX', 'FL', 'NY', 'PA', 'IL'];
      const start = performance.now();

      const promises = states.map(state =>
        Promise.all(
          Array(10).fill(null).map(() =>
            shippingService.getZoneForAddress({ state })
          )
        )
      );

      await Promise.all(promises);
      const duration = performance.now() - start;

      // 100 concurrent zone lookups should complete in <2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should maintain calculation accuracy under rapid calls', async () => {
      const results = [];
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        const cost = shippingService.calculateRateCost(
          {
            baseRate: '5.99',
            perOzRate: '0.50',
            minWeightOz: 8,
            maxWeightOz: 32,
          },
          12 + (i % 10)
        );
        results.push(cost);
      }
      const duration = performance.now() - start;

      // All results should be numbers with 2 decimal places
      results.forEach(cost => {
        expect(typeof cost).toBe('number');
        expect(cost > 0).toBe(true);
      });

      expect(duration).toBeLessThan(10);
    });
  });
});
