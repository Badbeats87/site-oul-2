/**
 * Buyer Products Catalog Manager
 * Handles product browsing, filtering, searching, and pagination
 */

class BuyerProductsManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.products = [];
    this.totalProducts = 0;
    this.filters = {
      search: '',
      genre: 'all',
      conditions: [],
      minPrice: 0,
      maxPrice: 10000,
      sort: 'newest',
    };
    this.pagination = {
      page: 1,
      limit: 12,
      total: 0,
    };
  }

  /**
   * Initialize product catalog
   */
  async initialize() {
    this.setupEventListeners();
    await this.loadProducts();
  }

  /**
   * Setup event listeners for filters
   */
  setupEventListeners() {
    // Search input
    const searchInput = document.querySelector('.filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.pagination.page = 1;
        this.loadProducts();
      });
    }

    // Genre filter (radio buttons)
    const genreRadios = document.querySelectorAll('input[name="genre"]');
    genreRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        this.filters.genre = e.target.value;
        this.pagination.page = 1;
        this.loadProducts();
      });
    });

    // Condition filter (checkboxes)
    const conditionCheckboxes = document.querySelectorAll(
      '.filter-options input[type="checkbox"]'
    );
    conditionCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        this.filters.conditions = Array.from(conditionCheckboxes)
          .filter((cb) => cb.checked)
          .map((cb) => cb.value);
        this.pagination.page = 1;
        this.loadProducts();
      });
    });

    // Price range inputs
    const priceInputs = document.querySelectorAll('.price-input');
    if (priceInputs.length >= 2) {
      priceInputs[0].addEventListener('change', (e) => {
        this.filters.minPrice = parseFloat(e.target.value) || 0;
        this.pagination.page = 1;
        this.loadProducts();
      });

      priceInputs[1].addEventListener('change', (e) => {
        this.filters.maxPrice = parseFloat(e.target.value) || 10000;
        this.pagination.page = 1;
        this.loadProducts();
      });
    }

    // Sort select
    const sortSelect = document.querySelector(
      '.filter-section:nth-child(5) .filter-select'
    );
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const sortValue = e.target.value;
        if (sortValue.includes('Price: Low')) this.filters.sort = 'price_asc';
        else if (sortValue.includes('Price: High'))
          this.filters.sort = 'price_desc';
        else if (sortValue.includes('Popular')) this.filters.sort = 'popular';
        else this.filters.sort = 'newest';
        this.pagination.page = 1;
        this.loadProducts();
      });
    }

    // View toggle buttons
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        viewBtns.forEach((b) => b.classList.remove('view-btn--active'));
        e.target.classList.add('view-btn--active');
      });
    });

    // Pagination buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('.pagination button')) {
        const text = e.target.textContent.trim();
        if (text === '← Previous' && this.pagination.page > 1) {
          this.pagination.page--;
          this.loadProducts();
          this.scrollToProducts();
        } else if (
          text === 'Next →' &&
          this.pagination.page < this.getTotalPages()
        ) {
          this.pagination.page++;
          this.loadProducts();
          this.scrollToProducts();
        } else if (!isNaN(parseInt(text))) {
          this.pagination.page = parseInt(text);
          this.loadProducts();
          this.scrollToProducts();
        }
      }
    });
  }

  /**
   * Load products from API
   */
  async loadProducts() {
    try {
      this.showLoading(true);

      // Build query parameters
      const params = {
        page: this.pagination.page,
        limit: this.pagination.limit,
      };

      if (this.filters.search) {
        params.search = this.filters.search;
      }

      if (this.filters.genre !== 'all') {
        params.genre = this.filters.genre;
      }

      if (this.filters.conditions.length > 0) {
        params.conditions = this.filters.conditions.join(',');
      }

      if (this.filters.minPrice > 0 || this.filters.maxPrice < 10000) {
        params.minPrice = this.filters.minPrice;
        params.maxPrice = this.filters.maxPrice;
      }

      if (this.filters.sort !== 'newest') {
        params.sort = this.filters.sort;
      }

      // Fetch products from API
      const response = await this.api.get('/buyer/products', params);

      this.products = response.products || response.data || [];
      this.pagination.total = response.total || 0;

      this.renderProducts();
      this.updatePagination();
      this.showLoading(false);
    } catch (error) {
      console.error('Failed to load products:', error);
      this.showError('Failed to load products: ' + error.message);
      this.showLoading(false);
    }
  }

  /**
   * Render products to grid
   */
  renderProducts() {
    const grid = document.querySelector('.products-grid');
    if (!grid) return;

    if (this.products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666;">
          <p>No products found matching your filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.products
      .map(
        (product) => `
      <div class="product-card">
        <a href="product.html?id=${product.id}" style="text-decoration: none; color: inherit;">
          <div class="product-card__image">
            ${
  product.coverArtUrl
    ? `<img src="${product.coverArtUrl}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;">`
    : `<svg viewBox="0 0 240 240" fill="none">
                <rect width="240" height="240" fill="#e5e7eb"/>
                <text x="120" y="120" text-anchor="middle" dominant-baseline="middle" font-size="18" fill="#9ca3af">Album Cover</text>
              </svg>`
}
            ${product.isNew ? '<div class="product-card__badge product-card__badge--new">New</div>' : ''}
            ${product.isRare ? '<div class="product-card__badge product-card__badge--rare">Rare</div>' : ''}
            ${product.lowStock ? '<div class="product-card__badge product-card__badge--low">Low Stock</div>' : ''}
          </div>
          <div class="product-card__content">
            <h3 class="product-card__title">${this.escapeHtml(product.title || 'Unknown')}</h3>
            <p class="product-card__artist">${this.escapeHtml(product.artist || '')}</p>
            <div class="product-card__meta">
              <span>${product.condition || 'N/A'} • ${product.releaseYear || 'N/A'}</span>
              <span class="badge ${product.inStock ? 'badge--success' : 'badge--danger'}">
                ${product.inStock ? (product.quantity > 1 ? `In Stock (${product.quantity})` : 'In Stock') : 'Out of Stock'}
              </span>
            </div>
            <div class="product-card__price">
              <span class="price-current">$${parseFloat(product.price || 0).toFixed(2)}</span>
              ${
  product.originalPrice && product.originalPrice !== product.price
    ? `<span class="price-original">$${parseFloat(product.originalPrice).toFixed(2)}</span>`
    : ''
}
            </div>
          </div>
        </a>
        <button class="button button--accent button--block" data-product-id="${product.id}" data-add-to-cart>
          ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    `
      )
      .join('');

    // Add cart event listeners
    document.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const productId = e.target.dataset.productId;
        this.addToCart(productId);
      });
    });
  }

  /**
   * Update pagination display
   */
  updatePagination() {
    const resultsInfo = document.querySelector('.results-info');
    if (resultsInfo) {
      const start = (this.pagination.page - 1) * this.pagination.limit + 1;
      const end = Math.min(
        start + this.pagination.limit - 1,
        this.pagination.total
      );
      resultsInfo.innerHTML = `
        <p>Showing <strong>${start}–${end}</strong> of <strong>${this.pagination.total}</strong> records</p>
      `;
    }

    // Update pagination buttons
    const totalPages = this.getTotalPages();
    const paginationContainer = document.querySelector('.pagination');
    if (paginationContainer) {
      const buttons = paginationContainer.querySelectorAll('button');
      buttons.forEach((btn) => {
        const text = btn.textContent.trim();
        if (!isNaN(parseInt(text))) {
          btn.classList.toggle(
            'button--accent',
            parseInt(text) === this.pagination.page
          );
          btn.classList.toggle(
            'button--secondary',
            parseInt(text) !== this.pagination.page
          );
        }
      });
    }
  }

  /**
   * Get total number of pages
   */
  getTotalPages() {
    return Math.ceil(this.pagination.total / this.pagination.limit);
  }

  /**
   * Add product to cart
   */
  async addToCart(productId) {
    try {
      const product = this.products.find((p) => p.id === productId);
      if (!product) return;

      // Get current cart from localStorage
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');

      // Check if product already in cart
      const existingItem = cart.find((item) => item.id === productId);
      if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
      } else {
        cart.push({
          id: productId,
          title: product.title,
          artist: product.artist,
          price: product.price,
          quantity: 1,
        });
      }

      // Save updated cart
      localStorage.setItem('cart', JSON.stringify(cart));

      // Show success message
      this.showSuccess(`Added "${product.title}" to cart`);

      // Update cart count in navbar
      this.updateCartCount();
    } catch (error) {
      console.error('Failed to add to cart:', error);
      this.showError('Failed to add to cart');
    }
  }

  /**
   * Update cart count in navbar
   */
  updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartLink = document.querySelector('[data-cart-link]');
    if (cartLink) {
      const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      cartLink.textContent = `Cart (${count})`;
    }
  }

  /**
   * Scroll to products section
   */
  scrollToProducts() {
    const section = document.querySelector('.products-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Show loading indicator
   */
  showLoading(show) {
    // Could add a spinner if needed
    if (show) {
      console.log('Loading products...');
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText =
      'position: fixed; top: 20px; right: 20px; background: #fee; color: #c33; padding: 12px 20px; border-radius: 4px; z-index: 1000;';
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText =
      'position: fixed; top: 20px; right: 20px; background: #efe; color: #3c3; padding: 12px 20px; border-radius: 4px; z-index: 1000;';
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create global instance
const buyerProductsManager = new BuyerProductsManager(api);
