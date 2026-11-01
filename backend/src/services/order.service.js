const prisma = require('../config/db');
const AppError = require('../utils/appError');
const { recordActivity } = require('./activityLogger.service');

/**
 * List purchase orders with filtering and pagination
 */
const listOrders = async ({
  page = 1,
  limit = 10,
  status,
  supplierId,
  sortBy = 'createdAt',
  order = 'desc',
} = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (safePage - 1) * safeLimit;

  const where = {};
  if (status && status.trim() !== '') {
    where.status = status.trim().toUpperCase();
  }
  if (supplierId) {
    const parsedSuppId = parseInt(supplierId, 10);
    if (!isNaN(parsedSuppId)) {
      where.supplierId = parsedSuppId;
    }
  }

  const allowedSorts = ['createdAt', 'totalAmount', 'status', 'id'];
  const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
  const safeOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [totalItems, orders] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { [safeSortBy]: safeOrder },
      include: {
        supplier: {
          select: { id: true, name: true, contactPerson: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    }),
  ]);

  const formattedOrders = orders.map((po) => ({
    ...po,
    totalAmount: Number(po.totalAmount),
    itemCount: po.items.length,
    totalUnits: po.items.reduce((sum, item) => sum + item.quantity, 0),
    items: po.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
    })),
  }));

  const totalPages = Math.ceil(totalItems / safeLimit);

  return {
    data: formattedOrders,
    currentPage: safePage,
    totalPages,
    totalItems,
    limit: safeLimit,
  };
};

/**
 * Get purchase order by ID
 */
const getOrderById = async (id) => {
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    throw new AppError('Invalid order ID supplied', 400);
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      supplier: true,
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, quantity: true, minStockLevel: true },
          },
        },
      },
    },
  });

  if (!po) {
    throw new AppError('Purchase order not found', 404);
  }

  return {
    ...po,
    totalAmount: Number(po.totalAmount),
    items: po.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
    })),
  };
};

/**
 * Create a new purchase order
 */
const createOrder = async (data) => {
  const { supplierId, items } = data;

  if (!supplierId) {
    throw new AppError('Supplier is required to create a purchase order', 400);
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Purchase order must contain at least one item', 400);
  }

  const parsedSupplierId = parseInt(supplierId, 10);
  if (isNaN(parsedSupplierId)) {
    throw new AppError('Invalid supplier ID', 400);
  }

  // Validate supplier exists
  const supplier = await prisma.supplier.findUnique({ where: { id: parsedSupplierId } });
  if (!supplier) {
    throw new AppError('Specified supplier not found', 404);
  }

  // Validate items
  let totalAmount = 0;
  const processedItems = [];

  for (const item of items) {
    const productId = parseInt(item.productId, 10);
    const quantity = parseInt(item.quantity, 10);
    const unitPrice = parseFloat(item.unitPrice);

    if (isNaN(productId) || isNaN(quantity) || quantity <= 0) {
      throw new AppError('Each item must specify a valid product and positive quantity', 400);
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new AppError('Each item must have a valid non-negative unit price', 400);
    }

    // Verify product belongs to catalog
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError(`Product with ID ${productId} was not found`, 404);
    }

    const subtotal = quantity * unitPrice;
    totalAmount += subtotal;

    processedItems.push({
      productId,
      quantity,
      unitPrice,
      subtotal,
    });
  }

  // Create PurchaseOrder and OrderItems inside transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    return await tx.purchaseOrder.create({
      data: {
        supplierId: parsedSupplierId,
        status: 'PENDING',
        totalAmount,
        items: {
          create: processedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
  });

  // Log to MongoDB ActivityLog
  await recordActivity({
    action: 'Purchase Order Created',
    entityType: 'PurchaseOrder',
    entityId: createdOrder.id,
    description: `Created Purchase Order #${createdOrder.id} with ${processedItems.length} items for ${supplier.name} (Total: ₹${totalAmount.toFixed(2)})`,
    metadata: {
      orderId: createdOrder.id,
      supplier: supplier.name,
      totalAmount,
      itemCount: processedItems.length,
    },
  });

  return {
    ...createdOrder,
    totalAmount: Number(createdOrder.totalAmount),
    items: createdOrder.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
    })),
  };
};

/**
 * Update purchase order status (Pending -> Received or Cancelled).
 * Marking as RECEIVED triggers a safe database transaction updating stock and movement history.
 */
const updateOrderStatus = async (id, newStatus) => {
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) {
    throw new AppError('Invalid purchase order ID', 400);
  }

  const validStatuses = ['PENDING', 'RECEIVED', 'CANCELLED'];
  const statusUpper = (newStatus || '').trim().toUpperCase();

  if (!validStatuses.includes(statusUpper)) {
    throw new AppError(`Invalid status. Allowed values: ${validStatuses.join(', ')}`, 400);
  }

  const existingOrder = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!existingOrder) {
    throw new AppError('Purchase order not found', 404);
  }

  // Prevent receiving an order that is already received or modifying it again
  if (existingOrder.status === 'RECEIVED') {
    throw new AppError('This purchase order has already been received and inventory was incremented. It cannot be modified again.', 400);
  }

  if (existingOrder.status === statusUpper) {
    return {
      ...existingOrder,
      totalAmount: Number(existingOrder.totalAmount),
      message: `Purchase order status is already ${statusUpper}`,
    };
  }

  if (existingOrder.status === 'CANCELLED' && statusUpper === 'RECEIVED') {
    throw new AppError('Cancelled purchase orders cannot be received. Please create a new purchase order.', 400);
  }

  if (statusUpper === 'RECEIVED') {
    // Execute atomic transaction:
    // 1. Update PO status to RECEIVED
    // 2. Increment stock quantity of each product
    // 3. Insert StockMovement record for each product
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Re-fetch within transaction to prevent race conditions
      const freshOrder = await tx.purchaseOrder.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      });

      if (freshOrder.status === 'RECEIVED') {
        throw new AppError('Purchase order was already received', 400);
      }

      const updated = await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { status: 'RECEIVED' },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      for (const item of updated.items) {
        const prevStock = item.product.quantity;
        const newStock = prevStock + item.quantity;

        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: newStock },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'Purchase Order Received',
            quantity: item.quantity,
            previousStock: prevStock,
            newStock: newStock,
            note: `Received via Purchase Order #${orderId}`,
          },
        });
      }

      return updated;
    });

    // Log to MongoDB
    await recordActivity({
      action: 'Purchase Order Received',
      entityType: 'PurchaseOrder',
      entityId: orderId,
      description: `Marked Purchase Order #${orderId} as RECEIVED. Incremented inventory for ${existingOrder.items.length} products.`,
      metadata: {
        orderId,
        supplier: existingOrder.supplier?.name,
        totalAmount: Number(existingOrder.totalAmount),
        itemCount: existingOrder.items.length,
      },
    });

    return {
      ...updatedOrder,
      totalAmount: Number(updatedOrder.totalAmount),
      items: updatedOrder.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    };
  }

  // Handle Cancelled or Pending transitions
  const updatedOrder = await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: statusUpper },
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  await recordActivity({
    action: `Purchase Order ${statusUpper === 'CANCELLED' ? 'Cancelled' : 'Updated'}`,
    entityType: 'PurchaseOrder',
    entityId: orderId,
    description: `Purchase Order #${orderId} status changed from ${existingOrder.status} to ${statusUpper}.`,
    metadata: { orderId, previousStatus: existingOrder.status, newStatus: statusUpper },
  });

  return {
    ...updatedOrder,
    totalAmount: Number(updatedOrder.totalAmount),
  };
};

module.exports = {
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
};
