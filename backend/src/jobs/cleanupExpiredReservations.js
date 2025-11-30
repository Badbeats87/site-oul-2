import cron from 'node-cron';
import logger from '../../config/logger.js';
import inventoryService from '../services/inventoryService.js';

/**
 * Background job to clean up expired inventory reservations
 * Runs every 5 minutes by default
 * Releases items reserved more than 15 minutes ago back to LIVE status
 */
class CleanupExpiredReservationsJob {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  /**
   * Start the background job
   * @param {string} schedule - Cron schedule expression (default: every 5 minutes)
   */
  start(schedule = '*/5 * * * *') {
    if (this.task) {
      logger.warn('Cleanup job already running');
      return;
    }

    try {
      this.task = cron.schedule(schedule, async () => {
        await this.execute();
      });

      logger.info('Cleanup expired reservations job started', {
        schedule,
      });
    } catch (error) {
      logger.error('Error starting cleanup job', {
        error: error.message,
      });
    }
  }

  /**
   * Stop the background job
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task.destroy();
      this.task = null;
      logger.info('Cleanup expired reservations job stopped');
    }
  }

  /**
   * Execute the cleanup logic
   */
  async execute() {
    if (this.isRunning) {
      logger.debug('Cleanup job already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.debug('Starting cleanup of expired reservations');

      // Call inventory service to clean up
      const result = await inventoryService.cleanupExpiredReservations();

      const duration = Date.now() - startTime;

      logger.info('Cleanup job completed successfully', {
        itemsReleased: result.count,
        duration: `${duration}ms`,
      });
    } catch (error) {
      logger.error('Error during cleanup job execution', {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual trigger for cleanup (useful for testing)
   */
  async cleanup() {
    return this.execute();
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isActive: this.task !== null,
      isRunning: this.isRunning,
      createdAt: new Date(),
    };
  }
}

// Export singleton instance
export default new CleanupExpiredReservationsJob();
