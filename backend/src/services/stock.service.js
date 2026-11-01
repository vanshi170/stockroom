const prisma = require('../config/db');
const AppError = require('../utils/appError');
const { recordActivity } = require('./activityLogger.service');

/**
 * Adjust stock for a product (Incoming / Outgoing manual adjustment)
 */
const adjustStock = async (productId, { type, quantity, note }) => {
  const parsedProductId = parseInt(productId, 10);
  if (isNaN(parsedProductId)) {
    throw new AppError('Invalid product ID supplied', 400);
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new AppError('Quantity must be a positive integer greater than zero', 400);
  }

  const movementType = (type || '').trim().toUpperCase();
  if (!['IN', 'OUT'].includes(movementType)) {
    throw new AppError("Movement type must be either 'IN' (Stock In) or 'OUT' (Stock Out)", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: parsedProductId },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const previousStock = product.quantity;
    let newStock;
    let standardMovementType;

    if (movementType === 'IN') {
      newStock = previousStock + parsedQty;
      standardMovementType = 'Stock In';
    } else {
      if (previousStock < parsedQty) {
        throw new AppError(
          `Insufficient stock. Current stock is ${previousStock}, cannot remove ${parsedQty} units.`,
          400
        );
      }
      newStock = previousStock - parsedQty;
      standardMovementType = 'Stock Out';
    }

    const updatedProduct = await tx.product.update({
      where: { id: parsedProductId },
      data: { quantity: newStock },
      include: { category: true, supplier: true },
    });

    const stockMovement = await tx.stockMovement.create({
      data: {
        productId: parsedProductId,
        type: standardMovementType,
        quantity: parsedQty,
        previousStock,
        newStock,
        note: note ? note.trim() : null,
      },
    });

    return { product: updatedProduct, stockMovement };
  });

  // Log to MongoDB ActivityLog
  await recordActivity({
    action: result.stockMovement.type === 'Stock In' ? 'Stock Added' : 'Stock Removed',
    entityType: 'StockMovement',
    entityId: result.stockMovement.id,
    description: `${result.stockMovement.type} of ${parsedQty} units for "${result.product.name}" (SKU: ${result.product.sku}). Balance: ${result.stockMovement.newStock}`,
    metadata: {
      productId: result.product.id,
      productName: result.product.name,
      sku: result.product.sku,
      movementType: result.stockMovement.type,
      quantity: parsedQty,
      previousStock: result.stockMovement.previousStock,
      newStock: result.stockMovement.newStock,
      note: note || '',
    },
  });

  return {
    message: `Successfully recorded ${result.stockMovement.type}`,
    movement: result.stockMovement,
    product: {
      ...result.product,
      price: Number(result.product.price),
    },
  };
};

/**
 * List stock movements across all products or a specific product, with filtering and pagination
 */
const listStockMovements = async ({
  page = 1,
  limit = 15,
  type,
  search = '',
  productId,
} = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const skip = (safePage - 1) * safeLimit;

  const where = {};

  if (type && type.trim() !== '') {
    const typeTerm = type.trim();
    if (typeTerm.toLowerCase() === 'in' || typeTerm.toLowerCase() === 'stock in') {
      where.type = 'Stock In';
    } else if (typeTerm.toLowerCase() === 'out' || typeTerm.toLowerCase() === 'stock out') {
      where.type = 'Stock Out';
    } else if (typeTerm.toLowerCase() === 'po' || typeTerm.toLowerCase().includes('received')) {
      where.type = 'Purchase Order Received';
    } else {
      where.type = typeTerm;
    }
  }

  if (productId) {
    const parsedId = parseInt(productId, 10);
    if (!isNaN(parsedId)) {
      where.productId = parsedId;
    }
  }

  if (search && search.trim() !== '') {
    const term = search.trim();
    where.product = {
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
      ],
    };
  }

  const [totalItems, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / safeLimit);

  return {
    data: movements,
    currentPage: safePage,
    totalPages,
    totalItems,
    limit: safeLimit,
  };
};

module.exports = {
  adjustStock,
  listStockMovements,
};

