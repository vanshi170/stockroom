const prisma = require('../config/db');
const AppError = require('../utils/appError');
const { recordActivity } = require('./activityLogger.service');

const listSuppliers = async ({ search = '' } = {}) => {
  const where = {};
  if (search && search.trim() !== '') {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { contactPerson: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          products: true,
          purchaseOrders: true,
        },
      },
    },
  });

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson,
    email: s.email,
    phone: s.phone,
    address: s.address,
    productsSuppliedCount: s._count.products,
    purchaseOrdersCount: s._count.purchaseOrders,
    createdAt: s.createdAt,
  }));
};

const getSupplierById = async (id) => {
  const supplierId = parseInt(id, 10);
  if (isNaN(supplierId)) {
    throw new AppError('Invalid supplier ID supplied', 400);
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      products: {
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
        },
      },
      purchaseOrders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!supplier) {
    throw new AppError('Supplier not found', 404);
  }

  return {
    ...supplier,
    products: supplier.products.map((p) => ({
      ...p,
      price: Number(p.price),
    })),
    purchaseOrders: supplier.purchaseOrders.map((po) => ({
      ...po,
      totalAmount: Number(po.totalAmount),
    })),
  };
};

const createSupplier = async (data) => {
  const { name, contactPerson, email, phone, address } = data;

  if (!name || !contactPerson || !email || !phone) {
    throw new AppError('Supplier name, contact person, email, and phone number are required', 400);
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address ? address.trim() : null,
    },
  });

  await recordActivity({
    action: 'Supplier Created',
    entityType: 'Supplier',
    entityId: supplier.id,
    description: `Created supplier "${supplier.name}" (Contact: ${supplier.contactPerson})`,
    metadata: { name: supplier.name, email: supplier.email },
  });

  return supplier;
};

const updateSupplier = async (id, data) => {
  const supplierId = parseInt(id, 10);
  if (isNaN(supplierId)) {
    throw new AppError('Invalid supplier ID supplied', 400);
  }

  const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!existing) {
    throw new AppError('Supplier not found', 404);
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson.trim();
  if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
  if (data.phone !== undefined) updateData.phone = data.phone.trim();
  if (data.address !== undefined) updateData.address = data.address ? data.address.trim() : null;

  const updatedSupplier = await prisma.supplier.update({
    where: { id: supplierId },
    data: updateData,
  });

  await recordActivity({
    action: 'Supplier Updated',
    entityType: 'Supplier',
    entityId: updatedSupplier.id,
    description: `Updated details for supplier "${updatedSupplier.name}"`,
    metadata: updateData,
  });

  return updatedSupplier;
};

const deleteSupplier = async (id) => {
  const supplierId = parseInt(id, 10);
  if (isNaN(supplierId)) {
    throw new AppError('Invalid supplier ID supplied', 400);
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      products: { select: { id: true }, take: 1 },
      purchaseOrders: { select: { id: true }, take: 1 },
    },
  });

  if (!supplier) {
    throw new AppError('Supplier not found', 404);
  }

  if (supplier.products.length > 0) {
    throw new AppError('Cannot delete supplier because they have products registered under their catalog', 400);
  }

  if (supplier.purchaseOrders.length > 0) {
    throw new AppError('Cannot delete supplier because purchase orders exist for them', 400);
  }

  await prisma.supplier.delete({ where: { id: supplierId } });

  await recordActivity({
    action: 'Supplier Deleted',
    entityType: 'Supplier',
    entityId: supplierId,
    description: `Deleted supplier "${supplier.name}"`,
    metadata: { name: supplier.name },
  });

  return { message: 'Supplier deleted successfully', id: supplierId };
};

module.exports = {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
