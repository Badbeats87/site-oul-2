// Admin Console Interactions
document.addEventListener('DOMContentLoaded', async function() {
    // Verify authentication on page load
    const isAuthenticated = await auth.verifySession();
    if (!isAuthenticated) {
        window.location.href = '/admin/login.html';
        return;
    }

    // Initialize UI
    initializeTabSwitching();
    initializeLogout();

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
 * Initialize tab switching functionality
 */
function initializeTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    let inventoryInitialized = false;
    let analyticsInitialized = false;

    tabBtns.forEach((btn, index) => {
        btn.addEventListener('click', async function() {
            const tabIndex = Array.from(tabBtns).indexOf(this);

            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('tab-btn--active'));
            tabPanels.forEach(p => p.classList.remove('tab-panel--active'));

            // Add active to clicked
            this.classList.add('tab-btn--active');
            tabPanels[tabIndex].classList.add('tab-panel--active');

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
