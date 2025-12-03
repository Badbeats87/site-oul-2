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
          window.open(`/admin/submission.html?id=${submissionId}`, '_blank');
        }
      }

      if (event.target.matches('[data-discogs-fetch]')) {
        const row = event.target.closest('tr[data-row-id]');
        if (!row) return;
        const discogsInput = row.querySelector('[data-release-field="discogsId"]');
        let discogsId = discogsInput?.value?.trim();
        if (!discogsId) {
          discogsId = event.target.dataset.discogsId?.trim() || '';
        }
        if (!discogsId) {
          this.showError('No Discogs ID available for this release yet');
          return;
        }
        this.loadDiscogsSuggestions(row, discogsId);
      }

      if (event.target.matches('[data-apply-suggestion]')) {
        const row = event.target.closest('tr[data-row-id]');
        if (!row) return;
        const field = event.target.dataset.field;
        const rawValue = event.target.dataset.value || '';
        const value = decodeURIComponent(rawValue);
        this.applySuggestion(row, field, value);
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
          <td colspan="17" class="empty-state">
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
    const release = item.release || {};
    const discogsLink = release.discogsId
      ? `https://www.discogs.com/release/${release.discogsId}`
      : null;
    const submissionDetail = item.submission
      ? `
        <div class="table-meta">${item.submission.sellerName || ''}</div>
        <button class="button button--sm button--ghost"
          data-inventory-view-submission
          data-submission-id="${item.submission.submissionId}">
          View
        </button>`
      : '<span class="text-muted">—</span>';

    return `
      <tr data-row-id="${item.id}">
        <td>
          <div class="table-title">${release.title || 'Unknown Record'}</div>
          <div class="table-meta text-muted">${release.releaseYear || 'Year N/A'}</div>
        </td>
        <td>${release.artist || '—'}</td>
        <td>
          <input type="text" class="table-input" data-release-field="label" value="${release.label || ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="label"></div>
        </td>
        <td>
          <input type="text" class="table-input" data-release-field="catalogNumber" value="${release.catalogNumber || ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="catalogNumber"></div>
        </td>
        <td>
          <input type="number" class="table-input" data-release-field="releaseYear" value="${release.releaseYear ?? ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="releaseYear"></div>
        </td>
        <td>
          <input type="text" class="table-input" data-release-field="genre" value="${release.genre || ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="genre"></div>
        </td>
        <td>
          <input type="text" class="table-input" data-release-field="description" value="${release.description || ''}" placeholder="Variant / version">
          <div class="table-meta suggestion-hint" data-suggestion-for="description"></div>
        </td>
        <td><input type="text" class="table-input" data-field="sku" value="${item.sku || ''}"></td>
        <td>${item.channel || '—'}</td>
        <td>${item.conditionMedia || 'N/A'} / ${item.conditionSleeve || 'N/A'}</td>
        <td>${this.renderStatusSelect(item.status)}</td>
        <td class="numeric">${this.formatCurrency(item.costBasis)}</td>
        <td>
          <input type="number" min="0" step="0.01" class="table-input" data-field="listPrice" value="${item.listPrice ?? ''}">
          <div class="table-meta text-muted">Margin ${margin}%</div>
        </td>
        <td>
          <input type="number" min="0" step="0.01" class="table-input" data-field="salePrice" value="${item.salePrice ?? ''}">
        </td>
        <td>
          <div class="table-discogs">
            <input type="number" class="table-input" data-release-field="discogsId" value="${release.discogsId ?? ''}" placeholder="Discogs ID">
            <button type="button" class="button button--ghost button--sm" data-discogs-fetch data-discogs-id="${release.discogsId ?? ''}">Fetch</button>
          </div>
          <div class="table-meta">
            ${
              discogsLink
                ? `<a href="${discogsLink}" target="_blank" rel="noopener">Open</a>`
                : '<span class="text-muted">No link</span>'
            }
          </div>
        </td>
        <td>${submissionDetail}</td>
        <td>
          <button class="button button--sm button--primary" data-inventory-save data-inventory-id="${item.id}">
            Save
          </button>
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

    const releasePayload = {};
    const releaseFields = ['label', 'catalogNumber', 'genre', 'description'];
    releaseFields.forEach((field) => {
      const input = row.querySelector(`[data-release-field="${field}"]`);
      if (input) {
        releasePayload[field] = input.value?.trim() || null;
      }
    });
    const releaseYearInput = row.querySelector('[data-release-field="releaseYear"]');
    if (releaseYearInput) {
      if (releaseYearInput.value === '') {
        releasePayload.releaseYear = null;
      } else {
        const parsedYear = parseInt(releaseYearInput.value, 10);
        releasePayload.releaseYear = Number.isNaN(parsedYear) ? null : parsedYear;
      }
    }
    const discogsInput = row.querySelector('[data-release-field="discogsId"]');
    if (discogsInput) {
      if (discogsInput.value === '') {
        releasePayload.discogsId = null;
      } else {
        const parsedDiscogs = parseInt(discogsInput.value, 10);
        releasePayload.discogsId = Number.isNaN(parsedDiscogs) ? null : parsedDiscogs;
      }
    }
    const sanitizedRelease = Object.fromEntries(
      Object.entries(releasePayload).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(sanitizedRelease).length > 0) {
      payload.release = sanitizedRelease;
    }

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

  async loadDiscogsSuggestions(row, discogsId) {
    try {
      this.showLoading(true);
      const release = await this.api.get(`/integrations/discogs/releases/${discogsId}`);
      const suggestions = this.extractDiscogsSuggestions(release);
      const discogsInput = row.querySelector('[data-release-field="discogsId"]');
      if (discogsInput && !discogsInput.value) {
        discogsInput.value = discogsId;
      }
      const fetchButton = row.querySelector('[data-discogs-fetch]');
      if (fetchButton) {
        fetchButton.dataset.discogsId = release?.id || discogsId;
      }
      this.showDiscogsSuggestions(row, suggestions);
      this.showSuccess('Discogs suggestions loaded');
    } catch (error) {
      console.error('Discogs fetch failed', error);
      this.showError('Failed to load Discogs data: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  extractDiscogsSuggestions(release) {
    const primaryLabel = release?.labels?.[0];
    const year =
      release?.year ||
      (release?.released ? parseInt(release.released.split('-')[0], 10) : null);
    const genreValue =
      release?.genres?.join(', ') ||
      release?.styles?.join(', ') ||
      null;

    return {
      label: primaryLabel?.name || null,
      catalogNumber: primaryLabel?.catno || null,
      releaseYear: year ? String(year) : null,
      genre: genreValue,
      description: release?.notes || null,
    };
  }

  showDiscogsSuggestions(row, suggestions) {
    Object.entries(suggestions).forEach(([field, value]) => {
      const hint = row.querySelector(`[data-suggestion-for="${field}"]`);
      if (!hint) return;

      if (!value) {
        hint.classList.remove('is-visible');
        hint.innerHTML = '';
        return;
      }

      const encodedValue = encodeURIComponent(value);
      hint.innerHTML = `
        Discogs: <strong>${this.escapeHtml(value)}</strong>
        <button type="button"
          class="button button--ghost button--sm"
          data-apply-suggestion
          data-field="${field}"
          data-value="${encodedValue}">
          Apply
        </button>
      `;
      hint.classList.add('is-visible');
    });
  }

  applySuggestion(row, field, value) {
    if (!field) return;
    const target =
      row.querySelector(`[data-release-field="${field}"]`) ||
      row.querySelector(`[data-field="${field}"]`);
    if (!target) return;
    if (field === 'releaseYear' && value) {
      const parsed = parseInt(value, 10);
      target.value = Number.isNaN(parsed) ? '' : parsed;
    } else {
      target.value = value ?? '';
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

function createFallbackApi() {
  const base = '/api/v1';

  async function request(method, endpoint, body, params) {
    const url = new URL(`${base}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .forEach(([key, value]) => url.searchParams.append(key, value));
    }

    const response = await fetch(url.toString(), {
      method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data?.error?.message || data?.error || response.statusText || 'Request failed'
      );
    }
    return data.data || data;
  }

  return {
    get(endpoint, params) {
      return request('GET', endpoint, null, params);
    },
    put(endpoint, payload) {
      return request('PUT', endpoint, payload);
    },
  };
}

const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
const inventoryApi = typeof api !== 'undefined' ? api : createFallbackApi();
const inventoryManager = new InventoryManager(inventoryApi);
document.addEventListener('DOMContentLoaded', () => {
  inventoryManager.initialize();
});
