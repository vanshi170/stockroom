const stockService = require('../services/stock.service');

const adjustProductStock = async (req, res, next) => {
  try {
    const { type, quantity, note } = req.body;
    const result = await stockService.adjustStock(req.params.id, { type, quantity, note });
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getStockMovements = async (req, res, next) => {
  try {
    const { page, limit, type, search, productId } = req.query;
    const result = await stockService.listStockMovements({
      page,
      limit,
      type,
      search,
      productId,
    });
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adjustProductStock,
  getStockMovements,
};

