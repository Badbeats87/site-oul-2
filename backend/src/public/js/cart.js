/**
 * Shopping Cart Manager
 * Handles cart display, quantity management, and checkout flow
 */

class CartManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.items = [];
    this.shipping = 'standard';
    this.shippingCosts = {
      standard: 10.00,
      express: 25.00,
      overnight: 45.00
    };
    this.taxRate = 0.08; // 8% tax
  }

  /**
   * Initialize cart page
   */
  async initialize() {
    this.setupEventListeners();
    this.loadCart();
    this.renderCart();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Shipping option changes
    document.querySelectorAll('input[name="shipping"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.shipping = e.target.value;
        this.updateTotals();
      });
    });

    // Promo code apply button
    const applyPromoBtn = document.querySelector('[data-apply-promo]');
    if (applyPromoBtn) {
      applyPromoBtn.addEventListener('click', () => {
        const promoInput = document.querySelector('[data-promo-code]');
        const code = promoInput.value.trim();
        if (code) {
          this.applyPromoCode(code);
        }
      });
    }

    // Checkout button
    const checkoutBtn = document.querySelector('[data-checkout-btn]');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', (e) => {
        if (this.items.length === 0) {
          e.preventDefault();
          this.showError('Cart is empty');
        }
      });
    }
  }

  /**
   * Load cart from localStorage
   */
  loadCart() {
    const cartData = localStorage.getItem('cart');
    this.items = cartData ? JSON.parse(cartData) : [];
  }

  /**
   * Save cart to localStorage
   */
  saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.items));
  }

  /**
   * Render cart
   */
  renderCart() {
    this.updateCartCount();

    if (this.items.length === 0) {
      document.querySelector('[data-empty-state]').style.display = 'block';
      document.querySelector('[data-cart-content]').style.display = 'none';
      return;
    }

    document.querySelector('[data-empty-state]').style.display = 'none';
    document.querySelector('[data-cart-content]').style.display = 'block';

    const tbody = document.querySelector('[data-cart-items]');
    tbody.innerHTML = this.items.map(item => `
      <tr class="cart-row" data-item-id="${item.id}">
        <td class="col-product">
          <div class="cart-item">
            <div class="cart-item__content">
              <h3 class="cart-item__title">${this.escapeHtml(item.title || 'Unknown')}</h3>
              <p class="cart-item__artist">${this.escapeHtml(item.artist || '')}</p>
            </div>
          </div>
        </td>
        <td class="col-price">
          <span class="cart-price">$${parseFloat(item.price || 0).toFixed(2)}</span>
        </td>
        <td class="col-quantity">
          <div class="quantity-control">
            <button class="quantity-btn quantity-btn--minus" data-decrease-qty="${item.id}">−</button>
            <input type="number" class="quantity-input" value="${item.quantity || 1}" min="1" max="99" data-qty-input="${item.id}">
            <button class="quantity-btn quantity-btn--plus" data-increase-qty="${item.id}">+</button>
          </div>
        </td>
        <td class="col-total">
          <span class="cart-total">$${(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
        </td>
        <td class="col-actions">
          <button class="cart-remove-btn" data-remove-item="${item.id}" title="Remove item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </td>
      </tr>
    `).join('');

    // Add event listeners for quantity controls
    this.setupQuantityControls();

    // Add event listeners for remove buttons
    document.querySelectorAll('[data-remove-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.removeItem;
        this.removeItem(itemId);
      });
    });

    this.updateTotals();
  }

  /**
   * Setup quantity control event listeners
   */
  setupQuantityControls() {
    // Increase quantity buttons
    document.querySelectorAll('[data-increase-qty]').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.increaseQty;
        this.updateQuantity(itemId, 1);
      });
    });

    // Decrease quantity buttons
    document.querySelectorAll('[data-decrease-qty]').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.decreaseQty;
        this.updateQuantity(itemId, -1);
      });
    });

    // Quantity input fields
    document.querySelectorAll('[data-qty-input]').forEach(input => {
      input.addEventListener('change', (e) => {
        const itemId = e.target.dataset.qtyInput;
        const newQty = parseInt(e.target.value) || 1;
        const item = this.items.find(i => i.id === itemId);
        if (item) {
          item.quantity = Math.max(1, Math.min(99, newQty));
          this.saveCart();
          this.renderCart();
        }
      });
    });
  }

  /**
   * Update item quantity
   */
  updateQuantity(itemId, change) {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.quantity = Math.max(1, (item.quantity || 1) + change);
      this.saveCart();
      this.renderCart();
    }
  }

  /**
   * Remove item from cart
   */
  removeItem(itemId) {
    this.items = this.items.filter(item => item.id !== itemId);
    this.saveCart();
    this.renderCart();
    this.showSuccess('Item removed from cart');
  }

  /**
   * Calculate subtotal
   */
  getSubtotal() {
    return this.items.reduce((total, item) => {
      return total + (parseFloat(item.price || 0) * (item.quantity || 1));
    }, 0);
  }

  /**
   * Get shipping cost
   */
  getShipping() {
    return this.shippingCosts[this.shipping] || this.shippingCosts.standard;
  }

  /**
   * Get tax amount
   */
  getTax() {
    const subtotal = this.getSubtotal();
    return subtotal * this.taxRate;
  }

  /**
   * Get total
   */
  getTotal() {
    return this.getSubtotal() + this.getShipping() + this.getTax();
  }

  /**
   * Update totals display
   */
  updateTotals() {
    const subtotal = this.getSubtotal();
    const shipping = this.getShipping();
    const tax = this.getTax();
    const total = this.getTotal();

    document.querySelector('[data-subtotal]').textContent = `$${subtotal.toFixed(2)}`;
    document.querySelector('[data-tax]').textContent = `$${tax.toFixed(2)}`;
    document.querySelector('[data-total]').textContent = `$${total.toFixed(2)}`;

    // Update shipping option display
    document.querySelectorAll('[data-shipping-standard], [data-shipping-express], [data-shipping-overnight]').forEach(el => {
      const shippingType = el.dataset.shippingStandard ? 'standard' :
                          el.dataset.shippingExpress ? 'express' : 'overnight';
      el.textContent = `$${this.shippingCosts[shippingType].toFixed(2)}`;
    });
  }

  /**
   * Apply promo code
   */
  applyPromoCode(code) {
    // Basic promo code validation - in production, this would be validated on server
    const promoCodes = {
      'WELCOME10': 0.10,
      'SAVE15': 0.15,
      'VINYL20': 0.20
    };

    if (promoCodes[code.toUpperCase()]) {
      const discount = promoCodes[code.toUpperCase()];
      const subtotal = this.getSubtotal();
      const discountAmount = subtotal * discount;

      this.showSuccess(`Promo code applied! Discount: $${discountAmount.toFixed(2)}`);

      // Store promo code in localStorage
      localStorage.setItem('promo_code', code.toUpperCase());
      localStorage.setItem('promo_discount', discountAmount.toString());
    } else {
      this.showError('Invalid promo code');
    }
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show error message
   */
  showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #fee; color: #c33; padding: 12px 20px; border-radius: 4px; z-index: 1000;';
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #efe; color: #3c3; padding: 12px 20px; border-radius: 4px; z-index: 1000;';
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
  }

  /**
   * Update cart count in navbar
   */
  updateCartCount() {
    const cartLink = document.querySelector('[data-cart-link]');
    if (cartLink) {
      const count = this.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      cartLink.textContent = `Cart (${count})`;
    }
  }
}

// Create global instance
const cartManager = new CartManager(api);
