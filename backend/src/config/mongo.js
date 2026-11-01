const mongoose = require('mongoose');
const logger = require('./logger');

let isConnected = false;

const connectMongoDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stockroom';

  try {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info('MongoDB connected successfully to %s', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      logger.error('MongoDB connection error: %s', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error) {
    isConnected = false;
    logger.error('Failed to establish initial MongoDB connection: %s', error.message);
    logger.info('MongoDB is required for ActivityLog audit logging. PostgreSQL operations will continue.');
  }
};

const getMongoStatus = () => {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
  };
};

module.exports = { connectMongoDB, getMongoStatus };
