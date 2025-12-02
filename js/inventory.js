/**
 * Inventory Management Module
 */
class InventoryManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.inventory = [];
    this.filters = {
      search: '',
      status: 'all',
      condition: 'all',
      minPrice: '',
      maxPrice: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    this.pagination = { page: 1, limit: 20, total: 0 };
  }

  async initialize() {
    this.cacheElements();
    this.setupEventListeners();
    await this.loadInventory();
  }

  cacheElements() {
    this.searchInput = document.querySelector('[data-inventory-search]');
    this.statusFilter = document.querySelector('[data-inventory-status-filter]');
    this.conditionFilter = document.querySelector('[data-inventory-condition-filter]');
    this.minPriceInput = document.querySelector('[data-inventory-min-price]');
    this.maxPriceInput = document.querySelector('[data-inventory-max-price]');
    this.sortSelect = document.querySelector('[data-inventory-sort]');
    this.tbody = document.querySelector('[data-inventory-tbody]');
    this.container = document.querySelector('[data-inventory-container]');
    this.loader = document.querySelector('[data-loading]');
  }

  setupEventListeners() {
    if (this.searchInput) {
      this.searchInput.addEventListener(
        'input',
        this.debounce((e) => {
          this.filters.search = e.target.value;
          this.pagination.page = 1;
          this.loadInventory();
        }, 300)
      );
    }

    if (this.statusFilter) {
      this.statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.pagination.page = 1;
        this.loadInventory();
      });
    }

    if (this.conditionFilter) {
      this.conditionFilter.addEventListener('change', (e) => {
        this.filters.condition = e.target.value;
        this.pagination.page = 1;
        this.loadInventory();
      });
    }

    if (this.minPriceInput) {
      this.minPriceInput.addEventListener('change', (e) => {
        this.filters.minPrice = e.target.value;
        this.pagination.page = 1;
        this.loadInventory();
      });
    }

    if (this.maxPriceInput) {
      this.maxPriceInput.addEventListener('change', (e) => {
        this.filters.maxPrice = e.target.value;
        this.pagination.page = 1;
        this.loadInventory();
      });
    }

    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        const value = e.target.value || 'createdAt:desc';
        const [sortBy, sortOrder] = value.split(':');
        this.filters.sortBy = sortBy;
        this.filters.sortOrder = sortOrder;
        this.pagination.page = 1;
        this.loadInventory();
      });
    }

    document.addEventListener('click', (event) => {
      if (event.target.matches('[data-inventory-save]')) {
        this.saveRow(event.target.dataset.inventoryId);
      }

      if (event.target.matches('[data-inventory-view-submission]')) {
        const submissionId = event.target.dataset.submissionId;
        if (submissionId) {
          window.open(`submission.html?id=${submissionId}`, '_blank');
        }
      }
    });
  }

  async loadInventory() {
    try {
      this.showLoading(true);
      const params = {
        page: this.pagination.page,
        limit: this.pagination.limit,
      };
      if (this.filters.search) params.search = this.filters.search;
      if (this.filters.status !== 'all') params.status = this.filters.status;
      if (this.filters.condition !== 'all') params.conditions = this.filters.condition;
      if (this.filters.minPrice) params.minPrice = this.filters.minPrice;
      if (this.filters.maxPrice) params.maxPrice = this.filters.maxPrice;
      params.sortBy = this.filters.sortBy;
      params.sortOrder = this.filters.sortOrder;

      const response = await this.api.get('/inventory', params);
      this.inventory = response.inventory || [];
      this.pagination.total = response.pagination?.total ?? response.total ?? 0;
      this.renderInventory();
      this.renderPagination();
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      this.showError('Failed to load inventory: ' + error.message);
      this.showLoading(false);
    }
  }

  renderInventory() {
    if (!this.tbody) return;
    if (this.inventory.length === 0) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <div class="empty-state-icon">📦</div>
            <div class="empty-state-title">No inventory items found</div>
            <div class="empty-state-message">
              Try adjusting your search or filters to find what you're looking for.
            </div>
          </td>
        </tr>
      `;
      return;
    }

    this.tbody.innerHTML = this.inventory.map((item) => this.renderRow(item)).join('');
  }

  renderRow(item) {
    const margin = this.calculateMargin(item);
    const submissionDetail = item.submission
      ? `<button class="button button--sm button--ghost"
           data-inventory-view-submission
           data-submission-id="${item.submission.submissionId}">
            View Submission
         </button>
         <div class="text-muted">${item.submission.sellerName || ''}</div>`
      : '<span class="text-muted">Manual entry</span>';

    return `
      <tr data-row-id="${item.id}">
        <td>
          <div class="record-cell">
            <div class="record-thumb">
              ${
  item.release?.coverArtUrl
    ? `<img src="${item.release.coverArtUrl}" alt="${item.release?.title || 'Record'}">`
    : '<div class="record-thumb__placeholder">♫</div>'
}
            </div>
            <div>
              <div class="record-title">${item.release?.title || 'Unknown Record'}</div>
              <div class="record-meta">${item.release?.artist || ''} • ${item.release?.releaseYear || 'Year N/A'}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="stacked">
            <label>Label</label>
            <input type="text" value="${item.release?.label || ''}" readonly>
            <label>Catalog #</label>
            <input type="text" value="${item.release?.catalogNumber || ''}" readonly>
          </div>
        </td>
        <td>
          <div class="stacked">
            <label>SKU</label>
            <input type="text" data-field="sku" value="${item.sku || ''}">
            <label>Channel</label>
            <input type="text" value="${item.channel || ''}" disabled>
          </div>
        </td>
        <td>
          <span class="condition-badge">${item.conditionMedia || 'N/A'} / ${item.conditionSleeve || 'N/A'}</span>
        </td>
        <td>
          <div class="stacked">
            <label>Status</label>
            ${this.renderStatusSelect(item.status)}
          </div>
        </td>
        <td>
          <div class="pricing-grid">
            <label>Cost</label>
            <input type="number" value="${item.costBasis ?? ''}" disabled>
            <label>List Price</label>
            <input type="number" min="0" step="0.01" data-field="listPrice" value="${item.listPrice ?? ''}">
            <label>Sale Price</label>
            <input type="number" min="0" step="0.01" data-field="salePrice" value="${item.salePrice ?? ''}">
            <label>Margin</label>
            <input type="text" value="${margin}%" readonly>
          </div>
        </td>
        <td>
          <div class="stacked">
            <div><span class="text-muted">Listed</span> ${this.formatDate(item.listedAt) || 'Not listed'}</div>
            <div><span class="text-muted">Sold</span> ${this.formatRelative(item.soldAt)}</div>
          </div>
        </td>
        <td>
          <div class="stacked">
            ${submissionDetail}
            <button class="button button--sm button--primary" data-inventory-save data-inventory-id="${item.id}">
              Save
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  renderStatusSelect(value) {
    const options = ['DRAFT', 'LIVE', 'RESERVED', 'SOLD', 'REMOVED', 'RETURNED'];
    return `
      <select class="filter-select" data-field="status">
        ${options
    .map(
      (opt) => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
    )
    .join('')}
      </select>
    `;
  }

  renderPagination() {
    if (!this.container) return;
    const existing = this.container.querySelector('.pagination');
    if (existing) existing.remove();
    if (this.pagination.total === 0) return;

    const totalPages = Math.ceil(this.pagination.total / this.pagination.limit);
    const start = (this.pagination.page - 1) * this.pagination.limit + 1;
    const end = Math.min(this.pagination.page * this.pagination.limit, this.pagination.total);

    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    pagination.innerHTML = `
      <div class="pagination-info">
        Showing ${start}-${end} of ${this.pagination.total}
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" data-pagination-prev ${this.pagination.page === 1 ? 'disabled' : ''}>
          ← Previous
        </button>
        <span class="pagination-page">
          Page <span data-current-page>${this.pagination.page}</span> of ${totalPages}
        </span>
        <button class="pagination-btn" data-pagination-next ${this.pagination.page >= totalPages ? 'disabled' : ''}>
          Next →
        </button>
      </div>
    `;

    this.container.appendChild(pagination);

    pagination.querySelector('[data-pagination-prev]')?.addEventListener('click', () => {
      if (this.pagination.page > 1) {
        this.pagination.page -= 1;
        this.loadInventory();
      }
    });

    pagination.querySelector('[data-pagination-next]')?.addEventListener('click', () => {
      const maxPages = Math.ceil(this.pagination.total / this.pagination.limit);
      if (this.pagination.page < maxPages) {
        this.pagination.page += 1;
        this.loadInventory();
      }
    });
  }

  async saveRow(inventoryId) {
    if (!inventoryId) return;
    const row = this.tbody?.querySelector(`[data-row-id="${inventoryId}"]`);
    if (!row) return;

    const sku = row.querySelector('[data-field="sku"]')?.value?.trim();
    const listPriceValue = row.querySelector('[data-field="listPrice"]')?.value;
    const salePriceValue = row.querySelector('[data-field="salePrice"]')?.value;
    const statusValue = row.querySelector('[data-field="status"]')?.value;

    const payload = {
      sku: sku || null,
      listPrice: listPriceValue ? parseFloat(listPriceValue) : null,
      salePrice: salePriceValue ? parseFloat(salePriceValue) : null,
      status: statusValue,
    };

    try {
      this.showLoading(true);
      await this.api.put(`/inventory/${inventoryId}`, payload);
      this.showSuccess('Inventory item updated');
      await this.loadInventory();
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to update inventory item:', error);
      this.showError('Failed to update item: ' + error.message);
      this.showLoading(false);
    }
  }

  showLoading(show) {
    if (this.loader) {
      this.loader.style.display = show ? 'block' : 'none';
    }
  }

  showError(message) {
    if (!this.container) return;
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.textContent = message;
    alertDiv.style.cssText = 'margin-bottom: 20px; padding: 12px; background: #fee; color: #c33; border-radius: 4px;';
    this.container.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
  }

  showSuccess(message) {
    if (!this.container) return;
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.textContent = message;
    alertDiv.style.cssText =
      'margin-bottom: 20px; padding: 12px; background: #e6ffed; color: #0f5132; border-radius: 4px;';
    this.container.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 4000);
  }

  calculateMargin(item) {
    if (!item.costBasis || !item.listPrice || Number(item.listPrice) === 0) {
      return '0.0';
    }
    const margin = ((item.listPrice - item.costBasis) / item.listPrice) * 100;
    return margin.toFixed(1);
  }

  formatCurrency(value) {
    if (value === null || value === undefined) return '$0.00';
    return `$${Number(value).toFixed(2)}`;
  }

  formatDate(value) {
    if (!value) return null;
    return new Date(value).toLocaleDateString();
  }

  formatRelative(value) {
    if (!value) return '—';
    const date = new Date(value);
    const now = new Date();
    const diff = now - date;
    const diffDays = Math.floor(diff / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }
}

const inventoryApi = typeof api !== 'undefined' ? api : window.api;
const inventoryManager = new InventoryManager(inventoryApi);
document.addEventListener('DOMContentLoaded', () => {
  inventoryManager.initialize();
});
