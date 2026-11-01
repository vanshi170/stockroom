const overviewService = require('../services/overview.service');

const getOverview = async (req, res, next) => {
  try {
    const data = await overviewService.getOverviewMetrics();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
};

