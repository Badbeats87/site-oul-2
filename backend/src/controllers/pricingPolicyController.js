import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/db.js';
import pricingService from '../services/pricingService.js';
import logger from '../../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Get active pricing policy by type
 * @param {string} type - 'BUYER' or 'SELLER'
 * @returns {Object} Pricing policy with configuration
 */
export const getPricingPolicy = async (req, res, next) => {
  try {
    const { type } = req.params; // BUYER or SELLER

    if (!['BUYER', 'SELLER'].includes(type)) {
      throw new ApiError('Invalid policy type. Must be BUYER or SELLER', 400);
    }

    const policy = await prisma.pricingPolicy.findFirst({
      where: {
        isActive: true,
        scope: type, // Using scope field to store policy type
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (!policy) {
      return res.status(200).json({
        success: true,
        data: null,
        message: `No active ${type} pricing policy found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: policy.id,
        type: policy.scope,
        name: policy.name,
        version: policy.version,
        buyFormula: policy.buyFormula,
        sellFormula: policy.sellFormula,
        conditionCurve: policy.conditionCurve,
        minOffer: policy.minOffer?.toString(),
        maxOffer: policy.maxOffer?.toString(),
        offerExpiryDays: policy.offerExpiryDays,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update pricing policy
 * @param {string} type - 'BUYER' or 'SELLER'
 * @param {Object} body - Policy configuration
 */
export const savePricingPolicy = async (req, res, next) => {
  try {
    const { type } = req.params; // BUYER or SELLER
    const { name, buyFormula, sellFormula, conditionCurve, minOffer, maxOffer, offerExpiryDays } = req.body;

    if (!['BUYER', 'SELLER'].includes(type)) {
      throw new ApiError('Invalid policy type. Must be BUYER or SELLER', 400);
    }

    // Validation
    if (!name || !buyFormula || !sellFormula || !conditionCurve) {
      throw new ApiError('Missing required fields: name, buyFormula, sellFormula, conditionCurve', 400);
    }

    // Find existing policy
    let existingPolicy = await prisma.pricingPolicy.findFirst({
      where: {
        scope: type,
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    let newVersion = 1;
    if (existingPolicy) {
      newVersion = existingPolicy.version + 1;

      // Record the audit trail
      await prisma.pricingPolicyAudit.create({
        data: {
          id: uuidv4(),
          policyId: existingPolicy.id,
          changeType: 'UPDATE',
          previousVersion: existingPolicy.version,
          newVersion,
          changes: {
            buyFormula: { old: existingPolicy.buyFormula, new: buyFormula },
            sellFormula: { old: existingPolicy.sellFormula, new: sellFormula },
            conditionCurve: { old: existingPolicy.conditionCurve, new: conditionCurve },
            minOffer: { old: existingPolicy.minOffer, new: minOffer },
            maxOffer: { old: existingPolicy.maxOffer, new: maxOffer },
            offerExpiryDays: { old: existingPolicy.offerExpiryDays, new: offerExpiryDays },
          },
          changedBy: req.user?.id,
        },
      });

      // Deactivate old policy version
      await prisma.pricingPolicy.update({
        where: { id: existingPolicy.id },
        data: { isActive: false },
      });
    }

    // Create new policy version
    const policy = await prisma.pricingPolicy.create({
      data: {
        id: uuidv4(),
        name,
        scope: type,
        isActive: true,
        version: newVersion,
        buyFormula,
        sellFormula,
        conditionCurve,
        minOffer: minOffer ? parseFloat(minOffer) : null,
        maxOffer: maxOffer ? parseFloat(maxOffer) : null,
        offerExpiryDays: offerExpiryDays || 30,
        createdBy: req.user?.id,
      },
    });

    // Clear cache
    pricingService.clearPolicyCache?.();

    logger.info(`Pricing policy saved: ${type} v${newVersion}`, {
      policyId: policy.id,
      userId: req.user?.id,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: policy.id,
        type: policy.scope,
        name: policy.name,
        version: policy.version,
        buyFormula: policy.buyFormula,
        sellFormula: policy.sellFormula,
        conditionCurve: policy.conditionCurve,
        minOffer: policy.minOffer?.toString(),
        maxOffer: policy.maxOffer?.toString(),
        offerExpiryDays: policy.offerExpiryDays,
      },
      message: `${type} pricing policy saved (v${newVersion})`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all pricing policy versions for a type
 */
export const getPricingPolicyHistory = async (req, res, next) => {
  try {
    const { type } = req.params;

    if (!['BUYER', 'SELLER'].includes(type)) {
      throw new ApiError('Invalid policy type. Must be BUYER or SELLER', 400);
    }

    const policies = await prisma.pricingPolicy.findMany({
      where: {
        scope: type,
      },
      orderBy: {
        version: 'desc',
      },
      include: {
        policyAudits: {
          orderBy: {
            changedAt: 'desc',
          },
          take: 5,
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: policies.map((p) => ({
        id: p.id,
        type: p.scope,
        name: p.name,
        version: p.version,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        audits: p.policyAudits,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rollback to previous policy version
 */
export const rollbackPricingPolicy = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { version } = req.body;

    if (!['BUYER', 'SELLER'].includes(type)) {
      throw new ApiError('Invalid policy type. Must be BUYER or SELLER', 400);
    }

    if (!version) {
      throw new ApiError('Target version is required', 400);
    }

    // Find the policy to rollback to
    const targetPolicy = await prisma.pricingPolicy.findFirst({
      where: {
        scope: type,
        version,
      },
    });

    if (!targetPolicy) {
      throw new ApiError(`Policy version ${version} not found`, 404);
    }

    // Find current active policy
    const currentPolicy = await prisma.pricingPolicy.findFirst({
      where: {
        scope: type,
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    if (currentPolicy) {
      // Deactivate current
      await prisma.pricingPolicy.update({
        where: { id: currentPolicy.id },
        data: { isActive: false },
      });
    }

    // Create new policy with content from target
    const newPolicy = await prisma.pricingPolicy.create({
      data: {
        id: uuidv4(),
        name: targetPolicy.name,
        scope: type,
        isActive: true,
        version: (currentPolicy?.version || 0) + 1,
        buyFormula: targetPolicy.buyFormula,
        sellFormula: targetPolicy.sellFormula,
        conditionCurve: targetPolicy.conditionCurve,
        minOffer: targetPolicy.minOffer,
        maxOffer: targetPolicy.maxOffer,
        offerExpiryDays: targetPolicy.offerExpiryDays,
        createdBy: req.user?.id,
      },
    });

    // Record audit
    await prisma.pricingPolicyAudit.create({
      data: {
        id: uuidv4(),
        policyId: newPolicy.id,
        changeType: 'ROLLBACK',
        previousVersion: currentPolicy?.version,
        newVersion: newPolicy.version,
        changes: {
          rolledBackFrom: version,
          currentVersion: currentPolicy?.version,
        },
        changedBy: req.user?.id,
      },
    });

    // Clear cache
    pricingService.clearPolicyCache?.();

    return res.status(200).json({
      success: true,
      data: {
        id: newPolicy.id,
        type: newPolicy.scope,
        version: newPolicy.version,
      },
      message: `Rolled back to policy version ${version}`,
    });
  } catch (error) {
    next(error);
  }
};
