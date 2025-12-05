/**
 * Inventory Management Module
 */
class InventoryManager {
  constructor(apiClient, columnManager = null) {
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
    this.columnManager = columnManager;
    this.columnWidths = this.loadColumnWidths();
    this.columnResizeState = null;
    this.boundHandleColumnResize = this.handleColumnResize.bind(this);
    this.boundStopColumnResize = this.stopColumnResize.bind(this);

    if (this.columnManager) {
      this.columnManager.onColumnsChange = (visibleColumns) => {
        this.applyColumnVisibility(visibleColumns);
      };
    }
  }

  async initialize() {
    this.cacheElements();
    await this.setupColumnPreferences();
    this.setupColumnResizers();
    this.setupEventListeners();
    await this.loadInventory();
  }

  cacheElements() {
    this.searchInput = document.querySelector('[data-inventory-search]');
    this.statusFilter = document.querySelector(
      '[data-inventory-status-filter]'
    );
    this.conditionFilter = document.querySelector(
      '[data-inventory-condition-filter]'
    );
    this.minPriceInput = document.querySelector('[data-inventory-min-price]');
    this.maxPriceInput = document.querySelector('[data-inventory-max-price]');
    this.sortSelect = document.querySelector('[data-inventory-sort]');
    this.tbody = document.querySelector('[data-inventory-tbody]');
    this.container = document.querySelector('[data-inventory-container]');
    this.loader = document.querySelector('[data-loading]');
    this.columnToggleContainer = document.querySelector('[data-column-toggle]');
    this.table = document.querySelector('[data-inventory-table]');
  }

  async setupColumnPreferences() {
    if (!this.columnManager) return;
    try {
      await this.columnManager.initialize();
      if (this.columnToggleContainer) {
        this.columnToggleContainer.innerHTML = '';
        this.columnManager.renderColumnToggleUI(this.columnToggleContainer);
      }
      this.applyColumnVisibility(this.columnManager.visibleColumns);
    } catch (error) {
      console.error('Failed to initialize column preferences:', error);
    }
  }

  applyColumnVisibility(visibilityMap) {
    if (!this.table || !visibilityMap) return;

    Object.entries(visibilityMap).forEach(([columnId, isVisible]) => {
      const cells = this.table.querySelectorAll(
        `th[data-column-id="${columnId}"], td[data-column-id="${columnId}"]`
      );
      const hide = isVisible === false;

      cells.forEach((cell) => {
        cell.classList.toggle('table-column-hidden', hide);
        if (hide) {
          cell.setAttribute('aria-hidden', 'true');
        } else {
          cell.removeAttribute('aria-hidden');
        }
      });

      const colElement = this.table.querySelector(
        `col[data-column-id="${columnId}"]`
      );
      if (colElement) {
        if (hide) {
          colElement.style.display = 'none';
        } else {
          colElement.style.display = '';
          if (this.columnWidths[columnId]) {
            colElement.style.width = `${this.columnWidths[columnId]}px`;
          }
        }
      }
    });
  }

  setupColumnResizers() {
    if (!this.table) return;
    this.applyColumnWidths();
    const resizers = this.table.querySelectorAll('[data-column-resizer]');
    resizers.forEach((handle) => {
      handle.addEventListener('mousedown', (event) => {
        this.startColumnResize(event, handle.dataset.columnId, handle);
      });
    });
  }

  startColumnResize(event, columnId, handle) {
    if (!columnId || !this.table) return;
    event.preventDefault();

    const headerCell = this.table.querySelector(
      `th[data-column-id="${columnId}"]`
    );
    if (!headerCell) return;

    const startWidth = headerCell.offsetWidth;
    this.columnResizeState = {
      columnId,
      startX: event.pageX,
      startWidth,
      minWidth: 80,
      handle,
      headerCell,
    };

    headerCell.classList.add('is-resizing');
    this.table.classList.add('is-resizing');
    document.addEventListener('mousemove', this.boundHandleColumnResize);
    document.addEventListener('mouseup', this.boundStopColumnResize);
  }

  handleColumnResize(event) {
    if (!this.columnResizeState) return;
    const delta = event.pageX - this.columnResizeState.startX;
    const newWidth = Math.max(
      this.columnResizeState.minWidth,
      this.columnResizeState.startWidth + delta
    );
    this.setColumnWidth(this.columnResizeState.columnId, newWidth);
    this.columnWidths[this.columnResizeState.columnId] = newWidth;
  }

  stopColumnResize() {
    if (!this.columnResizeState) return;

    const { headerCell, columnId } = this.columnResizeState;
    headerCell?.classList.remove('is-resizing');
    this.table?.classList.remove('is-resizing');
    document.removeEventListener('mousemove', this.boundHandleColumnResize);
    document.removeEventListener('mouseup', this.boundStopColumnResize);
    this.columnResizeState = null;
    this.saveColumnWidths();
    this.applyColumnWidths();
    if (this.columnManager) {
      this.applyColumnVisibility(this.columnManager.visibleColumns);
    }
  }

  setColumnWidth(columnId, width) {
    if (!this.table) return;
    const col = this.table.querySelector(`col[data-column-id="${columnId}"]`);
    if (col) {
      col.style.width = `${width}px`;
      col.style.display = '';
    }
    const header = this.table.querySelector(`th[data-column-id="${columnId}"]`);
    if (header) {
      header.style.width = `${width}px`;
    }
    this.table
      .querySelectorAll(`td[data-column-id="${columnId}"]`)
      .forEach((cell) => {
        cell.style.width = `${width}px`;
      });
  }

  applyColumnWidths() {
    if (!this.table) return;
    Object.entries(this.columnWidths).forEach(([columnId, width]) => {
      if (width) {
        this.setColumnWidth(columnId, width);
      }
    });
  }

  loadColumnWidths() {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem('inventory_column_widths');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveColumnWidths() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        'inventory_column_widths',
        JSON.stringify(this.columnWidths)
      );
    } catch {
      // Ignore storage write failures
    }
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

    // Global Fetch Discogs button
    const fetchDiscogsBtn = document.querySelector('[data-fetch-discogs]');
    if (fetchDiscogsBtn) {
      fetchDiscogsBtn.addEventListener('click', async () => {
        await this.fetchDiscogsForAllVisible();
      });
    }

    document.addEventListener('click', async (event) => {
      if (event.target.matches('[data-inventory-save]')) {
        this.saveRow(event.target.dataset.inventoryId);
      }

      if (event.target.matches('[data-inventory-delete]')) {
        this.deleteRow(event.target.dataset.inventoryId);
      }

      if (event.target.matches('[data-inventory-view-submission]')) {
        const submissionId = event.target.dataset.submissionId;
        if (submissionId) {
          window.open(`submission.html?id=${submissionId}`, '_blank');
        }
      }

      if (event.target.matches('[data-apply-suggestion]')) {
        const row = event.target.closest('tr[data-row-id]');
        if (!row) return;
        const field = event.target.dataset.field;
        if (!field) return;

        let value = '';
        if (event.target.dataset.value) {
          value = event.target.dataset.value;
        } else {
          const select = row.querySelector(
            `[data-suggestion-select="${field}"]`
          );
          value = select?.value || '';
        }
        this.applySuggestion(row, field, value);
      }
    });

    document.addEventListener('change', async (event) => {
      if (event.target.matches('[data-discogs-option]')) {
        const row = event.target.closest('tr[data-row-id]');
        if (!row) return;
        const discogsId = event.target.value;
        if (!discogsId) return;
        const selectedOption = event.target.selectedOptions[0];
        const discogsType = selectedOption?.dataset.discogsType || 'release';
        const discogsInput = row.querySelector(
          '[data-release-field="discogsId"]'
        );
        if (discogsInput) {
          // Store as special marker if it's a master: m{id} for master, r{id} for release
          discogsInput.value =
            discogsType === 'master' ? `m${discogsId}` : `r${discogsId}`;
        }
        const fetchButton = row.querySelector('[data-discogs-fetch]');
        if (fetchButton) {
          fetchButton.dataset.discogsId = discogsId;
          fetchButton.dataset.discogsType = discogsType;
        }
        await this.loadDiscogsSuggestions(row, discogsId, discogsType);
        const optionsContainer = row.querySelector('[data-discogs-options]');
        if (optionsContainer) {
          optionsContainer.innerHTML = '';
          optionsContainer.classList.remove('is-visible');
        }
      }

      if (event.target.matches('[data-suggestion-select]')) {
        const row = event.target.closest('tr[data-row-id]');
        if (!row) return;
        const field = event.target.dataset.suggestionSelect;
        const value = event.target.value;
        if (!field || !value) return;
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
      // Always exclude REMOVED items unless explicitly viewing them
      if (this.filters.status !== 'all') {
        params.status = this.filters.status;
      } else {
        // When status is 'all', exclude REMOVED items
        params.excludeStatus = 'REMOVED';
      }
      if (this.filters.condition !== 'all')
        params.conditions = this.filters.condition;
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

    this.tbody.innerHTML = this.inventory
      .map((item) => this.renderRow(item))
      .join('');
    if (this.columnManager) {
      this.applyColumnVisibility(this.columnManager.visibleColumns);
    }
    this.applyColumnWidths();
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
      <tr data-row-id="${item.id}"
        data-release-title="${this.escapeAttribute(release.title || '')}"
        data-release-artist="${this.escapeAttribute(release.artist || '')}">
        <td data-column-id="title">
          <div class="table-title">${release.title || 'Unknown Record'}</div>
          <div class="table-meta text-muted">${release.releaseYear || 'Year N/A'}</div>
        </td>
        <td data-column-id="artist">${release.artist || '—'}</td>
        <td data-column-id="label">
          <input type="text" class="table-input" data-release-field="label" value="${release.label || ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="label"></div>
        </td>
        <td data-column-id="catalogNumber">
          <input type="text" class="table-input" data-release-field="catalogNumber" value="${release.catalogNumber || ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="catalogNumber"></div>
        </td>
        <td data-column-id="format">
          <input type="text" class="table-input" data-field="format" value="${item.format || ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="format"></div>
        </td>
        <td data-column-id="country">
          <input type="text" class="table-input" data-field="country" value="${item.country || ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="country"></div>
        </td>
        <td data-column-id="releaseStatus">
          <input type="text" class="table-input" data-field="releaseStatus" value="${item.releaseStatus || ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="releaseStatus"></div>
        </td>
        <td data-column-id="styles">
          <input type="text" class="table-input" data-field="styles" value="${item.styles || ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="styles"></div>
        </td>
        <td data-column-id="year">
          <input type="number" class="table-input" data-release-field="releaseYear" value="${release.releaseYear ?? ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="releaseYear"></div>
        </td>
        <td data-column-id="genre">
          <input type="text" class="table-input" data-release-field="genre" value="${release.genre || ''}">
          <div class="table-meta suggestion-hint" data-suggestion-for="genre"></div>
        </td>
        <td data-column-id="variant">
          <input type="text" class="table-input" data-release-field="description" value="${release.description || ''}" placeholder="Variant / version">
          <div class="table-meta suggestion-hint" data-suggestion-for="description"></div>
        </td>
        <td data-column-id="sku"><input type="text" class="table-input" data-field="sku" value="${item.sku || ''}"></td>
        <td data-column-id="channel">${item.channel || '—'}</td>
        <td data-column-id="condition">${item.conditionMedia || 'N/A'} / ${item.conditionSleeve || 'N/A'}</td>
        <td data-column-id="status">${this.renderStatusSelect(item.status)}</td>
        <td class="numeric" data-column-id="cost">${this.formatCurrency(item.costBasis)}</td>
        <td data-column-id="listPrice">
          <input type="number" min="0" step="0.01" class="table-input" data-field="listPrice" value="${item.listPrice ?? ''}">
          <div class="table-meta text-muted">Margin ${margin}%</div>
        </td>
        <td data-column-id="salePrice">
          <input type="number" min="0" step="0.01" class="table-input" data-field="salePrice" value="${item.salePrice ?? ''}">
        </td>
        <td data-column-id="discogs">
          <div class="table-discogs">
            <input type="text" class="table-input" data-release-field="discogsId" value="${release.discogsId ?? ''}" placeholder="Discogs ID (e.g., m123456 or 123456)">
          </div>
          <div class="table-meta">
            ${discogsLink ? `<a href="${discogsLink}" target="_blank" rel="noopener">Open</a>` : '<span class="text-muted">No link</span>'}
          </div>
          <div class="discogs-options" data-discogs-options></div>
        </td>
        <td data-column-id="submission">${submissionDetail}</td>
        <td data-column-id="actions">
          <button class="button button--sm button--primary" data-inventory-save data-inventory-id="${item.id}">
            Save
          </button>
          <button class="button button--sm button--danger" data-inventory-delete data-inventory-id="${item.id}">
            Delete
          </button>
        </td>
      </tr>
    `;
  }

  async fetchDiscogsForAllVisible() {
    this.showLoading(true);
    const rows = this.tbody.querySelectorAll('tr[data-row-id]');
    let fetchedCount = 0;
    let searchedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const discogsInput = row.querySelector(
        '[data-release-field="discogsId"]'
      );
      const discogsId = discogsInput?.value?.trim();

      try {
        if (discogsId) {
          // Has Discogs ID - fetch metadata directly
          await this.loadDiscogsSuggestions(row, discogsId);
          fetchedCount++;
        } else {
          // No Discogs ID - search for the record and show options
          const options = await this.searchDiscogsOptions(row);
          if (options.length > 0) {
            this.renderDiscogsOptions(row, options);
            searchedCount++;
          } else {
            skippedCount++;
          }
        }
      } catch (error) {
        console.error('Failed to fetch Discogs data for row:', error);
        skippedCount++;
      }
    }

    this.showLoading(false);
    const parts = [];
    if (fetchedCount > 0) parts.push(`${fetchedCount} fetched`);
    if (searchedCount > 0) parts.push(`${searchedCount} search options shown`);
    if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
    const message =
      parts.length > 0 ? `Discogs: ${parts.join(', ')}` : 'No records to fetch';
    this.showSuccess(message);
  }

  async handleDiscogsFetch(row, button) {
    const discogsInput = row.querySelector('[data-release-field="discogsId"]');
    let discogsId = discogsInput?.value?.trim();
    if (!discogsId) {
      discogsId = button?.dataset.discogsId?.trim() || '';
    }

    if (discogsId) {
      await this.loadDiscogsSuggestions(row, discogsId);
      return;
    }

    const options = await this.searchDiscogsOptions(row);
    if (!options.length) {
      this.showError('No Discogs matches found for this release');
      return;
    }
    this.renderDiscogsOptions(row, options);
  }

  async searchDiscogsOptions(row) {
    const artist = row.dataset.releaseArtist || '';
    const title = row.dataset.releaseTitle || '';
    const query = [artist, title].filter(Boolean).join(' - ');
    if (!query) return [];

    try {
      const response = await this.api.get(
        '/integrations/discogs/search-enriched',
        {
          q: query,
          limit: 5,
        }
      );
      // Store enriched results with metadata for later use
      const results = response?.results || [];
      console.log('searchDiscogsOptions results', {
        count: results.length,
        results: results.map((r) => ({
          id: r.id,
          type: r.type,
          masterId: r.master_id,
          hasMetadata: !!r.metadata,
          metadataVinylVersions: r.metadata?.vinyl_versions?.length,
        })),
      });
      // Cache the enriched metadata so we don't have to re-fetch
      if (window.discogsMetadataCache === undefined) {
        window.discogsMetadataCache = {};
      }
      results.forEach((result) => {
        if (result.metadata) {
          const cacheKey = `${result.type}_${result.id}`;
          window.discogsMetadataCache[cacheKey] = result.metadata;
        }
      });
      return results;
    } catch (error) {
      console.error('Discogs search failed', error);
      return [];
    }
  }

  renderDiscogsOptions(row, options) {
    const container = row.querySelector('[data-discogs-options]');
    if (!container) return;

    if (!options.length) {
      container.innerHTML = '';
      container.classList.remove('is-visible');
      return;
    }

    const select = document.createElement('select');
    select.className = 'table-input';
    select.setAttribute('data-discogs-option', 'true');
    select.innerHTML = `
      <option value="">Select matching release</option>
      ${options.map((opt) => this.renderDiscogsOption(opt)).join('')}
    `;

    select.addEventListener('change', (event) => {});

    container.innerHTML = '';
    container.appendChild(select);
    container.classList.add('is-visible');
  }

  renderDiscogsOption(option) {
    const id =
      option.id || option.releaseId || option.master_id || option.masterId;
    // If it's a release with a master_id, prefer fetching the master for comprehensive data
    const type =
      option.type === 'master' || option.master_id ? 'master' : 'release';
    const year = option.year || option.released || '';
    const label = option.label || option.labels?.join(', ') || '';
    const title = option.title || '';
    const text = `${title}${year ? ` (${year})` : ''}${label ? ` – ${label}` : ''}`;
    // Store both id and type so we know how to fetch the data
    const idToStore =
      type === 'master' && option.master_id ? option.master_id : id;
    return `<option value="${idToStore}" data-discogs-type="${type}">${this.escapeHtml(
      text
    )}</option>`;
  }

  renderStatusSelect(value) {
    const options = [
      'DRAFT',
      'LIVE',
      'RESERVED',
      'SOLD',
      'REMOVED',
      'RETURNED',
    ];
    return `
      <select class="filter-select" data-field="status">
        ${options
          .map(
            (opt) =>
              `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
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
    const end = Math.min(
      this.pagination.page * this.pagination.limit,
      this.pagination.total
    );

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

    pagination
      .querySelector('[data-pagination-prev]')
      ?.addEventListener('click', () => {
        if (this.pagination.page > 1) {
          this.pagination.page -= 1;
          this.loadInventory();
        }
      });

    pagination
      .querySelector('[data-pagination-next]')
      ?.addEventListener('click', () => {
        const maxPages = Math.ceil(
          this.pagination.total / this.pagination.limit
        );
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
    const releaseFields = [
      'label',
      'catalogNumber',
      'genre',
      'description',
      'format',
      'country',
      'releaseStatus',
      'styles',
    ];
    releaseFields.forEach((field) => {
      const input = row.querySelector(`[data-release-field="${field}"]`);
      if (input) {
        releasePayload[field] = input.value?.trim() || null;
      }
    });
    const releaseYearInput = row.querySelector(
      '[data-release-field="releaseYear"]'
    );
    if (releaseYearInput) {
      if (releaseYearInput.value === '') {
        releasePayload.releaseYear = null;
      } else {
        const parsedYear = parseInt(releaseYearInput.value, 10);
        releasePayload.releaseYear = Number.isNaN(parsedYear)
          ? null
          : parsedYear;
      }
    }
    const discogsInput = row.querySelector('[data-release-field="discogsId"]');
    if (discogsInput) {
      if (discogsInput.value === '') {
        releasePayload.discogsId = null;
      } else {
        const parsedDiscogs = parseInt(discogsInput.value, 10);
        releasePayload.discogsId = Number.isNaN(parsedDiscogs)
          ? null
          : parsedDiscogs;
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

  async deleteRow(inventoryId) {
    if (!inventoryId) return;
    const row = this.tbody?.querySelector(`[data-row-id="${inventoryId}"]`);
    if (!row) return;

    // Get record title for confirmation
    const title =
      row.querySelector('[data-column-id="title"]')?.textContent ||
      'this record';

    // Confirm deletion
    if (
      !confirm(
        `Are you sure you want to delete "${title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      this.showLoading(true);
      await this.api.delete(`/inventory/${inventoryId}`);
      this.showSuccess('Inventory item deleted');
      await this.loadInventory();
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
      this.showError('Failed to delete item: ' + error.message);
      this.showLoading(false);
    }
  }

  showLoading(show) {
    if (this.loader) {
      this.loader.style.display = show ? 'flex' : 'none';
    }
  }

  showError(message) {
    if (!this.container) return;
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.textContent = message;
    alertDiv.style.cssText =
      'margin-bottom: 20px; padding: 12px; background: #fee; color: #c33; border-radius: 4px;';
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

  async loadDiscogsSuggestions(row, discogsId, discogsType = 'release') {
    try {
      this.showLoading(true);
      let allReleases = [];

      // Search by title/artist to get all matching masters and their vinyl versions
      // This is more reliable than ID-based fetching since inventory IDs are often wrong/missing
      const artist = row.dataset.releaseArtist || '';
      const title = row.dataset.releaseTitle || '';
      const releaseYear = row.dataset.releaseYear || '';
      if (artist || title) {
        try {
          // Build search query - prioritize exact title matches
          const query = title || [artist, title].filter(Boolean).join(' ');
          const searchResponse = await this.api.get(
            '/integrations/discogs/search-enriched',
            {
              q: query,
              limit: 5, // Limit to top 5 most relevant results
            }
          );

          const searchResults = searchResponse?.results || [];

          // Cache the enriched metadata
          if (window.discogsMetadataCache === undefined) {
            window.discogsMetadataCache = {};
          }

          // Filter results: prefer exact/near title matches and matching artist
          const filteredResults = searchResults.filter((result) => {
            // Must have metadata
            if (!result.metadata) return false;

            // Prefer results where title closely matches (at least contains major words)
            const resultTitle = (result.title || '').toLowerCase();
            const queryTitle = (title || '').toLowerCase();
            const titleMatch =
              resultTitle.includes(queryTitle) ||
              queryTitle.includes(resultTitle) ||
              this.calculateTitleSimilarity(resultTitle, queryTitle) > 0.7;

            // Check artist match if provided
            let artistMatch = true;
            if (artist) {
              const resultArtists = (result.metadata.artists || [])
                .map((a) => a.name?.toLowerCase() || '')
                .join(' ');
              artistMatch = resultArtists.includes(artist.toLowerCase());
            }

            return titleMatch && artistMatch;
          });

          // Use only the best matches (limit to top 3 to avoid duplicates from multiple masters)
          const topResults = filteredResults.slice(0, 3);

          topResults.forEach((result) => {
            if (result.metadata) {
              const cacheKey = `${result.type}_${result.id}`;
              window.discogsMetadataCache[cacheKey] = result.metadata;
              console.log('Adding metadata from result:', {
                type: result.type,
                id: result.id,
                metadataKeys: Object.keys(result.metadata),
                fullMetadata: result.metadata,
              });
              allReleases.push(result.metadata);
            }
          });
        } catch (searchError) {
          console.warn('Title/artist search failed', searchError.message);
        }
      }

      // Merge suggestions from all found releases/masters
      const mergedSuggestions = this.mergeDiscogsSuggestions(allReleases);

      const discogsInput = row.querySelector(
        '[data-release-field="discogsId"]'
      );
      if (discogsInput && !discogsInput.value && allReleases.length > 0) {
        discogsInput.value = allReleases[0]?.id || discogsId;
      }
      const fetchButton = row.querySelector('[data-discogs-fetch]');
      if (fetchButton && allReleases.length > 0) {
        fetchButton.dataset.discogsId = allReleases[0]?.id || discogsId;
      }

      this.showDiscogsSuggestions(row, mergedSuggestions);
      const optionsContainer = row.querySelector('[data-discogs-options]');
      if (optionsContainer) {
        optionsContainer.innerHTML = '';
        optionsContainer.classList.remove('is-visible');
      }

      const sourceCount = allReleases.length;
      this.showSuccess(
        `Discogs suggestions loaded from ${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`
      );
    } catch (error) {
      console.error('Discogs fetch failed', error);
      this.showError('Failed to load Discogs data: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  calculateTitleSimilarity(str1, str2) {
    // Simple similarity check - count matching words
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    const matches = [...words1].filter((w) => words2.has(w)).length;
    const total = Math.max(words1.size, words2.size);
    return total > 0 ? matches / total : 0;
  }

  normalizeCatalogNumber(catno) {
    // Normalize catalog number for deduplication
    // Remove extra spaces, convert to uppercase, normalize separators
    if (!catno) return '';
    // First, remove variant suffixes like [1], [2], etc.
    const withoutVariant = catno.replace(/\s*\[\d+\]\s*/g, '');
    return withoutVariant
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '') // Remove all spaces
      .replace(/[-_]/g, '-') // Normalize separators to hyphen
      .replace(/,.*$/, ''); // Remove anything after comma (like ", none")
  }

  mergeDiscogsSuggestions(releases) {
    // Merge suggestions from multiple releases into a single comprehensive suggestions object
    const merged = {};

    releases.forEach((release) => {
      const suggestions = this.extractDiscogsSuggestions(release);
      Object.entries(suggestions).forEach(([field, values]) => {
        if (!merged[field]) {
          merged[field] = [];
        }
        const valuesArray = Array.isArray(values) ? values : [values];
        merged[field].push(...valuesArray);
      });
    });

    // Deduplicate each field with smart handling for catalog numbers
    Object.keys(merged).forEach((field) => {
      if (field === 'catalogNumber') {
        // Smart deduplication for catalog numbers
        const seen = new Set();
        const unique = [];
        merged[field].filter(Boolean).forEach((catno) => {
          const normalized = this.normalizeCatalogNumber(catno);
          // Skip empty or "none" values
          if (!normalized || /^none$/i.test(normalized)) return;
          if (!seen.has(normalized)) {
            seen.add(normalized);
            unique.push(catno); // Keep original value for display
          }
        });
        merged[field] = unique;
      } else {
        // Standard deduplication for other fields
        const unique = [...new Set(merged[field].filter(Boolean))];
        merged[field] = unique;
      }
    });

    return merged;
  }

  extractDiscogsSuggestions(release) {
    console.log('extractDiscogsSuggestions - release data:', {
      title: release?.title,
      country: release?.country,
      status: release?.status,
      formats: release?.formats,
      styles: release?.styles,
      vinylVersionsCount: release?.vinyl_versions?.length,
      firstVinylVersion: release?.vinyl_versions?.[0],
    });

    const unique = (arr) => [
      ...new Set(arr.filter((value) => value && value !== '')),
    ];
    // Basic info - use master release data when available
    const titleOptions = unique([release?.title]);
    const artistOptions = unique(
      (release?.artists || []).map((artist) => artist?.name).filter(Boolean)
    );

    // Label and catalog - handle both catno and catalog_number fields
    const labelOptions = unique(
      (release?.labels || [])
        .map((label) => label?.name?.trim())
        .filter(Boolean)
    );

    // Catalog numbers: combine current release labels + all vinyl versions' catalog numbers
    // with smart filtering and normalization
    const filterCatalogNumber = (value) => {
      if (!value) return null;
      const trimmed = value.trim();
      // Filter out invalid entries
      if (/^none$/i.test(trimmed)) return null;
      if (/^not in label$/i.test(trimmed)) return null;
      if (/,\s*none$/i.test(trimmed)) return null; // Handle "DM-SP-40, none"
      // Remove comma-separated suffixes (like ", none")
      const cleaned = trimmed.replace(/,.*$/, '').trim();
      // Remove variant brackets like [1], [2]
      const noVariants = cleaned.replace(/\s*\[\d+\]\s*/g, '').trim();
      return noVariants || null;
    };

    const currentCatalogNumbers = (release?.labels || []).map((label) => {
      const value = label?.catalog_number || label?.catno;
      return filterCatalogNumber(value);
    });

    const vinylVersionCatalogNumbers = (release?.vinyl_versions || []).map(
      (version) => {
        return filterCatalogNumber(version?.catno);
      }
    );

    // Deduplicate using normalized comparison
    const catalogNumberMap = new Map();
    [...currentCatalogNumbers, ...vinylVersionCatalogNumbers]
      .filter(Boolean)
      .forEach((catno) => {
        // Normalize for deduplication but keep original for display
        const normalized = this.normalizeCatalogNumber(catno);
        if (normalized && !catalogNumberMap.has(normalized)) {
          catalogNumberMap.set(normalized, catno);
        }
      });

    const catalogNumberOptions = Array.from(catalogNumberMap.values());

    // Year/Date
    const yearOptions = unique([
      release?.year ? String(release.year) : null,
      release?.released ? release.released.split('-')[0] : null,
      release?.released_formatted
        ? release.released_formatted.split('-')[0]
        : null,
    ]);

    // Genre and styles - genres from master release are most reliable
    const genreOptions = unique([
      ...(release?.genres || []),
      ...(release?.styles || []),
    ]);

    // Styles only - separate from genres
    const stylesOptions = unique(release?.styles || []);

    // Format information - includes vinyl, CD, cassette, etc.
    // For masters, also check vinyl versions
    const allFormats = [
      ...(release?.formats || []),
      ...(release?.vinyl_versions || [])
        .map((v) => v?.format)
        .filter(Boolean)
        .map((f) => ({name: f})), // Wrap string format in object to match object format structure
    ];
    const formatOptions = unique(
      allFormats
        .map((format) => {
          const parts = [];
          if (format?.name) parts.push(format.name);
          if (format?.qty) parts.push(`${format.qty}x`);
          return parts.join(' ');
        })
        .filter(Boolean)
    );

    // Format descriptions and release notes
    const formatDescriptionOptions = unique(
      allFormats.flatMap((format) => format?.descriptions || [])
    );

    // Description/notes - combine release notes and format descriptions
    const descriptionOptions = unique([
      release?.notes,
      ...formatDescriptionOptions,
    ]);

    // Country - where the record was pressed/released
    // For masters, check vinyl versions as well
    const countryOptions = unique([
      release?.country,
      ...(release?.vinyl_versions || [])
        .map((v) => v?.country)
        .filter(Boolean),
    ]);

    // Status (official, bootleg, reissue, etc)
    // Masters don't have status, so try to infer from vinyl versions or use default
    const statusOptions = unique([
      release?.status,
      ...(release?.vinyl_versions || [])
        .map((v) => v?.type || v?.status)
        .filter(Boolean),
      // Masters typically don't have status in the same way releases do
      // but we can use empty array if nothing found
    ].filter(Boolean)); // Remove any undefined/null values

    // URI for reference
    const discogsUriOptions = unique([release?.uri]);

    return {
      title: titleOptions,
      artist: artistOptions,
      label: labelOptions,
      catalogNumber: catalogNumberOptions,
      releaseYear: yearOptions,
      genre: genreOptions,
      styles: stylesOptions,
      format: formatOptions,
      description: descriptionOptions,
      country: countryOptions,
      releaseStatus: statusOptions,
      discogsUri: discogsUriOptions,
    };
  }

  showDiscogsSuggestions(row, suggestions) {
    // Apply Discogs suggestions as dropdown select options
    const fieldMappings = {
      title: ['title'],
      artist: ['artist', 'releaseArtist'],
      label: ['label'],
      catalogNumber: ['catalogNumber'],
      format: ['format'],
      country: ['country'],
      releaseStatus: ['releaseStatus'],
      styles: ['styles'],
      releaseYear: ['releaseYear'],
      genre: ['genre'],
      description: ['description', 'variant'],
      discogsUri: ['discogsUri', 'discogsId'],
    };

    // Track which fields are lot metadata (not release fields) for correct attribute lookup
    const lotMetadataFields = new Set(['format', 'country', 'releaseStatus', 'styles']);

    console.log('showDiscogsSuggestions called with:', {
      suggestionsCount: Object.keys(suggestions).length,
      fields: Object.keys(suggestions),
      rowId: row?.dataset?.rowId,
    });

    Object.entries(suggestions).forEach(([field, values]) => {
      const valuesList = Array.isArray(values)
        ? values.filter(Boolean)
        : values
          ? [values]
          : [];

      console.log(`Field ${field}:`, {
        valuesCount: valuesList.length,
        values: valuesList.slice(0, 3),
      });

      if (!valuesList.length) {
        console.log(`Skipping ${field} - no values`);
        return;
      }

      // Find the input field for this suggestion
      const possibleSelectors = (fieldMappings[field] || [field])
        .map((f) => `[data-release-field="${f}"], [data-field="${f}"]`)
        .join(', ');

      const input = row.querySelector(possibleSelectors);
      console.log(`Input for ${field}:`, input ? 'found' : 'NOT FOUND');
      if (!input) return;

      // Find the suggestion hint container
      const suggestionHint = row.querySelector(
        `[data-suggestion-for="${field}"]`
      );
      console.log(`Suggestion hint for ${field}:`, suggestionHint ? 'found' : 'NOT FOUND');
      if (!suggestionHint) return;

      // Create dropdown select with suggestions
      const select = document.createElement('select');
      select.className = 'suggestion-dropdown table-input';
      select.setAttribute('data-suggestions-for', field);

      // Add default/placeholder option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = `← ${field} options`;
      defaultOption.disabled = true;
      defaultOption.selected = true;
      select.appendChild(defaultOption);

      // Add separator
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '─'.repeat(40);
      select.appendChild(separator);

      // Add suggestion options
      valuesList.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      // Handle selection
      select.addEventListener('change', (e) => {
        if (e.target.value) {
          this.applySuggestion(row, field, e.target.value);
          // Reset dropdown after applying
          setTimeout(() => {
            e.target.value = '';
          }, 100);
        }
      });

      // Replace suggestion hint content with select
      suggestionHint.innerHTML = '';
      suggestionHint.appendChild(select);
      // Make the suggestion hint visible
      suggestionHint.classList.add('is-visible');
      console.log(`Created dropdown for ${field} with ${valuesList.length} options`);
    });
  }

  getFieldLabel(field) {
    const labels = {
      title: 'Title',
      artist: 'Artist',
      label: 'Label',
      catalogNumber: 'Catalog Number',
      releaseYear: 'Release Year',
      genre: 'Genre / Style',
      format: 'Format',
      description: 'Description / Notes',
      country: 'Country',
      releaseStatus: 'Release Status',
      discogsUri: 'Discogs Link',
    };
    return labels[field] || field;
  }

  applySuggestion(row, field, value) {
    if (!field) return;
    const target =
      row.querySelector(`[data-release-field="${field}"]`) ||
      row.querySelector(`[data-field="${field}"]`);
    if (!target) return;
    let normalized = value ? decodeURIComponent(value) : '';
    if (field === 'releaseYear' && normalized) {
      const parsed = parseInt(normalized, 10);
      normalized = Number.isNaN(parsed) ? '' : parsed;
    }
    target.value = normalized;
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

  escapeAttribute(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
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
        .filter(
          ([, value]) => value !== undefined && value !== null && value !== ''
        )
        .forEach(([key, value]) => url.searchParams.append(key, value));
    }

    const response = await fetch(url.toString(), {
      method,
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        storedToken ? { Authorization: `Bearer ${storedToken}` } : {}
      ),
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
          data?.error ||
          response.statusText ||
          'Request failed'
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

const INVENTORY_COLUMN_CONFIG = [
  { id: 'title', label: 'Title' },
  { id: 'artist', label: 'Artist' },
  { id: 'label', label: 'Label' },
  { id: 'catalogNumber', label: 'Catalog #' },
  { id: 'format', label: 'Format', defaultVisible: false },
  { id: 'country', label: 'Country', defaultVisible: false },
  { id: 'releaseStatus', label: 'Status (Discogs)', defaultVisible: false },
  { id: 'styles', label: 'Styles', defaultVisible: false },
  { id: 'year', label: 'Year' },
  { id: 'genre', label: 'Genre' },
  { id: 'variant', label: 'Variant / Notes' },
  { id: 'sku', label: 'SKU' },
  { id: 'channel', label: 'Channel', defaultVisible: false },
  { id: 'condition', label: 'Condition' },
  { id: 'status', label: 'Status' },
  { id: 'cost', label: 'Cost' },
  { id: 'listPrice', label: 'List Price' },
  { id: 'salePrice', label: 'Sale Price' },
  { id: 'discogs', label: 'Discogs', defaultVisible: false },
  { id: 'submission', label: 'Submission' },
  { id: 'actions', label: 'Actions' },
];

const storedToken =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem('auth_token')
    : null;
const inventoryApi = typeof api !== 'undefined' ? api : createFallbackApi();
const inventoryColumnManager =
  typeof TableColumnManager !== 'undefined'
    ? new TableColumnManager({
        tableName: 'inventory',
        columns: INVENTORY_COLUMN_CONFIG,
        api: inventoryApi,
      })
    : null;
const inventoryManager = new InventoryManager(
  inventoryApi,
  inventoryColumnManager
);
document.addEventListener('DOMContentLoaded', () => {
  inventoryManager.initialize();
});
