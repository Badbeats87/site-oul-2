# Shipping Integration Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Weight Calculations](#weight-calculations)
4. [Rate Calculations](#rate-calculations)
5. [API Endpoints](#api-endpoints)
6. [Service Methods](#service-methods)
7. [Provider Integration](#provider-integration)
8. [Workflow Examples](#workflow-examples)
9. [Configuration](#configuration)
10. [Testing](#testing)

## Architecture Overview

The shipping integration is built on a layered architecture:

```
┌─────────────────────────────────────────┐
│  Controllers (API Layer)                │
│  - shippingController                   │
│  - fulfillmentController                │
│  - trackingController                   │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│  Services (Business Logic)              │
│  - ShippingService                      │
│  - FulfillmentService                   │
│  - NotificationService                  │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│  Providers (External Integration)       │
│  - ShippingProviderInterface            │
│  - MockShippingProvider                 │
│  - [Future: ShippoProvider, EasyPost]   │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│  Database (Prisma ORM)                  │
│  - Shipment                             │
│  - ShipmentTracking                     │
│  - ShippingZone                         │
│  - ShippingRate                         │
└─────────────────────────────────────────┘
```

### Key Components

**ShippingService**
- Zone matching and rate calculation
- Shipment CRUD operations
- Label generation (mock)
- Tracking history retrieval

**FulfillmentService**
- Order preparation workflow
- Label approval/rejection
- Batch operations
- Status management

**Controllers**
- Request validation
- Response formatting
- Role-based access control

**Providers**
- Abstract interface for carrier integration
- Mock implementation for testing
- Support for Shippo, EasyPost, etc.

## Database Schema

### Shipment
```prisma
model Shipment {
  id                   String                @id @default(cuid())
  orderId              String                @unique
  order                Order                 @relation(fields: [orderId], references: [id])

  status               ShipmentStatus        // PENDING_LABEL, SHIPPED, DELIVERED, LOST, RETURNED
  carrier              ShippingCarrier       // MOCK, USPS, UPS, FEDEX, DHL
  trackingNumber       String?               @unique

  // Label information
  labelUrl             String?
  labelStatus          String                // GENERATED, APPROVED, REJECTED, VOIDED

  // Shipping details
  shippingMethod       ShippingMethod        // STANDARD, EXPRESS, OVERNIGHT
  shippingCost         Decimal               // Cost in USD
  shippingZoneId       String
  shippingZone         ShippingZone          @relation(fields: [shippingZoneId], references: [id])

  // Dates
  createdAt            DateTime              @default(now())
  shippedAt            DateTime?
  estimatedDelivery    DateTime?
  deliveredAt          DateTime?

  // Relations
  trackingEvents       ShipmentTracking[]

  @@index([orderId])
  @@index([trackingNumber])
  @@index([status])
}
```

### ShipmentTracking
```prisma
model ShipmentTracking {
  id                   String                @id @default(cuid())
  shipmentId           String
  shipment             Shipment              @relation(fields: [shipmentId], references: [id], onDelete: Cascade)

  status               String                // IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, LOST
  location             String?
  message              String
  timestamp            DateTime

  createdAt            DateTime              @default(now())

  @@index([shipmentId])
  @@index([timestamp])
}
```

### ShippingZone
```prisma
model ShippingZone {
  id                   String                @id @default(cuid())
  name                 String
  statesIncluded       String[]              // ["CA", "NV", "OR"]
  priority             Int                   // Lower number = higher priority
  isActive             Boolean               @default(true)

  rates                ShippingRate[]
  shipments            Shipment[]

  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  @@unique([name])
  @@index([priority])
}
```

### ShippingRate
```prisma
model ShippingRate {
  id                   String                @id @default(cuid())
  zoneId               String
  zone                 ShippingZone          @relation(fields: [zoneId], references: [id], onDelete: Cascade)

  shippingMethod       ShippingMethod        // STANDARD, EXPRESS, OVERNIGHT
  carrier              ShippingCarrier       // MOCK, USPS, UPS, etc.

  baseRate             Decimal               // Base cost in USD
  perOzRate            Decimal               // Per ounce charge

  minWeightOz          Int                   // Minimum weight for this tier
  maxWeightOz          Int                   // Maximum weight for this tier
  minDays              Int                   // Minimum delivery days
  maxDays              Int                   // Maximum delivery days

  isActive             Boolean               @default(true)
  effectiveDate        DateTime
  expirationDate       DateTime?

  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  @@unique([zoneId, shippingMethod, minWeightOz])
  @@index([zoneId])
  @@index([shippingMethod])
}
```

## Weight Calculations

### Standard Weight Formula

```
Total Weight = (Item Count × 8oz) + 4oz packaging
```

Example:
- 0 items: 0 × 8 + 4 = **4oz** (packaging only)
- 1 item: 1 × 8 + 4 = **12oz**
- 3 items: 3 × 8 + 4 = **28oz**
- 5 items: 5 × 8 + 4 = **44oz**

### Implementation

```javascript
calculatePackageWeight(items = []) {
  if (!Array.isArray(items)) return 12; // Default: 1 vinyl + packaging

  const itemWeight = items.length * 8; // 8oz per vinyl
  const packagingWeight = 4; // 4oz packaging
  return itemWeight + packagingWeight;
}
```

### Custom Weight Override

The API supports overriding calculated weight:

```json
{
  "destinationAddress": { "state": "CA" },
  "items": [{ "title": "Album" }],
  "weight": 50  // Override with 50oz instead of calculated weight
}
```

## Rate Calculations

### Cost Formula

```
Cost = Base Rate + (Excess Weight × Per-Oz Rate)
  where Excess Weight = max(0, Actual Weight - Min Weight)
```

### Example Calculation

Given rate tier:
- Base Rate: $5.99
- Per-Oz Rate: $0.50
- Min Weight: 8oz
- Max Weight: 64oz

For 12oz package:
```
Excess Weight = 12 - 8 = 4oz
Cost = $5.99 + (4 × $0.50) = $5.99 + $2.00 = $7.99
```

### Implementation

```javascript
calculateRateCost(rate, weightOz) {
  const baseRate = parseFloat(rate.baseRate);
  const perOzRate = parseFloat(rate.perOzRate);
  const excessWeight = Math.max(0, weightOz - rate.minWeightOz);
  const totalCost = baseRate + excessWeight * perOzRate;
  return Math.round(totalCost * 100) / 100; // Round to 2 decimals
}
```

### Pricing Tiers

The system supports multiple weight tiers for volume discounts:

```
Tier 1: 0-8oz       $5.99 base + $0.50/oz
Tier 2: 8-32oz      $5.99 base + $0.40/oz (discount)
Tier 3: 32-64oz     $4.99 base + $0.35/oz (bulk discount)
```

## API Endpoints

### Calculate Shipping Rates

**POST** `/api/v1/shipping/calculate-rates`

Calculate available shipping rates for a destination.

```bash
curl -X POST http://localhost:3000/api/v1/shipping/calculate-rates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destinationAddress": {
      "state": "CA",
      "city": "Los Angeles",
      "zip": "90210"
    },
    "items": [
      {"title": "Album 1"},
      {"title": "Album 2"}
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "method": "STANDARD",
      "carrier": "USPS",
      "cost": 7.99,
      "deliveryDays": "5-7",
      "zone": "West Coast",
      "weight": 20
    },
    {
      "method": "EXPRESS",
      "carrier": "UPS",
      "cost": 12.99,
      "deliveryDays": "2-3",
      "zone": "West Coast",
      "weight": 20
    }
  ]
}
```

### Zone Management (Admin)

**GET** `/api/v1/shipping/zones`

List all shipping zones.

**POST** `/api/v1/shipping/zones`

Create a new shipping zone.

```json
{
  "name": "West Coast",
  "statesIncluded": ["CA", "NV", "OR", "WA"],
  "priority": 1
}
```

### Rate Management (Admin)

**GET** `/api/v1/shipping/rates`

List all shipping rates.

**POST** `/api/v1/shipping/rates`

Create a new shipping rate.

```json
{
  "zoneId": "zone-123",
  "shippingMethod": "STANDARD",
  "carrier": "USPS",
  "baseRate": "5.99",
  "perOzRate": "0.50",
  "minWeightOz": 8,
  "maxWeightOz": 32,
  "minDays": 5,
  "maxDays": 7,
  "effectiveDate": "2025-01-01T00:00:00Z"
}
```

### Fulfillment Workflow (Admin)

**GET** `/api/v1/fulfillment/orders/ready-to-ship`

Get orders ready for shipment.

**POST** `/api/v1/fulfillment/labels/generate`

Generate shipping labels for orders.

```json
{
  "orderIds": ["order-123", "order-456"]
}
```

**POST** `/api/v1/fulfillment/labels/approve`

Approve generated labels.

```json
{
  "shipmentIds": ["shipment-123"]
}
```

### Public Tracking

**GET** `/api/v1/tracking/{trackingNumber}`

Get tracking information by tracking number.

**Response:**
```json
{
  "success": true,
  "data": {
    "shipment": {
      "trackingNumber": "MOCK123456789012",
      "status": "IN_TRANSIT",
      "carrier": "MOCK",
      "estimatedDelivery": "2025-12-05"
    },
    "trackingEvents": [
      {
        "status": "LABEL_GENERATED",
        "location": "Los Angeles, CA",
        "message": "Label generated",
        "timestamp": "2025-11-30T10:00:00Z"
      },
      {
        "status": "IN_TRANSIT",
        "location": "San Francisco Distribution Center",
        "message": "Package in transit",
        "timestamp": "2025-12-01T08:00:00Z"
      }
    ]
  }
}
```

## Service Methods

### ShippingService

```javascript
// Calculate rates
await shippingService.calculateShippingRates(
  fromAddress,      // Origin (warehouse)
  toAddress,        // Destination
  packageDetails    // { items, weight?, shippingMethod? }
);

// Zone management
await shippingService.getZoneForAddress(toAddress);
await shippingService.listShippingZones();
await shippingService.createShippingZone(data);
await shippingService.updateShippingZone(id, data);
await shippingService.deleteShippingZone(id);

// Rate management
await shippingService.getRatesForZone(zoneId, weightOz);
await shippingService.listShippingRates();
await shippingService.createShippingRate(data);
await shippingService.updateShippingRate(id, data);
await shippingService.deleteShippingRate(id);

// Shipment management
await shippingService.createShipment(orderData);
await shippingService.getShipment(shipmentId);
await shippingService.listShipments(filters);
await shippingService.updateShipment(id, data);

// Label operations
await shippingService.generateLabel(shipmentId);
await shippingService.approveLabel(shipmentId);
await shippingService.rejectLabel(shipmentId);
await shippingService.voidLabel(shipmentId);

// Tracking
await shippingService.getTrackingHistory(trackingNumber);
await shippingService.processCarrierWebhook(webhookData);
```

## Provider Integration

### ShippingProviderInterface

All providers must implement this interface:

```javascript
class ShippingProvider {
  async getRates(fromAddress, toAddress, packageDetails) {
    // Return available rates
  }

  async createShipment(shipmentData) {
    // Create shipment and return tracking number
  }

  async generateLabel(shipmentId) {
    // Generate shipping label, return URL
  }

  async getTracking(trackingNumber) {
    // Retrieve tracking information
  }

  async voidLabel(shipmentId) {
    // Void/cancel a shipment
  }
}
```

### Mock Provider

The mock provider is useful for testing and development:

```javascript
// Returns flat rates
const rates = [
  { method: 'STANDARD', cost: 5.99, days: '5-7' },
  { method: 'EXPRESS', cost: 9.99, days: '2-3' },
  { method: 'OVERNIGHT', cost: 19.99, days: 'next-day' }
];

// Generates mock tracking numbers
const trackingNumber = `MOCK${randomDigits(12)}`;

// Mock tracking events
const events = [
  { status: 'LABEL_GENERATED', timestamp: now() },
  { status: 'IN_TRANSIT', timestamp: now() + 1day },
  { status: 'DELIVERED', timestamp: now() + 3days }
];
```

### Adding a New Provider

1. Create provider class extending `ShippingProviderInterface`
2. Implement all required methods
3. Add to provider factory in ShippingService constructor
4. Set environment variable: `SHIPPING_PROVIDER=shippo`

Example:

```javascript
// src/providers/shippoProvider.js
import ShippingProviderInterface from './shippingProviderInterface.js';

export default class ShippoProvider extends ShippingProviderInterface {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.goshippo.com';
  }

  async getRates(fromAddress, toAddress, packageDetails) {
    // Call Shippo API
    const response = await fetch(`${this.baseUrl}/rates`, {
      method: 'POST',
      headers: { 'Authorization': `ShippoToken ${this.apiKey}` },
      body: JSON.stringify(/* ... */)
    });
    return response.json();
  }

  // Implement other methods...
}
```

## Workflow Examples

### Complete Shipping Workflow

```javascript
// 1. Calculate rates
const rates = await shippingService.calculateShippingRates(
  { address: 'Warehouse' },
  { state: 'CA', city: 'LA' },
  { items: [{ title: 'Album' }] }
);

// 2. Create shipment with selected rate
const shipment = await shippingService.createShipment({
  orderId: 'order-123',
  shippingMethod: 'STANDARD',
  cost: 7.99,
  zone: 'West Coast'
});

// 3. Generate label
const label = await shippingService.generateLabel(shipment.id);

// 4. Admin approves label
await shippingService.approveLabel(shipment.id);

// 5. Mark as shipped
await shippingService.updateShipment(shipment.id, {
  status: 'SHIPPED',
  trackingNumber: 'MOCK123456789012'
});

// 6. Send notification to buyer
await notificationService.notifyOrderShipped({
  buyerEmail: 'buyer@example.com',
  orderNumber: 'ORD-001',
  trackingNumber: 'MOCK123456789012',
  carrier: 'MOCK'
});

// 7. Buyer tracks shipment
const tracking = await shippingService.getTrackingHistory('MOCK123456789012');
```

### Admin Bulk Operations

```javascript
// Get orders ready to ship
const orders = await fulfillmentService.getOrdersReadyToShip();

// Generate labels for all
const labels = await fulfillmentService.generateLabelsForOrders(
  orders.map(o => o.id)
);

// Approve labels in batch
await fulfillmentService.batchApproveShipments(
  labels.map(l => l.shipmentId)
);

// Mark all as shipped
await fulfillmentService.batchMarkAsShipped(
  labels.map(l => l.shipmentId)
);
```

## Configuration

### Environment Variables

```env
# Shipping provider (mock, shippo, easypost)
SHIPPING_PROVIDER=mock

# Provider API keys
SHIPPO_API_KEY=your_shippo_key
EASYPOST_API_KEY=your_easypost_key

# Warehouse address (used as from_address)
WAREHOUSE_ADDRESS_STREET=123 Commerce St
WAREHOUSE_ADDRESS_CITY=Los Angeles
WAREHOUSE_ADDRESS_STATE=CA
WAREHOUSE_ADDRESS_ZIP=90001
WAREHOUSE_ADDRESS_COUNTRY=US
```

### Rate Configuration

Zone and rate configuration is typically managed through the admin API or database seeding:

```javascript
// seed/shipping-rates.js
export async function seedShippingRates() {
  // Create West Coast zone
  const westCoast = await prisma.shippingZone.create({
    data: {
      name: 'West Coast',
      statesIncluded: ['CA', 'NV', 'OR', 'WA'],
      priority: 1,
      isActive: true
    }
  });

  // Create rate tiers
  await prisma.shippingRate.createMany({
    data: [
      {
        zoneId: westCoast.id,
        shippingMethod: 'STANDARD',
        carrier: 'USPS',
        baseRate: '5.99',
        perOzRate: '0.50',
        minWeightOz: 8,
        maxWeightOz: 32,
        minDays: 5,
        maxDays: 7,
        effectiveDate: new Date()
      }
    ]
  });
}
```

## Testing

### Unit Tests

Located in `tests/unit/shippingService.test.js`

```bash
npm test -- shippingService.test.js
```

Tests cover:
- Weight calculations
- Rate cost calculations
- Error handling
- Edge cases

### Integration Tests

Located in `tests/integration/shipping.test.js`

```bash
npm test -- shipping.test.js
```

Tests cover:
- API endpoints
- Authentication
- Zone and rate management
- Rate calculation API
- Error responses

### Running All Tests

```bash
npm test
```

All 203 tests should pass, including 30 shipping-specific tests.

## Best Practices

### 1. Always Calculate Weight Correctly
- Use actual item count when possible
- Override with custom weight only when necessary
- Include packaging weight (4oz baseline)

### 2. Use Zones for Regional Pricing
- Group states by shipping zones
- Set priority for overlapping zones
- Keep zones minimal but sufficient

### 3. Manage Rate Tiers
- Define weight ranges clearly
- Avoid overlaps
- Use per-ounce rates for volume discounts

### 4. Handle Errors Gracefully
- Always validate input addresses
- Provide clear error messages
- Don't expose internal errors to users

### 5. Track Shipments
- Update status immediately after changes
- Log all state transitions
- Maintain complete audit trail

### 6. Test Thoroughly
- Use mock provider for development
- Test with various weights and zones
- Verify calculation accuracy

## Troubleshooting

### "No shipping zone found"
- Verify destination state is in a zone
- Check zone priority if multiple zones include state
- Ensure zone isActive=true

### "Invalid package weight"
- Verify items array is valid
- Check for zero weight packages
- Use custom weight override if needed

### "Shipment not found"
- Verify shipment ID is correct
- Check shipment exists in database
- Ensure shipment isn't soft-deleted

### Slow Rate Calculations
- Check database indexes on shippingZone.statesIncluded
- Verify zone and rate queries are optimized
- Consider caching rates for frequently used zones
