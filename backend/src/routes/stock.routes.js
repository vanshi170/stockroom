const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');

// GET /api/v1/stock-movements
router.get('/', stockController.getStockMovements);

module.exports = router;

