/**
 * Admin Settings Page Manager
 * Handles settings section navigation and form interactions
 */

const settingsManager = {
  currentSection: 'general',

  init() {
    this.cacheElements();
    this.bindEvents();
    this.showSection('general');
  },

  cacheElements() {
    this.navItems = document.querySelectorAll('.settings-nav__item');
    this.sections = document.querySelectorAll('.settings-section');
  },

  bindEvents() {
    this.navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        const section = item.getAttribute('data-section');
        if (section) {
          e.preventDefault();
          this.showSection(section);
        }
      });
    });

    // Handle Save buttons
    const saveButtons = document.querySelectorAll(
      '.settings-group .button--primary'
    );
    saveButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    });

    // Handle Test Email Connection button
    const testEmailBtn = document.querySelector(
      '.settings-group .button--secondary'
    );
    if (testEmailBtn && testEmailBtn.textContent.includes('Test Email')) {
      testEmailBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.testEmailConnection();
      });
    }

    // Handle Add New Admin button
    const addAdminBtn = document.querySelector(
      '.settings-group .button--primary'
    );
    if (addAdminBtn && addAdminBtn.textContent.includes('Add New Admin')) {
      addAdminBtn.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Add new admin functionality would open a modal here');
      });
    }
  },

  showSection(sectionName) {
    // Update active nav item
    this.navItems.forEach((item) => {
      const itemSection = item.getAttribute('data-section');
      if (itemSection === sectionName) {
        item.classList.add('settings-nav__item--active');
      } else {
        item.classList.remove('settings-nav__item--active');
      }
    });

    // Show/hide sections
    this.sections.forEach((section) => {
      const sectionName_ = section.getAttribute('data-section');
      if (sectionName_ === sectionName) {
        section.classList.add('settings-section--active');
      } else {
        section.classList.remove('settings-section--active');
      }
    });

    this.currentSection = sectionName;

    // Scroll to top of content
    document.querySelector('.settings-content').scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  },

  saveSettings() {
    // Collect form data for current section
    const section = document.querySelector('.settings-section--active');
    const inputs = section.querySelectorAll('input, select, textarea');
    const data = {};

    inputs.forEach((input) => {
      const key = input.id || input.name;
      if (input.type === 'checkbox') {
        data[key] = input.checked;
      } else {
        data[key] = input.value;
      }
    });

    // In a real application, this would send to an API
    console.log('Saving settings for section:', this.currentSection, data);

    // Show success message
    this.showNotification('Settings saved successfully!', 'success');
  },

  testEmailConnection() {
    const emailConfig = {
      host: document.getElementById('smtp-host').value,
      port: document.getElementById('smtp-port').value,
      user: document.getElementById('smtp-user').value,
      password: document.getElementById('smtp-password').value,
      from: document.getElementById('from-email').value,
    };

    // Validate required fields
    if (
      !emailConfig.host ||
      !emailConfig.port ||
      !emailConfig.user ||
      !emailConfig.password
    ) {
      this.showNotification('Please fill in all required SMTP fields', 'error');
      return;
    }

    // In a real application, this would test the connection via API
    console.log('Testing email connection with:', emailConfig);

    this.showNotification('Testing email connection...', 'info');

    // Simulate test
    setTimeout(() => {
      this.showNotification('Email connection successful!', 'success');
    }, 1500);
  },

  showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    settingsManager.init();
  });
} else {
  settingsManager.init();
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
