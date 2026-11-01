require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');
const { connectMongoDB } = require('./config/mongo');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const v1Router = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend client
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Centralized Request Logger
app.use(requestLogger);

// API Version 1 Routes
app.use('/api/v1', v1Router);

// Fallback for root path
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Stockroom API',
    version: '1.0.0',
    description: 'Stockroom Inventory Management System REST API',
    documentation: '/api/v1',
    endpoints: {
      overview: '/api/v1/overview',
      products: '/api/v1/products',
      categories: '/api/v1/categories',
      suppliers: '/api/v1/suppliers',
      orders: '/api/v1/orders',
      stockMovements: '/api/v1/stock-movements',
      activityLogs: '/api/v1/activity-logs',
      health: '/api/v1/health',
    },
  });
});

// 404 Not Found Middleware
app.use(notFoundHandler);

// Centralized Error-Handling Middleware
app.use(errorHandler);

// Connect to MongoDB and start HTTP Server
const startServer = async () => {
  await connectMongoDB();

  const server = app.listen(PORT, () => {
    logger.info(`Stockroom Backend REST API running at http://localhost:${PORT}`);
    logger.info(`API v1 Base URL: http://localhost:${PORT}/api/v1`);
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    logger.info('Received kill signal, shutting down gracefully...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

if (require.main === module) {
  startServer();
}

module.exports = app;
