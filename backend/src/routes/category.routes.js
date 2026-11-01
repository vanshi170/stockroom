const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');

// GET /api/v1/categories
router.get('/', categoryController.getCategories);

// POST /api/v1/categories
router.post('/', categoryController.createCategory);

module.exports = router;
