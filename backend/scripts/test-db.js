require('dotenv').config();
const prisma = require('../src/config/db');
const mongoose = require('mongoose');
const ActivityLog = require('../src/models/activityLog.model');

async function testAll() {
  console.log('Testing PostgreSQL via Prisma...');
  const productCount = await prisma.product.count();
  const categoryCount = await prisma.category.count();
  const supplierCount = await prisma.supplier.count();
  const orderCount = await prisma.purchaseOrder.count();
  const movementCount = await prisma.stockMovement.count();

  console.log(`Prisma stats:
  - Products: ${productCount}
  - Categories: ${categoryCount}
  - Suppliers: ${supplierCount}
  - Purchase Orders: ${orderCount}
  - Stock Movements: ${movementCount}`);

  console.log('\nTesting MongoDB via Mongoose...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stockroom');
  const logCount = await ActivityLog.countDocuments();
  console.log(`MongoDB Activity Logs count: ${logCount}`);

  await prisma.$disconnect();
  await mongoose.disconnect();
  console.log('\nAll Database Tests Passed Successfully!');
}

testAll().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
