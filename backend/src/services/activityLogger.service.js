const ActivityLog = require('../models/activityLog.model');
const logger = require('../config/logger');
const { getMongoStatus } = require('../config/mongo');

/**
 * Record a business activity event in MongoDB.
 * Non-blocking: logs any error through Winston without throwing so PostgreSQL operations remain consistent.
 */
const recordActivity = async ({ action, entityType, entityId, description, metadata = {} }) => {
  try {
    const mongoStatus = getMongoStatus();
    if (!mongoStatus.isConnected) {
      logger.warn(
        `MongoDB not connected. Skipping ActivityLog recording for [${action}] on ${entityType} #${entityId}: "${description}"`
      );
      return null;
    }

    const logEntry = await ActivityLog.create({
      action,
      entityType,
      entityId: entityId !== undefined && entityId !== null ? String(entityId) : null,
      description,
      metadata,
    });

    logger.info(`Activity logged to MongoDB: [${action}] on ${entityType} #${entityId}`);
    return logEntry;
  } catch (error) {
    logger.error('Failed to write activity log to MongoDB: %s', error.message, {
      action,
      entityType,
      entityId,
      metadata,
    });
    return null;
  }
};

/**
 * Retrieve paginated activity logs with filtering and sorting
 */
const getActivityLogs = async ({ page = 1, limit = 20, action, entityType, entityId, sortBy = 'createdAt', order = 'desc' }) => {
  const mongoStatus = getMongoStatus();
  if (!mongoStatus.isConnected) {
    return {
      connected: false,
      message: 'MongoDB is currently not connected or unreachable. Activity logs cannot be fetched.',
      data: [],
      currentPage: Number(page),
      totalPages: 0,
      totalItems: 0,
      limit: Number(limit),
    };
  }

  const query = {};
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = String(entityId);

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const sortDirection = order.toLowerCase() === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDirection };

  const [totalItems, logs] = await Promise.all([
    ActivityLog.countDocuments(query),
    ActivityLog.find(query).sort(sort).skip(skip).limit(safeLimit).lean(),
  ]);

  const totalPages = Math.ceil(totalItems / safeLimit);

  return {
    connected: true,
    data: logs,
    currentPage: safePage,
    totalPages,
    totalItems,
    limit: safeLimit,
  };
};

module.exports = {
  recordActivity,
  getActivityLogs,
};
