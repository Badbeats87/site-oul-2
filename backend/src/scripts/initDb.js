import prisma from '../utils/db.js';
import logger from '../../config/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      if (error.message.includes('does not exist') || error.code === 'P1017') {
        logger.warn('Database schema not found, syncing with Prisma schema...');
      } else {
        logger.warn('Database check failed', { error: error.message });
      }
    }

    // Run prisma db push to sync schema
    logger.info('Running prisma db push to initialize schema...');
    const { execSync } = await import('child_process');

    try {
      // Try to use prisma directly from node_modules
      const prismaPath = path.resolve(__dirname, '../../node_modules/.bin/prisma');
      const command = `node "${prismaPath}" db push --skip-generate --force-reset`;

      logger.info(`Executing: ${command}`);
      execSync(command, {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      });

      logger.info('Database schema synchronized successfully');
      return true;
    } catch (execError) {
      logger.error('Prisma db push failed', { error: execError.message });

      // If that fails, try one more time with npx
      try {
        logger.info('Retrying with npx...');
        execSync('npx prisma db push --skip-generate --force-reset', {
          cwd: path.resolve(__dirname, '../..'),
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        });
        logger.info('Database schema synchronized successfully (via npx)');
        return true;
      } catch (npxError) {
        logger.error('Failed to sync database schema', { error: npxError.message });
        throw npxError;
      }
    }
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    throw error;
  }
}

export default initializeDatabase;
