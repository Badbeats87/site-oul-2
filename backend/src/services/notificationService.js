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
   * Notify seller about inventory creation from accepted submission
   * @param {Object} data - Inventory data
   * @param {string} data.submissionId - Submission ID
   * @param {string} data.sellerEmail - Seller email
   * @param {number} data.itemCount - Number of items converted to inventory
   * @param {number} data.totalInventoryValue - Total value of created inventory
   */
  async notifyInventoryCreated(data) {
    try {
      const { submissionId, sellerEmail, itemCount, totalInventoryValue } =
        data;

      logger.info('Inventory creation notification', {
        submissionId,
        sellerEmail,
        itemCount,
        totalInventoryValue,
      });

      // TODO: Send email to seller confirming inventory creation
      // Message could include:
      // - Number of items accepted and added to inventory
      // - Total value of the accepted items
      // - Next steps for tracking/selling
    } catch (error) {
      logger.error('Error sending inventory notification', {
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

  // ============================================================================
  // SHIPPING NOTIFICATIONS
  // ============================================================================

  /**
   * Notify buyer that order has shipped
   * @param {Object} data - Shipment data
   * @param {string} data.buyerEmail - Buyer email address
   * @param {string} data.orderNumber - Order number (e.g., OUL-20251130-0001)
   * @param {string} data.trackingNumber - Tracking number
   * @param {string} data.carrier - Carrier name (MOCK, USPS, UPS, etc.)
   * @param {string} data.shippingMethod - Shipping method (STANDARD, EXPRESS, OVERNIGHT)
   * @param {string} data.estimatedDelivery - Estimated delivery date
   */
  async notifyOrderShipped(data) {
    try {
      const {
        buyerEmail,
        orderNumber,
        trackingNumber,
        carrier,
        shippingMethod,
        estimatedDelivery,
      } = data;

      logger.info('Order shipped notification', {
        buyerEmail,
        orderNumber,
        trackingNumber,
        carrier,
        shippingMethod,
        estimatedDelivery,
      });

      // TODO: Send shipping confirmation email to buyer
      // Template variables:
      // - Order number and link
      // - Tracking number with link to carrier
      // - Carrier name
      // - Estimated delivery date
      // - CTA to track package
    } catch (error) {
      logger.error('Error sending order shipped notification', {
        buyerEmail: data.buyerEmail,
        error: error.message,
      });
    }
  }

  /**
   * Notify buyer that package is out for delivery
   * @param {Object} data - Tracking data
   * @param {string} data.buyerEmail - Buyer email
   * @param {string} data.orderNumber - Order number
   * @param {string} data.trackingNumber - Tracking number
   * @param {string} data.deliveryWindow - Expected delivery window
   */
  async notifyOutForDelivery(data) {
    try {
      const { buyerEmail, orderNumber, trackingNumber, deliveryWindow } = data;

      logger.info('Out for delivery notification', {
        buyerEmail,
        orderNumber,
        trackingNumber,
        deliveryWindow,
      });

      // TODO: Send out-for-delivery notification to buyer
      // Urgent notification: package arriving today/soon
    } catch (error) {
      logger.error('Error sending out-for-delivery notification', {
        buyerEmail: data.buyerEmail,
        error: error.message,
      });
    }
  }

  /**
   * Notify buyer that package has been delivered
   * @param {Object} data - Delivery data
   * @param {string} data.buyerEmail - Buyer email
   * @param {string} data.orderNumber - Order number
   * @param {string} data.trackingNumber - Tracking number
   * @param {string} data.deliveryTime - Delivery timestamp
   * @param {string} data.deliveryLocation - Where package was left
   */
  async notifyDelivered(data) {
    try {
      const {
        buyerEmail,
        orderNumber,
        trackingNumber,
        deliveryTime,
        deliveryLocation,
      } = data;

      logger.info('Delivered notification', {
        buyerEmail,
        orderNumber,
        trackingNumber,
        deliveryTime,
        deliveryLocation,
      });

      // TODO: Send delivery confirmation email
      // Include:
      // - Delivery confirmation
      // - Link to order
      // - Instructions for returns (if applicable)
    } catch (error) {
      logger.error('Error sending delivered notification', {
        buyerEmail: data.buyerEmail,
        error: error.message,
      });
    }
  }

  /**
   * Notify buyer of tracking update
   * @param {Object} data - Tracking update data
   * @param {string} data.buyerEmail - Buyer email
   * @param {string} data.orderNumber - Order number
   * @param {string} data.trackingNumber - Tracking number
   * @param {string} data.status - New tracking status
   * @param {string} data.location - Current package location
   * @param {string} data.message - Status message
   */
  async notifyTrackingUpdate(data) {
    try {
      const {
        buyerEmail,
        orderNumber,
        trackingNumber,
        status,
        location,
        message,
      } = data;

      logger.info('Tracking update notification', {
        buyerEmail,
        orderNumber,
        trackingNumber,
        status,
        location,
      });

      // TODO: Send tracking update notification
      // Could be email or SMS depending on preference
    } catch (error) {
      logger.error('Error sending tracking update notification', {
        buyerEmail: data.buyerEmail,
        error: error.message,
      });
    }
  }

  /**
   * Notify buyer of delivery exception (lost, delayed, etc.)
   * @param {Object} data - Exception data
   * @param {string} data.buyerEmail - Buyer email
   * @param {string} data.orderNumber - Order number
   * @param {string} data.trackingNumber - Tracking number
   * @param {string} data.exceptionType - Type of exception (LOST, DELAYED, DAMAGED)
   * @param {string} data.details - Exception details
   * @param {string} data.contactInfo - Support contact info
   */
  async notifyDeliveryException(data) {
    try {
      const {
        buyerEmail,
        orderNumber,
        trackingNumber,
        exceptionType,
        details,
        contactInfo,
      } = data;

      logger.info('Delivery exception notification', {
        buyerEmail,
        orderNumber,
        trackingNumber,
        exceptionType,
      });

      // TODO: Send alert email about delivery issue
      // Include support contact information
    } catch (error) {
      logger.error('Error sending delivery exception notification', {
        buyerEmail: data.buyerEmail,
        error: error.message,
      });
    }
  }

  /**
   * Notify admin of fulfillment action needed
   * @param {Object} data - Admin notification data
   * @param {string} data.actionType - Type of action (LABEL_GENERATED, APPROVAL_NEEDED, ISSUE)
   * @param {string} data.orderId - Order ID
   * @param {string} data.orderNumber - Order number
   * @param {string} data.itemCount - Number of items
   * @param {string} data.details - Additional details
   */
  async notifyAdminFulfillmentAction(data) {
    try {
      const { actionType, orderId, orderNumber, itemCount, details } = data;

      logger.info('Admin fulfillment notification', {
        actionType,
        orderId,
        orderNumber,
        itemCount,
      });

      // TODO: Send notification to fulfillment team
      // Different templates based on actionType
    } catch (error) {
      logger.error('Error sending admin fulfillment notification', {
        orderId: data.orderId,
        error: error.message,
      });
    }
  }
}

export default new NotificationService();
