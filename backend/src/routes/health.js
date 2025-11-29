import express from 'express';
import config from '../../config/config.js';
import prisma from '../utils/db.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns basic health status of the API server
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: healthy
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       description: Server uptime in seconds
 *                     environment:
 *                       type: string
 *                       example: development
 *                     version:
 *                       type: string
 *                       example: 0.1.0
 *                     requestId:
 *                       type: string
 *                       format: uuid
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
 * @swagger
 * /api/v1/health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Checks if the API is ready to receive requests (database connected)
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service not ready - database unavailable
 */
router.get('/ready', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      data: { status: 'ready', database: 'connected' },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        message: 'Service not ready - database unavailable',
        status: 503,
      },
    });
  }
});

/**
 * @swagger
 * /api/v1/health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Checks if the API process is running and responding to requests
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (req, res) => {
  res.json({
    success: true,
    data: { status: 'alive' },
  });
});

export default router;
