(() => {
  const body = document.body;
  const nav = document.querySelector('.admin-topbar__nav');
  const toggle = document.querySelector('[data-nav-toggle]');
  if (!body || !nav || !toggle) return;

  const navId = nav.id || 'admin-topbar-nav';
  nav.id = navId;
  toggle.setAttribute('aria-controls', navId);

  const closeNav = () => {
    body.classList.remove('topnav-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  const openNav = () => {
    body.classList.add('topnav-menu-open');
    toggle.setAttribute('aria-expanded', 'true');
  };

  const toggleNav = () => {
    if (body.classList.contains('topnav-menu-open')) {
      closeNav();
    } else {
      openNav();
    }
  };

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    toggleNav();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      closeNav();
    }
  });

  closeNav();
})();
