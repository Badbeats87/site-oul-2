// Admin Console Interactions
document.addEventListener('DOMContentLoaded', async function () {
  // Verify authentication on page load
  const isAuthenticated = await auth.verifySession();
  if (!isAuthenticated) {
    window.location.href = '/admin/login.html';
    return;
  }

  // Initialize UI
  initializeUserInfo();
  initializeTabSwitching();
  initializeLogout();
  initializeModals();

  // Load dashboard stats
  if (dashboardStats) {
    await dashboardStats.initialize();
  }

  // Initialize submissions manager
  if (submissionsManager) {
    await submissionsManager.initialize();
  }
});

/**
 * Initialize user info display
 */
function initializeUserInfo() {
  const userNameEl = document.querySelector('[data-user-name]');
  const userRoleEl = document.querySelector('[data-user-role]');
  const userAvatarEl = document.querySelector('[data-user-avatar]');

  // Get user info from auth or localStorage
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    try {
      // Try to decode JWT to get user info (simple decode, not verification)
      const parts = authToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const userName = payload.email ? payload.email.split('@')[0] : 'Admin';
        const userRole = payload.role || 'Admin';

        if (userNameEl) userNameEl.textContent = userName;
        if (userRoleEl) userRoleEl.textContent = userRole;
        if (userAvatarEl) {
          userAvatarEl.textContent = userName.charAt(0).toUpperCase();
        }
      }
    } catch (e) {
      if (userNameEl) userNameEl.textContent = 'Admin';
      if (userAvatarEl) userAvatarEl.textContent = 'A';
    }
  }
}

/**
 * Initialize tab switching functionality with keyboard support
 */
function initializeTabSwitching() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  let inventoryInitialized = false;
  let analyticsInitialized = false;

  /**
   * Switch to a specific tab
   */
  async function switchTab(tabIndex) {
    // Remove active from all
    tabBtns.forEach((b) => {
      b.classList.remove('tab-btn--active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach((p) => p.classList.remove('tab-panel--active'));

    // Add active to selected
    tabBtns[tabIndex].classList.add('tab-btn--active');
    tabBtns[tabIndex].setAttribute('aria-selected', 'true');
    tabPanels[tabIndex].classList.add('tab-panel--active');

    // Set focus on active tab
    tabBtns[tabIndex].focus();

    // Lazy load inventory tab
    if (tabIndex === 1 && !inventoryInitialized && inventoryManager) {
      await inventoryManager.initialize();
      inventoryInitialized = true;
    }

    // Lazy load analytics tab (if it exists)
    if (tabIndex === 2 && !analyticsInitialized && analyticsManager) {
      await analyticsManager.initialize();
      analyticsInitialized = true;
    }
  }

  // Click handler
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', async function () {
      const tabIndex = Array.from(tabBtns).indexOf(this);
      await switchTab(tabIndex);
    });

    // Keyboard navigation
    btn.addEventListener('keydown', async function (e) {
      const currentIndex = Array.from(tabBtns).indexOf(this);
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          newIndex = currentIndex === 0 ? tabBtns.length - 1 : currentIndex - 1;
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          newIndex = currentIndex === tabBtns.length - 1 ? 0 : currentIndex + 1;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = tabBtns.length - 1;
          break;
        default:
          return;
      }

      await switchTab(newIndex);
    });
  });
}

/**
 * Initialize logout button
 */
function initializeLogout() {
  const logoutBtn = document.querySelector('[data-logout-btn]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        await auth.logout();
      }
    });
  }
}

/**
 * Initialize modal functionality
 */
function initializeModals() {
  // Close submission details modal
  const closeSubmissionBtn = document.querySelector(
    '[data-close-submission-modal]'
  );
  if (closeSubmissionBtn) {
    closeSubmissionBtn.addEventListener('click', () => {
      const modal = document.querySelector('[data-submission-details-modal]');
      if (modal) modal.style.display = 'none';
    });
  }

  // Close inventory edit modal
  const closeInventoryBtn = document.querySelector(
    '[data-close-inventory-modal]'
  );
  if (closeInventoryBtn) {
    closeInventoryBtn.addEventListener('click', () => {
      const modal = document.querySelector('[data-inventory-edit-modal]');
      if (modal) modal.style.display = 'none';
    });
  }

  // Close modals on backdrop click
  const modals = document.querySelectorAll('.modal-backdrop');
  modals.forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.style.display = 'none';
      }
    });
  });

  // Close modals with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector(
        '[data-submission-details-modal][style*="display: flex"], [data-inventory-edit-modal][style*="display: flex"]'
      );
      if (openModal) openModal.style.display = 'none';
    }
  });
}
