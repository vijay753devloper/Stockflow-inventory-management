import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Enforce authentication for settings routes
router.use(authenticate);

/**
 * GET /api/settings
 * Retrieve current organization settings.
 */
router.get('/', async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.organization.id },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    return res.status(200).json({
      id: organization.id,
      organizationName: organization.name,
      defaultLowStockThreshold: organization.defaultLowStockThreshold,
      createdAt: organization.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/settings
 * Update organization default low-stock threshold.
 */
router.put('/', async (req, res, next) => {
  try {
    const { defaultLowStockThreshold, organizationName } = req.body;

    if (defaultLowStockThreshold === undefined || defaultLowStockThreshold === null) {
      return res.status(400).json({
        error: 'defaultLowStockThreshold is required.',
      });
    }

    const threshold = Number(defaultLowStockThreshold);
    if (!Number.isInteger(threshold) || threshold < 0) {
      return res.status(400).json({
        error: 'Default low stock threshold must be a non-negative integer (0 or greater).',
      });
    }

    const updateData = {
      defaultLowStockThreshold: threshold,
    };

    if (organizationName && typeof organizationName === 'string' && organizationName.trim().length > 0) {
      updateData.name = organizationName.trim();
    }

    const updated = await prisma.organization.update({
      where: { id: req.organization.id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully.',
      id: updated.id,
      organizationName: updated.name,
      defaultLowStockThreshold: updated.defaultLowStockThreshold,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
