/**
 * Active State Indicators
 * Marks the current page/navigation item as active based on URL
 */

function initActiveStates() {
  const currentUrl = window.location.pathname;
  const currentFilename = currentUrl.split('/').pop() || 'index.html';

  // Handle breadcrumb active states
  updateBreadcrumbActiveState(currentFilename);

  // Handle navigation link active states
  updateNavLinkActiveState(currentFilename);

  // Handle tab active states (already handled by admin.js, but ensure consistency)
  updateTabActiveState(currentFilename);
}

/**
 * Update breadcrumb active state
 * The last breadcrumb item should already be styled as active
 * This function ensures it's properly marked
 */
function updateBreadcrumbActiveState(currentFilename) {
  const breadcrumbItems = document.querySelectorAll('.breadcrumb-item');

  if (breadcrumbItems.length === 0) {
    return;
  }

  // The last item is always the current page and should be active
  const lastItem = breadcrumbItems[breadcrumbItems.length - 1];
  lastItem.classList.add('active');
  lastItem.setAttribute('aria-current', 'page');
}

/**
 * Update navigation link active states
 * Marks nav links that match current page
 */
function updateNavLinkActiveState(currentFilename) {
  const navLinks = document.querySelectorAll('.navbar__links a, .navbar__mobile-menu a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');

    // Check if link matches current page
    const isActive =
      href === currentFilename ||
      href === '/' + currentFilename ||
      href.endsWith(currentFilename) ||
      (currentFilename === 'index.html' && (href === 'index.html' || href === './' || href === './index.html'));

    if (isActive && href !== '../index.html' && href !== '../../index.html') {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * Update tab active states based on current page
 */
function updateTabActiveState(currentFilename) {
  // Determine which tab should be active based on current page
  let activeTabId = null;

  if (currentFilename === 'index.html' || currentFilename === '') {
    // On dashboard, show submissions tab (first tab)
    activeTabId = 'submissions-tab';
  } else if (currentFilename === 'inventory.html') {
    activeTabId = 'inventory-tab';
  } else if (currentFilename === 'pricing-editor.html') {
    activeTabId = 'analytics-tab';
  }

  if (activeTabId) {
    // This is optional - tabs are usually managed by admin.js
    // Only set if needed for consistency
    const activeTab = document.getElementById(activeTabId);
    if (activeTab) {
      // Tab switching would happen in admin.js
      // This is just a fallback for consistency
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initActiveStates);
} else {
  initActiveStates();
}

// Also update on popstate (browser back/forward)
window.addEventListener('popstate', initActiveStates);
