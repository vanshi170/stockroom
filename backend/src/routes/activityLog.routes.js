const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLog.controller');

// GET /api/v1/activity-logs
router.get('/', activityLogController.listActivityLogs);

// GET /api/v1/activity-logs/:id
router.get('/:id', activityLogController.getActivityLogById);

module.exports = router;
