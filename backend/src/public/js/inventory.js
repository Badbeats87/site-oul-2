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
      console.error('Failed to load inventory:', error);
      this.showError('Failed to load inventory: ' + error.message);
      this.showLoading(false);
    }
  }

  renderInventory() {
    const tbody = document.querySelector('[data-inventory-tbody]');
    if (!tbody) return;

    if (this.inventory.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">No inventory items found</td></tr>';
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
        return (
          '<tr><td><strong>' +
          (item.release?.title || 'Unknown') +
          '</strong><br><span class="text-muted">' +
          (item.release?.artist || '') +
          '</span></td><td>' +
          (item.conditionMedia || 'N/A') +
          ' / ' +
          (item.conditionSleeve || 'N/A') +
          '</td><td>' +
          (item.status || 'UNKNOWN') +
          '</td><td>$' +
          parseFloat(item.costBasis || 0).toFixed(2) +
          '</td><td>$' +
          parseFloat(item.listPrice || 0).toFixed(2) +
          '</td><td>' +
          margin +
          '%</td><td><button class="button button--sm button--secondary" data-inventory-edit-btn data-inventory-id="' +
          item.id +
          '">Edit</button></td></tr>'
        );
      })
      .join('');
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

    const html =
      '<form id="inventoryEditForm"><div class="form-group"><label for="editListPrice">List Price</label><input type="number" id="editListPrice" name="listPrice" step="0.01" value="' +
      parseFloat(item.listPrice || 0).toFixed(2) +
      '" required></div><div class="form-group"><label for="editStatus">Status</label><select id="editStatus" name="status"><option value="LIVE">LIVE</option><option value="SOLD">SOLD</option><option value="RESERVED">RESERVED</option></select></div><div class="form-actions" style="display: flex; gap: 10px; margin-top: 20px;"><button type="submit" class="button button--primary">Save</button><button type="button" class="button button--secondary" onclick="document.querySelector(\'[data-inventory-edit-modal]\').style.display=\'none\'">Cancel</button></div></form>';
    modalBody.innerHTML = html;

    document.getElementById('editStatus').value = item.status || 'LIVE';

    document
      .getElementById('inventoryEditForm')
      .addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        await this.updateItem(item.id, data);
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
    if (loader) loader.style.display = show ? 'block' : 'none';
  }

  showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText =
      'margin-bottom: 20px; padding: 12px; background: #fee; color: #c33; border-radius: 4px;';
    alertDiv.textContent = message;
    const container = document.querySelector('[data-inventory-container]');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      setTimeout(() => alertDiv.remove(), 5000);
    }
  }

  showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText =
      'margin-bottom: 20px; padding: 12px; background: #efe; color: #3c3; border-radius: 4px;';
    alertDiv.textContent = message;
    const container = document.querySelector('[data-inventory-container]');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      setTimeout(() => alertDiv.remove(), 3000);
    }
  }
}

const inventoryManager = new InventoryManager(api);
