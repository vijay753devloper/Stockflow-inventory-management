import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Enforce authentication for dashboard routes
router.use(authenticate);

/**
 * GET /api/dashboard
 * Computes live summary metrics and low-stock items for authenticated organization.
 */
router.get('/', async (req, res, next) => {
  try {
    const organizationId = req.organization.id;
    const defaultThreshold = req.organization.defaultLowStockThreshold;

    // Fetch all products for this organization
    const products = await prisma.product.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    const totalProducts = products.length;

    let totalStockUnits = 0;
    const lowStockItems = [];

    for (const product of products) {
      totalStockUnits += product.quantityOnHand;

      const effectiveThreshold =
        product.lowStockThreshold !== null && product.lowStockThreshold !== undefined
          ? product.lowStockThreshold
          : defaultThreshold;

      // Condition: quantityOnHand <= effectiveThreshold
      if (product.quantityOnHand <= effectiveThreshold) {
        lowStockItems.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          quantityOnHand: product.quantityOnHand,
          effectiveThreshold,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
        });
      }
    }

    return res.status(200).json({
      totalProducts,
      totalStockUnits,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
