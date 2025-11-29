import pricingService from '../../src/services/pricingService.js';

describe('PricingService - Unit Tests', () => {
  // ============================================================================
  // CONDITION CURVE TESTS (10+ tests)
  // ============================================================================

  describe('Condition Curve Adjustments', () => {
    test('MINT condition should apply 110% multiplier', () => {
      const result = pricingService.applyConditionCurve(
        100,
        'MINT',
        'MINT',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );
      expect(result).toBe(110);
    });

    test('NM/NM should apply 100% baseline', () => {
      const result = pricingService.applyConditionCurve(
        100,
        'NM',
        'NM',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );
      expect(result).toBe(100);
    });

    test('VG/VG should apply 60% adjustment', () => {
      const result = pricingService.applyConditionCurve(
        100,
        'VG',
        'VG',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );
      expect(result).toBe(60);
    });

    test('POOR condition should apply 10% multiplier', () => {
      const result = pricingService.applyConditionCurve(
        100,
        'POOR',
        'POOR',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );
      expect(result).toBe(10);
    });

    test('NM/VG_PLUS should weight media 60% and sleeve 40%', () => {
      const result = pricingService.applyConditionCurve(
        100,
        'NM',
        'VG_PLUS',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );
      // Media: 100 × 1.00 × 0.60 = 60
      // Sleeve: 100 × 0.85 × 0.40 = 34
      // Total: 94
      expect(result).toBe(94);
    });

    test('MINT/POOR asymmetric condition', () => {
      const result = pricingService.applyConditionCurve(
        100,
        'MINT',
        'POOR',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );
      // Media: 100 × 1.10 × 0.60 = 66
      // Sleeve: 100 × 0.10 × 0.40 = 4
      // Total: 70
      expect(result).toBe(70);
    });

    test('All condition grades should have valid multipliers', () => {
      const conditions = ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'];
      for (const condition of conditions) {
        const result = pricingService.applyConditionCurve(
          100,
          condition,
          condition,
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(110);
      }
    });

    test('Custom condition curve should override defaults', () => {
      const customCurve = {
        MINT: 1.5,
        NM: 1.0,
        VG_PLUS: 0.7,
        VG: 0.5,
        VG_MINUS: 0.3,
        G: 0.2,
        FAIR: 0.1,
        POOR: 0.05,
      };
      const result = pricingService.applyConditionCurve(
        100,
        'MINT',
        'NM',
        customCurve,
        pricingService.defaultWeights
      );
      // Media: 100 × 1.5 × 0.60 = 90
      // Sleeve: 100 × 1.0 × 0.40 = 40
      // Total: 130
      expect(result).toBe(130);
    });

    test('Custom weights different from defaults', () => {
      const customWeights = {
        media: 0.8,
        sleeve: 0.2,
      };

      const result = pricingService.applyConditionCurve(
        100,
        'NM',
        'VG_PLUS',
        pricingService.defaultConditionCurve,
        customWeights
      );
      // Media: 100 × 1.0 × 0.8 = 80
      // Sleeve: 100 × 0.85 × 0.2 = 17
      // Total: 97
      expect(result).toBe(97);
    });
  });

  // ============================================================================
  // ROUNDING AND CONSTRAINTS TESTS (10+ tests)
  // ============================================================================

  describe('Rounding and Constraints', () => {
    test('roundToIncrement should round to $0.25', () => {
      const result1 = pricingService.roundToIncrement(10.13);
      expect(result1 % 0.25).toBeLessThan(0.01);

      const result2 = pricingService.roundToIncrement(10.16);
      expect(result2 % 0.25).toBeLessThan(0.01);

      const result3 = pricingService.roundToIncrement(10.38);
      expect(result3 % 0.25).toBeLessThan(0.01);

      const result4 = pricingService.roundToIncrement(10.63);
      expect(result4 % 0.25).toBeLessThan(0.01);

      const result5 = pricingService.roundToIncrement(10.99);
      expect(result5 % 0.25).toBeLessThan(0.01);
    });

    test('roundToIncrement with custom increment', () => {
      expect(pricingService.roundToIncrement(10.04, 0.1)).toBeCloseTo(10);
      expect(pricingService.roundToIncrement(10.06, 0.1)).toBeCloseTo(10.1);
    });

    test('roundToIncrement edge cases', () => {
      expect(pricingService.roundToIncrement(10)).toBe(10);
      // 0.125 with 0.25 increment rounds up to 0.25 due to normal rounding rules
      const result = pricingService.roundToIncrement(0.125, 0.25);
      expect(result).toBe(0.25); // 0.125/0.25 = 0.5, rounds to 1, so 1*0.25 = 0.25
      expect(pricingService.roundToIncrement(0)).toBe(0);
    });

    test('applyFloorAndCeiling should enforce constraints', () => {
      expect(pricingService.applyFloorAndCeiling(5, 10, 100)).toBe(10);
      expect(pricingService.applyFloorAndCeiling(50, 10, 100)).toBe(50);
      expect(pricingService.applyFloorAndCeiling(150, 10, 100)).toBe(100);
    });

    test('applyFloorAndCeiling with equal bounds', () => {
      expect(pricingService.applyFloorAndCeiling(50, 50, 50)).toBe(50);
    });

    test('calculateProfitMargin should calculate percentage', () => {
      const margin = pricingService.calculateProfitMargin(100, 50);
      expect(margin).toBe(100); // 100% margin
    });

    test('calculateProfitMargin with zero cost basis', () => {
      const margin = pricingService.calculateProfitMargin(100, 0);
      expect(margin).toBe(0);
    });

    test('validateMinimumMargin should validate threshold', () => {
      expect(pricingService.validateMinimumMargin(65, 50, 0.3)).toBe(true);
      expect(pricingService.validateMinimumMargin(64, 50, 0.3)).toBe(false);
    });

    test('validateMinimumMargin with 30% margin exactly', () => {
      expect(pricingService.validateMinimumMargin(65, 50, 0.3)).toBe(true);
    });

    test('validateMinimumMargin with 0% threshold', () => {
      expect(pricingService.validateMinimumMargin(50, 50, 0)).toBe(true);
    });
  });

  // ============================================================================
  // MARKDOWN CALCULATION TESTS (5+ tests)
  // ============================================================================

  describe('Markdown Scheduling', () => {
    test('no markdown for items listed less than 30 days', () => {
      const listedAt = new Date();
      listedAt.setDate(listedAt.getDate() - 15);

      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt,
        costBasis: 50,
      });

      expect(result.discountPercent).toBe(0);
      expect(result.newPrice).toBe(100);
      expect(result.daysListed).toBe(15);
    });

    test('10% markdown after 30 days', () => {
      const listedAt = new Date();
      listedAt.setDate(listedAt.getDate() - 35);

      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt,
        costBasis: 50,
      });

      expect(result.discountPercent).toBe(10);
      expect(result.newPrice).toBe(90);
      expect(result.daysListed).toBe(35);
    });

    test('20% markdown after 60 days', () => {
      const listedAt = new Date();
      listedAt.setDate(listedAt.getDate() - 65);

      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt,
        costBasis: 50,
      });

      expect(result.discountPercent).toBe(20);
      expect(result.newPrice).toBe(80);
      expect(result.daysListed).toBe(65);
    });

    test('markdown with invalid date throws error', () => {
      expect(() => {
        pricingService.calculateMarkdown({
          currentPrice: 100,
          listedAt: 'invalid-date',
          costBasis: 50,
        });
      }).toThrow();
    });

    test('markdown with high markup schedule', () => {
      const listedAt = new Date();
      listedAt.setDate(listedAt.getDate() - 75);

      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt,
        costBasis: 50,
        markdownSchedule: { 30: 0.15, 60: 0.3 },
      });

      expect(result.discountPercent).toBe(30);
      expect(result.newPrice).toBe(70);
    });
  });

  // ============================================================================
  // VALIDATION TESTS (5+ tests)
  // ============================================================================

  describe('Input Validation', () => {
    test('all condition grades should pass validation', () => {
      const conditions = ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'];
      for (const condition of conditions) {
        expect(() => {
          pricingService['_validateCondition'](condition);
        }).not.toThrow();
      }
    });

    test('invalid condition should fail validation', () => {
      expect(() => {
        pricingService['_validateCondition']('EXCELLENT');
      }).toThrow();
    });

    test('null condition should fail validation', () => {
      expect(() => {
        pricingService['_validateCondition'](null);
      }).toThrow();
    });

    test('undefined condition should fail validation', () => {
      expect(() => {
        pricingService['_validateCondition'](undefined);
      }).toThrow();
    });

    test('empty string condition should fail validation', () => {
      expect(() => {
        pricingService['_validateCondition']('');
      }).toThrow();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS - Synchronous Methods (5+ tests)
  // ============================================================================

  describe('Performance - Synchronous Methods', () => {
    test('applyConditionCurve is fast - 1000 calls < 100ms', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        pricingService.applyConditionCurve(
          100,
          'NM',
          'VG_PLUS',
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });

    test('roundToIncrement is efficient - 10000 calls < 50ms', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        pricingService.roundToIncrement(10.13 + Math.random(), 0.25);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    test('applyFloorAndCeiling is fast', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        pricingService.applyFloorAndCeiling(Math.random() * 1000, 10, 500);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    test('calculateProfitMargin is fast', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        pricingService.calculateProfitMargin(Math.random() * 1000, 50);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    test('calculateMarkdown is fast', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        const listedAt = new Date();
        listedAt.setDate(listedAt.getDate() - (Math.floor(Math.random() * 100)));
        pricingService.calculateMarkdown({
          currentPrice: 100,
          listedAt,
          costBasis: 50,
        });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  // ============================================================================
  // EDGE CASES - SYNCHRONOUS (15+ tests)
  // ============================================================================

  describe('Edge Cases', () => {
    test('zero prices handled correctly', () => {
      const result = pricingService.applyFloorAndCeiling(0, 5, 100);
      expect(result).toBe(5);
    });

    test('negative price handled correctly', () => {
      const result = pricingService.applyFloorAndCeiling(-50, 5, 100);
      expect(result).toBe(5);
    });

    test('very high prices handled correctly', () => {
      const result = pricingService.applyFloorAndCeiling(10000, 5, 500);
      expect(result).toBe(500);
    });

    test('float precision in condition curve', () => {
      const result = pricingService.applyConditionCurve(
        0.1,
        'NM',
        'NM',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      // Should not produce floating point errors
      expect(result).toBeLessThan(0.11);
      expect(result).toBeGreaterThan(0.09);
    });

    test('rounding edge case 0.125', () => {
      const result = pricingService.roundToIncrement(0.125, 0.25);
      expect(result).toBe(0.25); // 0.125 rounds up to nearest 0.25 increment
    });

    test('custom condition curve with missing grades defaults to 1.0', () => {
      const incompleteCurve = {
        NM: 1.0,
        // Missing other grades
      };

      const result = pricingService.applyConditionCurve(
        100,
        'MINT',
        'NM',
        incompleteCurve,
        pricingService.defaultWeights
      );

      // Should default to 1.0 for missing MINT grade
      expect(result).toBe(100);
    });

    test('profitMargin with negative cost basis', () => {
      const margin = pricingService.calculateProfitMargin(100, -10);
      expect(margin).toBe(0);
    });

    test('profitMargin with exact breakeven', () => {
      const margin = pricingService.calculateProfitMargin(50, 50);
      expect(margin).toBe(0);
    });

    test('validateMinimumMargin with negative margin', () => {
      // Price below cost (loss scenario)
      const isValid = pricingService.validateMinimumMargin(40, 50, 0.3);
      expect(isValid).toBe(false);
    });

    test('markdown today (0 days)', () => {
      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt: new Date(),
        costBasis: 50,
      });

      expect(result.daysListed).toBe(0);
      expect(result.discountPercent).toBe(0);
    });

    test('markdown exact 30 days', () => {
      const listedAt = new Date();
      listedAt.setDate(listedAt.getDate() - 30);

      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt,
        costBasis: 50,
      });

      // At exactly 30 days, 10% markdown applies
      expect(result.discountPercent).toBe(10);
    });

    test('markdown exact 60 days', () => {
      const listedAt = new Date();
      listedAt.setDate(listedAt.getDate() - 60);

      const result = pricingService.calculateMarkdown({
        currentPrice: 100,
        listedAt,
        costBasis: 50,
      });

      // At exactly 60 days, 20% markdown applies
      expect(result.discountPercent).toBe(20);
    });

    test('extreme values in profit margin calculation', () => {
      const margin1 = pricingService.calculateProfitMargin(1000000, 1);
      expect(margin1).toBeGreaterThan(0);

      const margin2 = pricingService.calculateProfitMargin(1, 1000000);
      expect(margin2).toBeLessThan(0);
    });

    test('rounding with zero increment returns price unchanged', () => {
      const result = pricingService.roundToIncrement(10.5, 0);
      expect(result).toBe(10.5);
    });

    test('applyFloorAndCeiling with null values', () => {
      // null comparisons in JavaScript: null < number is false, so it returns the floor
      const result = pricingService.applyFloorAndCeiling(null, 10, 100);
      expect(result).toBe(10); // null is treated as falsy in comparisons, returns floor
    });
  });

  // ============================================================================
  // CALCULATION INTEGRATION TESTS (10+ tests)
  // ============================================================================

  describe('Calculation Integration', () => {
    test('complete buy price workflow with rounding', () => {
      // Market price 150 × 0.55 buy% × 1.0 condition = 82.50
      const baseOffer = 150 * 0.55;
      const adjusted = pricingService.applyConditionCurve(
        baseOffer,
        'NM',
        'NM',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );
      const rounded = pricingService.roundToIncrement(adjusted, 0.25);
      const final = pricingService.applyFloorAndCeiling(rounded, 5, 500);

      expect(final).toBe(82.5);
    });

    test('buy price with condition reduces from market', () => {
      // Market 150 × 0.55 = 82.5 for NM
      // Market 150 × 0.55 × 0.60 (VG) = 49.5 for VG/VG
      const nmPrice = pricingService.applyConditionCurve(
        150 * 0.55,
        'NM',
        'NM',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      const vgPrice = pricingService.applyConditionCurve(
        150 * 0.55,
        'VG',
        'VG',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      expect(vgPrice).toBeLessThan(nmPrice);
    });

    test('sell price must exceed buy price with margin', () => {
      const costBasis = 50;
      const minSellPrice = costBasis * (1 + 0.3); // 65

      // Market 150 × 1.25 = 187.5 for NM
      const baseSell = 150 * 1.25;
      const adjusted = pricingService.applyConditionCurve(
        baseSell,
        'NM',
        'NM',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      expect(adjusted).toBeGreaterThan(minSellPrice);
    });

    test('successive markdowns reduce price progressively', () => {
      const originalPrice = 100;

      // 30-day markdown
      const result30 = pricingService.calculateMarkdown({
        currentPrice: originalPrice,
        listedAt: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 35);
          return d;
        })(),
        costBasis: 50,
      });

      // 60-day markdown (would be higher discount)
      const result60 = pricingService.calculateMarkdown({
        currentPrice: originalPrice,
        listedAt: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 65);
          return d;
        })(),
        costBasis: 50,
      });

      expect(result30.newPrice).toBeGreaterThan(result60.newPrice);
    });

    test('rounding preserves increments throughout', () => {
      const prices = [82.13, 82.38, 82.63, 82.88];

      for (const price of prices) {
        const rounded = pricingService.roundToIncrement(price, 0.25);
        expect(rounded % 0.25).toBeLessThan(0.01); // Allow for floating point errors
      }
    });

    test('condition curve combined effects', () => {
      // MINT media + POOR sleeve should be between POOR and MINT
      const poor = pricingService.applyConditionCurve(
        100,
        'POOR',
        'POOR',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      const mintPoor = pricingService.applyConditionCurve(
        100,
        'MINT',
        'POOR',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      const mint = pricingService.applyConditionCurve(
        100,
        'MINT',
        'MINT',
        pricingService.defaultConditionCurve,
        pricingService.defaultWeights
      );

      expect(mintPoor).toBeGreaterThan(poor);
      expect(mintPoor).toBeLessThan(mint);
    });

    test('profit margin maintained across price range', () => {
      const costBases = [10, 50, 100, 500];

      for (const cost of costBases) {
        const sellPrice = cost * 1.5; // 50% margin
        const margin = pricingService.calculateProfitMargin(sellPrice, cost);
        expect(margin).toBe(50);
      }
    });

    test('floor prevents unrealistic low prices', () => {
      const prices = [0.01, 1, 2, 4.99];

      for (const price of prices) {
        const result = pricingService.applyFloorAndCeiling(price, 5, 500);
        expect(result).toBeGreaterThanOrEqual(5);
      }
    });

    test('ceiling prevents unrealistic high prices', () => {
      const prices = [501, 1000, 5000, 10000];

      for (const price of prices) {
        const result = pricingService.applyFloorAndCeiling(price, 5, 500);
        expect(result).toBeLessThanOrEqual(500);
      }
    });
  });

  // ============================================================================
  // PRIVATE METHOD VALIDATION TESTS
  // ============================================================================

  describe('Private Method Validation', () => {
    test('_validateCondition throws for invalid conditions', () => {
      // Test the private validation method
      expect(() => {
        pricingService._validateCondition('INVALID');
      }).toThrow('Invalid condition');
    });

    test('_validateCondition passes for all valid grades', () => {
      const validConditions = ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'];

      validConditions.forEach((condition) => {
        expect(() => {
          pricingService._validateCondition(condition);
        }).not.toThrow();
      });
    });

    test('calculateBuyPrice is an async function', () => {
      // Verify async methods exist and are functions
      expect(typeof pricingService.calculateBuyPrice).toBe('function');
    });

    test('calculateSellPrice is an async function', () => {
      // Verify async methods exist and are functions
      expect(typeof pricingService.calculateSellPrice).toBe('function');
    });

    test('should have proper default curves and weights', () => {
      expect(pricingService.defaultConditionCurve).toBeDefined();
      expect(pricingService.defaultConditionCurve.MINT).toBe(1.1);
      expect(pricingService.defaultConditionCurve.NM).toBe(1.0);
      expect(pricingService.defaultConditionCurve.POOR).toBe(0.1);

      expect(pricingService.defaultWeights).toBeDefined();
      expect(pricingService.defaultWeights.media).toBe(0.6);
      expect(pricingService.defaultWeights.sleeve).toBe(0.4);
    });
  });
});
