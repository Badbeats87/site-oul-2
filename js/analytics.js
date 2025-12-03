/**
 * Analytics Dashboard Module
 */

class AnalyticsManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.overviewData = null;
    this.lowStockAlerts = [];
    this.salesVelocity = null;
  }

  async initialize() {
    await this.loadAnalytics();
  }

  async loadAnalytics() {
    try {
      this.showLoading(true);
      
      const overview = await this.api.get('/inventory/analytics/overview');
      const lowStock = await this.api.get('/inventory/analytics/low-stock');
      const sales = await this.api.get('/inventory/analytics/sales-velocity');

      this.overviewData = overview;
      this.lowStockAlerts = lowStock.alerts || [];
      this.salesVelocity = sales;

      this.renderDashboard();
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      this.showError('Failed to load analytics: ' + error.message);
      this.showLoading(false);
    }
  }

  renderDashboard() {
    if (this.overviewData) {
      this.renderOverviewStats();
    }
    if (this.lowStockAlerts && this.lowStockAlerts.length > 0) {
      this.renderLowStockTable();
    }
    if (this.salesVelocity) {
      this.renderSalesMetrics();
    }
  }

  renderOverviewStats() {
    const data = this.overviewData;
    const container = document.querySelector('[data-analytics-overview]');
    if (!container) return;

    let html = '<div class="analytics-section"><h3>Inventory Statistics</h3><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">';

    if (data.totalInventory !== undefined) {
      html += '<div class="stat-box"><label>Total Inventory</label><div class="value">' + data.totalInventory + '</div></div>';
    }

    if (data.byStatus) {
      html += '<div class="stat-box"><label>Status Breakdown</label><div style="font-size: 12px;">';
      for (var status in data.byStatus) {
        html += status + ': ' + data.byStatus[status] + '<br>';
      }
      html += '</div></div>';
    }

    if (data.priceStats) {
      const stats = data.priceStats;
      html += '<div class="stat-box"><label>Price Stats</label><div style="font-size: 12px;"><strong>Avg:</strong> $' + parseFloat(stats.avg || 0).toFixed(2) + '<br><strong>Min:</strong> $' + parseFloat(stats.min || 0).toFixed(2) + '<br><strong>Max:</strong> $' + parseFloat(stats.max || 0).toFixed(2) + '</div></div>';
    }

    html += '</div></div>';
    container.innerHTML = html;
  }

  renderLowStockTable() {
    const container = document.querySelector('[data-analytics-low-stock]');
    if (!container) return;

    if (this.lowStockAlerts.length === 0) {
      container.innerHTML = '<p>No low-stock alerts</p>';
      return;
    }

    let html = '<div class="analytics-section"><h3>Low Stock Alerts</h3><table class="table"><thead><tr><th>Album</th><th>Artist</th><th>LIVE Count</th></tr></thead><tbody>';

    for (var i = 0; i < this.lowStockAlerts.length; i++) {
      var alert = this.lowStockAlerts[i];
      html += '<tr><td>' + (alert.title || 'Unknown') + '</td><td>' + (alert.artist || '') + '</td><td>' + (alert.liveCount || 0) + '</td></tr>';
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  renderSalesMetrics() {
    const container = document.querySelector('[data-analytics-sales]');
    if (!container) return;

    const data = this.salesVelocity;
    let html = '<div class="analytics-section"><h3>Sales Metrics</h3><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">';

    if (data.totalSold !== undefined) {
      html += '<div class="stat-box"><label>Items Sold</label><div class="value">' + data.totalSold + '</div></div>';
    }

    if (data.totalRevenue !== undefined) {
      html += '<div class="stat-box"><label>Total Revenue</label><div class="value">$' + parseFloat(data.totalRevenue || 0).toFixed(2) + '</div></div>';
    }

    if (data.averagePrice !== undefined) {
      html += '<div class="stat-box"><label>Average Price</label><div class="value">$' + parseFloat(data.averagePrice || 0).toFixed(2) + '</div></div>';
    }

    html += '</div></div>';
    container.innerHTML = html;
  }

  showLoading(show) {
    const loader = document.querySelector('[data-loading]');
    if (loader) loader.style.display = show ? 'flex' : 'none';
  }

  showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = 'margin-bottom: 20px; padding: 12px; background: #fee; color: #c33; border-radius: 4px;';
    alertDiv.textContent = message;
    const container = document.querySelector('[data-analytics-container]');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      setTimeout(() => alertDiv.remove(), 5000);
    }
  }
}

const analyticsManager = new AnalyticsManager(api);
