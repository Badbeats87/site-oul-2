class SubmissionDetailPage {
  constructor(apiClient) {
    this.api = apiClient;
    this.submissionId = null;
    this.submission = null;
  }

  init() {
    const params = new URLSearchParams(window.location.search);
    this.submissionId = params.get('id');
    this.cacheElements();
    this.bindEvents();

    if (!this.submissionId) {
      this.showError('Missing submission ID in the URL');
      return;
    }

    this.loadSubmission();
  }

  cacheElements() {
    this.summaryEl = document.querySelector('[data-submission-summary]');
    this.itemsContainer = document.querySelector('[data-items-container]');
    this.auditContainer = document.querySelector('[data-audit-container]');
    this.loadingEl = document.querySelector('[data-loading]');
    this.idLabel = document.querySelector('[data-submission-id-display]');
    this.acceptAllBtn = document.querySelector('[data-submission-accept-all]');
    this.rejectAllBtn = document.querySelector('[data-submission-reject-all]');
  }

  bindEvents() {
    if (this.acceptAllBtn) {
      this.acceptAllBtn.addEventListener('click', () => {
        if (!this.submissionId || !confirm('Accept all items in this submission?')) return;
        this.acceptSubmission();
      });
    }

    if (this.rejectAllBtn) {
      this.rejectAllBtn.addEventListener('click', () => {
        if (!this.submissionId || !confirm('Reject all items in this submission?')) return;
        this.rejectSubmission();
      });
    }

    if (this.itemsContainer) {
      this.itemsContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('[data-item-accept]')) {
          this.acceptItem(target.dataset.itemId);
        } else if (target.matches('[data-item-reject]')) {
          this.rejectItem(target.dataset.itemId);
        } else if (target.matches('[data-item-quote]')) {
          this.promptCounterOffer(target.dataset.itemId);
        }
      });
    }
  }

  async loadSubmission() {
    try {
      this.toggleLoading(true);
      this.submission = await this.api.get(`/admin/submissions/${this.submissionId}`);
      this.renderSubmission();
      this.toggleLoading(false);
    } catch (error) {
      console.error('Failed to load submission detail:', error);
      this.showError('Unable to load submission details. Please try again.');
      this.toggleLoading(false);
    }
  }

  renderSubmission() {
    if (!this.submission) return;

    if (this.idLabel) {
      this.idLabel.textContent = `ID: ${this.submission.id}`;
    }

    if (this.summaryEl) {
      this.summaryEl.innerHTML = `
        <div class="summary-grid">
          <div>
            <span class="label">Seller</span>
            <p class="value">${this.submission.sellerName || 'Unknown Seller'}</p>
            <a href="mailto:${this.submission.sellerContact}" class="text-muted">${this.submission.sellerContact || 'N/A'}</a>
          </div>
          <div>
            <span class="label">Status</span>
            <p class="value">${this.getStatusBadge(this.submission.status)}</p>
            <span class="text-muted">${this.formatDate(this.submission.createdAt)}</span>
          </div>
          <div>
            <span class="label">Total Offered</span>
            <p class="value">${this.formatCurrency(this.submission.totalOffered)}</p>
            <span class="text-muted">Accepted: ${this.formatCurrency(this.submission.totalAccepted)}</span>
          </div>
          <div>
            <span class="label">Expires</span>
            <p class="value">${this.formatDate(this.submission.expiresAt)}</p>
            <span class="text-muted">${this.submission.channel || 'direct'}</span>
          </div>
        </div>
      `;
    }

    if (this.acceptAllBtn) {
      this.acceptAllBtn.disabled = !this.submission.items || this.submission.items.length === 0;
    }
    if (this.rejectAllBtn) {
      this.rejectAllBtn.disabled = !this.submission.items || this.submission.items.length === 0;
    }

    this.renderItems();
    this.renderAudits();
  }

  renderItems() {
    if (!this.itemsContainer) return;
    if (!this.submission.items || this.submission.items.length === 0) {
      this.itemsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-title">No items in this submission yet</div>
          <div class="empty-state-message">Items will appear here once the seller sends their list.</div>
        </div>
      `;
      return;
    }

    const rows = this.submission.items
      .map(
        (item) => `
        <tr>
          <td>
            <strong>${item.release?.title || 'Unknown Record'}</strong><br>
            <span class="text-muted">${item.release?.artist || ''}</span>
          </td>
          <td>${item.sellerConditionMedia}/${item.sellerConditionSleeve}</td>
          <td>${item.quantity}</td>
          <td>${this.formatCurrency(item.autoOfferPrice)}</td>
          <td>${item.counterOfferPrice ? this.formatCurrency(item.counterOfferPrice) : '—'}</td>
          <td>${this.getStatusBadge(item.status)}</td>
          <td>
            <div class="action-buttons">
              <button class="button button--sm button--secondary" data-item-quote data-item-id="${item.id}">Quote</button>
              <button class="button button--sm button--success" data-item-accept data-item-id="${item.id}">Accept</button>
              <button class="button button--sm button--danger" data-item-reject data-item-id="${item.id}">Reject</button>
            </div>
          </td>
        </tr>
      `
      )
      .join('');

    this.itemsContainer.innerHTML = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Album</th>
              <th>Condition</th>
              <th>Qty</th>
              <th>Auto Offer</th>
              <th>Counter Offer</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  renderAudits() {
    if (!this.auditContainer) return;
    const audits = this.submission.audits || [];
    if (audits.length === 0) {
      this.auditContainer.innerHTML = '<p class="text-muted">No activity yet.</p>';
      return;
    }

    this.auditContainer.innerHTML = audits
      .map(
        (entry) => `
        <div class="audit-entry">
          <div class="audit-status">${entry.fromStatus} → ${entry.toStatus}</div>
          <div class="audit-meta">
            <span>${this.formatDate(entry.changedAt)}</span>
            <span>${entry.changeReason || 'No reason provided'}</span>
          </div>
        </div>
      `
      )
      .join('');
  }

  async acceptSubmission() {
    try {
      this.toggleLoading(true);
      await this.api.post(`/admin/submissions/${this.submissionId}/accept`, {});
      await this.loadSubmission();
      this.toggleLoading(false);
    } catch (error) {
      this.toggleLoading(false);
      this.showError('Failed to accept submission: ' + error.message);
    }
  }

  async rejectSubmission() {
    try {
      this.toggleLoading(true);
      await this.api.post(`/admin/submissions/${this.submissionId}/reject`, {});
      await this.loadSubmission();
      this.toggleLoading(false);
    } catch (error) {
      this.toggleLoading(false);
      this.showError('Failed to reject submission: ' + error.message);
    }
  }

  async acceptItem(itemId) {
    if (!itemId) return;
    try {
      this.toggleLoading(true);
      await this.api.post(`/admin/submissions/${this.submissionId}/items/${itemId}/accept`, {});
      await this.loadSubmission();
      this.toggleLoading(false);
    } catch (error) {
      this.toggleLoading(false);
      this.showError('Failed to accept item: ' + error.message);
    }
  }

  async rejectItem(itemId) {
    if (!itemId) return;
    try {
      this.toggleLoading(true);
      await this.api.post(`/admin/submissions/${this.submissionId}/items/${itemId}/reject`, {});
      await this.loadSubmission();
      this.toggleLoading(false);
    } catch (error) {
      this.toggleLoading(false);
      this.showError('Failed to reject item: ' + error.message);
    }
  }

  promptCounterOffer(itemId) {
    const item = this.submission?.items?.find((it) => it.id === itemId);
    if (!item) return;
    const current = item.counterOfferPrice || item.autoOfferPrice || 0;
    const value = prompt(
      `Enter counter offer price for \"${item.release?.title || 'record'}\"`,
      parseFloat(current).toFixed(2)
    );
    if (value === null) return;
    const price = parseFloat(value);
    if (Number.isNaN(price) || price < 0) {
      alert('Please enter a valid price');
      return;
    }
    this.updateItemQuote(itemId, price);
  }

  async updateItemQuote(itemId, price) {
    try {
      this.toggleLoading(true);
      await this.api.put(
        `/admin/submissions/${this.submissionId}/items/${itemId}/quote`,
        { counterOfferPrice: price }
      );
      await this.loadSubmission();
      this.toggleLoading(false);
    } catch (error) {
      this.toggleLoading(false);
      this.showError('Failed to update quote: ' + error.message);
    }
  }

  toggleLoading(show) {
    if (!this.loadingEl) return;
    this.loadingEl.style.display = show ? 'flex' : 'none';
  }

  showError(message) {
    if (this.summaryEl) {
      this.summaryEl.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    } else {
      alert(message);
    }
  }

  getStatusBadge(status) {
    if (!status) return '<span class="badge badge--secondary">Unknown</span>';
    const map = {
      PENDING_REVIEW: 'warning',
      COUNTER_OFFERED: 'info',
      ACCEPTED: 'success',
      PARTIALLY_ACCEPTED: 'accent',
      REJECTED: 'danger',
      EXPIRED: 'secondary',
    };
    const cls = map[status] || 'secondary';
    return `<span class="badge badge--${cls}">${status.replace(/_/g, ' ')}</span>`;
  }

  formatCurrency(value) {
    const num = Number(value || 0);
    return `$${num.toFixed(2)}`;
  }

  formatDate(value) {
    if (!value) return 'N/A';
    const date = new Date(value);
    return date.toLocaleString();
  }
}

const submissionDetailPage = new SubmissionDetailPage(api);
document.addEventListener('DOMContentLoaded', () => {
  submissionDetailPage.init();
});
