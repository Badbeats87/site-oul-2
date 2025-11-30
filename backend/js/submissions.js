/**
 * Submission Queue Management Module
 * Handles submission queue display, filtering, and actions
 */

class SubmissionsManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.submissions = [];
    this.selectedSubmission = null;
    this.filters = {
      status: 'all',
      search: ''
    };
    this.pagination = {
      page: 1,
      limit: 10,
      total: 0
    };
  }

  /**
   * Initialize submissions UI
   */
  async initialize() {
    this.setupEventListeners();
    await this.loadSubmissions();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Search input
    const searchInput = document.querySelector('[data-submissions-search]');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.pagination.page = 1;
        this.loadSubmissions();
      });
    }

    // Status filter
    const statusFilter = document.querySelector('[data-submissions-status-filter]');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.pagination.page = 1;
        this.loadSubmissions();
      });
    }

    // Review buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-submission-review-btn]')) {
        const submissionId = e.target.dataset.submissionId;
        this.openDetailsModal(submissionId);
      }

      if (e.target.matches('[data-submission-accept-btn]')) {
        const submissionId = e.target.dataset.submissionId;
        this.acceptSubmission(submissionId);
      }

      if (e.target.matches('[data-submission-reject-btn]')) {
        const submissionId = e.target.dataset.submissionId;
        this.rejectSubmission(submissionId);
      }

      if (e.target.matches('[data-submission-item-accept]')) {
        const submissionId = e.target.dataset.submissionId;
        const itemId = e.target.dataset.itemId;
        this.acceptItem(submissionId, itemId);
      }

      if (e.target.matches('[data-submission-item-reject]')) {
        const submissionId = e.target.dataset.submissionId;
        const itemId = e.target.dataset.itemId;
        this.rejectItem(submissionId, itemId);
      }

      if (e.target.matches('[data-submission-item-quote]')) {
        const submissionId = e.target.dataset.submissionId;
        const itemId = e.target.dataset.itemId;
        this.openQuoteModal(submissionId, itemId);
      }
    });
  }

  /**
   * Load submissions from API
   */
  async loadSubmissions() {
    try {
      this.showLoading(true);

      const params = {
        page: this.pagination.page,
        limit: this.pagination.limit
      };

      if (this.filters.status !== 'all') {
        params.status = this.filters.status;
      }

      if (this.filters.search) {
        params.search = this.filters.search;
      }

      const response = await this.api.get('/admin/submissions', params);

      this.submissions = response.submissions || [];
      this.pagination.total = response.total || 0;

      this.renderSubmissions();
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to load submissions:', error);
      this.showError('Failed to load submissions: ' + error.message);
      this.showLoading(false);
    }
  }

  /**
   * Render submissions table
   */
  renderSubmissions() {
    const tbody = document.querySelector('[data-submissions-tbody]');
    if (!tbody) return;

    if (this.submissions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: #999;">
            No submissions found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.submissions.map(submission => `
      <tr>
        <td><strong>${submission.id.substring(0, 8)}</strong></td>
        <td>
          ${submission.sellerContact || 'N/A'}<br>
          <span class="text-muted">${submission.sellerName || 'Unknown'}</span>
        </td>
        <td>
          <strong>${submission.items?.length || 0} items</strong><br>
          <span class="text-muted">${this.getItemStats(submission)}</span>
        </td>
        <td><strong>$${parseFloat(submission.totalOffered || 0).toFixed(2)}</strong></td>
        <td>${this.getStatusBadge(submission.status)}</td>
        <td><span class="text-muted">${this.formatDate(submission.createdAt)}</span></td>
        <td>
          <button
            class="button button--sm button--accent"
            data-submission-review-btn
            data-submission-id="${submission.id}"
          >
            Review
          </button>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Get item statistics for display
   */
  getItemStats(submission) {
    if (!submission.items || submission.items.length === 0) return 'No items';

    const accepted = submission.items.filter(i => i.status === 'ACCEPTED').length;
    const pending = submission.items.filter(i => i.status === 'PENDING').length;
    const rejected = submission.items.filter(i => i.status === 'REJECTED').length;

    const parts = [];
    if (pending > 0) parts.push(`${pending} pending`);
    if (accepted > 0) parts.push(`${accepted} accepted`);
    if (rejected > 0) parts.push(`${rejected} rejected`);

    return parts.join(', ') || 'All pending';
  }

  /**
   * Get status badge HTML
   */
  getStatusBadge(status) {
    const statusMap = {
      'PENDING_REVIEW': 'warning',
      'ACCEPTED': 'success',
      'REJECTED': 'danger',
      'PARTIALLY_ACCEPTED': 'info'
    };

    const badgeClass = statusMap[status] || 'secondary';
    const label = status.replace(/_/g, ' ');

    return `<span class="badge badge--${badgeClass}">${label}</span>`;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  /**
   * Open details modal for submission
   */
  async openDetailsModal(submissionId) {
    try {
      this.showLoading(true);

      const submission = await this.api.get(`/admin/submissions/${submissionId}`);
      this.selectedSubmission = submission;

      const modal = document.querySelector('[data-submission-details-modal]');
      if (modal) {
        this.renderDetailsModal(submission);
        modal.style.display = 'block';
      }

      this.showLoading(false);
    } catch (error) {
      console.error('Failed to load submission details:', error);
      this.showError('Failed to load submission details: ' + error.message);
      this.showLoading(false);
    }
  }

  /**
   * Render details modal content
   */
  renderDetailsModal(submission) {
    const modalBody = document.querySelector('[data-submission-details-body]');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="submission-details">
        <div class="details-header">
          <div class="detail-row">
            <span class="label">Seller</span>
            <span class="value">${submission.sellerName || 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="label">Email</span>
            <span class="value">${submission.sellerContact || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="label">Total Value</span>
            <span class="value"><strong>$${parseFloat(submission.totalOffered || 0).toFixed(2)}</strong></span>
          </div>
          <div class="detail-row">
            <span class="label">Status</span>
            <span class="value">${this.getStatusBadge(submission.status)}</span>
          </div>
        </div>

        <div class="submission-items">
          <h3>Items</h3>
          ${this.renderSubmissionItems(submission)}
        </div>

        <div class="submission-actions">
          <button
            class="button button--primary"
            data-submission-accept-btn
            data-submission-id="${submission.id}"
          >
            Accept All
          </button>
          <button
            class="button button--secondary"
            data-submission-reject-btn
            data-submission-id="${submission.id}"
          >
            Reject All
          </button>
          <button
            class="button button--secondary"
            onclick="document.querySelector('[data-submission-details-modal]').style.display='none'"
          >
            Close
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render submission items
   */
  renderSubmissionItems(submission) {
    if (!submission.items || submission.items.length === 0) {
      return '<p>No items in this submission</p>';
    }

    return `
      <table class="table">
        <thead>
          <tr>
            <th>Album</th>
            <th>Condition</th>
            <th>Qty</th>
            <th>Auto Offer</th>
            <th>Counter Offer</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${submission.items.map(item => `
            <tr>
              <td>
                <strong>${item.release?.title || 'Unknown'}</strong><br>
                <span class="text-muted">${item.release?.artist || ''}</span>
              </td>
              <td>${item.sellerConditionMedia}/${item.sellerConditionSleeve}</td>
              <td>${item.quantity}</td>
              <td>$${parseFloat(item.autoOfferPrice || 0).toFixed(2)}</td>
              <td>
                ${item.counterOfferPrice ? `$${parseFloat(item.counterOfferPrice).toFixed(2)}` : '—'}
              </td>
              <td>${this.getStatusBadge(item.status)}</td>
              <td>
                <button
                  class="button button--sm button--secondary"
                  data-submission-item-quote
                  data-submission-id="${submission.id}"
                  data-item-id="${item.id}"
                >
                  Quote
                </button>
                <button
                  class="button button--sm button--success"
                  data-submission-item-accept
                  data-submission-id="${submission.id}"
                  data-item-id="${item.id}"
                >
                  ✓
                </button>
                <button
                  class="button button--sm button--danger"
                  data-submission-item-reject
                  data-submission-id="${submission.id}"
                  data-item-id="${item.id}"
                >
                  ✗
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Accept submission
   */
  async acceptSubmission(submissionId) {
    if (!confirm('Accept this submission?')) return;

    try {
      this.showLoading(true);
      await this.api.post(`/admin/submissions/${submissionId}/accept`, {});
      this.showSuccess('Submission accepted');
      await this.loadSubmissions();
      document.querySelector('[data-submission-details-modal]').style.display = 'none';
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to accept submission:', error);
      this.showError('Failed to accept submission: ' + error.message);
      this.showLoading(false);
    }
  }

  /**
   * Reject submission
   */
  async rejectSubmission(submissionId) {
    if (!confirm('Reject this submission?')) return;

    try {
      this.showLoading(true);
      await this.api.post(`/admin/submissions/${submissionId}/reject`, {});
      this.showSuccess('Submission rejected');
      await this.loadSubmissions();
      document.querySelector('[data-submission-details-modal]').style.display = 'none';
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to reject submission:', error);
      this.showError('Failed to reject submission: ' + error.message);
      this.showLoading(false);
    }
  }

  /**
   * Accept single item
   */
  async acceptItem(submissionId, itemId) {
    try {
      this.showLoading(true);
      await this.api.post(`/admin/submissions/${submissionId}/items/${itemId}/accept`, {});
      this.showSuccess('Item accepted');
      const submission = await this.api.get(`/admin/submissions/${submissionId}`);
      this.selectedSubmission = submission;
      this.renderDetailsModal(submission);
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to accept item:', error);
      this.showError('Failed to accept item: ' + error.message);
      this.showLoading(false);
    }
  }

  /**
   * Reject single item
   */
  async rejectItem(submissionId, itemId) {
    try {
      this.showLoading(true);
      await this.api.post(`/admin/submissions/${submissionId}/items/${itemId}/reject`, {});
      this.showSuccess('Item rejected');
      const submission = await this.api.get(`/admin/submissions/${submissionId}`);
      this.selectedSubmission = submission;
      this.renderDetailsModal(submission);
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to reject item:', error);
      this.showError('Failed to reject item: ' + error.message);
      this.showLoading(false);
    }
  }

  /**
   * Open quote modal
   */
  openQuoteModal(submissionId, itemId) {
    const submission = this.selectedSubmission;
    if (!submission) return;

    const item = submission.items.find(i => i.id === itemId);
    if (!item) return;

    const price = prompt(
      `Enter counter offer price for "${item.release?.title}"\n\nAuto offer: $${parseFloat(item.autoOfferPrice).toFixed(2)}`,
      parseFloat(item.counterOfferPrice || item.autoOfferPrice).toFixed(2)
    );

    if (price !== null) {
      this.updateItemQuote(submissionId, itemId, parseFloat(price));
    }
  }

  /**
   * Update item quote
   */
  async updateItemQuote(submissionId, itemId, price) {
    try {
      this.showLoading(true);
      await this.api.put(`/admin/submissions/${submissionId}/items/${itemId}/quote`, {
        counterOfferPrice: price
      });
      this.showSuccess('Quote updated');
      const submission = await this.api.get(`/admin/submissions/${submissionId}`);
      this.selectedSubmission = submission;
      this.renderDetailsModal(submission);
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to update quote:', error);
      this.showError('Failed to update quote: ' + error.message);
      this.showLoading(false);
    }
  }

  /**
   * Show loading indicator
   */
  showLoading(show) {
    const loader = document.querySelector('[data-loading]');
    if (loader) {
      loader.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.textContent = message;
    alertDiv.style.cssText = 'margin-bottom: 20px; padding: 12px; background: #fee; color: #c33; border-radius: 4px;';

    const container = document.querySelector('[data-submissions-container]');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      setTimeout(() => alertDiv.remove(), 5000);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.textContent = message;
    alertDiv.style.cssText = 'margin-bottom: 20px; padding: 12px; background: #efe; color: #3c3; border-radius: 4px;';

    const container = document.querySelector('[data-submissions-container]');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      setTimeout(() => alertDiv.remove(), 3000);
    }
  }
}

// Create global instance
const submissionsManager = new SubmissionsManager(api);
