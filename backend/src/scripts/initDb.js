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
  const { execSync } = await import('child_process');

  try {
    logger.info('Initializing database schema...');

    // ALWAYS run prisma db push to ensure schema is in sync
    // This is idempotent - safe to run even if schema exists
    const prismaPath = path.resolve(__dirname, '../../node_modules/.bin/prisma');
    const command = `node "${prismaPath}" db push --skip-generate`;

    logger.info(`Executing: ${command}`);

    try {
      execSync(command, {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      });
      logger.info('✅ Database schema initialized successfully');
      return true;
    } catch (execError) {
      logger.error('❌ Prisma db push failed with direct path', { error: execError.message });

      // Fallback: try with npx
      logger.info('Attempting fallback with npx...');
      try {
        execSync('npx prisma db push --skip-generate', {
          cwd: path.resolve(__dirname, '../..'),
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        });
        logger.info('✅ Database schema initialized successfully (via npx)');
        return true;
      } catch (npxError) {
        logger.error('❌ Both methods failed', { error: npxError.message });
        throw new Error(`Database initialization failed: ${npxError.message}`);
      }
    }
  } catch (error) {
    logger.error('❌ Database initialization failed', { error: error.message });
    throw error;
  }
}

export default initializeDatabase;
