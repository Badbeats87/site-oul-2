import app from './index.js';
import config from '../config/config.js';
import logger from '../config/logger.js';
import cleanupExpiredReservationsJob from './jobs/cleanupExpiredReservations.js';

const PORT = config.app.port;
const HOST = config.app.host;

const server = app.listen(PORT, HOST, () => {
  logger.info(`✅ Server running at http://${HOST}:${PORT}`);
  logger.info(`📍 Health check: http://${HOST}:${PORT}/api/v1/health`);

  // Start background jobs
  cleanupExpiredReservationsJob.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  cleanupExpiredReservationsJob.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  cleanupExpiredReservationsJob.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export { server };
