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
  const { execSync } = await import('child_process');

  try {
    logger.info('🔧 Starting database initialization...');
    logger.info(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);

    const backendDir = path.resolve(__dirname, '../..');
    const prismaDir = path.resolve(backendDir, 'prisma');
    const prismaSchema = path.resolve(prismaDir, 'schema.prisma');

    logger.info(`Backend dir: ${backendDir}`);
    logger.info(`Prisma dir: ${prismaDir}`);
    logger.info(`Schema file exists: ${existsSync(prismaSchema)}`);

    // Try prisma migrate deploy first (uses existing migrations)
    const prismaPath = path.resolve(backendDir, 'node_modules/.bin/prisma');
    logger.info(`Prisma CLI path: ${prismaPath}`);
    logger.info(`Prisma CLI exists: ${existsSync(prismaPath)}`);

    const commands = [
      `node "${prismaPath}" migrate deploy --skip-generate`,
      'npx prisma migrate deploy --skip-generate',
      `node "${prismaPath}" db push --skip-generate`,
      'npx prisma db push --skip-generate',
    ];

    for (const command of commands) {
      try {
        logger.info(`⏳ Attempting: ${command}`);
        execSync(command, {
          cwd: backendDir,
          stdio: 'inherit',
          env: { ...process.env },
          timeout: 60000, // 60 second timeout
        });
        logger.info('✅ Database schema initialized successfully');
        return true;
      } catch (error) {
        logger.warn(`⚠️  Command failed: ${command}`, { error: error.message });
        // Continue to next command
      }
    }

    // If all commands failed
    throw new Error('All database initialization attempts failed');
  } catch (error) {
    logger.error('❌ Database initialization failed fatally', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export default initializeDatabase;
