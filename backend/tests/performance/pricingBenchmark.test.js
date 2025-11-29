import pricingService from '../../src/services/pricingService.js';

describe('Pricing Service - Performance Benchmarks', () => {
  // ============================================================================
  // SYNCHRONOUS METHOD PERFORMANCE TESTS
  // ============================================================================

  describe('Synchronous Method Performance', () => {
    it('applyConditionCurve should complete 10,000 operations in < 50ms', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        pricingService.applyConditionCurve(
          100,
          'NM',
          'VG_PLUS',
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
      }

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`applyConditionCurve: 10,000 ops in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(50);
    });

    it('roundToIncrement should complete 10,000 operations in < 30ms', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        pricingService.roundToIncrement(Math.random() * 1000, 0.25);
      }

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`roundToIncrement: 10,000 ops in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(30);
    });

    it('applyFloorAndCeiling should complete 10,000 operations in < 30ms', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        pricingService.applyFloorAndCeiling(Math.random() * 1000, 5, 500);
      }

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`applyFloorAndCeiling: 10,000 ops in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(30);
    });

    it('calculateProfitMargin should complete 10,000 operations in < 30ms', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        pricingService.calculateProfitMargin(125 + Math.random() * 100, 50 + Math.random() * 50);
      }

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`calculateProfitMargin: 10,000 ops in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(30);
    });

    it('calculateMarkdown should complete 10,000 operations in < 100ms', () => {
      const now = new Date();

      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        const daysAgo = Math.floor(Math.random() * 100);
        const listedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

        pricingService.calculateMarkdown({
          currentPrice: 100,
          listedAt,
          costBasis: 50,
        });
      }

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`calculateMarkdown: 10,000 ops in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(100);
    });

    it('validateMinimumMargin should complete 10,000 operations in < 30ms', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        pricingService.validateMinimumMargin(125, 50, 0.3);
      }

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`validateMinimumMargin: 10,000 ops in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(30);
    });
  });

  // ============================================================================
  // CALCULATION CHAIN PERFORMANCE TESTS
  // ============================================================================

  describe('Complete Calculation Chain Performance', () => {
    it('should complete 1,000 full buy price chains in < 500ms', () => {
      const marketPrice = 100;
      const buyPercentage = 0.55;

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const baseOffer = marketPrice * buyPercentage;
        const adjusted = pricingService.applyConditionCurve(
          baseOffer,
          'NM',
          'VG_PLUS',
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
        const rounded = pricingService.roundToIncrement(adjusted, 0.25);
        pricingService.applyFloorAndCeiling(rounded, 5, 500);
      }

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`Full buy price chain: 1,000 ops in ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(2)}ms per op)`);
      expect(elapsed).toBeLessThan(500);
    });

    it('should complete 1,000 full sell price chains in < 500ms', () => {
      const marketPrice = 100;
      const sellPercentage = 1.25;

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const listSuggestion = marketPrice * sellPercentage;
        const adjusted = pricingService.applyConditionCurve(
          listSuggestion,
          'NM',
          'VG',
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
        const rounded = pricingService.roundToIncrement(adjusted, 0.25);
        const minPrice = 50 * (1 + 0.3);
        const final = Math.max(minPrice, rounded);
        pricingService.applyFloorAndCeiling(final, 10, 999.99);
      }

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`Full sell price chain: 1,000 ops in ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(2)}ms per op)`);
      expect(elapsed).toBeLessThan(500);
    });

    it('should complete 1,000 buy+sell pricing pairs in < 1000ms', () => {
      const marketPrice = 100;

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        // Buy price
        const buyBase = marketPrice * 0.55;
        const buyAdjusted = pricingService.applyConditionCurve(
          buyBase,
          'NM',
          'NM',
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
        const buyRounded = pricingService.roundToIncrement(buyAdjusted, 0.25);
        const buyFinal = pricingService.applyFloorAndCeiling(buyRounded, 5, 500);

        // Sell price
        const sellBase = marketPrice * 1.25;
        const sellAdjusted = pricingService.applyConditionCurve(
          sellBase,
          'NM',
          'NM',
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
        const sellRounded = pricingService.roundToIncrement(sellAdjusted, 0.25);
        const minSellPrice = buyFinal * 1.3;
        const sellFinal = Math.max(minSellPrice, sellRounded);
        pricingService.applyFloorAndCeiling(sellFinal, 10, 999.99);

        // Calculate margin
        pricingService.calculateProfitMargin(sellFinal, buyFinal);
      }

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`Buy+Sell pair: 1,000 ops in ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(2)}ms per pair)`);
      expect(elapsed).toBeLessThan(1000);
    });
  });

  // ============================================================================
  // BATCH OPERATION PERFORMANCE TESTS
  // ============================================================================

  describe('Batch Operation Performance', () => {
    it('should price 100 items in < 100ms', () => {
      const items = [];
      for (let i = 0; i < 100; i++) {
        items.push({
          id: i,
          marketPrice: 50 + Math.random() * 200,
          mediaCondition: ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'][
            Math.floor(Math.random() * 8)
          ],
          sleeveCondition: ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'][
            Math.floor(Math.random() * 8)
          ],
        });
      }

      const startTime = performance.now();

      items.forEach((item) => {
        const buyBase = item.marketPrice * 0.55;
        const buyAdjusted = pricingService.applyConditionCurve(
          buyBase,
          item.mediaCondition,
          item.sleeveCondition,
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
        const buyRounded = pricingService.roundToIncrement(buyAdjusted, 0.25);
        pricingService.applyFloorAndCeiling(buyRounded, 5, 500);
      });

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`Batch 100 items: ${elapsed.toFixed(2)}ms (${(elapsed / 100).toFixed(2)}ms per item)`);
      expect(elapsed).toBeLessThan(100);
    });

    it('should price 500 items in < 500ms', () => {
      const items = [];
      for (let i = 0; i < 500; i++) {
        items.push({
          id: i,
          marketPrice: 50 + Math.random() * 200,
          mediaCondition: ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'][
            Math.floor(Math.random() * 8)
          ],
          sleeveCondition: ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'][
            Math.floor(Math.random() * 8)
          ],
        });
      }

      const startTime = performance.now();

      items.forEach((item) => {
        const buyBase = item.marketPrice * 0.55;
        const buyAdjusted = pricingService.applyConditionCurve(
          buyBase,
          item.mediaCondition,
          item.sleeveCondition,
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
        const buyRounded = pricingService.roundToIncrement(buyAdjusted, 0.25);
        pricingService.applyFloorAndCeiling(buyRounded, 5, 500);
      });

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`Batch 500 items: ${elapsed.toFixed(2)}ms (${(elapsed / 500).toFixed(2)}ms per item)`);
      expect(elapsed).toBeLessThan(500);
    });

    it('should price 1000 items in < 1000ms', () => {
      const items = [];
      for (let i = 0; i < 1000; i++) {
        items.push({
          id: i,
          marketPrice: 50 + Math.random() * 200,
          mediaCondition: ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'][
            Math.floor(Math.random() * 8)
          ],
          sleeveCondition: ['MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR'][
            Math.floor(Math.random() * 8)
          ],
        });
      }

      const startTime = performance.now();

      items.forEach((item) => {
        const buyBase = item.marketPrice * 0.55;
        const buyAdjusted = pricingService.applyConditionCurve(
          buyBase,
          item.mediaCondition,
          item.sleeveCondition,
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );
        const buyRounded = pricingService.roundToIncrement(buyAdjusted, 0.25);
        pricingService.applyFloorAndCeiling(buyRounded, 5, 500);
      });

      const endTime = performance.now();
      const elapsed = endTime - startTime;

      console.log(`Batch 1000 items: ${elapsed.toFixed(2)}ms (${(elapsed / 1000).toFixed(2)}ms per item)`);
      expect(elapsed).toBeLessThan(1000);
    });
  });

  // ============================================================================
  // MEMORY EFFICIENCY TESTS
  // ============================================================================

  describe('Memory Efficiency', () => {
    it('should handle 10,000 concurrent price calculations without memory leak', () => {
      const startMem = process.memoryUsage().heapUsed / 1024 / 1024;

      for (let i = 0; i < 10000; i++) {
        const result = {
          id: i,
          buy: pricingService.applyFloorAndCeiling(
            pricingService.roundToIncrement(
              pricingService.applyConditionCurve(
                100 * 0.55,
                'NM',
                'NM',
                pricingService.defaultConditionCurve,
                pricingService.defaultWeights
              ),
              0.25
            ),
            5,
            500
          ),
        };
        // Simulate clearing results
        void result;
      }

      const endMem = process.memoryUsage().heapUsed / 1024 / 1024;
      const memIncrease = endMem - startMem;

      console.log(`Memory usage increase: ${memIncrease.toFixed(2)}MB`);
      // Should not significantly exceed reasonable bounds (< 50MB for 10k operations)
      expect(memIncrease).toBeLessThan(50);
    });
  });

  // ============================================================================
  // CALCULATION ACCURACY UNDER LOAD TESTS
  // ============================================================================

  describe('Calculation Accuracy Under Load', () => {
    it('should maintain calculation accuracy with 1,000 rapid operations', () => {
      const marketPrice = 100;
      const expectedBuyBase = marketPrice * 0.55; // $55

      let allCorrect = true;

      for (let i = 0; i < 1000; i++) {
        const adjusted = pricingService.applyConditionCurve(
          expectedBuyBase,
          'NM',
          'NM',
          pricingService.defaultConditionCurve,
          pricingService.defaultWeights
        );

        // NM/NM should be exactly $55 (100% of base)
        if (Math.abs(adjusted - 55) > 0.01) {
          allCorrect = false;
          break;
        }
      }

      expect(allCorrect).toBe(true);
    });

    it('should maintain rounding consistency with 1,000 operations', () => {
      const testValue = 62.126; // Should round to 62.25

      let allCorrect = true;

      for (let i = 0; i < 1000; i++) {
        const rounded = pricingService.roundToIncrement(testValue, 0.25);

        if (rounded !== 62.25) {
          allCorrect = false;
          break;
        }
      }

      expect(allCorrect).toBe(true);
    });

    it('should maintain floor/ceiling consistency with 1,000 operations', () => {
      let allCorrect = true;

      for (let i = 0; i < 1000; i++) {
        // Test floor
        if (pricingService.applyFloorAndCeiling(3, 5, 500) !== 5) {
          allCorrect = false;
          break;
        }

        // Test ceiling
        if (pricingService.applyFloorAndCeiling(600, 5, 500) !== 500) {
          allCorrect = false;
          break;
        }

        // Test normal
        if (pricingService.applyFloorAndCeiling(100, 5, 500) !== 100) {
          allCorrect = false;
          break;
        }
      }

      expect(allCorrect).toBe(true);
    });
  });
});
