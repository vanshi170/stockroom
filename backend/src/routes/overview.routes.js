const express = require('express');
const router = express.Router();
const overviewController = require('../controllers/overview.controller');

// GET /api/v1/overview
router.get('/', overviewController.getOverview);

module.exports = router;

