const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error: %s', e.message);
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning: %s', e.message);
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    // Keep dev logs clean but informative
    logger.debug('Prisma Query: %s [Duration: %d ms]', e.query, e.duration);
  });
}

module.exports = prisma;

