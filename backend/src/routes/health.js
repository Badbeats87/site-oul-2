import express from 'express';
import config from '../../config/config.js';

const router = express.Router();

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.app.env,
      version: '0.1.0',
      requestId: req.id,
    },
  });
});

/**
 * GET /api/v1/health/ready
 * Readiness check (for Kubernetes/load balancers)
 */
router.get('/ready', (req, res) => {
  // TODO: Add database connection check
  const isReady = true; // Placeholder

  if (isReady) {
    res.json({
      success: true,
      data: { status: 'ready' },
    });
  } else {
    res.status(503).json({
      success: false,
      error: { message: 'Service not ready', status: 503 },
    });
  }
});

/**
 * GET /api/v1/health/live
 * Liveness check (for Kubernetes)
 */
router.get('/live', (req, res) => {
  res.json({
    success: true,
    data: { status: 'alive' },
  });
});

export default router;
