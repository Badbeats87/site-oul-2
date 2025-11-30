import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import config from '../config/config.js';
import logger, { logRequest } from '../config/logger.js';
import { swaggerSpec } from '../config/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import integrationsRoutes from './routes/integrations.js';
import sellersRoutes from './routes/sellers.js';
import adminRoutes from './routes/admin.js';
import inventoryRoutes from './routes/inventory.js';
import buyerRoutes from './routes/buyer.js';
import checkoutRoutes from './routes/checkout.js';
import { authenticate } from './middleware/authMiddleware.js';
import { captureRawBody } from './middleware/rawBody.js';
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

// Capture raw body for webhook processing (must be before json())
app.use('/api/v1/checkout/webhook', captureRawBody);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ============================================================================
// DOCUMENTATION (before authentication middleware)
// ============================================================================

// API documentation (available without authentication)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

// Integration routes
app.use('/api/v1/integrations', integrationsRoutes);

// Sellers and submissions routes
app.use('/api/v1/sellers', sellersRoutes);

// Admin routes
app.use('/api/v1/admin/submissions', adminRoutes);

// Inventory routes
app.use('/api/v1/inventory', inventoryRoutes);

// Buyer storefront routes
app.use('/api/v1/buyer', buyerRoutes);

// Checkout and orders routes
app.use('/api/v1/checkout', checkoutRoutes);

// TODO: Add other route groups
// app.use('/api/v1/pricing', pricingRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
