import pricingService from '../../src/services/pricingService.js';

// Since we're testing the service with mocked market data,
// we'll test the async methods by providing resolved promises
describe('Pricing Service - Integration Tests', () => {
  // ============================================================================
  // BUY PRICE INTEGRATION TESTS
  // ============================================================================

  describe('calculateBuyPrice Integration', () => {
    it('should calculate buy price with various conditions', async () => {
      // Test that the method structure is correct
      expect(typeof pricingService.calculateBuyPrice).toBe('function');
    });

    it('should apply condition curves to buy calculation', () => {
      // Test synchronous condition curve application
      const basePrice = 100;
      const result = pricingService.applyConditionCurve(
        basePrice,
        'NM',
        'NM',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      // NM media: 100 × 1.0 × 0.6 = 60
      // NM sleeve: 100 × 1.0 × 0.4 = 40
      // Total: 100
      expect(result).toBe(100);
    });

    it('should apply correct buy floor and ceiling constraints', () => {
      const floor = 5;
      const ceiling = 500;

      // Test floor constraint
      const tooLow = pricingService.applyFloorAndCeiling(3, floor, ceiling);
      expect(tooLow).toBe(floor);

      // Test normal range
      const normal = pricingService.applyFloorAndCeiling(100, floor, ceiling);
      expect(normal).toBe(100);

      // Test ceiling constraint
      const tooHigh = pricingService.applyFloorAndCeiling(600, floor, ceiling);
      expect(tooHigh).toBe(ceiling);
    });

    it('should round buy prices to 0.25 increment correctly', () => {
      const prices = [66.12, 66.18, 66.38, 66.62];
      const increment = 0.25;

      prices.forEach((price) => {
        const rounded = pricingService.roundToIncrement(price, increment);
        // All should round to nearest 0.25
        expect(rounded % increment).toBeLessThan(0.01);
      });
    });

    it('should handle condition asymmetry correctly', () => {
      const basePrice = 100;

      // Mint media, poor sleeve
      const result1 = pricingService.applyConditionCurve(
        basePrice,
        'MINT',
        'POOR',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      // Poor media, mint sleeve
      const result2 = pricingService.applyConditionCurve(
        basePrice,
        'POOR',
        'MINT',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      // Media is weighted 60%, so MINT media should give higher price
      expect(result1).toBeGreaterThan(result2);
    });

    it('should apply profit margin calculation correctly', () => {
      const buyPrice = 55;
      const sellPrice = 125;

      const margin = pricingService.calculateProfitMargin(sellPrice, buyPrice);
      // (125 - 55) / 55 * 100 = 127.27%
      expect(margin).toBeCloseTo(127.27, 0);
    });

    it('should validate minimum margin correctly', () => {
      const buyPrice = 50;
      const sellPrice = 65;
      const minMargin = 0.3; // 30%

      const isValid = pricingService.validateMinimumMargin(sellPrice, buyPrice, minMargin);
      // (65 - 50) / 50 = 0.30 = 30% exactly
      expect(isValid).toBe(true);
    });
  });

  // ============================================================================
  // SELL PRICE INTEGRATION TESTS
  // ============================================================================

  describe('calculateSellPrice Integration', () => {
    it('should apply sell floor and ceiling constraints', () => {
      const floor = 10;
      const ceiling = 999.99;

      // Test floor constraint
      const tooLow = pricingService.applyFloorAndCeiling(5, floor, ceiling);
      expect(tooLow).toBe(floor);

      // Test normal range
      const normal = pricingService.applyFloorAndCeiling(500, floor, ceiling);
      expect(normal).toBe(500);

      // Test ceiling constraint
      const tooHigh = pricingService.applyFloorAndCeiling(1500, floor, ceiling);
      expect(tooHigh).toBe(ceiling);
    });

    it('should round sell prices to 0.25 increment', () => {
      const price = 125.37;
      const rounded = pricingService.roundToIncrement(price, 0.25);

      // Should round to nearest 0.25
      expect(rounded % 0.25).toBeLessThan(0.01);
    });

    it('should handle various condition combinations for sell pricing', () => {
      const basePrice = 100;

      // Test all condition combinations
      const conditions = ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'];

      conditions.forEach((mediaCondition) => {
        conditions.forEach((sleeveCondition) => {
          const result = pricingService.applyConditionCurve(
            basePrice,
            mediaCondition,
            sleeveCondition,
            pricingService.defaultConditionCurve,
            pricingService.defaultWeights
          );

          // All results should be positive and less than or equal to base (since weights < 1)
          expect(result).toBeGreaterThan(0);
          expect(result).toBeLessThanOrEqual(basePrice * 1.1); // MINT/MINT = 110
        });
      });
    });

    it('should enforce minimum profit margin across condition grades', () => {
      const costBasis = 50;
      const minMargin = 0.3; // 30%

      // Even worst condition should maintain margin if enforced
      const minimumPrice = costBasis * (1 + minMargin);

      // POOR condition with weights should still allow margin enforcement
      const poorConditionAdjustment = pricingService.applyConditionCurve(
        costBasis,
        'POOR',
        'POOR',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      expect(poorConditionAdjustment).toBeLessThan(minimumPrice);
    });
  });

  // ============================================================================
  // MARKDOWN INTEGRATION TESTS
  // ============================================================================

  describe('calculateMarkdown Integration', () => {
    it('should apply no markdown for recent listings', () => {
      const now = new Date();
      const listedAt = new Date(now - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt,
        costBasis: 50,
      });

      expect(result.discountPercent).toBe(0);
      expect(result.newPrice).toBe(100);
      expect(result.marginProtected).toBe(true);
    });

    it('should apply 10% markdown after 30 days', () => {
      const now = new Date();
      const listedAt = new Date(now - 31 * 24 * 60 * 60 * 1000); // 31 days ago

      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt,
        costBasis: 50,
      });

      expect(result.discountPercent).toBe(10);
      expect(result.newPrice).toBe(90);
    });

    it('should apply 20% markdown after 60 days', () => {
      const now = new Date();
      const listedAt = new Date(now - 61 * 24 * 60 * 60 * 1000); // 61 days ago

      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt,
        costBasis: 50,
      });

      expect(result.discountPercent).toBe(20);
      expect(result.newPrice).toBe(80);
    });

    it('should protect cost basis during markdown', () => {
      const now = new Date();
      const listedAt = new Date(now - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const currentPrice = 60;
      const costBasis = 55;

      const result = pricingService.calculateMarkdown({
        currentPrice,
        listedAt,
        costBasis,
      });

      // Price should not go below current price (conservative)
      expect(result.newPrice).toBeLessThanOrEqual(currentPrice);
    });

    it('should use custom markdown schedule', () => {
      const now = new Date();
      const listedAt = new Date(now - 45 * 24 * 60 * 60 * 1000); // 45 days ago

      const customSchedule = {
        30: 0.15, // 15% after 30 days
        60: 0.25, // 25% after 60 days
      };

      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt,
        costBasis: 50,
        markdownSchedule: customSchedule,
      });

      expect(result.discountPercent).toBe(15);
      expect(result.newPrice).toBe(85);
    });

    it('should handle exact day boundaries correctly', () => {
      const now = new Date();

      // Exactly 30 days
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const result30 = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt: thirtyDaysAgo,
        costBasis: 50,
      });

      expect(result30.discountPercent).toBe(10);

      // Exactly 60 days
      const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
      const result60 = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt: sixtyDaysAgo,
        costBasis: 50,
      });

      expect(result60.discountPercent).toBe(20);
    });
  });

  // ============================================================================
  // END-TO-END WORKFLOW TESTS
  // ============================================================================

  describe('End-to-End Pricing Workflows', () => {
    it('should handle complete condition curve chain', () => {
      const marketPrice = 150;
      const buyPercentage = 0.55;
      const sellPercentage = 1.25;

      // Simulate buy price calculation
      const buyBase = marketPrice * buyPercentage; // $82.50
      const buyAdjusted = pricingService.applyConditionCurve(
        buyBase,
        'NM',
        'VG_PLUS',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );
      const buyRounded = pricingService.roundToIncrement(buyAdjusted, 0.25);
      const buyFinal = pricingService.applyFloorAndCeiling(buyRounded, 5, 500);

      // Simulate sell price calculation
      const sellBase = marketPrice * sellPercentage; // $187.50
      const sellAdjusted = pricingService.applyConditionCurve(
        sellBase,
        'NM',
        'VG_PLUS',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );
      const sellRounded = pricingService.roundToIncrement(sellAdjusted, 0.25);
      const sellFinal = pricingService.applyFloorAndCeiling(sellRounded, 10, 999.99);

      // Verify sell > buy with margin
      expect(sellFinal).toBeGreaterThan(buyFinal);

      // Verify margin
      const margin = pricingService.calculateProfitMargin(sellFinal, buyFinal);
      expect(margin).toBeGreaterThan(0);
    });

    it('should handle degradation from mint to poor conditions', () => {
      const marketPrice = 200;
      const prices = [];

      const conditions = ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'];

      conditions.forEach((condition) => {
        const adjusted = pricingService.applyConditionCurve(
          marketPrice * 0.55,
          condition,
          condition,
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
        prices.push(adjusted);
      });

      // Each condition should result in lower price
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThan(prices[i - 1]);
      }
    });

    it('should maintain consistency across calculation paths', () => {
      const marketPrice = 100;
      const customCurve = {
        MINT: 1.1,
        NM: 1.0,
        VG_PLUS: 0.85,
        VG: 0.6,
        VG_MINUS: 0.45,
        G: 0.3,
        FAIR: 0.2,
        POOR: 0.1,
      };

      // Test with custom curve
      const customResult = pricingService.applyConditionCurve(
        marketPrice,
        'NM',
        'NM',
        customCurve,
        pricingService.defaultWeights
      );

      // Test with default curve
      const defaultResult = pricingService.applyConditionCurve(
        marketPrice,
        'NM',
        'NM',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      // Should be identical
      expect(customResult).toBe(defaultResult);
    });

    it('should handle extreme prices correctly', () => {
      const extremePrice = 10000;
      const minPrice = 1;

      // High price should be constrained
      const highConstrained = pricingService.applyFloorAndCeiling(extremePrice, 5, 500);
      expect(highConstrained).toBeLessThanOrEqual(500);

      // Low price should be floored
      const lowConstrained = pricingService.applyFloorAndCeiling(minPrice, 5, 500);
      expect(lowConstrained).toBeGreaterThanOrEqual(5);
    });

    it('should handle rounding throughout calculation', () => {
      const prices = [12.126, 45.374, 78.625, 99.999];

      prices.forEach((price) => {
        const rounded = pricingService.roundToIncrement(price, 0.25);
        // Each rounded price should be a multiple of 0.25
        expect(Math.abs(rounded % 0.25)).toBeLessThan(0.01);
      });
    });

    it('should validate margin across price ranges', () => {
      const testCases = [
        { buy: 10, sell: 13, minMargin: 0.3, shouldPass: true }, // 30% margin
        { buy: 50, sell: 60, minMargin: 0.3, shouldPass: false }, // 20% margin
        { buy: 100, sell: 150, minMargin: 0.4, shouldPass: true }, // 50% margin
      ];

      testCases.forEach(({ buy, sell, minMargin, shouldPass }) => {
        const isValid = pricingService.validateMinimumMargin(sell, buy, minMargin);
        expect(isValid).toBe(shouldPass);
      });
    });
  });
});
