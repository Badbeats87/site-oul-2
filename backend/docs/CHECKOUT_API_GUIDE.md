# Checkout & Payment Processing API Guide

## Overview

The checkout system provides a complete e-commerce flow from shopping cart to order confirmation with integrated Stripe payment processing. The system supports both guest and authenticated buyers.

**Key Features:**
- Shopping cart management (add, remove, recalculate)
- Inventory validation and price locking
- Stripe payment integration with webhooks
- Order state machine with audit trail
- Guest checkout support
- Comprehensive error handling

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Checkout System Architecture             │
├─────────────────────────────────────────────────┤
│                                                  │
│  Client Frontend                                 │
│  ├── Cart UI                                     │
│  ├── Checkout Form                               │
│  └── Order History                               │
│         │                                        │
│         ↓                                        │
│  ┌──────────────────────────────────────┐       │
│  │   Checkout Controller (API Routes)   │       │
│  │  POST   /checkout/cart                │       │
│  │  GET    /checkout/cart/summary        │       │
│  │  POST   /checkout/initiate            │       │
│  │  POST   /checkout/complete            │       │
│  │  POST   /checkout/webhook (Stripe)    │       │
│  └──────────────────────────────────────┘       │
│         │                                        │
│         ↓                                        │
│  ┌──────────────────────────────────────┐       │
│  │      Service Layer                   │       │
│  │  ├─ CheckoutService (cart ops)       │       │
│  │  ├─ OrderService (order management)  │       │
│  │  └─ PaymentService (Stripe)          │       │
│  └──────────────────────────────────────┘       │
│         │                                        │
│         ↓                                        │
│  ┌──────────────────────────────────────┐       │
│  │      Database Layer (Prisma)         │       │
│  │  ├─ Order Model                      │       │
│  │  ├─ OrderItem Model                  │       │
│  │  ├─ OrderAudit Model                 │       │
│  │  └─ InventoryLot Model               │       │
│  └──────────────────────────────────────┘       │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Data Models

### Order
Main order record tracking checkout state and payment.

```javascript
{
  id: UUID,
  orderNumber: String,        // Unique order reference
  buyerEmail: String,         // Required for guest/authenticated
  buyerName: String,          // Optional
  buyerId: UUID,              // Optional for authenticated buyers

  // Order Status
  status: OrderStatus,        // CART, PAYMENT_PENDING, PAYMENT_CONFIRMED, etc.

  // Pricing
  subtotal: Decimal,
  tax: Decimal,
  shipping: Decimal,
  total: Decimal,

  // Payment (Stripe)
  stripePaymentIntentId: String,
  stripePaymentStatus: String,
  paymentMethod: String,      // 'card', 'apple_pay', etc.

  // Shipping
  shippingAddress: JSON,
  shippingMethod: ShippingMethod, // STANDARD, EXPRESS, OVERNIGHT

  // Metadata
  sessionId: String,          // For guest checkout tracking
  ipAddress: String,
  userAgent: String,

  // Timestamps
  createdAt: DateTime,
  updatedAt: DateTime,
  checkoutStartedAt: DateTime,
  paymentConfirmedAt: DateTime,
  shippedAt: DateTime,
  deliveredAt: DateTime
}
```

### OrderItem
Items in an order with historical pricing snapshot.

```javascript
{
  id: UUID,
  orderId: UUID,
  inventoryLotId: UUID,

  // Price snapshot (locked at purchase)
  priceAtPurchase: Decimal,

  // Product snapshot
  releaseTitle: String,
  releaseArtist: String,
  conditionMedia: VinylCondition,
  conditionSleeve: VinylCondition,

  createdAt: DateTime
}
```

### OrderAudit
Audit trail of order status changes.

```javascript
{
  id: UUID,
  orderId: UUID,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  changeReason: String,
  changedBy: UUID,            // Admin user ID if admin-changed
  changedAt: DateTime
}
```

## Order State Machine

```
                    ┌─────────────┐
                    │    CART     │ ← Initial state
                    └──────┬──────┘
                           │
                           ↓
                  ┌─────────────────────┐
                  │ PAYMENT_PENDING     │ ← Payment intent created
                  └──────┬─────────┬────┘
                         │         │
                    ✓    │         │    ✗
                         ↓         ↓
            ┌─────────────────────────────────┐
            │  PAYMENT_CONFIRMED              │ PAYMENT_FAILED
            └──────┬──────────────────┬───────┘
                   │                  │
                   │                  └──→ CANCELLED
                   ↓
         ┌──────────────────┐
         │   PROCESSING     │ ← Order being packed
         └────────┬─────────┘
                  ↓
         ┌──────────────────┐
         │     SHIPPED      │ ← Handed to carrier
         └────────┬─────────┘
                  ↓
         ┌──────────────────┐
         │   DELIVERED      │ ← Final state
         └──────────────────┘

Also possible:
REFUNDED  ← From PAYMENT_CONFIRMED (admin action)
CANCELLED ← From CART or PAYMENT_PENDING
```

## API Endpoints

### Cart Management

#### Get or Create Cart
```
GET /api/v1/checkout/cart
```

**Query Parameters:**
- `buyerEmail` (required): Buyer email address
- `buyerName` (optional): Buyer name
- `sessionId` (optional): Session ID for guest tracking

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-2025-001",
    "buyerEmail": "buyer@example.com",
    "status": "CART",
    "items": [],
    "subtotal": 0,
    "tax": 0,
    "shipping": 0,
    "total": 0,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `400`: Missing `buyerEmail`
- `500`: Database error

#### Get Cart Summary
```
GET /api/v1/checkout/cart/summary?orderId=uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-2025-001",
    "items": [
      {
        "id": "item-uuid",
        "releaseTitle": "Album Name",
        "releaseArtist": "Artist Name",
        "conditionMedia": "VG_PLUS",
        "conditionSleeve": "VG",
        "priceAtPurchase": 25.99
      }
    ],
    "subtotal": 25.99,
    "tax": 2.08,
    "shipping": 5.99,
    "total": 34.06
  }
}
```

#### Add Item to Cart
```
POST /api/v1/checkout/cart/items

{
  "orderId": "uuid",
  "inventoryLotId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "items": [
      {
        "id": "item-uuid",
        "inventoryLotId": "inv-uuid",
        "releaseTitle": "Album Name",
        "priceAtPurchase": 25.99
      }
    ],
    "subtotal": 25.99,
    "total": 34.06
  }
}
```

**Error Responses:**
- `400`: Missing required fields or invalid data
- `404`: Inventory lot not found
- `409`: Item already in cart

#### Remove Item from Cart
```
DELETE /api/v1/checkout/cart/items/:inventoryLotId

{
  "orderId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "items": [],
    "subtotal": 0,
    "total": 0
  }
}
```

#### Recalculate Cart
```
POST /api/v1/checkout/cart/recalculate

{
  "orderId": "uuid",
  "shippingMethod": "STANDARD"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "subtotal": 25.99,
    "tax": 2.08,
    "shipping": 5.99,
    "total": 34.06,
    "shippingMethod": "STANDARD",
    "estimatedDeliveryDays": "5-7"
  }
}
```

#### Validate Cart
```
POST /api/v1/checkout/cart/validate

{
  "orderId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "items": 1,
    "itemsAvailable": true,
    "pricesMatched": true,
    "warnings": []
  }
}
```

### Checkout Flow

#### Initiate Checkout
```
POST /api/v1/checkout/initiate

{
  "orderId": "uuid",
  "total": 34.06
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "status": "PAYMENT_PENDING",
    "paymentIntentId": "pi_xxxxxxxxxxxx",
    "clientSecret": "pi_xxxx_secret_xxxx",
    "amount": 3406,
    "currency": "usd",
    "stripePublishableKey": "pk_live_xxxx"
  }
}
```

**What Happens:**
1. Validates cart is not empty
2. Calculates final totals
3. Reserves inventory items
4. Creates Stripe PaymentIntent
5. Updates order status to PAYMENT_PENDING
6. Returns client secret for frontend payment form

**Error Responses:**
- `400`: Empty cart or calculation error
- `409`: Unable to reserve inventory

#### Complete Checkout
```
POST /api/v1/checkout/complete

{
  "orderId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "orderNumber": "ORD-2025-001",
    "status": "PAYMENT_CONFIRMED",
    "total": 34.06,
    "paymentConfirmedAt": "2025-01-15T10:35:00Z",
    "message": "Order confirmed. Confirmation sent to buyer@example.com"
  }
}
```

**What Happens:**
1. Verifies payment intent succeeded
2. Converts reserved inventory to sold
3. Updates order status to PAYMENT_CONFIRMED
4. Sends confirmation email
5. Triggers order fulfillment workflow

**Error Responses:**
- `400`: Order not in PAYMENT_PENDING status
- `404`: Order not found
- `500`: Payment verification failed

#### Cancel Checkout
```
POST /api/v1/checkout/cancel

{
  "orderId": "uuid",
  "reason": "User cancelled"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "status": "CANCELLED",
    "message": "Checkout cancelled. Reserved items released."
  }
}
```

### Order Management

#### Get Order
```
GET /api/v1/checkout/orders/:orderId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-2025-001",
    "buyerEmail": "buyer@example.com",
    "status": "PAYMENT_CONFIRMED",
    "items": [...],
    "total": 34.06,
    "shippingAddress": {...},
    "paymentConfirmedAt": "2025-01-15T10:35:00Z",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

#### List Orders
```
GET /api/v1/checkout/orders?buyerEmail=email@example.com&status=PAYMENT_CONFIRMED&limit=50&page=1
```

**Query Parameters:**
- `buyerEmail` (required): Filter by buyer
- `status` (optional): Filter by status
- `limit` (optional, default 50, max 200)
- `page` (optional, default 1)

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

#### Get Order History
```
GET /api/v1/checkout/orders/:orderId/history
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "audit-uuid",
      "orderId": "uuid",
      "fromStatus": "CART",
      "toStatus": "PAYMENT_PENDING",
      "changeReason": "User initiated checkout",
      "changedAt": "2025-01-15T10:31:00Z"
    },
    {
      "id": "audit-uuid-2",
      "orderId": "uuid",
      "fromStatus": "PAYMENT_PENDING",
      "toStatus": "PAYMENT_CONFIRMED",
      "changeReason": "Payment webhook received",
      "changedAt": "2025-01-15T10:35:00Z"
    }
  ]
}
```

### Payment Intent

#### Get Payment Intent Details
```
GET /api/v1/checkout/payment-intent/:paymentIntentId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pi_xxxxxxxxxxxx",
    "amount": 3406,
    "currency": "usd",
    "status": "succeeded",
    "charges": {
      "data": [
        {
          "id": "ch_xxxxxxxxxxxx",
          "amount": 3406,
          "status": "succeeded"
        }
      ]
    }
  }
}
```

## Stripe Webhook

### Endpoint
```
POST /api/v1/checkout/webhook
```

**Headers:**
- `stripe-signature`: Required for webhook verification

**Handled Events:**
- `payment_intent.succeeded` - Payment successful, updates order
- `payment_intent.payment_failed` - Payment failed, updates order status
- `charge.refunded` - Refund processed, updates order

**What Happens on Success:**
1. Verifies webhook signature
2. Updates order payment status
3. Triggers order confirmation email
4. Starts fulfillment workflow

## Integration Examples

### React Component Example
```javascript
// Create/get cart
const cart = await fetch('/api/v1/checkout/cart', {
  method: 'GET',
  params: { buyerEmail: 'buyer@example.com' }
});

// Add item
await fetch('/api/v1/checkout/cart/items', {
  method: 'POST',
  body: JSON.stringify({
    orderId: cart.id,
    inventoryLotId: inventoryId
  })
});

// Recalculate
const updated = await fetch('/api/v1/checkout/cart/recalculate', {
  method: 'POST',
  body: JSON.stringify({
    orderId: cart.id,
    shippingMethod: 'STANDARD'
  })
});

// Initiate payment
const checkout = await fetch('/api/v1/checkout/initiate', {
  method: 'POST',
  body: JSON.stringify({ orderId: cart.id })
});

// Use clientSecret with Stripe Elements
const stripe = Stripe('pk_live_xxx');
const { paymentMethod, error } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement
});

// Confirm payment
const { paymentIntent } = await stripe.confirmCardPayment(checkout.clientSecret, {
  payment_method: paymentMethod.id
});

// Complete checkout
await fetch('/api/v1/checkout/complete', {
  method: 'POST',
  body: JSON.stringify({ orderId: cart.id })
});
```

### Node.js/Backend Example
```javascript
import checkoutService from './services/checkoutService.js';

// Get or create cart
const cart = await checkoutService.getOrCreateCart(
  buyerEmail,
  buyerName,
  sessionId
);

// Add items
await checkoutService.addToCart(cart.id, inventoryLotId);

// Calculate totals
const calculated = await checkoutService.recalculateCart(
  cart.id,
  shippingMethod
);

// Initiate checkout
const paymentIntent = await checkoutService.initiateCheckout(cart.id);

// After payment confirmed by webhook
await checkoutService.completeCheckout(cart.id);

// Get order
const order = await orderService.getOrder(cart.id);
```

## Error Handling

**Common Error Codes:**
- `400`: Bad Request (missing fields, invalid data)
- `404`: Not Found (order, inventory not found)
- `409`: Conflict (duplicate item, inventory unavailable)
- `500`: Server Error

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "message": "Item already in cart",
    "code": "DUPLICATE_ITEM",
    "statusCode": 409
  }
}
```

## Testing

Run checkout integration tests:
```bash
npm test -- tests/integration/checkout.test.js
```

Test coverage includes:
- Cart CRUD operations
- Checkout flow validation
- Payment processing
- Order management
- Error handling
- Edge cases

## Best Practices

1. **Always validate cart** before initiating checkout
2. **Lock prices** when adding items to cart
3. **Reserve inventory** immediately on checkout initiate
4. **Verify Stripe signatures** on webhooks
5. **Handle idempotent operations** for payment retries
6. **Log all state transitions** for audit trail
7. **Send confirmation emails** asynchronously
8. **Implement timeouts** for abandoned carts (e.g., release holds after 1 hour)

## Configuration

**Environment Variables:**
```bash
STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Features:**
- Guest checkout: Enabled
- Payment methods: Card, Apple Pay, Google Pay
- Currencies: USD
- Tax: Calculated based on shipping address
- Shipping: Integrated with shipping service

---

**Last Updated**: 2025-01-15
**API Version**: v1
**Status**: Production Ready
