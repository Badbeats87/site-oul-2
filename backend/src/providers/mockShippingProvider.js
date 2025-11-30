import ShippingProviderInterface from "./shippingProviderInterface.js";
import logger from "../../config/logger.js";

/**
 * Mock Shipping Provider
 * Simulates shipping provider for development and testing
 * Easy to swap for real provider (Shippo, EasyPost) without changing interface
 */
export default class MockShippingProvider extends ShippingProviderInterface {
  constructor() {
    super();
    logger.info("MockShippingProvider initialized");
  }

  /**
   * Get mock rates for shipment
   * Returns flat rates based on shipping method
   */
  async getRates(fromAddress, toAddress, packageDetails = {}) {
    logger.info("MockShippingProvider.getRates", {
      toState: toAddress?.state,
      weight: packageDetails.weight,
    });

    // Mock rates by shipping method
    const mockRates = [
      {
        method: "STANDARD",
        carrier: "MOCK",
        cost: 5.99,
        deliveryDays: "3-5",
      },
      {
        method: "EXPRESS",
        carrier: "MOCK",
        cost: 9.99,
        deliveryDays: "2-3",
      },
      {
        method: "OVERNIGHT",
        carrier: "MOCK",
        cost: 19.99,
        deliveryDays: "1",
      },
    ];

    return mockRates;
  }

  /**
   * Create mock shipment
   */
  async createShipment(shipmentData) {
    logger.info("MockShippingProvider.createShipment", {
      orderId: shipmentData.orderId,
      weight: shipmentData.weight,
    });

    const trackingNumber = `MOCK${Math.floor(Math.random() * 999999999999)
      .toString()
      .padStart(12, "0")}`;

    return {
      id: trackingNumber,
      trackingNumber,
      labelUrl: `/mock-labels/${shipmentData.orderId}.pdf`,
      labelFormat: "PDF",
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Generate mock label
   */
  async generateLabel(shipment) {
    logger.info("MockShippingProvider.generateLabel", {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
    });

    // Generate mock label URL and PDF
    return {
      trackingNumber: shipment.trackingNumber,
      labelUrl: `/mock-labels/${shipment.orderId}/${shipment.id}.pdf`,
      labelFormat: "PDF",
      // In real implementation, would generate actual PDF with label data
    };
  }

  /**
   * Get mock tracking information
   */
  async getTracking(trackingNumber) {
    logger.info("MockShippingProvider.getTracking", {
      trackingNumber,
    });

    // Return mock tracking events
    const events = [
      {
        status: "LABEL_GENERATED",
        timestamp: new Date(),
        location: "Label Created",
        message: "Shipping label created",
      },
      {
        status: "IN_TRANSIT",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        location: "Distribution Center",
        message: "Package picked up",
      },
    ];

    return {
      trackingNumber,
      status: "IN_TRANSIT",
      events,
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Void mock label
   */
  async voidLabel(shipmentId) {
    logger.info("MockShippingProvider.voidLabel", {
      shipmentId,
    });

    // In mock provider, just return success
    return true;
  }
}
