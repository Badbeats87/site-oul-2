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
      search: '',
    };
    this.pagination = {
      page: 1,
      limit: 10,
      total: 0,
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
    const statusFilter = document.querySelector(
      '[data-submissions-status-filter]'
    );
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
        limit: this.pagination.limit,
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
      // eslint-disable-next-line no-console
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
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">No submissions found</div>
            <div class="empty-state-message">
              Try adjusting your search or filters to find what you're looking for.
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.submissions
      .map(
        (submission) => `
      <tr>
        <td data-label="Submission ID"><strong>${submission.id.substring(0, 8)}</strong></td>
        <td data-label="Seller">
          <div class="seller-info">
            <span class="seller-name">${submission.sellerName || 'Unknown'}</span>
            <a href="mailto:${submission.sellerContact}" class="seller-email">${submission.sellerContact || 'N/A'}</a>
          </div>
        </td>
        <td data-label="Items">
          <div class="item-stats">
            <span class="item-count">${submission.items?.length || 0} items</span>
            <span class="item-breakdown">${this.getItemStats(submission)}</span>
          </div>
        </td>
        <td data-label="Value"><strong>$${parseFloat(submission.totalOffered || 0).toFixed(2)}</strong></td>
        <td data-label="Status">${this.getStatusBadge(submission.status)}</td>
        <td data-label="Submitted"><span class="submission-date">${this.formatDate(submission.createdAt)}</span></td>
        <td class="actions">
          <button
            class="button button--sm button--accent"
            data-submission-review-btn
            data-submission-id="${submission.id}"
            aria-label="Review submission ${submission.id.substring(0, 8)}"
          >
            Review
          </button>
        </td>
      </tr>
    `
      )
      .join('');

    this.renderPagination();
  }

  /**
   * Render pagination controls
   */
  renderPagination() {
    const container = document.querySelector('[data-submissions-container]');
    if (!container) return;

    // Remove existing pagination
    const existingPagination = container.querySelector('.pagination');
    if (existingPagination) {
      existingPagination.remove();
    }

    if (this.pagination.total === 0) return;

    const totalPages = Math.ceil(this.pagination.total / this.pagination.limit);
    const startItem = (this.pagination.page - 1) * this.pagination.limit + 1;
    const endItem = Math.min(
      this.pagination.page * this.pagination.limit,
      this.pagination.total
    );

    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    pagination.innerHTML = `
      <div class="pagination-info">
        Showing ${startItem}-${endItem} of ${this.pagination.total}
      </div>
      <div class="pagination-controls">
        <button
          class="pagination-btn"
          data-pagination-prev
          ${this.pagination.page === 1 ? 'disabled' : ''}
          aria-label="Previous page"
        >
          ← Previous
        </button>
        <span class="pagination-page">
          Page <span data-current-page>${this.pagination.page}</span> of ${totalPages}
        </span>
        <button
          class="pagination-btn"
          data-pagination-next
          ${this.pagination.page >= totalPages ? 'disabled' : ''}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    `;

    container.appendChild(pagination);

    // Add pagination event listeners
    pagination
      .querySelector('[data-pagination-prev]')
      ?.addEventListener('click', () => {
        if (this.pagination.page > 1) {
          this.pagination.page--;
          this.loadSubmissions();
        }
      });

    pagination
      .querySelector('[data-pagination-next]')
      ?.addEventListener('click', () => {
        const totalPages = Math.ceil(
          this.pagination.total / this.pagination.limit
        );
        if (this.pagination.page < totalPages) {
          this.pagination.page++;
          this.loadSubmissions();
        }
      });
  }

  /**
   * Get item statistics for display
   */
  getItemStats(submission) {
    if (!submission.items || submission.items.length === 0) return 'No items';

    const accepted = submission.items.filter(
      (i) => i.status === 'ACCEPTED'
    ).length;
    const pending = submission.items.filter(
      (i) => i.status === 'PENDING'
    ).length;
    const rejected = submission.items.filter(
      (i) => i.status === 'REJECTED'
    ).length;

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
      PENDING_REVIEW: 'warning',
      ACCEPTED: 'success',
      REJECTED: 'danger',
      PARTIALLY_ACCEPTED: 'info',
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

      const submission = await this.api.get(
        `/admin/submissions/${submissionId}`
      );
      this.selectedSubmission = submission;

      const modal = document.querySelector('[data-submission-details-modal]');
      if (modal) {
        this.renderDetailsModal(submission);
        modal.style.display = 'block';
      }

      this.showLoading(false);
    } catch (error) {
      // eslint-disable-next-line no-console
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
            <span class="value">
              <a href="mailto:${submission.sellerContact}" style="color: var(--color-accent);">
                ${submission.sellerContact || 'N/A'}
              </a>
            </span>
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
            aria-label="Accept all items in this submission"
          >
            Accept All
          </button>
          <button
            class="button button--secondary"
            data-submission-reject-btn
            data-submission-id="${submission.id}"
            aria-label="Reject all items in this submission"
          >
            Reject All
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

    // eslint-disable-next-line indent
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
          ${submission.items
    .map(
      (item) => `
              <tr>
                <td data-label="Album">
                  <strong>${item.release?.title || 'Unknown'}</strong><br>
                  <span class="text-muted">${item.release?.artist || ''}</span>
                </td>
                <td data-label="Condition">${item.sellerConditionMedia}/${item.sellerConditionSleeve}</td>
                <td data-label="Qty">${item.quantity}</td>
                <td data-label="Auto Offer">$${parseFloat(item.autoOfferPrice || 0).toFixed(2)}</td>
                <td data-label="Counter Offer">
                  ${item.counterOfferPrice ? `$${parseFloat(item.counterOfferPrice).toFixed(2)}` : '—'}
                </td>
                <td data-label="Status">${this.getStatusBadge(item.status)}</td>
                <td data-label="Actions" class="item-actions">
                  <button
                    class="button button--sm button--secondary"
                    data-submission-item-quote
                    data-submission-id="${submission.id}"
                    data-item-id="${item.id}"
                    aria-label="Set quote for ${item.release?.title || 'item'}"
                  >
                    Quote
                  </button>
                  <button
                    class="button button--sm button--success"
                    data-submission-item-accept
                    data-submission-id="${submission.id}"
                    data-item-id="${item.id}"
                    aria-label="Accept ${item.release?.title || 'item'}"
                    title="Accept this item"
                  >
                    ✓ Accept
                  </button>
                  <button
                    class="button button--sm button--danger"
                    data-submission-item-reject
                    data-submission-id="${submission.id}"
                    data-item-id="${item.id}"
                    aria-label="Reject ${item.release?.title || 'item'}"
                    title="Reject this item"
                  >
                    ✗ Reject
                  </button>
                </td>
              </tr>
            `
    )
    .join('')}
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
      document.querySelector('[data-submission-details-modal]').style.display =
        'none';
      this.showLoading(false);
    } catch (error) {
      // eslint-disable-next-line no-console
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
      document.querySelector('[data-submission-details-modal]').style.display =
        'none';
      this.showLoading(false);
    } catch (error) {
      // eslint-disable-next-line no-console
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
      await this.api.post(
        `/admin/submissions/${submissionId}/items/${itemId}/accept`,
        {}
      );
      this.showSuccess('Item accepted');
      const submission = await this.api.get(
        `/admin/submissions/${submissionId}`
      );
      this.selectedSubmission = submission;
      this.renderDetailsModal(submission);
      this.showLoading(false);
    } catch (error) {
      // eslint-disable-next-line no-console
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
      await this.api.post(
        `/admin/submissions/${submissionId}/items/${itemId}/reject`,
        {}
      );
      this.showSuccess('Item rejected');
      const submission = await this.api.get(
        `/admin/submissions/${submissionId}`
      );
      this.selectedSubmission = submission;
      this.renderDetailsModal(submission);
      this.showLoading(false);
    } catch (error) {
      // eslint-disable-next-line no-console
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

    const item = submission.items.find((i) => i.id === itemId);
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
      await this.api.put(
        `/admin/submissions/${submissionId}/items/${itemId}/quote`,
        {
          counterOfferPrice: price,
        }
      );
      this.showSuccess('Quote updated');
      const submission = await this.api.get(
        `/admin/submissions/${submissionId}`
      );
      this.selectedSubmission = submission;
      this.renderDetailsModal(submission);
      this.showLoading(false);
    } catch (error) {
      // eslint-disable-next-line no-console
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
      if (show) {
        loader.innerHTML =
          '<div class="loading-spinner"></div><div style="margin-top: 10px;">Loading...</div>';
        loader.style.display = 'flex';
        loader.style.flexDirection = 'column';
        loader.style.alignItems = 'center';
        loader.style.justifyContent = 'center';
      } else {
        loader.style.display = 'none';
      }
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.innerHTML = `
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">${message}</div>
    `;

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
    alertDiv.innerHTML = `
      <div class="alert-icon">✓</div>
      <div class="alert-content">${message}</div>
    `;

    const container = document.querySelector('[data-submissions-container]');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      setTimeout(() => alertDiv.remove(), 3000);
    }
  }
}

// Create global instance
// eslint-disable-next-line no-unused-vars
const submissionsManager = new SubmissionsManager(api);
