import shippingService from '../services/shippingService.js';
import logger from '../../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Tracking Controller
 * Public endpoints for buyers to track shipments
 */

/**
 * Get tracking information by tracking number
 * GET /api/v1/tracking/:trackingNumber
 */
export async function getTrackingByNumber(req, res, next) {
  try {
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      throw new ApiError('Tracking number is required', 400);
    }

    const tracking = await shippingService.getTrackingHistory(trackingNumber);

    logger.info('Tracking information retrieved', { trackingNumber });

    res.json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get tracking events for shipment
 * GET /api/v1/tracking/shipment/:shipmentId/events
 */
export async function getShipmentTrackingEvents(req, res, next) {
  try {
    const { shipmentId } = req.params;

    if (!shipmentId) {
      throw new ApiError('Shipment ID is required', 400);
    }

    const shipment = await shippingService.getShipment(shipmentId);

    if (!shipment) {
      throw new ApiError('Shipment not found', 404);
    }

    logger.info('Tracking events retrieved', { shipmentId });

    res.json({
      success: true,
      data: {
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        status: shipment.shipmentStatus,
        carrier: shipment.carrier,
        estimatedDelivery: shipment.estimatedDelivery,
        events: shipment.trackingEvents || [],
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get tracking for multiple shipments
 * POST /api/v1/tracking/batch
 */
export async function getTrackingBatch(req, res, next) {
  try {
    const { trackingNumbers } = req.body;

    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      throw new ApiError('trackingNumbers (non-empty array) is required', 400);
    }

    if (trackingNumbers.length > 50) {
      throw new ApiError('Maximum 50 tracking numbers allowed', 400);
    }

    const results = [];
    const errors = [];

    for (const trackingNumber of trackingNumbers) {
      try {
        const tracking =
          await shippingService.getTrackingHistory(trackingNumber);
        results.push(tracking);
      } catch (error) {
        errors.push({
          trackingNumber,
          error: error.message,
        });
      }
    }

    logger.info('Batch tracking information retrieved', {
      requested: trackingNumbers.length,
      found: results.length,
      notFound: errors.length,
    });

    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          requested: trackingNumbers.length,
          found: results.length,
          notFound: errors.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
