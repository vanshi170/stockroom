const prisma = require('../config/db');
const AppError = require('../utils/appError');
const { recordActivity } = require('./activityLogger.service');

const ALLOWED_SORT_FIELDS = ['name', 'price', 'quantity', 'createdAt', 'sku'];

/**
 * List products with pagination, search, category filter, stock status filter, and sorting.
 */
const listProducts = async ({
  page = 1,
  limit = 10,
  search = '',
  categoryId,
  stockStatus,
  sortBy = 'name',
  order = 'asc',
}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (safePage - 1) * safeLimit;

  // Build where clause
  const where = {};

  if (search && search.trim() !== '') {
    const searchTerm = search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { sku: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    const parsedCatId = parseInt(categoryId, 10);
    if (!isNaN(parsedCatId)) {
      where.categoryId = parsedCatId;
    }
  }

  if (stockStatus) {
    const status = stockStatus.toLowerCase();
    if (status === 'out_of_stock' || status === 'out') {
      where.quantity = 0;
    } else if (status === 'in_stock' || status === 'healthy') {
      where.quantity = { gt: 0 };
    }
  }

  // Validate sort field
  const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'name';
  const safeOrder = order.toLowerCase() === 'desc' ? 'desc' : 'asc';
  const orderBy = { [safeSortBy]: safeOrder };

  // Fetch total count and products
  const [totalItems, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, email: true, phone: true } },
      },
    }),
  ]);

  // Compute stockStatus helper property on each product
  const formattedProducts = products.map((p) => {
    let computedStatus = 'IN_STOCK';
    if (p.quantity === 0) {
      computedStatus = 'OUT_OF_STOCK';
    } else if (p.quantity <= p.minStockLevel) {
      computedStatus = 'LOW_STOCK';
    }

    return {
      ...p,
      price: Number(p.price),
      stockStatus: computedStatus,
    };
  });

  // If low_stock filter was requested, filter items where quantity <= minStockLevel
  let finalProducts = formattedProducts;
  if (stockStatus && (stockStatus.toLowerCase() === 'low_stock' || stockStatus.toLowerCase() === 'low')) {
    finalProducts = formattedProducts.filter((p) => p.stockStatus === 'LOW_STOCK');
  }

  const totalPages = Math.ceil(totalItems / safeLimit);

  return {
    data: finalProducts,
    currentPage: safePage,
    totalPages,
    totalItems,
    limit: safeLimit,
  };
};

/**
 * Get single product by ID with details and movement history
 */
const getProductById = async (id) => {
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    throw new AppError('Invalid product ID supplied', 400);
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      supplier: true,
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 15,
      },
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  let computedStatus = 'IN_STOCK';
  if (product.quantity === 0) {
    computedStatus = 'OUT_OF_STOCK';
  } else if (product.quantity <= product.minStockLevel) {
    computedStatus = 'LOW_STOCK';
  }

  return {
    ...product,
    price: Number(product.price),
    stockStatus: computedStatus,
  };
};

/**
 * Create a new product
 */
const createProduct = async (data) => {
  const { name, sku, description, categoryId, supplierId, price, quantity = 0, minStockLevel = 5 } = data;

  if (!name || !sku || !categoryId || !supplierId || price === undefined) {
    throw new AppError('Name, SKU, category, supplier, and price are required fields', 400);
  }

  const parsedCategoryId = parseInt(categoryId, 10);
  const parsedSupplierId = parseInt(supplierId, 10);
  const parsedPrice = parseFloat(price);
  const parsedQty = parseInt(quantity, 10) || 0;
  const parsedMinStock = parseInt(minStockLevel, 10) || 5;

  if (isNaN(parsedCategoryId) || isNaN(parsedSupplierId)) {
    throw new AppError('Category ID and Supplier ID must be valid numbers', 400);
  }

  if (isNaN(parsedPrice) || parsedPrice < 0) {
    throw new AppError('Price must be a positive number', 400);
  }

  if (parsedQty < 0) {
    throw new AppError('Initial quantity cannot be negative', 400);
  }

  // Check unique SKU
  const existingSku = await prisma.product.findUnique({
    where: { sku: sku.trim() },
  });
  if (existingSku) {
    throw new AppError(`A product with SKU "${sku}" already exists`, 409);
  }

  // Create product in transaction and record initial stock movement if quantity > 0
  const createdProduct = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        description: description ? description.trim() : null,
        categoryId: parsedCategoryId,
        supplierId: parsedSupplierId,
        price: parsedPrice,
        quantity: parsedQty,
        minStockLevel: parsedMinStock,
      },
      include: {
        category: true,
        supplier: true,
      },
    });

    if (parsedQty > 0) {
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: 'Stock In',
          quantity: parsedQty,
          previousStock: 0,
          newStock: parsedQty,
          note: 'Initial inventory entry upon product creation',
        },
      });
    }

    return product;
  });

  // Log to MongoDB ActivityLog
  await recordActivity({
    action: 'Product Created',
    entityType: 'Product',
    entityId: createdProduct.id,
    description: `Created new product "${createdProduct.name}" (SKU: ${createdProduct.sku}) with ${parsedQty} units.`,
    metadata: {
      name: createdProduct.name,
      sku: createdProduct.sku,
      price: parsedPrice,
      quantity: parsedQty,
      category: createdProduct.category?.name,
    },
  });

  return {
    ...createdProduct,
    price: Number(createdProduct.price),
  };
};

/**
 * Update an existing product
 */
const updateProduct = async (id, data) => {
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    throw new AppError('Invalid product ID supplied', 400);
  }

  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!existingProduct) {
    throw new AppError('Product not found', 404);
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;

  if (data.sku !== undefined) {
    const newSku = data.sku.trim().toUpperCase();
    if (newSku !== existingProduct.sku) {
      const duplicateSku = await prisma.product.findUnique({ where: { sku: newSku } });
      if (duplicateSku) {
        throw new AppError(`A product with SKU "${newSku}" already exists`, 409);
      }
      updateData.sku = newSku;
    }
  }

  if (data.categoryId !== undefined) {
    const catId = parseInt(data.categoryId, 10);
    if (isNaN(catId)) throw new AppError('Invalid category ID', 400);
    updateData.categoryId = catId;
  }

  if (data.supplierId !== undefined) {
    const suppId = parseInt(data.supplierId, 10);
    if (isNaN(suppId)) throw new AppError('Invalid supplier ID', 400);
    updateData.supplierId = suppId;
  }

  if (data.price !== undefined) {
    const parsedPrice = parseFloat(data.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) throw new AppError('Price must be a positive number', 400);
    updateData.price = parsedPrice;
  }

  if (data.minStockLevel !== undefined) {
    const minLevel = parseInt(data.minStockLevel, 10);
    if (isNaN(minLevel) || minLevel < 0) throw new AppError('Minimum stock level must be positive', 400);
    updateData.minStockLevel = minLevel;
  }

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: updateData,
    include: {
      category: true,
      supplier: true,
    },
  });

  // Log to MongoDB ActivityLog
  await recordActivity({
    action: 'Product Updated',
    entityType: 'Product',
    entityId: updatedProduct.id,
    description: `Updated details for product "${updatedProduct.name}" (SKU: ${updatedProduct.sku}).`,
    metadata: updateData,
  });

  return {
    ...updatedProduct,
    price: Number(updatedProduct.price),
  };
};

/**
 * Delete a product safely (checking foreign key relationships)
 */
const deleteProduct = async (id) => {
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    throw new AppError('Invalid product ID supplied', 400);
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      orderItems: { select: { id: true }, take: 1 },
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Prevent deletion if product is part of existing purchase orders
  if (product.orderItems.length > 0) {
    throw new AppError(
      'Cannot delete product because it is referenced in one or more purchase orders. Consider archiving or setting stock to zero.',
      400
    );
  }

  // Delete product and associated stock movements in transaction
  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.deleteMany({
      where: { productId },
    });
    await tx.product.delete({
      where: { id: productId },
    });
  });

  // Log to MongoDB ActivityLog
  await recordActivity({
    action: 'Product Deleted',
    entityType: 'Product',
    entityId: productId,
    description: `Deleted product "${product.name}" (SKU: ${product.sku}).`,
    metadata: { name: product.name, sku: product.sku },
  });

  return { message: 'Product deleted successfully', id: productId };
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

