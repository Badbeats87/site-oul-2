/**
 * Startup handler - runs database seed before starting the server
 */
import app from './index.js';
import logger from '../config/logger.js';

// Seed the database
async function seedDatabase() {
  try {
    console.log('🌱 Running database seed...');
    const seed = await import('../prisma/seed.js');
    console.log('✅ Database seed completed');
  } catch (error) {
    console.error('⚠️  Database seeding failed:', error.message);
    // Don't fail startup if seeding fails
  }
}

// Start the server
async function start() {
  try {
    // Seed database if needed
    await seedDatabase();

    const PORT = process.env.PORT || 3001;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server listening on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, closing server...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
