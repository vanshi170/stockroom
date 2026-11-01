const prisma = require('../config/db');

/**
 * Fetch high-level overview metrics and recent activity for the dashboard.
 * Answers 3 key questions:
 * 1. What do we have?
 * 2. What is running low?
 * 3. What recently changed?
 */
const getOverviewMetrics = async () => {
  // Aggregate queries using Prisma
  const [
    totalProducts,
    stockAggregate,
    totalSuppliers,
    allProductsForLowStock,
    recentMovements,
    recentlyAddedProducts,
  ] = await Promise.all([
    // Total number of unique products
    prisma.product.count(),

    // Total units and inventory valuation
    prisma.product.aggregate({
      _sum: {
        quantity: true,
      },
    }),

    // Total suppliers
    prisma.supplier.count(),

    // Low stock items: where quantity <= minStockLevel
    // Note: Prisma does not support comparing two fields in where clause natively in standard syntax across all adapters,
    // so we can query products where quantity <= 15 or fetch candidates, or use raw SQL / filter safely.
    prisma.product.findMany({
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { quantity: 'asc' },
    }),

    // Recent stock movements (latest 6)
    prisma.stockMovement.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    }),

    // Recently added products (latest 5)
    prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Filter products that have reached or fallen below minimum stock level
  const lowStockItems = allProductsForLowStock.filter(
    (product) => product.quantity <= product.minStockLevel
  );

  return {
    summary: {
      totalProducts,
      totalStockUnits: stockAggregate._sum.quantity || 0,
      lowStockCount: lowStockItems.length,
      totalSuppliers,
    },
    lowStockItems: lowStockItems.slice(0, 8),
    recentMovements,
    recentlyAddedProducts,
  };
};

module.exports = {
  getOverviewMetrics,
};
