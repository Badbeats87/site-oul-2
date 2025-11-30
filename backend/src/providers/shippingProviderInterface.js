/**
 * Shipping Provider Interface
 * Defines the contract for shipping provider implementations
 * Allows swapping between mock, Shippo, EasyPost, etc.
 */
export default class ShippingProviderInterface {
  /**
   * Get available rates for shipment
   * @param {Object} fromAddress - Origin address
   * @param {Object} toAddress - Destination address
   * @param {Object} packageDetails - Package info
   * @returns {Promise<Array>} Available rates
   */
  async getRates(fromAddress, toAddress, packageDetails) {
    throw new Error("getRates() not implemented");
  }

  /**
   * Create shipment with provider
   * @param {Object} shipmentData - Shipment details
   * @returns {Promise<Object>} Created shipment response
   */
  async createShipment(shipmentData) {
    throw new Error("createShipment() not implemented");
  }

  /**
   * Generate shipping label
   * @param {Object} shipment - Shipment record
   * @returns {Promise<Object>} Label details {labelUrl, trackingNumber, labelFormat}
   */
  async generateLabel(shipment) {
    throw new Error("generateLabel() not implemented");
  }

  /**
   * Get tracking information
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise<Object>} Tracking details
   */
  async getTracking(trackingNumber) {
    throw new Error("getTracking() not implemented");
  }

  /**
   * Void/cancel shipping label
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<boolean>} Success
   */
  async voidLabel(shipmentId) {
    throw new Error("voidLabel() not implemented");
  }
}
