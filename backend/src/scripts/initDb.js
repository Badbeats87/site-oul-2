import prisma from '../utils/db.js';
import logger from '../../config/logger.js';

/**
 * Initialize database schema
 * This script ensures the database has all required tables
 */
async function initializeDatabase() {
  try {
    logger.info('Checking database schema...');

    // Try to query a simple table to see if schema exists
    try {
      await prisma.release.findFirst({ take: 1 });
      logger.info('Database schema already initialized');
      return true;
    } catch (error) {
      // If query fails, schema doesn't exist - need to sync
      logger.warn('Database schema not found, syncing with Prisma schema...');
    }

    // Run prisma db push to sync schema
    logger.info('Running "prisma db push --force-reset"...');
    const { execSync } = await import('child_process');

    try {
      execSync('npx prisma db push --skip-generate --force-reset', {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env },
      });
      logger.info('Database schema synchronized successfully');
      return true;
    } catch (execError) {
      logger.error('Failed to sync database schema', { error: execError.message });
      throw execError;
    }
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    throw error;
  }
}

export default initializeDatabase;
