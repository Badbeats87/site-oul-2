/**
 * Account Page Tab Management
 * Handles tab switching, panel display, and user interactions
 */

const accountManager = {
  currentTab: 'orders',

  init() {
    this.cacheElements();
    this.bindEvents();
    this.showTab('orders');
  },

  cacheElements() {
    this.navItems = document.querySelectorAll('.account-nav__item');
    this.panels = document.querySelectorAll('.account-panel');
  },

  bindEvents() {
    this.navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        const tab = item.getAttribute('data-tab');
        if (tab) {
          e.preventDefault();
          this.showTab(tab);
        }
      });
    });

    // Handle logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
          // Redirect to login or logout endpoint
          window.location.href = '../admin/login.html';
        }
      });
    }

    // Handle edit profile
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => {
        alert('Edit profile functionality would open a modal here');
      });
    }

    // Handle add address
    const addAddressBtn = document.getElementById('add-address-btn');
    if (addAddressBtn) {
      addAddressBtn.addEventListener('click', () => {
        alert('Add address functionality would open a modal here');
      });
    }

    // Handle add payment
    const addPaymentBtn = document.getElementById('add-payment-btn');
    if (addPaymentBtn) {
      addPaymentBtn.addEventListener('click', () => {
        alert('Add payment method functionality would open a modal here');
      });
    }
  },

  showTab(tabName) {
    // Update active nav item
    this.navItems.forEach((item) => {
      const itemTab = item.getAttribute('data-tab');
      if (itemTab === tabName) {
        item.classList.add('account-nav__item--active');
      } else {
        item.classList.remove('account-nav__item--active');
      }
    });

    // Show/hide panels
    this.panels.forEach((panel) => {
      const panelName = panel.getAttribute('data-panel');
      if (panelName === tabName) {
        panel.classList.add('account-panel--active');
      } else {
        panel.classList.remove('account-panel--active');
      }
    });

    this.currentTab = tabName;

    // Scroll to top of content area
    document.querySelector('.account-content').scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  },
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    accountManager.init();
  });
} else {
  accountManager.init();
}
