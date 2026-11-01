const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const stockController = require('../controllers/stock.controller');

// GET /api/v1/products
router.get('/', productController.getProducts);

// GET /api/v1/products/:id
router.get('/:id', productController.getProductById);

// POST /api/v1/products
router.post('/', productController.createProduct);

// PUT /api/v1/products/:id
router.put('/:id', productController.updateProduct);

// DELETE /api/v1/products/:id
router.delete('/:id', productController.deleteProduct);

// POST /api/v1/products/:id/stock (adjust stock)
router.post('/:id/stock', stockController.adjustProductStock);

module.exports = router;

