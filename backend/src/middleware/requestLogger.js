const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationInMs = ((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2);
    const statusCode = res.statusCode;

    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: statusCode,
      duration: Number(durationInMs),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.originalUrl} - Status: ${statusCode}`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.originalUrl} - Status: ${statusCode}`, logData);
    } else {
      logger.info(`HTTP ${req.method} ${req.originalUrl} - Status: ${statusCode}`, logData);
    }
  });

  next();
};

module.exports = requestLogger;
