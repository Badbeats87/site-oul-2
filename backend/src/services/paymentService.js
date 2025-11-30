import Stripe from "stripe";
import prisma from "../utils/db.js";
import { ApiError } from "../middleware/errorHandler.js";
import logger from "../../config/logger.js";

/**
 * Payment Service
 * Manages Stripe payment processing, webhooks, and payment state
 */
class PaymentService {
  constructor() {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      logger.warn("STRIPE_SECRET_KEY not configured");
    }
    this.stripe = new Stripe(stripeKey);
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  /**
   * Create a payment intent for an order
   * @param {string} orderId - Order ID
   * @param {number} amount - Amount in cents
   * @param {string} buyerEmail - Buyer email for receipt
   * @returns {Promise<Object>} Payment intent object
   */
  async createPaymentIntent(orderId, amount, buyerEmail) {
    try {
      if (!orderId || !amount || !buyerEmail) {
        throw new ApiError("orderId, amount, and buyerEmail are required", 400);
      }

      if (amount <= 0) {
        throw new ApiError("Amount must be greater than 0", 400);
      }

      // Check if order already has a payment intent (idempotency)
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!existingOrder) {
        throw new ApiError("Order not found", 404);
      }

      if (existingOrder.stripePaymentIntentId) {
        // Retrieve existing intent to avoid creating duplicates
        try {
          const existingIntent = await this.stripe.paymentIntents.retrieve(
            existingOrder.stripePaymentIntentId,
          );

          // If intent is still valid and matches amount, return it
          if (existingIntent.amount === amount) {
            logger.info("Returning existing payment intent", {
              orderId,
              intentId: existingIntent.id,
            });
            return existingIntent;
          }
        } catch (error) {
          logger.warn("Failed to retrieve existing payment intent", {
            orderId,
            intentId: existingOrder.stripePaymentIntentId,
            error: error.message,
          });
        }
      }

      // Create new payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount, // Amount in cents
        currency: "usd",
        payment_method_types: ["card"],
        receipt_email: buyerEmail,
        metadata: {
          orderId,
          buyerEmail,
        },
        // Automatically confirm for off-session payments if card is saved
        confirm: false,
      });

      logger.info("Payment intent created", {
        orderId,
        intentId: paymentIntent.id,
        amount,
        status: paymentIntent.status,
      });

      return paymentIntent;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error creating payment intent", {
        orderId,
        amount,
        error: error.message,
      });
      throw new ApiError("Failed to create payment intent", 500);
    }
  }

  /**
   * Confirm a payment intent
   * Used when payment is completed via webhook or client confirmation
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} Confirmed payment intent
   */
  async confirmPaymentIntent(paymentIntentId) {
    try {
      if (!paymentIntentId) {
        throw new ApiError("paymentIntentId is required", 400);
      }

      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (!paymentIntent) {
        throw new ApiError("Payment intent not found", 404);
      }

      logger.info("Payment intent confirmed", {
        paymentIntentId,
        status: paymentIntent.status,
      });

      return paymentIntent;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error confirming payment intent", {
        paymentIntentId,
        error: error.message,
      });
      throw new ApiError("Failed to confirm payment intent", 500);
    }
  }

  /**
   * Handle payment_intent.succeeded webhook event
   * @param {Object} paymentIntent - Stripe payment intent object
   * @returns {Promise<Object>} Updated order
   */
  async handlePaymentSucceeded(paymentIntent) {
    try {
      if (!paymentIntent || !paymentIntent.id) {
        throw new ApiError("Invalid payment intent object", 400);
      }

      const orderId = paymentIntent.metadata?.orderId;
      if (!orderId) {
        logger.warn("Payment intent missing orderId in metadata", {
          paymentIntentId: paymentIntent.id,
        });
        throw new ApiError("Payment intent missing order information", 400);
      }

      // Find order and verify it's waiting for payment confirmation
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        logger.warn("Order not found for payment webhook", {
          orderId,
          paymentIntentId: paymentIntent.id,
        });
        throw new ApiError("Order not found", 404);
      }

      // Verify this is the correct payment intent for this order
      if (order.stripePaymentIntentId !== paymentIntent.id) {
        logger.warn("Payment intent mismatch", {
          orderId,
          expectedIntentId: order.stripePaymentIntentId,
          receivedIntentId: paymentIntent.id,
        });
        throw new ApiError("Payment intent does not match order", 400);
      }

      // Check if order is in correct state for payment confirmation
      if (order.status !== "PAYMENT_PENDING") {
        logger.info("Order not in PAYMENT_PENDING state", {
          orderId,
          currentStatus: order.status,
          paymentIntentId: paymentIntent.id,
        });
        // Don't error - webhook might be retried, just acknowledge
        return order;
      }

      // Update order to PAYMENT_CONFIRMED
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: "PAYMENT_CONFIRMED",
            stripePaymentStatus: "succeeded",
            paymentConfirmedAt: new Date(),
          },
          include: { items: true, audits: true },
        });

        // Create audit record
        await tx.orderAudit.create({
          data: {
            orderId,
            fromStatus: "PAYMENT_PENDING",
            toStatus: "PAYMENT_CONFIRMED",
            changeReason: `Stripe payment succeeded: ${paymentIntent.id}`,
          },
        });

        return updated;
      });

      logger.info("Order payment confirmed via webhook", {
        orderId,
        paymentIntentId: paymentIntent.id,
      });

      return updatedOrder;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error handling payment succeeded webhook", {
        paymentIntentId: paymentIntent?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle payment_intent.payment_failed webhook event
   * @param {Object} paymentIntent - Stripe payment intent object
   * @returns {Promise<Object>} Updated order
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      if (!paymentIntent || !paymentIntent.id) {
        throw new ApiError("Invalid payment intent object", 400);
      }

      const orderId = paymentIntent.metadata?.orderId;
      if (!orderId) {
        logger.warn("Payment intent missing orderId in metadata", {
          paymentIntentId: paymentIntent.id,
        });
        throw new ApiError("Payment intent missing order information", 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        logger.warn("Order not found for payment failure webhook", {
          orderId,
          paymentIntentId: paymentIntent.id,
        });
        throw new ApiError("Order not found", 404);
      }

      // Verify this is the correct payment intent
      if (order.stripePaymentIntentId !== paymentIntent.id) {
        logger.warn("Payment intent mismatch on failure", {
          orderId,
          expectedIntentId: order.stripePaymentIntentId,
          receivedIntentId: paymentIntent.id,
        });
        throw new ApiError("Payment intent does not match order", 400);
      }

      // Check if order is in correct state for payment failure
      if (order.status !== "PAYMENT_PENDING") {
        logger.info("Order not in PAYMENT_PENDING state for failure", {
          orderId,
          currentStatus: order.status,
          paymentIntentId: paymentIntent.id,
        });
        // Don't error - webhook might be retried
        return order;
      }

      // Get failure reason from payment intent
      const failureReason =
        paymentIntent.last_payment_error?.message || "Payment declined";

      // Update order to PAYMENT_FAILED and release inventory reservations
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: "PAYMENT_FAILED",
            stripePaymentStatus: "failed",
          },
          include: { items: true, audits: true },
        });

        // Create audit record
        await tx.orderAudit.create({
          data: {
            orderId,
            fromStatus: "PAYMENT_PENDING",
            toStatus: "PAYMENT_FAILED",
            changeReason: `Stripe payment failed: ${failureReason}`,
          },
        });

        // Release all inventory reservations for this order
        if (updated.items && updated.items.length > 0) {
          await tx.inventoryLot.updateMany({
            where: {
              orderId,
              status: "RESERVED",
            },
            data: {
              status: "LIVE",
              orderId: null,
              reservedAt: null,
            },
          });
        }

        return updated;
      });

      logger.info("Order payment failed via webhook", {
        orderId,
        paymentIntentId: paymentIntent.id,
        failureReason,
      });

      return updatedOrder;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error handling payment failed webhook", {
        paymentIntentId: paymentIntent?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process a Stripe webhook event
   * Validates signature and routes to appropriate handler
   * @param {string} rawBody - Raw request body as string
   * @param {string} signature - Stripe signature header
   * @returns {Promise<Object>} Processed event result
   */
  async processWebhook(rawBody, signature) {
    try {
      if (!rawBody || !signature) {
        throw new ApiError("Missing webhook body or signature", 400);
      }

      if (!this.webhookSecret) {
        throw new ApiError("Webhook secret not configured", 500);
      }

      // Verify webhook signature
      let event;
      try {
        event = this.stripe.webhooks.constructEvent(
          rawBody,
          signature,
          this.webhookSecret,
        );
      } catch (error) {
        logger.warn("Invalid webhook signature", {
          error: error.message,
        });
        throw new ApiError("Invalid webhook signature", 401);
      }

      logger.info("Processing Stripe webhook", {
        eventId: event.id,
        eventType: event.type,
      });

      let result;

      switch (event.type) {
        case "payment_intent.succeeded":
          result = await this.handlePaymentSucceeded(event.data.object);
          break;

        case "payment_intent.payment_failed":
          result = await this.handlePaymentFailed(event.data.object);
          break;

        default:
          logger.debug("Unhandled webhook event type", {
            eventType: event.type,
            eventId: event.id,
          });
          result = { acknowledged: true, eventType: event.type };
      }

      return {
        acknowledged: true,
        eventId: event.id,
        eventType: event.type,
        result,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error processing webhook", {
        error: error.message,
      });
      throw new ApiError("Failed to process webhook", 500);
    }
  }

  /**
   * Get payment intent details
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} Payment intent details
   */
  async getPaymentIntentDetails(paymentIntentId) {
    try {
      if (!paymentIntentId) {
        throw new ApiError("paymentIntentId is required", 400);
      }

      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (!paymentIntent) {
        throw new ApiError("Payment intent not found", 404);
      }

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        lastPaymentError: paymentIntent.last_payment_error,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error getting payment intent details", {
        paymentIntentId,
        error: error.message,
      });
      throw new ApiError("Failed to get payment intent details", 500);
    }
  }

  /**
   * Cancel a payment intent
   * Used when order is cancelled before payment is confirmed
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled payment intent
   */
  async cancelPaymentIntent(paymentIntentId, reason = "Order cancelled") {
    try {
      if (!paymentIntentId) {
        throw new ApiError("paymentIntentId is required", 400);
      }

      const paymentIntent = await this.stripe.paymentIntents.cancel(
        paymentIntentId,
        {
          cancellation_reason: "requested_by_customer",
        },
      );

      logger.info("Payment intent cancelled", {
        paymentIntentId,
        reason,
      });

      return paymentIntent;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error cancelling payment intent", {
        paymentIntentId,
        error: error.message,
      });
      throw new ApiError("Failed to cancel payment intent", 500);
    }
  }
}

export default new PaymentService();
