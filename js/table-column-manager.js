/**
 * Table Column Manager
 * Manages column visibility preferences for admin tables with database persistence
 */
class TableColumnManager {
  constructor(config) {
    this.tableName = config.tableName;           // 'inventory', 'submissions', etc.
    this.columns = config.columns;               // Array of column definitions
    this.api = config.api;                       // API client
    this.onColumnsChange = config.onColumnsChange; // Callback for re-rendering

    this.visibleColumns = {};                    // Column ID -> boolean map
    this.initialized = false;
    this.saveTimeout = null;
  }

  /**
   * Initialize: Load preferences from server
   */
  async initialize() {
    try {
      const response = await this.api.get(`/admin/preferences/tables/${this.tableName}`);

      if (response.visibleColumns) {
        // Load saved preferences from server
        this.visibleColumns = response.visibleColumns;
        // Merge with any new columns that might not be in saved preferences
        this.columns.forEach(col => {
          if (!(col.id in this.visibleColumns)) {
            this.visibleColumns[col.id] = col.defaultVisible !== false;
          }
        });
      } else {
        // Set defaults: use column's defaultVisible setting
        this.visibleColumns = this.getDefaultVisibility();
      }

      this.initialized = true;
      return this.visibleColumns;
    } catch (error) {
      console.warn('Failed to load column preferences, using defaults:', error);
      this.visibleColumns = this.getDefaultVisibility();
      this.initialized = true;
      return this.visibleColumns;
    }
  }

  /**
   * Get default visibility (all columns visible unless specified otherwise)
   */
  getDefaultVisibility() {
    const defaults = {};
    this.columns.forEach(col => {
      defaults[col.id] = col.defaultVisible !== false; // Default true unless specified
    });
    return defaults;
  }

  /**
   * Check if column is visible
   */
  isColumnVisible(columnId) {
    return this.visibleColumns[columnId] !== false;
  }

  /**
   * Toggle column visibility
   */
  toggleColumn(columnId) {
    this.visibleColumns[columnId] = !this.isColumnVisible(columnId);
    this.savePreferences();
    if (this.onColumnsChange) {
      this.onColumnsChange(this.visibleColumns);
    }
  }

  /**
   * Get visible column definitions
   */
  getVisibleColumns() {
    return this.columns.filter(col => this.isColumnVisible(col.id));
  }

  /**
   * Save preferences to server (debounced)
   */
  async savePreferences() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      try {
        await this.api.put(`/admin/preferences/tables/${this.tableName}`, {
          visibleColumns: this.visibleColumns
        });
      } catch (error) {
        console.error('Failed to save column preferences:', error);
      }
    }, 500); // Debounce 500ms
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults() {
    try {
      await this.api.delete(`/admin/preferences/tables/${this.tableName}`);
      this.visibleColumns = this.getDefaultVisibility();
      if (this.onColumnsChange) {
        this.onColumnsChange(this.visibleColumns);
      }
    } catch (error) {
      console.error('Failed to reset preferences:', error);
    }
  }

  /**
   * Render column toggle UI
   */
  renderColumnToggleUI(container) {
    const uniqueId = `column-toggle-${this.tableName}-${Date.now()}`;

    const dropdown = document.createElement('div');
    dropdown.className = 'column-toggle-dropdown';
    dropdown.innerHTML = `
      <button class="button button--secondary button--sm" data-toggle-btn="${uniqueId}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="6" x2="20" y2="6"></line>
          <line x1="4" y1="12" x2="20" y2="12"></line>
          <line x1="4" y1="18" x2="20" y2="18"></line>
        </svg>
        Columns
      </button>
      <div class="column-toggle-menu" data-menu="${uniqueId}" hidden>
        <div class="column-toggle-menu__header">
          <strong>Show/Hide Columns</strong>
          <button class="button button--ghost button--sm" data-reset-btn="${uniqueId}">Reset</button>
        </div>
        <div class="column-toggle-menu__list">
          ${this.columns.map(col => `
            <label class="column-toggle-item">
              <input type="checkbox"
                class="column-toggle-checkbox"
                data-column-id="${col.id}"
                data-table-name="${this.tableName}"
                ${this.isColumnVisible(col.id) ? 'checked' : ''}>
              <span>${col.label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    container.appendChild(dropdown);
    this.bindUIEvents(dropdown, uniqueId);
  }

  /**
   * Bind UI event listeners
   */
  bindUIEvents(dropdown, uniqueId) {
    const toggleBtn = dropdown.querySelector(`[data-toggle-btn="${uniqueId}"]`);
    const menu = dropdown.querySelector(`[data-menu="${uniqueId}"]`);
    const resetBtn = dropdown.querySelector(`[data-reset-btn="${uniqueId}"]`);

    // Toggle dropdown
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        menu.hidden = true;
      }
    });

    // Column checkbox changes
    menu.addEventListener('change', (e) => {
      if (e.target.classList.contains('column-toggle-checkbox')) {
        const columnId = e.target.dataset.columnId;
        this.toggleColumn(columnId);
      }
    });

    // Reset button
    resetBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      await this.resetToDefaults();

      // Update checkboxes
      menu.querySelectorAll('.column-toggle-checkbox').forEach(checkbox => {
        checkbox.checked = this.isColumnVisible(checkbox.dataset.columnId);
      });
    });
  }
}

// Export for use in table managers
window.TableColumnManager = TableColumnManager;
