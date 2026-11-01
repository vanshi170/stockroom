const logger = require('../config/logger');
const AppError = require('../utils/appError');

/**
 * 404 Not Found Middleware for unhandled routes
 */
const notFoundHandler = (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404));
};

/**
 * Centralized Error-Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'error';

  // Log error to Winston with full context
  logger.error('Error encountered: %s', err.message, {
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
    name: err.name,
    code: err.code,
  });

  // Prisma Known Request Errors
  if (err.code === 'P2002') {
    // Unique constraint violation (e.g. duplicate SKU)
    const target = err.meta?.target ? `Duplicate field value: ${err.meta.target.join(', ')}` : 'Duplicate entry found';
    error = new AppError(`${target}. Please use a unique value.`, 409);
  } else if (err.code === 'P2003') {
    // Foreign key constraint failed
    const field = err.meta?.field_name || 'referenced record';
    error = new AppError(`Cannot perform operation: related record constraint violation on ${field}.`, 400);
  } else if (err.code === 'P2025') {
    // Record not found in Prisma
    error = new AppError(err.meta?.cause || 'Requested record was not found.', 404);
  } else if (err.code === 'P1001' || err.code === 'P1002') {
    // Database connection failure
    error = new AppError('Unable to reach PostgreSQL database. Please verify database connectivity.', 503);
  }

  // Mongoose Validation / Cast Errors
  if (err.name === 'CastError') {
    error = new AppError(`Invalid format for field ${err.path}: ${err.value}`, 400);
  } else if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = new AppError(`Validation error: ${messages.join('. ')}`, 400);
  }

  // JSON Body Parse error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('Malformed JSON payload received.', 400);
  }

  const responsePayload = {
    success: false,
    message: error.message || 'An unexpected internal server error occurred',
  };

  if (error.details) {
    responsePayload.details = error.details;
  }

  // Never expose sensitive stack trace or raw SQL in response
  res.status(error.statusCode).json(responsePayload);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};

