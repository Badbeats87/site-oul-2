import prisma from '../utils/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../../config/logger.js';
import MockShippingProvider from '../providers/mockShippingProvider.js';

/**
 * Shipping Service
 * Manages shipping rates, label generation, and tracking
 * Follows external service integration pattern from paymentService
 */
class ShippingService {
  constructor() {
    this.provider = process.env.SHIPPING_PROVIDER || 'mock';
    logger.info('ShippingService initialized', { provider: this.provider });

    if (this.provider === 'mock') {
      this.client = new MockShippingProvider();
    }
    // Future: Add Shippo, EasyPost providers
  }

  // ============================================================================
  // RATE CALCULATION FROM DATABASE TABLES
  // ============================================================================

  /**
   * Calculate shipping rates for destination
   * @param {Object} fromAddress - Origin address (warehouse)
   * @param {Object} toAddress - Destination address
   * @param {Object} packageDetails - Package info {items, shippingMethod?, weight?}
   * @returns {Promise<Array>} Available rates
   */
  async calculateShippingRates(fromAddress, toAddress, packageDetails = {}) {
    try {
      if (!toAddress || !toAddress.state) {
        throw new ApiError('Destination address with state required', 400);
      }

      // Determine zone
      const zone = await this.getZoneForAddress(toAddress);
      if (!zone) {
        throw new ApiError(
          `No shipping zone found for state: ${toAddress.state}`,
          400
        );
      }

      // Calculate package weight
      const weight =
        packageDetails.weight ||
        this.calculatePackageWeight(packageDetails.items || []);
      if (!weight || weight <= 0) {
        throw new ApiError('Invalid package weight', 400);
      }

      // Get rates for this zone and weight
      const rates = await this.getRatesForZone(zone.id, weight);

      logger.info('Shipping rates calculated', {
        zone: zone.name,
        weight,
        rateCount: rates.length,
      });

      return rates;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error calculating shipping rates', {
        toAddress: toAddress?.state,
        error: error.message,
      });
      throw new ApiError('Failed to calculate shipping rates', 500);
    }
  }

  /**
   * Determine shipping zone from destination address
   * @param {Object} toAddress - Address with state field
   * @returns {Promise<Object>} Zone record
   */
  async getZoneForAddress(toAddress) {
    try {
      if (!toAddress?.state) {
        return null;
      }

      // Find zone matching state (priority-based - lower priority = higher priority)
      const zone = await prisma.shippingZone.findFirst({
        where: {
          isActive: true,
          statesIncluded: {
            hasSome: [toAddress.state.toUpperCase()],
          },
        },
        orderBy: {
          priority: 'asc',
        },
      });

      return zone;
    } catch (error) {
      logger.error('Error finding shipping zone', {
        state: toAddress?.state,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get available rates for zone and weight
   * @param {string} zoneId - Zone UUID
   * @param {number} weightOz - Package weight in ounces
   * @returns {Promise<Array>} Available rates with costs
   */
  async getRatesForZone(zoneId, weightOz) {
    try {
      // Find matching rate tier for this weight
      const rates = await prisma.shippingRate.findMany({
        where: {
          zoneId,
          isActive: true,
          minWeightOz: { lte: weightOz },
          maxWeightOz: { gte: weightOz },
          effectiveDate: { lte: new Date() },
          OR: [
            { expirationDate: null },
            { expirationDate: { gt: new Date() } },
          ],
        },
        include: {
          zone: true,
        },
        orderBy: {
          shippingMethod: 'asc',
        },
      });

      // Format rates with calculated cost
      const formattedRates = rates.map((rate) => {
        const cost = this.calculateRateCost(rate, weightOz);
        return {
          method: rate.shippingMethod,
          carrier: rate.carrier,
          cost,
          deliveryDays: `${rate.minDays}-${rate.maxDays}`,
          zone: rate.zone.name,
          baseRate: parseFloat(rate.baseRate),
          perOzRate: parseFloat(rate.perOzRate),
          weight: weightOz,
        };
      });

      return formattedRates;
    } catch (error) {
      logger.error('Error getting rates for zone', {
        zoneId,
        weightOz,
        error: error.message,
      });
      throw new ApiError('Failed to retrieve shipping rates', 500);
    }
  }

  /**
   * Calculate actual cost from rate tier
   * Formula: baseRate + ((weight - minWeight) * perOzRate)
   * @param {Object} rate - ShippingRate record
   * @param {number} weightOz - Actual weight
   * @returns {number} Total cost
   */
  calculateRateCost(rate, weightOz) {
    const baseRate = parseFloat(rate.baseRate);
    const perOzRate = parseFloat(rate.perOzRate);
    const excessWeight = Math.max(0, weightOz - rate.minWeightOz);
    const totalCost = baseRate + excessWeight * perOzRate;
    return Math.round(totalCost * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate total package weight from items
   * Assumes each vinyl is ~8oz, plus 4oz for packaging
   * @param {Array} items - Order items
   * @returns {number} Total weight in ounces
   */
  calculatePackageWeight(items = []) {
    if (!Array.isArray(items)) return 12; // Default: 1 vinyl + packaging

    const itemWeight = items.length * 8; // 8oz per vinyl
    const packagingWeight = 4; // 4oz packaging
    return itemWeight + packagingWeight;
  }

  // ============================================================================
  // LABEL GENERATION
  // ============================================================================

  /**
   * Generate shipping label for shipment
   * @param {string} shipmentId - Shipment UUID
   * @param {Object} options - Label options
   * @returns {Promise<Object>} Label details
   */
  async generateShippingLabel(shipmentId, options = {}) {
    try {
      if (!shipmentId) {
        throw new ApiError('shipmentId is required', 400);
      }

      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
      });

      if (!shipment) {
        throw new ApiError('Shipment not found', 404);
      }

      // Generate label using provider
      const labelData = await this.client.generateLabel(shipment);

      // Update shipment with label info
      const updated = await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          labelUrl: labelData.labelUrl,
          labelFormat: labelData.labelFormat || 'PDF',
          trackingNumber: labelData.trackingNumber || shipment.trackingNumber,
          shipmentStatus: 'LABEL_GENERATED',
        },
      });

      logger.info('Shipping label generated', {
        shipmentId,
        trackingNumber: updated.trackingNumber,
      });

      return {
        labelUrl: updated.labelUrl,
        trackingNumber: updated.trackingNumber,
        format: updated.labelFormat,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error generating shipping label', {
        shipmentId,
        error: error.message,
      });
      throw new ApiError('Failed to generate shipping label', 500);
    }
  }

  /**
   * Generate mock tracking number (for testing)
   * Format: MOCK{12-digit-number}
   * @returns {string} Mock tracking number
   */
  generateMockTrackingNumber() {
    const randomNum = Math.floor(Math.random() * 999999999999)
      .toString()
      .padStart(12, '0');
    return `MOCK${randomNum}`;
  }

  // ============================================================================
  // TRACKING MANAGEMENT
  // ============================================================================

  /**
   * Create tracking event for shipment
   * @param {string} shipmentId - Shipment UUID
   * @param {string} status - Status (e.g., 'IN_TRANSIT', 'DELIVERED')
   * @param {Object} details - Event details {location, message, carrierEventId}
   * @returns {Promise<Object>} Created tracking event
   */
  async createTrackingEvent(shipmentId, status, details = {}) {
    try {
      if (!shipmentId || !status) {
        throw new ApiError('shipmentId and status are required', 400);
      }

      // Create tracking event
      const event = await prisma.shipmentTracking.create({
        data: {
          shipmentId,
          status,
          statusDetail: details.statusDetail,
          location: details.location,
          message: details.message,
          carrierEventId: details.carrierEventId,
          eventTime: details.eventTime || new Date(),
        },
      });

      logger.info('Tracking event created', {
        shipmentId,
        status,
        location: details.location,
      });

      return event;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating tracking event', {
        shipmentId,
        status,
        error: error.message,
      });
      throw new ApiError('Failed to create tracking event', 500);
    }
  }

  /**
   * Get tracking history for tracking number
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise<Object>} Shipment and tracking events
   */
  async getTrackingHistory(trackingNumber) {
    try {
      if (!trackingNumber) {
        throw new ApiError('Tracking number is required', 400);
      }

      const shipment = await prisma.shipment.findUnique({
        where: { trackingNumber },
        include: {
          trackingEvents: {
            orderBy: { eventTime: 'desc' },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              buyerEmail: true,
              buyerName: true,
            },
          },
        },
      });

      if (!shipment) {
        throw new ApiError('Shipment not found', 404);
      }

      return {
        shipment,
        trackingEvents: shipment.trackingEvents,
        order: shipment.order,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting tracking history', {
        trackingNumber,
        error: error.message,
      });
      throw new ApiError('Failed to retrieve tracking information', 500);
    }
  }

  /**
   * Simulate tracking update (for testing/demo)
   * @param {string} shipmentId - Shipment UUID
   * @param {string} newStatus - New shipment status
   * @returns {Promise<Object>} Updated shipment
   */
  async simulateTrackingUpdate(shipmentId, newStatus) {
    try {
      if (!shipmentId || !newStatus) {
        throw new ApiError('shipmentId and newStatus are required', 400);
      }

      // Create tracking event
      const statusMessages = {
        PENDING_LABEL: 'Label pending',
        LABEL_GENERATED: 'Label generated',
        READY_TO_SHIP: 'Ready to ship',
        IN_TRANSIT: 'Package picked up',
        OUT_FOR_DELIVERY: 'Out for delivery',
        DELIVERED: 'Delivered',
        FAILED_DELIVERY: 'Delivery attempt failed',
      };

      await this.createTrackingEvent(shipmentId, newStatus, {
        statusDetail: statusMessages[newStatus] || newStatus,
        location: 'Distribution Center',
        message: `Mock update: ${statusMessages[newStatus]}`,
      });

      // Update shipment status
      const updated = await prisma.shipment.update({
        where: { id: shipmentId },
        data: { shipmentStatus: newStatus },
      });

      logger.info('Tracking simulated', {
        shipmentId,
        newStatus,
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error simulating tracking update', {
        shipmentId,
        newStatus,
        error: error.message,
      });
      throw new ApiError('Failed to simulate tracking update', 500);
    }
  }

  // ============================================================================
  // SHIPMENT CRUD OPERATIONS
  // ============================================================================

  /**
   * Create new shipment
   * @param {string} orderId - Order UUID
   * @param {string} shippingMethod - Shipping method (STANDARD, EXPRESS, OVERNIGHT)
   * @param {Object} packageDetails - Package info {weightOz, dimensions?}
   * @returns {Promise<Object>} Created shipment
   */
  async createShipment(orderId, shippingMethod, packageDetails = {}) {
    try {
      if (!orderId || !shippingMethod) {
        throw new ApiError('orderId and shippingMethod are required', 400);
      }

      // Check if order exists and get details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new ApiError('Order not found', 404);
      }

      // Calculate weight if not provided
      const weight =
        packageDetails.weightOz || this.calculatePackageWeight(order.items);

      // Get warehouse and shipping address
      const warehouseAddress = JSON.parse(
        process.env.WAREHOUSE_ADDRESS || '{"state": "CA", "zip": "90001"}'
      );
      const toAddress = order.shippingAddress;

      if (!toAddress) {
        throw new ApiError('Order shipping address not set', 400);
      }

      // Calculate shipping cost
      const rates = await this.calculateShippingRates(
        warehouseAddress,
        toAddress,
        {
          weight,
        }
      );

      const selectedRate = rates.find((r) => r.method === shippingMethod);
      if (!selectedRate) {
        throw new ApiError(
          `Shipping method ${shippingMethod} not available for destination`,
          400
        );
      }

      // Create shipment
      const shipment = await prisma.shipment.create({
        data: {
          orderId,
          carrier: 'MOCK',
          shippingMethod,
          weightOz: weight,
          baseRate: selectedRate.baseRate,
          totalCost: selectedRate.cost,
          fromAddress: warehouseAddress,
          toAddress,
          trackingNumber: this.generateMockTrackingNumber(),
        },
      });

      logger.info('Shipment created', {
        shipmentId: shipment.id,
        orderId,
        shippingMethod,
        weight,
      });

      return shipment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating shipment', {
        orderId,
        shippingMethod,
        error: error.message,
      });
      throw new ApiError('Failed to create shipment', 500);
    }
  }

  /**
   * Get shipment by ID
   * @param {string} shipmentId - Shipment UUID
   * @returns {Promise<Object>} Shipment record
   */
  async getShipment(shipmentId) {
    try {
      if (!shipmentId) {
        throw new ApiError('shipmentId is required', 400);
      }

      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          trackingEvents: {
            orderBy: { eventTime: 'desc' },
            take: 10,
          },
        },
      });

      if (!shipment) {
        throw new ApiError('Shipment not found', 404);
      }

      return shipment;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting shipment', {
        shipmentId,
        error: error.message,
      });
      throw new ApiError('Failed to retrieve shipment', 500);
    }
  }

  /**
   * Update shipment status
   * @param {string} shipmentId - Shipment UUID
   * @param {string} newStatus - New status
   * @returns {Promise<Object>} Updated shipment
   */
  async updateShipmentStatus(shipmentId, newStatus) {
    try {
      if (!shipmentId || !newStatus) {
        throw new ApiError('shipmentId and newStatus are required', 400);
      }

      // Validate status
      const validStatuses = [
        'PENDING_LABEL',
        'LABEL_GENERATED',
        'READY_TO_SHIP',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FAILED_DELIVERY',
        'RETURNED',
        'EXCEPTION',
      ];

      if (!validStatuses.includes(newStatus)) {
        throw new ApiError(`Invalid shipment status: ${newStatus}`, 400);
      }

      const updated = await prisma.shipment.update({
        where: { id: shipmentId },
        data: { shipmentStatus: newStatus },
      });

      logger.info('Shipment status updated', {
        shipmentId,
        newStatus,
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error updating shipment status', {
        shipmentId,
        newStatus,
        error: error.message,
      });
      throw new ApiError('Failed to update shipment status', 500);
    }
  }

  // ============================================================================
  // PROVIDER ABSTRACTION (for future real provider integration)
  // ============================================================================

  /**
   * Get rates from external provider
   * @param {Object} fromAddress - Origin address
   * @param {Object} toAddress - Destination address
   * @param {Object} packageDetails - Package info
   * @returns {Promise<Array>} Provider rates
   */
  async getRatesFromProvider(fromAddress, toAddress, packageDetails) {
    try {
      return await this.client.getRates(fromAddress, toAddress, packageDetails);
    } catch (error) {
      logger.error('Error getting rates from provider', {
        provider: this.provider,
        error: error.message,
      });
      throw new ApiError('Failed to get rates from provider', 500);
    }
  }

  /**
   * Create shipment with external provider
   * @param {Object} shipmentData - Shipment data
   * @returns {Promise<Object>} Provider shipment response
   */
  async createShipmentWithProvider(shipmentData) {
    try {
      return await this.client.createShipment(shipmentData);
    } catch (error) {
      logger.error('Error creating shipment with provider', {
        provider: this.provider,
        error: error.message,
      });
      throw new ApiError('Failed to create shipment with provider', 500);
    }
  }

  /**
   * Void/cancel shipping label
   * @param {string} shipmentId - Shipment UUID
   * @returns {Promise<boolean>} Success
   */
  async voidLabel(shipmentId) {
    try {
      if (!shipmentId) {
        throw new ApiError('shipmentId is required', 400);
      }

      const result = await this.client.voidLabel(shipmentId);
      logger.info('Label voided', { shipmentId });
      return result;
    } catch (error) {
      logger.error('Error voiding label', {
        shipmentId,
        error: error.message,
      });
      throw new ApiError('Failed to void label', 500);
    }
  }

  // ============================================================================
  // WEBHOOK PROCESSING
  // ============================================================================

  /**
   * Process carrier webhook event
   * @param {Object} webhookData - Webhook payload from carrier
   * @returns {Promise<Object>} Processed result
   */
  async processCarrierWebhook(webhookData) {
    try {
      if (!webhookData) {
        throw new ApiError('Webhook data is required', 400);
      }

      // Implementation for carrier webhooks
      logger.info('Processing carrier webhook', {
        eventType: webhookData.type,
        trackingNumber: webhookData.tracking_number,
      });

      // Create tracking event from webhook
      if (webhookData.tracking_number) {
        const shipment = await prisma.shipment.findUnique({
          where: { trackingNumber: webhookData.tracking_number },
        });

        if (shipment) {
          await this.createTrackingEvent(shipment.id, webhookData.status, {
            statusDetail: webhookData.status_detail,
            location: webhookData.location,
            message: webhookData.message,
            carrierEventId: webhookData.event_id,
            eventTime: webhookData.timestamp
              ? new Date(webhookData.timestamp)
              : new Date(),
          });
        }
      }

      return { acknowledged: true };
    } catch (error) {
      logger.error('Error processing carrier webhook', {
        error: error.message,
      });
      throw new ApiError('Failed to process webhook', 500);
    }
  }

  /**
   * Validate webhook signature
   * @param {string} signature - Signature header from carrier
   * @param {Object} body - Webhook body
   * @returns {boolean} Signature valid
   */
  async validateWebhookSignature(signature, body) {
    try {
      // Implementation for signature validation
      // This would vary by carrier (Shippo, EasyPost, etc.)
      logger.info('Validating webhook signature');
      return true; // Placeholder
    } catch (error) {
      logger.error('Error validating webhook signature', {
        error: error.message,
      });
      return false;
    }
  }

  // ============================================================================
  // SHIPPING ZONE MANAGEMENT
  // ============================================================================

  /**
   * List all shipping zones with pagination
   */
  async listShippingZones({ filters = {}, limit = 50, page = 1 }) {
    try {
      const skip = (page - 1) * limit;

      const where = {};
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const [zones, total] = await Promise.all([
        prisma.shippingZone.findMany({
          where,
          include: { rates: true },
          skip,
          take: limit,
          orderBy: { priority: 'asc' },
        }),
        prisma.shippingZone.count({ where }),
      ]);

      return {
        data: zones,
        pagination: {
          total,
          limit,
          page,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing shipping zones', { error: error.message });
      throw new ApiError('Failed to list shipping zones', 500);
    }
  }

  /**
   * Get shipping zone by ID
   */
  async getShippingZone(zoneId) {
    try {
      const zone = await prisma.shippingZone.findUnique({
        where: { id: zoneId },
        include: { rates: true },
      });

      return zone;
    } catch (error) {
      logger.error('Error getting shipping zone', {
        zoneId,
        error: error.message,
      });
      throw new ApiError('Failed to get shipping zone', 500);
    }
  }

  /**
   * Create shipping zone
   */
  async createShippingZone({
    name,
    statesIncluded,
    priority,
    description,
    isActive,
  }) {
    try {
      if (
        !name ||
        !Array.isArray(statesIncluded) ||
        statesIncluded.length === 0
      ) {
        throw new ApiError(
          'name and statesIncluded (non-empty array) are required',
          400
        );
      }

      const zone = await prisma.shippingZone.create({
        data: {
          name,
          statesIncluded: statesIncluded.map((s) => s.toUpperCase()),
          priority,
          description,
          isActive,
        },
      });

      logger.info('Shipping zone created', { zoneId: zone.id, name });
      return zone;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating shipping zone', { error: error.message });
      throw new ApiError('Failed to create shipping zone', 500);
    }
  }

  /**
   * Update shipping zone
   */
  async updateShippingZone(zoneId, updates) {
    try {
      // Filter out undefined values
      const data = {};
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.statesIncluded !== undefined) {
        data.statesIncluded = updates.statesIncluded.map((s) =>
          s.toUpperCase()
        );
      }
      if (updates.priority !== undefined) data.priority = updates.priority;
      if (updates.description !== undefined)
        data.description = updates.description;
      if (updates.isActive !== undefined) data.isActive = updates.isActive;

      const zone = await prisma.shippingZone.update({
        where: { id: zoneId },
        data,
        include: { rates: true },
      });

      logger.info('Shipping zone updated', { zoneId, name: zone.name });
      return zone;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ApiError('Shipping zone not found', 404);
      }
      logger.error('Error updating shipping zone', {
        zoneId,
        error: error.message,
      });
      throw new ApiError('Failed to update shipping zone', 500);
    }
  }

  /**
   * Delete shipping zone
   */
  async deleteShippingZone(zoneId) {
    try {
      // Check if zone has rates
      const rates = await prisma.shippingRate.findMany({
        where: { zoneId },
      });

      if (rates.length > 0) {
        throw new ApiError(
          'Cannot delete zone with active rates. Delete rates first.',
          400
        );
      }

      const zone = await prisma.shippingZone.delete({
        where: { id: zoneId },
      });

      logger.info('Shipping zone deleted', { zoneId });
      return zone;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ApiError('Shipping zone not found', 404);
      }
      if (error instanceof ApiError) throw error;
      logger.error('Error deleting shipping zone', {
        zoneId,
        error: error.message,
      });
      throw new ApiError('Failed to delete shipping zone', 500);
    }
  }

  // ============================================================================
  // SHIPPING RATE MANAGEMENT
  // ============================================================================

  /**
   * List all shipping rates with pagination and filtering
   */
  async listShippingRates({ filters = {}, limit = 50, page = 1 }) {
    try {
      const skip = (page - 1) * limit;

      const where = {};
      if (filters.zoneId) where.zoneId = filters.zoneId;
      if (filters.shippingMethod) where.shippingMethod = filters.shippingMethod;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;

      const [rates, total] = await Promise.all([
        prisma.shippingRate.findMany({
          where,
          include: { zone: true },
          skip,
          take: limit,
          orderBy: [{ zoneId: 'asc' }, { shippingMethod: 'asc' }],
        }),
        prisma.shippingRate.count({ where }),
      ]);

      return {
        data: rates,
        pagination: {
          total,
          limit,
          page,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing shipping rates', { error: error.message });
      throw new ApiError('Failed to list shipping rates', 500);
    }
  }

  /**
   * Get shipping rate by ID
   */
  async getShippingRate(rateId) {
    try {
      const rate = await prisma.shippingRate.findUnique({
        where: { id: rateId },
        include: { zone: true },
      });

      return rate;
    } catch (error) {
      logger.error('Error getting shipping rate', {
        rateId,
        error: error.message,
      });
      throw new ApiError('Failed to get shipping rate', 500);
    }
  }

  /**
   * Create shipping rate
   */
  async createShippingRate({
    zoneId,
    shippingMethod,
    carrier,
    baseRate,
    perOzRate,
    minWeightOz,
    maxWeightOz,
    minDays,
    maxDays,
    effectiveDate,
    expirationDate,
    isActive,
  }) {
    try {
      if (
        !zoneId ||
        !shippingMethod ||
        !carrier ||
        baseRate === undefined ||
        perOzRate === undefined ||
        minWeightOz === undefined ||
        maxWeightOz === undefined
      ) {
        throw new ApiError('All rate parameters are required', 400);
      }

      if (minWeightOz >= maxWeightOz) {
        throw new ApiError('minWeightOz must be less than maxWeightOz', 400);
      }

      const rate = await prisma.shippingRate.create({
        data: {
          zoneId,
          shippingMethod,
          carrier,
          baseRate: baseRate.toString(),
          perOzRate: perOzRate.toString(),
          minWeightOz,
          maxWeightOz,
          minDays,
          maxDays,
          effectiveDate: effectiveDate || new Date(),
          expirationDate,
          isActive,
        },
        include: { zone: true },
      });

      logger.info('Shipping rate created', {
        rateId: rate.id,
        shippingMethod,
        zone: rate.zone.name,
      });
      return rate;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error creating shipping rate', { error: error.message });
      throw new ApiError('Failed to create shipping rate', 500);
    }
  }

  /**
   * Update shipping rate
   */
  async updateShippingRate(rateId, updates) {
    try {
      const data = {};
      if (updates.baseRate !== undefined)
        data.baseRate = updates.baseRate.toString();
      if (updates.perOzRate !== undefined)
        data.perOzRate = updates.perOzRate.toString();
      if (updates.minWeightOz !== undefined)
        data.minWeightOz = updates.minWeightOz;
      if (updates.maxWeightOz !== undefined)
        data.maxWeightOz = updates.maxWeightOz;
      if (updates.minDays !== undefined) data.minDays = updates.minDays;
      if (updates.maxDays !== undefined) data.maxDays = updates.maxDays;
      if (updates.effectiveDate !== undefined)
        data.effectiveDate = updates.effectiveDate;
      if (updates.expirationDate !== undefined)
        data.expirationDate = updates.expirationDate;
      if (updates.isActive !== undefined) data.isActive = updates.isActive;

      const rate = await prisma.shippingRate.update({
        where: { id: rateId },
        data,
        include: { zone: true },
      });

      logger.info('Shipping rate updated', { rateId });
      return rate;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ApiError('Shipping rate not found', 404);
      }
      logger.error('Error updating shipping rate', {
        rateId,
        error: error.message,
      });
      throw new ApiError('Failed to update shipping rate', 500);
    }
  }

  /**
   * Delete shipping rate
   */
  async deleteShippingRate(rateId) {
    try {
      const rate = await prisma.shippingRate.delete({
        where: { id: rateId },
      });

      logger.info('Shipping rate deleted', { rateId });
      return rate;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ApiError('Shipping rate not found', 404);
      }
      logger.error('Error deleting shipping rate', {
        rateId,
        error: error.message,
      });
      throw new ApiError('Failed to delete shipping rate', 500);
    }
  }
}

export default new ShippingService();
