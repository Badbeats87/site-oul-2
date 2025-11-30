/**
 * Mobile Navigation Toggle
 * Handles hamburger menu toggle and mobile nav interactions
 */

function initMobileNav() {
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const navLinks = document.querySelector('[data-navbar-links]');

  if (!menuToggle || !navLinks) {
    return;
  }

  // Toggle menu on button click
  menuToggle.addEventListener('click', function () {
    const isExpanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', !isExpanded);
    this.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  // Close menu when a link is clicked
  const links = navLinks.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('click', function () {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });

  // Close menu on Escape key
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (menuToggle.getAttribute('aria-expanded') === 'true') {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
      }
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', function (event) {
    const navbar = document.querySelector('.navbar');
    if (!navbar.contains(event.target)) {
      if (menuToggle.getAttribute('aria-expanded') === 'true') {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
      }
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileNav);
} else {
  initMobileNav();
}
