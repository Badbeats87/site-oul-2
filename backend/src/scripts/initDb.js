import prisma from '../utils/db.js';
import logger from '../../config/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Seed initial data (admin user)
 */
async function seedInitialData() {
  try {
    logger.info('🌱 Seeding initial data...');

    // Hash password for admin user
    const passwordHash = await bcrypt.hash('Admin123!', 12);

    // Create or update admin user
    const admin = await prisma.adminUser.upsert({
      where: { email: 'admin@vinylcatalog.com' },
      update: { passwordHash },
      create: {
        email: 'admin@vinylcatalog.com',
        name: 'System Admin',
        role: 'SUPER_ADMIN',
        passwordHash,
      },
    });

    logger.info('✅ Admin user initialized', {
      email: admin.email,
      role: admin.role,
    });

    return true;
  } catch (error) {
    logger.error('❌ Error seeding data', { error: error.message });
    return false;
  }
}

/**
 * Initialize database schema
 * This script ensures the database has all required tables
 */
async function initializeDatabase() {
  const { execSync } = await import('child_process');

  try {
    logger.info('🔧 Starting database initialization...');
    logger.info(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);

    if (!process.env.DATABASE_URL) {
      logger.warn('⚠️  DATABASE_URL not set, skipping initialization');
      return true;
    }

    const backendDir = path.resolve(__dirname, '../..');
    logger.info(`Backend dir: ${backendDir}`);

    // Try prisma db push with accept-data-loss for fresh databases
    try {
      logger.info('⏳ Attempting: npx prisma db push --accept-data-loss');
      const output = execSync('npx prisma db push --accept-data-loss', {
        cwd: backendDir,
        stdio: 'pipe', // Capture output instead of inheriting
        env: { ...process.env },
        timeout: 120000,
        encoding: 'utf-8'
      });
      logger.info('✅ Database schema initialized successfully', { output: output.substring(0, 500) });
      return true;
    } catch (error) {
      logger.warn(`⚠️  prisma db push failed: ${error.message}`, { stderr: error.stderr?.substring(0, 500) });
      // Continue to next method
    }

    // Fallback: Try migrate deploy
    try {
      logger.info('⏳ Attempting: npx prisma migrate deploy');
      const output = execSync('npx prisma migrate deploy', {
        cwd: backendDir,
        stdio: 'pipe',
        env: { ...process.env },
        timeout: 120000,
        encoding: 'utf-8'
      });
      logger.info('✅ Database schema initialized successfully with migrate deploy', { output: output.substring(0, 500) });
      return true;
    } catch (error) {
      logger.warn(`⚠️  prisma migrate deploy failed: ${error.message}`, { stderr: error.stderr?.substring(0, 500) });
    }

    // Last resort: Try db push without flags
    try {
      logger.info('⏳ Attempting: npx prisma db push (last resort)');
      const output = execSync('npx prisma db push', {
        cwd: backendDir,
        input: 'y\n', // Send 'y' for confirmation if prompted
        stdio: 'pipe',
        env: { ...process.env },
        timeout: 120000,
        encoding: 'utf-8'
      });
      logger.info('✅ Database schema initialized', { output: output.substring(0, 500) });
      return true;
    } catch (error) {
      logger.warn(`⚠️  Final attempt failed: ${error.message}`);
    }

    // If all methods failed, log warning but don't crash
    logger.error('⚠️  All database initialization methods failed', {
      error: 'Could not sync database schema'
    });
    // Don't throw - let the application try to start anyway
    // The database might be manually initialized or there might be other issues
    return false;
  } catch (error) {
    logger.error('❌ Database initialization error', {
      error: error.message,
      stack: error.stack,
    });
    // Don't re-throw - let app attempt to start
    return false;
  } finally {
    // Always try to seed initial data after schema is ready
    try {
      await seedInitialData();
    } catch (error) {
      logger.warn('⚠️  Failed to seed initial data', { error: error.message });
    }
  }
}

export default initializeDatabase;
