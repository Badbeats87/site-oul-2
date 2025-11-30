import shippingService from '../../src/services/shippingService.js';

describe('ShippingService', () => {
  describe('calculatePackageWeight', () => {
    it('should return 4oz for empty items array (packaging only)', () => {
      const weight = shippingService.calculatePackageWeight([]);
      expect(weight).toBe(4);
    });

    it('should return 12oz for null items (default)', () => {
      const weight = shippingService.calculatePackageWeight(null);
      expect(weight).toBe(12);
    });

    it('should calculate 12oz for 1 vinyl (8oz) + packaging (4oz)', () => {
      const items = [{ id: '1', title: 'Album 1' }];
      const weight = shippingService.calculatePackageWeight(items);
      expect(weight).toBe(12); // 8oz + 4oz packaging
    });

    it('should calculate 20oz for 2 vinyls (16oz) + packaging (4oz)', () => {
      const items = [
        { id: '1', title: 'Album 1' },
        { id: '2', title: 'Album 2' },
      ];
      const weight = shippingService.calculatePackageWeight(items);
      expect(weight).toBe(20); // (2 * 8oz) + 4oz packaging
    });

    it('should calculate 44oz for 5 vinyls (40oz) + packaging (4oz)', () => {
      const items = Array(5).fill({ title: 'Album' });
      const weight = shippingService.calculatePackageWeight(items);
      expect(weight).toBe(44); // (5 * 8oz) + 4oz packaging
    });
  });

  describe('calculateRateCost', () => {
    it('should calculate cost with base rate only for min weight', () => {
      const rate = {
        baseRate: '5.99',
        perOzRate: '0.50',
        minWeightOz: 8,
        maxWeightOz: 32,
      };
      const cost = shippingService.calculateRateCost(rate, 8);
      expect(cost).toBe(5.99);
    });

    it('should add per-ounce charges for weight over minimum', () => {
      const rate = {
        baseRate: '5.99',
        perOzRate: '0.50',
        minWeightOz: 8,
        maxWeightOz: 32,
      };
      const cost = shippingService.calculateRateCost(rate, 12); // 4oz over min
      expect(cost).toBe(7.99); // 5.99 + (4 * 0.50)
    });

    it('should round to 2 decimal places', () => {
      const rate = {
        baseRate: '5.00',
        perOzRate: '0.33',
        minWeightOz: 8,
        maxWeightOz: 32,
      };
      const cost = shippingService.calculateRateCost(rate, 10); // 2oz over
      expect(cost).toBe(5.66); // 5.00 + (2 * 0.33) = 5.66
    });

    it('should handle large weight calculations', () => {
      const rate = {
        baseRate: '10.00',
        perOzRate: '0.50',
        minWeightOz: 8,
        maxWeightOz: 64,
      };
      const cost = shippingService.calculateRateCost(rate, 60); // 52oz over
      expect(cost).toBe(36.0); // 10.00 + (52 * 0.50)
    });
  });

  describe('Error handling', () => {
    it('should handle invalid rate objects gracefully', () => {
      const invalidRate = {
        baseRate: 'invalid',
        perOzRate: 'invalid',
        minWeightOz: 8,
      };

      // Should convert to NaN but still compute
      const cost = shippingService.calculateRateCost(invalidRate, 12);
      expect(isNaN(cost)).toBe(true);
    });

    it('should return default weight for non-array items', () => {
      const weight = shippingService.calculatePackageWeight('not an array');
      expect(weight).toBe(12);
    });

    it('should handle zero weight correctly', () => {
      const rate = {
        baseRate: '5.99',
        perOzRate: '0.50',
        minWeightOz: 8,
        maxWeightOz: 32,
      };
      // Zero weight - no excess weight charge
      const cost = shippingService.calculateRateCost(rate, 0);
      expect(cost).toBe(5.99);
    });
  });

  describe('Edge cases', () => {
    it('should handle very large item counts', () => {
      const items = Array(100).fill({ title: 'Album' });
      const weight = shippingService.calculatePackageWeight(items);
      expect(weight).toBe(804); // (100 * 8oz) + 4oz packaging
    });

    it('should handle decimal rate calculations precisely', () => {
      const rate = {
        baseRate: '12.50',
        perOzRate: '0.25',
        minWeightOz: 12,
        maxWeightOz: 64,
      };
      const cost = shippingService.calculateRateCost(rate, 24); // 12oz over
      expect(cost).toBe(15.5); // 12.50 + (12 * 0.25)
    });

    it('should handle minimum weight boundary', () => {
      const rate = {
        baseRate: '5.00',
        perOzRate: '0.50',
        minWeightOz: 8,
        maxWeightOz: 32,
      };

      const cost1 = shippingService.calculateRateCost(rate, 7); // Under min
      const cost2 = shippingService.calculateRateCost(rate, 8); // At min
      const cost3 = shippingService.calculateRateCost(rate, 9); // Over min

      expect(cost1).toBe(5.0); // No excess weight
      expect(cost2).toBe(5.0); // No excess weight
      expect(cost3).toBe(5.5); // 1oz excess * 0.50
    });
  });

  describe('Provider initialization', () => {
    it('should initialize with mock provider by default', () => {
      expect(shippingService.provider).toBe('mock');
    });

    it('should have client initialized', () => {
      expect(shippingService.client).toBeDefined();
    });

    it('should have client with getRates method', () => {
      expect(typeof shippingService.client.getRates).toBe('function');
    });
  });
});
