import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Enforce authentication for all product routes
router.use(authenticate);

/**
 * Helper to compute effective threshold and low stock status for a product.
 * Consistent across all endpoints.
 */
export function formatProductWithStatus(product, defaultThreshold) {
  const effectiveThreshold =
    product.lowStockThreshold !== null && product.lowStockThreshold !== undefined
      ? product.lowStockThreshold
      : defaultThreshold;

  const isLowStock = product.quantityOnHand <= effectiveThreshold;

  return {
    ...product,
    effectiveThreshold,
    isLowStock,
  };
}

/**
 * Helper to validate product fields
 */
function validateProductInput(data, isUpdate = false) {
  const errors = [];

  // Name validation
  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Product name is required.');
    }
  }

  // SKU validation
  if (!isUpdate || data.sku !== undefined) {
    if (!data.sku || typeof data.sku !== 'string' || data.sku.trim().length === 0) {
      errors.push('SKU is required.');
    }
  }

  // Quantity on Hand validation
  if (data.quantityOnHand !== undefined && data.quantityOnHand !== null && data.quantityOnHand !== '') {
    const qty = Number(data.quantityOnHand);
    if (!Number.isInteger(qty) || qty < 0) {
      errors.push('Quantity on hand must be a non-negative integer (0 or greater).');
    }
  }

  // Cost Price validation
  if (data.costPrice !== undefined && data.costPrice !== null && data.costPrice !== '') {
    const cost = Number(data.costPrice);
    if (isNaN(cost) || cost < 0) {
      errors.push('Cost price must be a non-negative number.');
    }
  }

  // Selling Price validation
  if (data.sellingPrice !== undefined && data.sellingPrice !== null && data.sellingPrice !== '') {
    const selling = Number(data.sellingPrice);
    if (isNaN(selling) || selling < 0) {
      errors.push('Selling price must be a non-negative number.');
    }
  }

  // Low Stock Threshold validation
  if (data.lowStockThreshold !== undefined && data.lowStockThreshold !== null && data.lowStockThreshold !== '') {
    const threshold = Number(data.lowStockThreshold);
    if (!Number.isInteger(threshold) || threshold < 0) {
      errors.push('Low stock threshold must be a non-negative integer (0 or greater) if specified.');
    }
  }

  return errors;
}

/**
 * Helper to sanitize and format numeric fields safely
 */
function sanitizeProductPayload(data) {
  const payload = {};

  if (data.name !== undefined) {
    payload.name = data.name.trim();
  }

  if (data.sku !== undefined) {
    payload.sku = data.sku.trim().toUpperCase();
  }

  if (data.description !== undefined) {
    payload.description = data.description ? data.description.trim() : null;
  }

  if (data.quantityOnHand !== undefined) {
    payload.quantityOnHand = data.quantityOnHand === '' || data.quantityOnHand === null ? 0 : Math.floor(Number(data.quantityOnHand));
  }

  if (data.costPrice !== undefined) {
    payload.costPrice =
      data.costPrice === '' || data.costPrice === null
        ? null
        : Math.round(Number(data.costPrice) * 100) / 100;
  }

  if (data.sellingPrice !== undefined) {
    payload.sellingPrice =
      data.sellingPrice === '' || data.sellingPrice === null
        ? null
        : Math.round(Number(data.sellingPrice) * 100) / 100;
  }

  if (data.lowStockThreshold !== undefined) {
    payload.lowStockThreshold =
      data.lowStockThreshold === '' || data.lowStockThreshold === null
        ? null
        : Math.floor(Number(data.lowStockThreshold));
  }

  return payload;
}

/**
 * GET /api/products
 * List products for the authenticated organization with optional search by name or SKU.
 */
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const organizationId = req.organization.id;
    const defaultThreshold = req.organization.defaultLowStockThreshold;

    const whereClause = {
      organizationId,
    };

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim();
      whereClause.OR = [
        { name: { contains: term } },
        { sku: { contains: term } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const formattedProducts = products.map((p) =>
      formatProductWithStatus(p, defaultThreshold)
    );

    return res.status(200).json(formattedProducts);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/products
 * Create a new product scoped to the authenticated organization.
 */
router.post('/', async (req, res, next) => {
  try {
    const organizationId = req.organization.id;
    const defaultThreshold = req.organization.defaultLowStockThreshold;

    const validationErrors = validateProductInput(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    const sanitized = sanitizeProductPayload(req.body);

    // Check SKU uniqueness within the organization
    const existing = await prisma.product.findUnique({
      where: {
        organizationId_sku: {
          organizationId,
          sku: sanitized.sku,
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        error: `A product with SKU "${sanitized.sku}" already exists in your organization.`,
      });
    }

    const newProduct = await prisma.product.create({
      data: {
        ...sanitized,
        organizationId,
      },
    });

    return res.status(201).json(formatProductWithStatus(newProduct, defaultThreshold));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:id
 * Retrieve a single product by ID scoped to authenticated organization.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization.id;
    const defaultThreshold = req.organization.defaultLowStockThreshold;

    const product = await prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    return res.status(200).json(formatProductWithStatus(product, defaultThreshold));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/products/:id
 * Update an existing product scoped to authenticated organization.
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization.id;
    const defaultThreshold = req.organization.defaultLowStockThreshold;

    // Check if product exists in this organization
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const validationErrors = validateProductInput(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    const sanitized = sanitizeProductPayload(req.body);

    // If SKU is being changed, verify uniqueness within this organization
    if (sanitized.sku && sanitized.sku !== existingProduct.sku) {
      const skuConflict = await prisma.product.findUnique({
        where: {
          organizationId_sku: {
            organizationId,
            sku: sanitized.sku,
          },
        },
      });

      if (skuConflict) {
        return res.status(409).json({
          error: `A product with SKU "${sanitized.sku}" already exists in your organization.`,
        });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: sanitized,
    });

    return res.status(200).json(formatProductWithStatus(updatedProduct, defaultThreshold));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product scoped to authenticated organization.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.organization.id;

    // Check if product exists in this organization
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    await prisma.product.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
