const prisma = require('../config/db');
const AppError = require('../utils/appError');
const { recordActivity } = require('./activityLogger.service');

const getAllCategories = async () => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    productCount: cat._count.products,
    createdAt: cat.createdAt,
  }));
};

const createCategory = async (data) => {
  const { name, description } = data;

  if (!name || name.trim() === '') {
    throw new AppError('Category name is required', 400);
  }

  const existing = await prisma.category.findUnique({
    where: { name: name.trim() },
  });
  if (existing) {
    throw new AppError(`Category "${name.trim()}" already exists`, 409);
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      description: description ? description.trim() : null,
    },
  });

  await recordActivity({
    action: 'Category Created',
    entityType: 'Category',
    entityId: category.id,
    description: `Created product category "${category.name}"`,
    metadata: { name: category.name },
  });

  return category;
};

module.exports = {
  getAllCategories,
  createCategory,
};
