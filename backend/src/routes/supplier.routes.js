const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');

// GET /api/v1/suppliers
router.get('/', supplierController.getSuppliers);

// GET /api/v1/suppliers/:id
router.get('/:id', supplierController.getSupplierById);

// POST /api/v1/suppliers
router.post('/', supplierController.createSupplier);

// PUT /api/v1/suppliers/:id
router.put('/:id', supplierController.updateSupplier);

// DELETE /api/v1/suppliers/:id
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;

