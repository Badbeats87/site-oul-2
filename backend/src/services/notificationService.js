import logger from '../../config/logger.js';

/**
 * Notification Service
 * Handles sending notifications for submission state changes
 * Can be extended to support email, webhooks, SMS, etc.
 */
class NotificationService {
  /**
   * Notify seller of submission state change
   * @param {Object} data - Notification data
   * @param {string} data.submissionId - Submission ID
   * @param {string} data.fromStatus - Previous status
   * @param {string} data.toStatus - New status
   * @param {string} data.changeReason - Reason for change
   */
  async notifySubmissionStateChange(data) {
    try {
      const { submissionId, fromStatus, toStatus, changeReason } = data;

      // Log notification event
      logger.info('Submission state change notification', {
        submissionId,
        fromStatus,
        toStatus,
        changeReason,
      });

      // Build notification message
      const message = this.buildNotificationMessage(
        fromStatus,
        toStatus,
        changeReason
      );

      // TODO: Implement actual notification channels:
      // - Email notification to seller
      // - Webhook notification to external systems
      // - In-app notification
      // - SMS notification (optional)

      // For now, just log the notification
      logger.info('Notification sent', {
        submissionId,
        toStatus,
        message,
      });
    } catch (error) {
      logger.error('Error sending notification', {
        submissionId: data.submissionId,
        error: error.message,
      });
      // Don't throw - notifications should not block main workflow
    }
  }

  /**
   * Build human-readable notification message based on status change
   * @param {string} fromStatus - Previous status
   * @param {string} toStatus - New status
   * @param {string} changeReason - Reason for change
   * @returns {string} Formatted message
   */
  buildNotificationMessage(fromStatus, toStatus, changeReason) {
    const messages = {
      PENDING_REVIEW: 'Your submission is being reviewed',
      COUNTER_OFFERED: 'A counter-offer has been made on your submission',
      ACCEPTED: 'Your submission has been accepted',
      PARTIALLY_ACCEPTED: 'Part of your submission has been accepted',
      REJECTED: 'Your submission has been rejected',
      EXPIRED: 'Your submission has expired',
      COMPLETED: 'Your submission has been completed',
    };

    const baseMessage = messages[toStatus] || `Status changed to ${toStatus}`;
    const reasonText = changeReason ? ` (${changeReason})` : '';

    return `${baseMessage}${reasonText}`;
  }

  /**
   * Notify about counter-offer on item
   * @param {Object} data - Counter-offer data
   * @param {string} data.itemId - Submission item ID
   * @param {number} data.counterOfferPrice - Counter-offer price
   * @param {string} data.itemTitle - Item title for notification
   */
  async notifyCounterOffer(data) {
    try {
      const { itemId, counterOfferPrice, itemTitle } = data;

      logger.info('Counter-offer notification', {
        itemId,
        counterOfferPrice,
        itemTitle,
      });

      // TODO: Send email/notification to seller with counter-offer details
    } catch (error) {
      logger.error('Error sending counter-offer notification', {
        itemId: data.itemId,
        error: error.message,
      });
    }
  }

  /**
   * Notify about quote expiration
   * @param {Object} data - Expiration data
   * @param {string} data.submissionId - Submission ID
   * @param {string} data.sellerEmail - Seller email
   * @param {Date} data.expiresAt - Expiration date
   */
  async notifyQuoteExpiration(data) {
    try {
      const { submissionId, sellerEmail, expiresAt } = data;

      logger.info('Quote expiration notification', {
        submissionId,
        sellerEmail,
        expiresAt,
      });

      // TODO: Send reminder email to seller about upcoming expiration
    } catch (error) {
      logger.error('Error sending expiration notification', {
        submissionId: data.submissionId,
        error: error.message,
      });
    }
  }

  /**
   * Notify admin of new submission
   * @param {Object} data - Submission data
   * @param {string} data.submissionId - Submission ID
   * @param {string} data.sellerName - Seller name
   * @param {number} data.itemCount - Number of items
   * @param {number} data.totalOffered - Total offered amount
   */
  async notifyAdminNewSubmission(data) {
    try {
      const { submissionId, sellerName, itemCount, totalOffered } = data;

      logger.info('New submission admin notification', {
        submissionId,
        sellerName,
        itemCount,
        totalOffered,
      });

      // TODO: Send email/notification to admins about new submission
    } catch (error) {
      logger.error('Error sending admin notification', {
        submissionId: data.submissionId,
        error: error.message,
      });
    }
  }
}

export default new NotificationService();
