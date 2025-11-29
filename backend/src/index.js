import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config.js';
import logger, { logRequest } from '../config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import healthRoutes from './routes/health.js';
import catalogRoutes from './routes/catalog.js';
import { authenticate } from './middleware/authMiddleware.js';
import prisma from './utils/db.js';

const app = express();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Security
app.use(helmet());
app.use(cors(config.cors));
app.use(compression());

// Request logging
app.use(logRequest);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Authentication middleware
app.use(authenticate);

logger.info(`🚀 ${config.app.name} starting up...`);
logger.info(`Environment: ${config.app.env}`);

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.use('/api/v1/health', healthRoutes);

// Catalog routes
app.use('/api/v1/catalog', catalogRoutes);

// TODO: Add other route groups
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/pricing', pricingRoutes);
// app.use('/api/v1/submissions', submissionRoutes);
// app.use('/api/v1/inventory', inventoryRoutes);
// app.use('/api/v1/orders', orderRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = config.app.port;
const HOST = config.app.host;

const server = app.listen(PORT, HOST, () => {
  logger.info(`✅ Server running at http://${HOST}:${PORT}`);
  logger.info(`📍 Health check: http://${HOST}:${PORT}/api/v1/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
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

export default app;
