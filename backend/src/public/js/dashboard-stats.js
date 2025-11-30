/**
 * Dashboard Stats Manager
 * Loads and displays real-time statistics on the admin dashboard
 */

class DashboardStatsManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.stats = {
      pendingSubmissions: 0,
      liveInventory: 0,
      soldThisMonth: 0,
      dataIssues: 0
    };
  }

  /**
   * Initialize and load dashboard stats
   */
  async initialize() {
    try {
      this.showLoading(true);
      await this.loadStats();
      this.updateUI();
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      this.showError('Failed to load dashboard stats: ' + error.message);
      this.showLoading(false);
    }
  }

  /**
   * Load stats from various API endpoints
   */
  async loadStats() {
    try {
      // Load pending submissions count
      const submissionsData = await this.api.get('/admin/submissions', {
        status: 'PENDING_REVIEW',
        limit: 1
      });
      this.stats.pendingSubmissions = submissionsData.total || 0;

      // Load inventory analytics overview
      const analyticsData = await this.api.get('/inventory/analytics/overview');

      // Live inventory count
      if (analyticsData.byStatus && analyticsData.byStatus.LIVE !== undefined) {
        this.stats.liveInventory = analyticsData.byStatus.LIVE;
      } else if (analyticsData.totalInventory !== undefined) {
        this.stats.liveInventory = analyticsData.totalInventory;
      }

      // Calculate data issues (items with missing critical data)
      this.stats.dataIssues = analyticsData.dataIssues || 0;

      // Load sales velocity to get sold this month
      const salesData = await this.api.get('/inventory/analytics/sales-velocity');
      this.stats.soldThisMonth = salesData.totalSold || 0;

    } catch (error) {
      console.error('Error loading individual stats:', error);
      throw error;
    }
  }

  /**
   * Update UI with loaded stats
   */
  updateUI() {
    const statCards = document.querySelectorAll('.stat-card');

    if (statCards.length >= 4) {
      // Pending Submissions
      const pendingCard = statCards[0];
      pendingCard.querySelector('.stat-card__value').textContent = this.stats.pendingSubmissions;

      // Live Inventory
      const liveCard = statCards[1];
      liveCard.querySelector('.stat-card__value').textContent = this.stats.liveInventory;

      // Sold This Month
      const soldCard = statCards[2];
      soldCard.querySelector('.stat-card__value').textContent = this.stats.soldThisMonth;

      // Data Issues
      const issuesCard = statCards[3];
      issuesCard.querySelector('.stat-card__value').textContent = this.stats.dataIssues;

      // Update meta text if needed
      if (this.stats.dataIssues > 0) {
        issuesCard.querySelector('.stat-card__meta').textContent = this.stats.dataIssues + ' items need attention';
      } else {
        issuesCard.querySelector('.stat-card__meta').textContent = 'All good';
      }
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

    const container = document.querySelector('.dashboard-stats') || document.querySelector('.page-content');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      setTimeout(() => alertDiv.remove(), 5000);
    }
  }
}

// Create global instance
const dashboardStats = new DashboardStatsManager(api);
