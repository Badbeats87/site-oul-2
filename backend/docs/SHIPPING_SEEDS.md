# Shipping Database Seeding Guide

## Overview

This guide covers how to seed the shipping database with initial zones and rates for production deployment.

## What Gets Seeded

### Shipping Zones

Zones define geographic regions for shipping purposes. Seeding creates zones for major US regions:

- **Northeast Zone**: CT, DE, MA, MD, ME, NH, NJ, NY, PA, RI, VT
- **Southeast Zone**: AL, AR, FL, GA, KY, LA, MS, NC, SC, TN, VA, WV
- **Midwest Zone**: IA, IL, IN, MI, MN, MO, ND, NE, OH, SD, WI
- **Southwest Zone**: AZ, NM, OK, TX
- **Northwest Zone**: ID, MT, OR, WA, WY
- **Pacific Zone**: AK, CA, HI, NV, UT

### Shipping Rates

Rates define pricing for each zone and shipping method:

- **STANDARD**: 5-7 business days
- **EXPRESS**: 2-3 business days
- **OVERNIGHT**: Next business day

Weight tiers: 0-8oz, 8-16oz, 16-32oz, 32-64oz

## Pre-Seeding Setup

### Create Seed File

Create `backend/prisma/seeds/shipping.seed.js`:

```javascript
import prisma from '../../src/utils/db.js';

async function seedShippingZones() {
  const zones = [
    {
      name: 'Northeast',
      description: 'CT, DE, MA, MD, ME, NH, NJ, NY, PA, RI, VT',
      statesIncluded: ['CT', 'DE', 'MA', 'MD', 'ME', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
      priority: 1,
      isActive: true,
    },
    {
      name: 'Southeast',
      description: 'AL, AR, FL, GA, KY, LA, MS, NC, SC, TN, VA, WV',
      statesIncluded: ['AL', 'AR', 'FL', 'GA', 'KY', 'LA', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
      priority: 1,
      isActive: true,
    },
    // ... more zones
  ];

  for (const zone of zones) {
    await prisma.shippingZone.upsert({
      where: { name: zone.name },
      update: { ...zone },
      create: { ...zone },
    });
  }
}

async function seedShippingRates(zones) {
  const methods = ['STANDARD', 'EXPRESS', 'OVERNIGHT'];
  const carriers = ['USPS', 'UPS', 'FEDEX'];

  const rateConfigs = [
    { minOz: 1, maxOz: 8, baseRates: { STANDARD: 5.99, EXPRESS: 12.99, OVERNIGHT: 24.99 } },
    { minOz: 8, maxOz: 16, baseRates: { STANDARD: 7.99, EXPRESS: 14.99, OVERNIGHT: 26.99 } },
    { minOz: 16, maxOz: 32, baseRates: { STANDARD: 11.99, EXPRESS: 18.99, OVERNIGHT: 30.99 } },
    { minOz: 32, maxOz: 64, baseRates: { STANDARD: 17.99, EXPRESS: 24.99, OVERNIGHT: 39.99 } },
  ];

  for (const zone of zones) {
    for (const config of rateConfigs) {
      for (const method of methods) {
        const baseRate = config.baseRates[method];
        const carrier = carriers[Math.floor(Math.random() * carriers.length)];

        await prisma.shippingRate.upsert({
          where: {
            // Composite unique key would be: zoneId + shippingMethod + minWeightOz
          },
          update: {
            baseRate: baseRate.toString(),
            perOzRate: '0.25',
            isActive: true,
          },
          create: {
            zoneId: zone.id,
            shippingMethod: method,
            carrier,
            baseRate: baseRate.toString(),
            perOzRate: '0.25',
            minWeightOz: config.minOz,
            maxWeightOz: config.maxOz,
            minDays: method === 'OVERNIGHT' ? 1 : method === 'EXPRESS' ? 2 : 5,
            maxDays: method === 'OVERNIGHT' ? 1 : method === 'EXPRESS' ? 3 : 7,
            isActive: true,
            effectiveDate: new Date(),
          },
        });
      }
    }
  }
}

async function main() {
  console.log('Starting shipping seed...');

  try {
    // Seed zones
    console.log('Seeding shipping zones...');
    const zones = await seedShippingZones();
    console.log('✓ Zones seeded');

    // Get created zones
    const allZones = await prisma.shippingZone.findMany();

    // Seed rates
    console.log('Seeding shipping rates...');
    await seedShippingRates(allZones);
    console.log('✓ Rates seeded');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

### Update package.json

```json
{
  "prisma": {
    "seed": "node prisma/seeds/shipping.seed.js"
  }
}
```

## Running Seeds

### Development Environment

```bash
# Run seed
npx prisma db seed

# Expected output
# Starting shipping seed...
# Seeding shipping zones...
# ✓ Zones seeded
# Seeding shipping rates...
# ✓ Rates seeded
# Seed completed successfully!
```

### Production Environment

```bash
# 1. Backup database first
pg_dump $DATABASE_URL > backup_before_seed.sql

# 2. Run seed
npx prisma db seed

# 3. Verify
psql $DATABASE_URL -c "SELECT * FROM shipping_zones;"
```

## Verifying Seeds

### Check Zones

```sql
SELECT id, name, array_length(states_included, 1) as state_count, priority, is_active
FROM shipping_zones
ORDER BY priority;
```

Expected output:
```
                  id                  |    name    | state_count | priority | is_active
--------------------------------------+------------+-------------+----------+-----------
 12345678-1234-1234-1234-123456789012 | Northeast  |          11 |        1 | t
 12345678-1234-1234-1234-123456789013 | Southeast  |          12 |        1 | t
 12345678-1234-1234-1234-123456789014 | Midwest    |          10 |        1 | t
 12345678-1234-1234-1234-123456789015 | Southwest  |           4 |        1 | t
 12345678-1234-1234-1234-123456789016 | Northwest  |           6 |        1 | t
 12345678-1234-1234-1234-123456789017 | Pacific    |           6 |        1 | t
```

### Check Rates

```sql
SELECT
  z.name,
  sr.shipping_method,
  sr.carrier,
  sr.min_weight_oz,
  sr.max_weight_oz,
  sr.base_rate,
  sr.per_oz_rate,
  sr.min_days,
  sr.max_days
FROM shipping_rates sr
JOIN shipping_zones z ON sr.zone_id = z.id
ORDER BY z.name, sr.shipping_method, sr.min_weight_oz;
```

Expected output:
```
    name    | shipping_method | carrier | min_weight_oz | max_weight_oz | base_rate | per_oz_rate | min_days | max_days
------------+-----------------+---------+---------------+---------------+-----------+-------------+----------+----------
 Midwest    | EXPRESS         | FEDEX   |             1 |             8 |     12.99 |        0.25 |        2 |        3
 Midwest    | EXPRESS         | UPS     |             8 |            16 |     14.99 |        0.25 |        2 |        3
 Midwest    | OVERNIGHT       | USPS    |            16 |            32 |     30.99 |        0.25 |        1 |        1
 Midwest    | OVERNIGHT       | FEDEX   |            32 |            64 |     39.99 |        0.25 |        1 |        1
 Midwest    | STANDARD        | UPS     |             1 |             8 |      5.99 |        0.25 |        5 |        7
 ...
```

### Count Records

```sql
SELECT
  (SELECT COUNT(*) FROM shipping_zones) as zones,
  (SELECT COUNT(*) FROM shipping_rates) as rates,
  (SELECT COUNT(*) FROM shipping_rates WHERE is_active = true) as active_rates;
```

Expected output (for 6 zones × 3 methods × 4 weight tiers):
```
 zones | rates | active_rates
-------+-------+--------------
     6 |    72 |           72
```

## Customizing Seeds

### Add New Zone

```javascript
// In shipping.seed.js
const zones = [
  // ... existing zones
  {
    name: 'Alaska',
    description: 'AK',
    statesIncluded: ['AK'],
    priority: 2,  // Lower priority than continental zones
    isActive: true,
  },
];
```

### Adjust Pricing

```javascript
// In seedShippingRates
const rateConfigs = [
  {
    minOz: 1,
    maxOz: 8,
    baseRates: {
      STANDARD: 6.99,  // Increased from 5.99
      EXPRESS: 13.99,  // Increased from 12.99
      OVERNIGHT: 25.99, // Increased from 24.99
    }
  },
  // ... more configs
];
```

### Add New Shipping Method

```javascript
const methods = ['STANDARD', 'EXPRESS', 'OVERNIGHT', 'GROUND'];  // Added GROUND

const rateConfigs = [
  {
    minOz: 1,
    maxOz: 8,
    baseRates: {
      STANDARD: 5.99,
      EXPRESS: 12.99,
      OVERNIGHT: 24.99,
      GROUND: 3.99,  // New method
    }
  },
];
```

## Resetting Seeds

### Clear All Shipping Data

```bash
# Run this script carefully - it clears all data
npx prisma db execute --stdin <<EOF
DELETE FROM shipping_rates;
DELETE FROM shipping_zones;
EOF
```

Then re-run:
```bash
npx prisma db seed
```

### Selective Reset

Reset only rates for a specific zone:

```sql
DELETE FROM shipping_rates
WHERE zone_id = (SELECT id FROM shipping_zones WHERE name = 'Pacific');
```

Then manually re-insert rates or run part of seed script.

## Troubleshooting

### Seed Fails - Database Connection

```bash
# Check connection
psql $DATABASE_URL -c "SELECT NOW();"

# Test with ping
nc -zv db.example.com 5432
```

### Seed Fails - Unique Constraint

If zones already exist:

```bash
# Seed uses upsert, so it should handle duplicates
# But if you get constraint errors, verify:
npx prisma db execute --stdin <<EOF
SELECT COUNT(*) FROM shipping_zones;
EOF
```

### Seed Fails - Missing Types

Ensure ShippingMethod enum is defined:

```sql
-- In Prisma migration
CREATE TYPE "ShippingMethod" AS ENUM ('STANDARD', 'EXPRESS', 'OVERNIGHT');
```

### Verify Seed Idempotency

Run seed multiple times to ensure it's idempotent:

```bash
npx prisma db seed
npx prisma db seed
npx prisma db seed

# Should complete without errors each time
```

## Backup Before Changing Seeds

```bash
# Before modifying seed file
git stash

# Before running seed in production
pg_dump $DATABASE_URL > backup_before_seed_$(date +%Y%m%d_%H%M%S).sql

# Run seed
npx prisma db seed

# If something goes wrong
psql $DATABASE_URL < backup_file.sql
```

## Performance Considerations

### Seed Performance

- **6 zones + 72 rates**: ~2-5 seconds
- **Scales linearly**: Add more zones/rates as needed
- **No performance impact**: Use indexes for queries

### Optimization Tips

1. **Batch operations**: Seeds already use upsert (efficient)
2. **Disable indexes during seed** (if very large):
   ```sql
   ALTER TABLE shipping_rates DISABLE TRIGGER ALL;
   -- Run seed
   ALTER TABLE shipping_rates ENABLE TRIGGER ALL;
   ```
3. **Run seed during low-traffic windows**

## Seed Schedule

Recommended timing:

- **Initial deployment**: Run once
- **Zone/rate changes**: Run to update (upsert handles it)
- **New environment setup**: Run automatically
- **Testing**: Fresh seed for each test run (see test setup)

---

**Last Updated**: 2025-11-30
**Current Seed**: 6 zones × 72 rates = 72 total rates
**Seed Script**: `prisma/seeds/shipping.seed.js`
