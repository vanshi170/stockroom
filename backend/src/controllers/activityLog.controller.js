const { getActivityLogs } = require('../services/activityLogger.service');
const ActivityLog = require('../models/activityLog.model');
const { getMongoStatus } = require('../config/mongo');
const AppError = require('../utils/appError');

const listActivityLogs = async (req, res, next) => {
  try {
    const { page, limit, action, entityType, entityId, sortBy, order } = req.query;
    const result = await getActivityLogs({
      page,
      limit,
      action,
      entityType,
      entityId,
      sortBy,
      order,
    });
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getActivityLogById = async (req, res, next) => {
  try {
    const mongoStatus = getMongoStatus();
    if (!mongoStatus.isConnected) {
      throw new AppError('MongoDB is currently not connected. Cannot fetch activity log.', 503);
    }

    const log = await ActivityLog.findById(req.params.id);
    if (!log) {
      throw new AppError('Activity log entry not found', 404);
    }

    res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listActivityLogs,
  getActivityLogById,
};
