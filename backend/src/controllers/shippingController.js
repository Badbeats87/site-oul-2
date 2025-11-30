import shippingService from '../services/shippingService.js';
import logger from '../../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Shipping Controller
 * Handles shipping rate calculations and management
 */

/**
 * Calculate shipping rates for destination
 * POST /api/v1/shipping/calculate-rates
 */
export async function calculateShippingRates(req, res, next) {
  try {
    const { originAddress, destinationAddress, items, shippingMethod } = req.body;

    if (!destinationAddress) {
      throw new ApiError('destinationAddress is required', 400);
    }

    if (!destinationAddress.state) {
      throw new ApiError('Destination address must include state', 400);
    }

    const rates = await shippingService.calculateShippingRates(
      originAddress,
      destinationAddress,
      { items, shippingMethod },
    );

    logger.info('Shipping rates calculated via API', {
      destinationState: destinationAddress.state,
      itemCount: items?.length || 0,
    });

    res.json({
      success: true,
      data: rates,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get shipping zone for destination
 * GET /api/v1/shipping/zones/lookup
 */
export async function getZoneForAddress(req, res, next) {
  try {
    const { state } = req.query;

    if (!state) {
      throw new ApiError('state is required', 400);
    }

    const zone = await shippingService.getZoneForAddress({ state });

    if (!zone) {
      throw new ApiError('No shipping zone found for address', 404);
    }

    res.json({
      success: true,
      data: zone,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all shipping zones (admin)
 * GET /api/v1/shipping/zones
 */
export async function listShippingZones(req, res, next) {
  try {
    const { isActive, limit, page } = req.query;

    const filters = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    const result = await shippingService.listShippingZones({
      filters,
      limit: limit ? parseInt(limit) : 50,
      page: page ? parseInt(page) : 1,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get shipping zone by ID (admin)
 * GET /api/v1/shipping/zones/:zoneId
 */
export async function getShippingZone(req, res, next) {
  try {
    const { zoneId } = req.params;

    const zone = await shippingService.getShippingZone(zoneId);

    if (!zone) {
      throw new ApiError('Shipping zone not found', 404);
    }

    res.json({
      success: true,
      data: zone,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create shipping zone (admin)
 * POST /api/v1/shipping/zones
 */
export async function createShippingZone(req, res, next) {
  try {
    const { name, statesIncluded, priority, description, isActive } = req.body;

    if (!name || !statesIncluded || !Array.isArray(statesIncluded)) {
      throw new ApiError('name and statesIncluded (array) are required', 400);
    }

    const zone = await shippingService.createShippingZone({
      name,
      statesIncluded,
      priority: priority ?? 0,
      description,
      isActive: isActive !== false,
    });

    logger.info('Shipping zone created via API', { zoneId: zone.id, name });

    res.json({
      success: true,
      data: zone,
      message: 'Shipping zone created',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update shipping zone (admin)
 * PUT /api/v1/shipping/zones/:zoneId
 */
export async function updateShippingZone(req, res, next) {
  try {
    const { zoneId } = req.params;
    const { name, statesIncluded, priority, description, isActive } = req.body;

    const zone = await shippingService.updateShippingZone(zoneId, {
      name,
      statesIncluded,
      priority,
      description,
      isActive,
    });

    logger.info('Shipping zone updated via API', { zoneId, name });

    res.json({
      success: true,
      data: zone,
      message: 'Shipping zone updated',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete shipping zone (admin)
 * DELETE /api/v1/shipping/zones/:zoneId
 */
export async function deleteShippingZone(req, res, next) {
  try {
    const { zoneId } = req.params;

    const deleted = await shippingService.deleteShippingZone(zoneId);

    logger.info('Shipping zone deleted via API', { zoneId });

    res.json({
      success: true,
      data: deleted,
      message: 'Shipping zone deleted',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List shipping rates (admin)
 * GET /api/v1/shipping/rates
 */
export async function listShippingRates(req, res, next) {
  try {
    const { zoneId, shippingMethod, isActive, limit, page } = req.query;

    const filters = {};
    if (zoneId) filters.zoneId = zoneId;
    if (shippingMethod) filters.shippingMethod = shippingMethod;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const result = await shippingService.listShippingRates({
      filters,
      limit: limit ? parseInt(limit) : 50,
      page: page ? parseInt(page) : 1,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get shipping rate by ID (admin)
 * GET /api/v1/shipping/rates/:rateId
 */
export async function getShippingRate(req, res, next) {
  try {
    const { rateId } = req.params;

    const rate = await shippingService.getShippingRate(rateId);

    if (!rate) {
      throw new ApiError('Shipping rate not found', 404);
    }

    res.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create shipping rate (admin)
 * POST /api/v1/shipping/rates
 */
export async function createShippingRate(req, res, next) {
  try {
    const {
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
    } = req.body;

    if (
      !zoneId
      || !shippingMethod
      || !carrier
      || baseRate === undefined
      || perOzRate === undefined
      || minWeightOz === undefined
      || maxWeightOz === undefined
    ) {
      throw new ApiError(
        'All rate parameters are required',
        400,
      );
    }

    const rate = await shippingService.createShippingRate({
      zoneId,
      shippingMethod,
      carrier,
      baseRate,
      perOzRate,
      minWeightOz,
      maxWeightOz,
      minDays,
      maxDays,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      isActive: isActive !== false,
    });

    logger.info('Shipping rate created via API', { rateId: rate.id, shippingMethod });

    res.json({
      success: true,
      data: rate,
      message: 'Shipping rate created',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update shipping rate (admin)
 * PUT /api/v1/shipping/rates/:rateId
 */
export async function updateShippingRate(req, res, next) {
  try {
    const { rateId } = req.params;
    const {
      baseRate,
      perOzRate,
      minWeightOz,
      maxWeightOz,
      minDays,
      maxDays,
      effectiveDate,
      expirationDate,
      isActive,
    } = req.body;

    const rate = await shippingService.updateShippingRate(rateId, {
      baseRate,
      perOzRate,
      minWeightOz,
      maxWeightOz,
      minDays,
      maxDays,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      isActive,
    });

    logger.info('Shipping rate updated via API', { rateId });

    res.json({
      success: true,
      data: rate,
      message: 'Shipping rate updated',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete shipping rate (admin)
 * DELETE /api/v1/shipping/rates/:rateId
 */
export async function deleteShippingRate(req, res, next) {
  try {
    const { rateId } = req.params;

    const deleted = await shippingService.deleteShippingRate(rateId);

    logger.info('Shipping rate deleted via API', { rateId });

    res.json({
      success: true,
      data: deleted,
      message: 'Shipping rate deleted',
    });
  } catch (error) {
    next(error);
  }
}
