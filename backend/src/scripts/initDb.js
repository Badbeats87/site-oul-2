import prisma from '../utils/db.js';
import logger from '../../config/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize database schema
 * This script ensures the database has all required tables
 */
async function initializeDatabase() {
  const { execSync, exec } = await import('child_process');
  const { promisify } = await import('util');
  const execPromise = promisify(exec);

  try {
    logger.info('🔧 Starting database initialization...');
    logger.info(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);

    if (!process.env.DATABASE_URL) {
      logger.warn('⚠️  DATABASE_URL not set, skipping initialization');
      return true;
    }

    const backendDir = path.resolve(__dirname, '../..');
    logger.info(`Backend dir: ${backendDir}`);

    // Primary method: Use prisma db push (most reliable)
    // This pushes the current schema directly to the database without migration files
    try {
      logger.info('⏳ Attempting: npx prisma db push --skip-generate');
      execSync('npx prisma db push --skip-generate', {
        cwd: backendDir,
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 120000, // 120 second timeout for db push
      });
      logger.info('✅ Database schema initialized successfully with prisma db push');
      return true;
    } catch (error) {
      logger.warn(`⚠️  prisma db push failed: ${error.message}`);
      // Don't throw yet, try alternate method
    }

    // Fallback: Try migrate deploy
    try {
      logger.info('⏳ Attempting: npx prisma migrate deploy --skip-generate');
      execSync('npx prisma migrate deploy --skip-generate', {
        cwd: backendDir,
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 120000,
      });
      logger.info('✅ Database schema initialized successfully with migrate deploy');
      return true;
    } catch (error) {
      logger.warn(`⚠️  prisma migrate deploy failed: ${error.message}`);
    }

    // If we reach here, all attempts failed
    throw new Error('Database initialization failed: all methods exhausted');
  } catch (error) {
    logger.error('❌ Database initialization failed fatally', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export default initializeDatabase;
