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
import authRoutes from './routes/auth.js';
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

// Auth routes (before other protected routes)
app.use('/api/v1/auth', authRoutes);

// Catalog routes
app.use('/api/v1/catalog', catalogRoutes);

// TODO: Add other route groups
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

export default app;
