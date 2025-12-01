/**
 * Inventory Management Module
 */

class InventoryManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.inventory = [];
    this.filters = { status: 'all', search: '' };
    this.pagination = { page: 1, limit: 20, total: 0 };
  }

  async initialize() {
    this.setupEventListeners();
    await this.loadInventory();
  }

  setupEventListeners() {
    const searchInput = document.querySelector('[data-inventory-search]');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.pagination.page = 1;
        this.loadInventory();
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-inventory-edit-btn]')) {
        const id = e.target.dataset.inventoryId;
        this.openEditModal(id);
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

      const response = await this.api.get('/inventory', params);
      this.inventory = response.inventory || [];
      this.pagination.total = response.total || 0;
      this.renderInventory();
      this.showLoading(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load inventory:', error);
      this.showError('Failed to load inventory: ' + error.message);
      this.showLoading(false);
    }
  }

  renderInventory() {
    const tbody = document.querySelector('[data-inventory-tbody]');
    if (!tbody) return;

    if (this.inventory.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
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

    tbody.innerHTML = this.inventory
      .map((item) => {
        const margin = item.costBasis
          ? (
            ((item.listPrice - item.costBasis) / item.listPrice) *
              100
          ).toFixed(1)
          : '0';
        const statusBadge = this.getStatusBadge(item.status);
        return `
        <tr>
          <td data-label="Record">
            <div class="record-info">
              <span class="record-title">${item.release?.title || 'Unknown'}</span>
              <span class="record-artist">${item.release?.artist || ''}</span>
            </div>
          </td>
          <td data-label="Condition">
            <span class="condition-badge">${item.conditionMedia || 'N/A'} / ${
  item.conditionSleeve || 'N/A'
}</span>
          </td>
          <td data-label="Status">${statusBadge}</td>
          <td data-label="Cost"><span class="price-value">$${parseFloat(
    item.costBasis || 0
  ).toFixed(2)}</span></td>
          <td data-label="List Price"><span class="price-value">$${parseFloat(
    item.listPrice || 0
  ).toFixed(2)}</span></td>
          <td data-label="Margin"><span class="margin-value">${margin}%</span></td>
          <td class="actions">
            <button
              class="button button--sm button--secondary"
              data-inventory-edit-btn
              data-inventory-id="${item.id}"
              aria-label="Edit ${item.release?.title || 'item'}"
            >
              Edit
            </button>
          </td>
        </tr>
      `;
      })
      .join('');

    this.renderPagination();
  }

  /**
   * Get status badge with color coding
   */
  getStatusBadge(status) {
    const statusMap = {
      LIVE: 'live',
      SOLD: 'sold',
      RESERVED: 'reserved',
    };

    const badgeClass = statusMap[status] || 'secondary';
    const label = status || 'UNKNOWN';

    return `<span class="badge badge--${badgeClass}">${label}</span>`;
  }

  /**
   * Render pagination controls
   */
  renderPagination() {
    const container = document.querySelector('[data-inventory-container]');
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
          this.loadInventory();
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
          this.loadInventory();
        }
      });
  }

  async openEditModal(inventoryId) {
    try {
      this.showLoading(true);
      const item = await this.api.get('/inventory/' + inventoryId);
      const modal = document.querySelector('[data-inventory-edit-modal]');
      if (modal) {
        this.renderEditModal(item);
        modal.style.display = 'block';
      }
      this.showLoading(false);
    } catch (error) {
      this.showError('Failed to load inventory item: ' + error.message);
      this.showLoading(false);
    }
  }

  renderEditModal(item) {
    const modalBody = document.querySelector(
      '[data-inventory-edit-modal-body]'
    );
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="inventory-edit-modal">
        <form id="inventoryEditForm">
          <div class="inventory-form-group">
            <label for="editListPrice">List Price</label>
            <input
              type="number"
              id="editListPrice"
              name="listPrice"
              step="0.01"
              value="${parseFloat(item.listPrice || 0).toFixed(2)}"
              required
              aria-label="List price"
            />
          </div>
          <div class="inventory-form-group">
            <label for="editStatus">Status</label>
            <select
              id="editStatus"
              name="status"
              aria-label="Item status"
            >
              <option value="LIVE">LIVE</option>
              <option value="SOLD">SOLD</option>
              <option value="RESERVED">RESERVED</option>
            </select>
          </div>
          <div class="inventory-form-actions">
            <button type="submit" class="button button--primary">
              Save Changes
            </button>
            <button
              type="button"
              class="button button--secondary"
              data-close-inventory-form
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('editStatus').value = item.status || 'LIVE';

    document
      .getElementById('inventoryEditForm')
      .addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await this.updateItem(item.id, data);
      });

    document
      .querySelector('[data-close-inventory-form]')
      ?.addEventListener('click', () => {
        document.querySelector('[data-inventory-edit-modal]').style.display =
          'none';
      });
  }

  async updateItem(inventoryId, data) {
    try {
      this.showLoading(true);
      await this.api.put('/inventory/' + inventoryId, data);
      this.showSuccess('Inventory item updated');
      await this.loadInventory();
      document.querySelector('[data-inventory-edit-modal]').style.display =
        'none';
      this.showLoading(false);
    } catch (error) {
      this.showError('Failed to update inventory item: ' + error.message);
      this.showLoading(false);
    }
  }

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

  showError(message) {
    // eslint-disable-next-line no-console
    console.error('Inventory error:', message);
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.innerHTML = `
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">${message}</div>
    `;

    const container = document.querySelector('[data-inventory-container]');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      setTimeout(() => alertDiv.remove(), 5000);
    }
  }

  showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.innerHTML = `
      <div class="alert-icon">✓</div>
      <div class="alert-content">${message}</div>
    `;

    const container = document.querySelector('[data-inventory-container]');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      setTimeout(() => alertDiv.remove(), 3000);
    }
  }
}

// eslint-disable-next-line no-unused-vars
const inventoryManager = new InventoryManager(api);
