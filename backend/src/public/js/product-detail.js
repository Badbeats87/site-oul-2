/**
 * Product Detail Page Manager
 * Handles loading product data, market comparisons, and related products
 */

class ProductDetailManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.product = null;
    this.marketData = null;
    this.relatedProducts = [];
  }

  /**
   * Initialize product detail page
   */
  async initialize() {
    try {
      const productId = this.getProductIdFromUrl();
      if (!productId) {
        this.showError('Product not found');
        return;
      }

      this.showLoading();

      // Load product data
      await this.loadProduct(productId);

      if (!this.product) {
        this.showError('Could not load product details');
        return;
      }

      // Load market data in parallel
      await Promise.all([
        this.loadMarketData(),
        this.loadRelatedProducts()
      ]);

      this.renderProductDetail();
      this.setupEventListeners();
      this.hideLoading();
    } catch (error) {
      console.error('Failed to load product:', error);
      this.showError('Failed to load product details: ' + error.message);
    }
  }

  /**
   * Get product ID from URL query string
   */
  getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  /**
   * Load product data from API
   */
  async loadProduct(productId) {
    try {
      const response = await this.api.get(`/buyer/products/${productId}`);
      this.product = response;
    } catch (error) {
      console.error('Failed to load product:', error);
      throw error;
    }
  }

  /**
   * Load market data (Discogs/eBay) for the product
   */
  async loadMarketData() {
    if (!this.product) return;

    try {
      // Try to load market data from Discogs if barcode is available
      if (this.product.barcode) {
        try {
          const discogsData = await this.api.get('/integrations/discogs/search-enriched', {
            barcode: this.product.barcode
          });

          if (discogsData && discogsData.results && discogsData.results.length > 0) {
            const release = discogsData.results[0];

            // Try to get price data
            const priceData = await this.api.get(`/integrations/discogs/prices/${release.id}`);
            if (priceData) {
              this.marketData = {
                source: 'DISCOGS',
                low: priceData.statLow,
                median: priceData.statMedian,
                high: priceData.statHigh,
                sampleSize: priceData.sampleSize
              };
            }
          }
        } catch (e) {
          console.warn('Failed to load Discogs data:', e);
        }
      }

      // Could also load eBay data here, but keeping it simple for now
    } catch (error) {
      console.warn('Failed to load market data:', error);
      // Don't throw - market data is optional
    }
  }

  /**
   * Load related products (by artist or genre)
   */
  async loadRelatedProducts() {
    if (!this.product) return;

    try {
      const response = await this.api.get('/buyer/products', {
        search: this.product.artist,
        limit: 6
      });

      // Filter out current product
      this.relatedProducts = (response.products || [])
        .filter(p => p.id !== this.product.id)
        .slice(0, 6);
    } catch (error) {
      console.warn('Failed to load related products:', error);
      // Don't throw - related products are optional
    }
  }

  /**
   * Render product detail page
   */
  renderProductDetail() {
    // Show product detail section
    document.querySelector('.product-detail').style.display = 'block';

    // Update title and breadcrumb
    document.querySelector('[data-product-breadcrumb]').textContent = this.product.title || 'Product';
    document.querySelector('[data-product-title]').textContent = this.product.title || 'Unknown';
    document.querySelector('[data-product-artist]').textContent = this.product.artist || '';

    // Update metadata
    document.querySelector('[data-product-label]').textContent = this.product.label || 'N/A';
    document.querySelector('[data-product-year]').textContent = this.product.releaseYear || 'N/A';
    document.querySelector('[data-product-catalog]').textContent = this.product.catalogNumber || 'N/A';
    document.querySelector('[data-product-barcode]').textContent = this.product.barcode || 'N/A';

    // Update condition grades
    document.querySelector('[data-product-condition-media]').textContent =
      this.formatCondition(this.product.conditionMedia) || 'N/A';
    document.querySelector('[data-product-condition-sleeve]').textContent =
      this.formatCondition(this.product.conditionSleeve) || 'N/A';

    // Update pricing
    document.querySelector('[data-product-price]').textContent =
      '$' + parseFloat(this.product.price || 0).toFixed(2);

    // Update stock status
    this.updateStockStatus();

    // Update image
    const mainImage = document.querySelector('#main-image');
    if (this.product.coverArtUrl) {
      mainImage.src = this.product.coverArtUrl;
      mainImage.alt = this.product.title;
    } else {
      mainImage.style.display = 'none';
    }

    // Update description if available
    if (this.product.description) {
      const descDiv = document.querySelector('[data-product-description]');
      descDiv.style.display = 'block';
      descDiv.querySelector('p').textContent = this.product.description;
    }

    // Update specs
    document.querySelector('[data-product-genre]').textContent = this.product.genre || 'N/A';
    document.querySelector('[data-product-media-full]').textContent =
      this.formatConditionFull(this.product.conditionMedia);
    document.querySelector('[data-product-sleeve-full]').textContent =
      this.formatConditionFull(this.product.conditionSleeve);
    document.querySelector('[data-product-sku]').textContent = this.product.sku || this.product.id;

    // Render market data
    this.renderMarketData();

    // Render related products
    this.renderRelatedProducts();

    // Update cart count
    this.updateCartCount();
  }

  /**
   * Update stock status display
   */
  updateStockStatus() {
    const statusEl = document.querySelector('[data-stock-status]');
    const quantityEl = document.querySelector('[data-stock-quantity]');
    const addToCartBtn = document.querySelector('[data-add-to-cart-btn]');

    if (this.product.quantity > 0) {
      statusEl.textContent = '✓ In Stock';
      statusEl.className = 'stock-status in-stock';

      if (this.product.quantity <= 2) {
        quantityEl.textContent = `Only ${this.product.quantity} left`;
      } else {
        quantityEl.textContent = `${this.product.quantity} available`;
      }

      addToCartBtn.disabled = false;
      addToCartBtn.textContent = 'Add to Cart';
    } else {
      statusEl.textContent = '✗ Out of Stock';
      statusEl.className = 'stock-status out-of-stock';
      quantityEl.textContent = '';

      addToCartBtn.disabled = true;
      addToCartBtn.textContent = 'Out of Stock';
    }
  }

  /**
   * Render market data comparison
   */
  renderMarketData() {
    const marketContainer = document.querySelector('[data-market-data]');

    if (!this.marketData) {
      marketContainer.style.display = 'none';
      return;
    }

    marketContainer.style.display = 'block';

    // Update Discogs data if available
    if (this.marketData.source === 'DISCOGS') {
      const discogsDiv = marketContainer.querySelector('.discogs');
      discogsDiv.style.display = 'block';

      discogsDiv.querySelector('[data-discogs-low]').textContent =
        '$' + parseFloat(this.marketData.low || 0).toFixed(2);
      discogsDiv.querySelector('[data-discogs-median]').textContent =
        '$' + parseFloat(this.marketData.median || 0).toFixed(2);
      discogsDiv.querySelector('[data-discogs-high]').textContent =
        '$' + parseFloat(this.marketData.high || 0).toFixed(2);
      discogsDiv.querySelector('[data-discogs-sample]').textContent =
        this.marketData.sampleSize || 'N/A';

      // Show price comparison badge
      this.showPriceComparison(this.marketData.median);
    }
  }

  /**
   * Show price comparison badge
   */
  showPriceComparison(marketPrice) {
    if (!marketPrice || marketPrice === 0) return;

    const ourPrice = parseFloat(this.product.price || 0);
    const percentDiff = ((ourPrice - marketPrice) / marketPrice) * 100;

    const comparisonDiv = document.querySelector('[data-price-comparison]');
    const badge = comparisonDiv.querySelector('[data-price-badge]');

    comparisonDiv.style.display = 'block';

    if (percentDiff < -10) {
      badge.className = 'badge badge--below-market';
      badge.textContent = '✓ Below Market (' + percentDiff.toFixed(0) + '%)';
    } else if (percentDiff > 10) {
      badge.className = 'badge badge--above-market';
      badge.textContent = 'Premium (' + percentDiff.toFixed(0) + '%)';
    } else {
      badge.className = 'badge badge--at-market';
      badge.textContent = '= Fair Market Price';
    }
  }

  /**
   * Render related products
   */
  renderRelatedProducts() {
    const container = document.querySelector('[data-related-products]');

    if (this.relatedProducts.length === 0) {
      container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;"><p>No related products found</p></div>';
      return;
    }

    container.innerHTML = this.relatedProducts.map(product => `
      <div class="product-card">
        <div class="product-card__image">
          ${product.coverArtUrl ?
            `<img src="${product.coverArtUrl}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;">` :
            `<svg viewBox="0 0 240 240" fill="none">
              <rect width="240" height="240" fill="#e5e7eb"/>
              <text x="120" y="120" text-anchor="middle" dominant-baseline="middle" font-size="18" fill="#9ca3af">Album Cover</text>
            </svg>`
          }
        </div>
        <div class="product-card__content">
          <h3 class="product-card__title">
            <a href="product.html?id=${product.id}" style="text-decoration: none; color: inherit;">
              ${this.escapeHtml(product.title || 'Unknown')}
            </a>
          </h3>
          <p class="product-card__artist">${this.escapeHtml(product.artist || '')}</p>
          <div class="product-card__meta">
            <span>${product.condition || 'N/A'} • ${product.releaseYear || 'N/A'}</span>
            <span class="badge ${product.quantity > 0 ? 'badge--success' : 'badge--danger'}">
              ${product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>
          <div class="product-card__price">
            <span class="price-current">$${parseFloat(product.price || 0).toFixed(2)}</span>
          </div>
          <a href="product.html?id=${product.id}" class="button button--accent button--block">
            View Details
          </a>
        </div>
      </div>
    `).join('');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Add to cart button
    const addToCartBtn = document.querySelector('[data-add-to-cart-btn]');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        if (this.product.quantity > 0) {
          this.addToCart();
        }
      });
    }

    // Wishlist button
    const wishlistBtn = document.querySelector('[data-wishlist-btn]');
    if (wishlistBtn) {
      wishlistBtn.addEventListener('click', () => {
        this.addToWishlist();
      });
    }
  }

  /**
   * Add product to cart
   */
  addToCart() {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');

      // Check if product already in cart
      const existingItem = cart.find(item => item.id === this.product.id);
      if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
      } else {
        cart.push({
          id: this.product.id,
          title: this.product.title,
          artist: this.product.artist,
          price: this.product.price,
          quantity: 1,
          image: this.product.coverArtUrl
        });
      }

      localStorage.setItem('cart', JSON.stringify(cart));
      this.updateCartCount();
      this.showSuccess(`Added "${this.product.title}" to cart`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      this.showError('Failed to add to cart');
    }
  }

  /**
   * Add product to wishlist
   */
  addToWishlist() {
    try {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

      // Check if already in wishlist
      if (wishlist.find(item => item.id === this.product.id)) {
        this.showError('Already in wishlist');
        return;
      }

      wishlist.push({
        id: this.product.id,
        title: this.product.title,
        artist: this.product.artist,
        price: this.product.price,
        addedAt: new Date().toISOString()
      });

      localStorage.setItem('wishlist', JSON.stringify(wishlist));
      this.showSuccess(`Added "${this.product.title}" to wishlist`);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      this.showError('Failed to add to wishlist');
    }
  }

  /**
   * Update cart count in navigation
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
   * Format condition code to display text
   */
  formatCondition(code) {
    const map = {
      'MINT': 'Mint',
      'NM': 'Near Mint',
      'VG_PLUS': 'Very Good+',
      'VG': 'Very Good',
      'VG_MINUS': 'Very Good-',
      'G': 'Good',
      'FAIR': 'Fair',
      'POOR': 'Poor'
    };
    return map[code] || code;
  }

  /**
   * Format condition to full description
   */
  formatConditionFull(code) {
    const descriptions = {
      'MINT': 'Mint (M) - Perfect condition, unplayed',
      'NM': 'Near Mint (NM) - Nearly perfect, minimal signs of play',
      'VG_PLUS': 'Very Good Plus (VG+) - Well cared for with light wear',
      'VG': 'Very Good (VG) - Surface marks and/or audible defects',
      'VG_MINUS': 'Very Good Minus (VG-) - Significant wear and damage',
      'G': 'Good (G) - Heavy wear, plays through but with issues',
      'FAIR': 'Fair - Damaged but still playable',
      'POOR': 'Poor - Severely damaged, barely playable'
    };
    return descriptions[code] || 'Unknown condition';
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
   * Show loading state
   */
  showLoading() {
    document.querySelector('[data-loading-state]').style.display = 'block';
    document.querySelector('[data-error-state]').style.display = 'none';
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    document.querySelector('[data-loading-state]').style.display = 'none';
  }

  /**
   * Show error state
   */
  showError(message) {
    document.querySelector('[data-error-state]').style.display = 'block';
    document.querySelector('[data-error-message]').textContent = message;
    document.querySelector('[data-loading-state]').style.display = 'none';
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
const productDetailManager = new ProductDetailManager(api);
