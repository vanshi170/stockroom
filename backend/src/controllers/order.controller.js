const orderService = require('../services/order.service');

const getOrders = async (req, res, next) => {
  try {
    const { page, limit, status, supplierId, sortBy, order } = req.query;
    const result = await orderService.listOrders({
      page,
      limit,
      status,
      supplierId,
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

const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status);
    res.status(200).json({
      success: true,
      message: `Purchase order status updated to ${order.status}`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
};
