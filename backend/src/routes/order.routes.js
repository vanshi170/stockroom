const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// GET /api/v1/orders
router.get('/', orderController.getOrders);

// GET /api/v1/orders/:id
router.get('/:id', orderController.getOrderById);

// POST /api/v1/orders
router.post('/', orderController.createOrder);

// PATCH /api/v1/orders/:id/status
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;

