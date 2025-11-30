import shippingService from "../services/shippingService.js";
import logger from "../../config/logger.js";
import { ApiError } from "../middleware/errorHandler.js";

/**
 * Webhook Controller
 * Handles carrier webhook events for shipping updates
 */

/**
 * Receive carrier webhook events
 * POST /api/v1/webhooks/shipping/carrier-events
 */
export async function receiveCarrierWebhook(req, res, next) {
  try {
    const { headers, body } = req;

    // Get signature from header (varies by carrier)
    const signature =
      headers["x-carrier-signature"] ||
      headers["stripe-signature"] ||
      headers["shippo-signature"];

    if (!signature) {
      logger.warn("Webhook received without signature");
      // Still process for development, but log warning
    }

    // Validate signature if present
    if (signature) {
      const isValid = await shippingService.validateWebhookSignature(
        signature,
        body,
      );

      if (!isValid) {
        logger.error("Invalid webhook signature", { signature });
        throw new ApiError("Invalid webhook signature", 401);
      }
    }

    // Process the webhook
    const result = await shippingService.processCarrierWebhook(body);

    logger.info("Carrier webhook processed", {
      eventType: body.type || body.status,
      trackingNumber: body.tracking_number || body.id,
    });

    // Return 200 OK immediately to acknowledge receipt
    res.status(200).json({
      success: true,
      message: "Webhook acknowledged",
      acknowledgementId: req.id,
    });
  } catch (error) {
    // Log error but still return 200 to prevent carrier retries
    logger.error("Error processing carrier webhook", {
      error: error.message,
      body: req.body,
    });

    // Return 200 to prevent infinite retries from carrier
    res.status(200).json({
      success: false,
      message: "Webhook acknowledged but with errors",
      error: error.message,
      acknowledgementId: req.id,
    });
  }
}

/**
 * Health check for webhook endpoint
 * GET /api/v1/webhooks/shipping/health
 */
export async function webhookHealth(req, res) {
  res.json({
    success: true,
    status: "webhook_endpoint_ready",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Simulate carrier webhook for testing
 * POST /api/v1/webhooks/shipping/simulate
 */
export async function simulateCarrierWebhook(req, res, next) {
  try {
    const { trackingNumber, status, details } = req.body;

    if (!trackingNumber || !status) {
      throw new ApiError("trackingNumber and status are required", 400);
    }

    // Create mock webhook payload
    const mockPayload = {
      type: "tracking_update",
      tracking_number: trackingNumber,
      status,
      status_detail: details?.statusDetail || status,
      location: details?.location || "Distribution Center",
      message: details?.message || `Status updated to ${status}`,
      event_id: `mock_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    // Process as if it came from carrier
    const result = await shippingService.processCarrierWebhook(mockPayload);

    logger.info("Simulated carrier webhook", {
      trackingNumber,
      status,
    });

    res.json({
      success: true,
      message: "Mock webhook simulated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
