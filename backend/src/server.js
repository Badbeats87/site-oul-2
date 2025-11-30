import app from './index.js';
import config from '../config/config.js';
import logger from '../config/logger.js';
import cleanupExpiredReservationsJob from './jobs/cleanupExpiredReservations.js';
import initializeDatabase from './scripts/initDb.js';

const PORT = config.app.port;
const HOST = config.app.host;

let server;

async function startServer() {
  try {
    // Initialize database before starting server
    await initializeDatabase();

    server = app.listen(PORT, HOST, () => {
      logger.info(`✅ Server running at http://${HOST}:${PORT}`);
      logger.info(`📍 Health check: http://${HOST}:${PORT}/api/v1/health`);

      // Start background jobs
      cleanupExpiredReservationsJob.start();
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();

// Graceful shutdown handler
// Re-initializes database connection on restart
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  cleanupExpiredReservationsJob.stop();
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  cleanupExpiredReservationsJob.stop();
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
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
