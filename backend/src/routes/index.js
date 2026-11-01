const express = require('express');
const router = express.Router();

const overviewRoutes = require('./overview.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const supplierRoutes = require('./supplier.routes');
const orderRoutes = require('./order.routes');
const stockRoutes = require('./stock.routes');
const activityLogRoutes = require('./activityLog.routes');
const { getMongoStatus } = require('../config/mongo');
const prisma = require('../config/db');

// Healthcheck endpoint
router.get('/health', async (req, res) => {
  let postgresConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    postgresConnected = true;
  } catch (err) {
    postgresConnected = false;
  }

  const mongoStatus = getMongoStatus();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    databases: {
      postgresql: {
        connected: postgresConnected,
        orm: 'Prisma Client',
      },
      mongodb: {
        connected: mongoStatus.isConnected,
        odm: 'Mongoose',
      },
    },
  });
});

router.use('/overview', overviewRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/orders', orderRoutes);
router.use('/stock-movements', stockRoutes);
router.use('/activity-logs', activityLogRoutes);

module.exports = router;

