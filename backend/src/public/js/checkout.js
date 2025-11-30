/**
 * Checkout Manager
 * Handles checkout form, order review, and order placement
 */

class CheckoutManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.cart = [];
    this.formData = {};
    this.shippingCosts = {
      standard: 10.00,
      express: 25.00,
      overnight: 45.00
    };
    this.taxRate = 0.08;
    this.selectedShipping = 'standard';
  }

  /**
   * Initialize checkout page
   */
  async initialize() {
    this.loadCart();
    this.setupEventListeners();
    this.renderOrderSummary();
  }

  /**
   * Load cart from localStorage
   */
  loadCart() {
    const cartData = localStorage.getItem('cart');
    this.cart = cartData ? JSON.parse(cartData) : [];

    if (this.cart.length === 0) {
      this.showError('Cart is empty. Redirecting to cart...');
      setTimeout(() => {
        window.location.href = 'cart.html';
      }, 2000);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const form = document.querySelector('[data-checkout-form]');

    // Billing address checkbox
    const sameAsBillingCheckbox = document.querySelector('input[name="sameAsBilling"]');
    if (sameAsBillingCheckbox) {
      sameAsBillingCheckbox.addEventListener('change', (e) => {
        const billingSection = document.getElementById('billing-section');
        billingSection.style.display = e.target.checked ? 'none' : 'block';
      });
    }

    // Payment method selection
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.updatePaymentForm(e.target.value);
      });
    });

    // Form submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCheckout();
      });
    }
  }

  /**
   * Update payment form based on selected method
   */
  updatePaymentForm(method) {
    document.getElementById('credit-card-form').style.display = method === 'credit-card' ? 'block' : 'none';
    document.getElementById('paypal-form').style.display = method === 'paypal' ? 'block' : 'none';
    document.getElementById('bank-transfer-form').style.display = method === 'bank-transfer' ? 'block' : 'none';
  }

  /**
   * Render order summary
   */
  renderOrderSummary() {
    const itemsContainer = document.querySelector('[data-order-items]');

    if (!itemsContainer) return;

    if (this.cart.length === 0) {
      itemsContainer.innerHTML = '<p style="color: #999;">Cart is empty</p>';
      return;
    }

    itemsContainer.innerHTML = this.cart.map(item => `
      <div class="order-item">
        <div class="order-item__info">
          <div class="order-item__title">${this.escapeHtml(item.title || 'Unknown')}</div>
          <div class="order-item__artist">${this.escapeHtml(item.artist || '')}</div>
          <div class="order-item__qty">Qty: ${item.quantity || 1}</div>
        </div>
        <div class="order-item__price">
          $${(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}
        </div>
      </div>
    `).join('');

    this.updateTotals();
  }

  /**
   * Calculate and update totals
   */
  updateTotals() {
    const subtotal = this.getSubtotal();
    const shipping = this.shippingCosts[this.selectedShipping] || this.shippingCosts.standard;
    const tax = subtotal * this.taxRate;
    const total = subtotal + shipping + tax;

    document.querySelector('[data-subtotal]').textContent = `$${subtotal.toFixed(2)}`;
    document.querySelector('[data-shipping]').textContent = `$${shipping.toFixed(2)}`;
    document.querySelector('[data-tax]').textContent = `$${tax.toFixed(2)}`;
    document.querySelector('[data-total]').textContent = `$${total.toFixed(2)}`;
  }

  /**
   * Get cart subtotal
   */
  getSubtotal() {
    return this.cart.reduce((total, item) => {
      return total + (parseFloat(item.price || 0) * (item.quantity || 1));
    }, 0);
  }

  /**
   * Validate checkout form
   */
  validateForm() {
    const form = document.querySelector('[data-checkout-form]');
    if (!form.checkValidity()) {
      this.showError('Please fill out all required fields');
      return false;
    }

    // Validate payment method
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

    if (paymentMethod === 'credit-card') {
      const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
      if (!/^\d{13,19}$/.test(cardNumber)) {
        this.showError('Invalid card number. Please enter 13-19 digits.');
        return false;
      }

      const expiry = document.getElementById('expiry').value;
      if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        this.showError('Invalid expiry date. Use MM/YY format.');
        return false;
      }

      const cvv = document.getElementById('cvv').value;
      if (!/^\d{3,4}$/.test(cvv)) {
        this.showError('Invalid CVV. Please enter 3 or 4 digits.');
        return false;
      }
    }

    // Validate terms acceptance
    if (!document.querySelector('input[name="agreeTerms"]').checked) {
      this.showError('Please agree to the Terms of Service and Privacy Policy');
      return false;
    }

    return true;
  }

  /**
   * Collect form data
   */
  collectFormData() {
    const form = document.querySelector('[data-checkout-form]');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    return {
      shipping: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipcode: data.zipcode,
        country: data.country
      },
      billing: data.sameAsBilling ? null : {
        firstName: data.billingFirstName,
        lastName: data.billingLastName,
        address: data.billingAddress,
        city: data.billingCity,
        state: data.billingState,
        zipcode: data.billingZipcode,
        country: data.billingCountry
      },
      payment: {
        method: data.paymentMethod,
        cardholderName: data.cardholderName,
        cardNumber: data.cardNumber ? data.cardNumber.replace(/\s/g, '').slice(-4) : null, // Only store last 4
        saveCard: data.saveCard === 'on'
      },
      notes: data.orderNotes,
      subscribe: data.subscribe === 'on',
      cart: this.cart,
      totals: {
        subtotal: this.getSubtotal(),
        shipping: this.shippingCosts[data.shippingMethod] || this.shippingCosts.standard,
        tax: this.getSubtotal() * this.taxRate,
        total: this.getSubtotal() + (this.shippingCosts[data.shippingMethod] || this.shippingCosts.standard) + (this.getSubtotal() * this.taxRate)
      }
    };
  }

  /**
   * Handle checkout submission
   */
  async handleCheckout() {
    if (!this.validateForm()) {
      return;
    }

    const btn = document.querySelector('[data-place-order-btn]');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
      const orderData = this.collectFormData();

      // For now, store order locally and show success
      // In production, this would submit to /api/v1/orders
      localStorage.setItem('pending_order', JSON.stringify(orderData));
      localStorage.removeItem('cart'); // Clear cart after order

      this.showSuccess('Order placed successfully!');

      // Redirect to order confirmation page
      setTimeout(() => {
        window.location.href = 'order-confirmation.html?order=' + this.generateOrderNumber();
      }, 1500);
    } catch (error) {
      console.error('Checkout error:', error);
      this.showError('Failed to place order: ' + error.message);
      btn.disabled = false;
      btn.textContent = 'Place Order';
    }
  }

  /**
   * Generate order number
   */
  generateOrderNumber() {
    return 'ORD-' + Date.now();
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
}

// Create global instance
const checkoutManager = new CheckoutManager(api);
