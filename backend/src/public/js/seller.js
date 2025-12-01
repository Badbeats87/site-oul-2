// Seller Site Interactions
const sellerApp = {
  state: {
    searchResults: [],
    selectedAlbum: null,
    searchTimeout: null,
    pricingPolicy: null,
  },

  init() {
    this.cacheElements();
    this.bindEvents();
  },

  cacheElements() {
    this.searchInput = document.getElementById('searchInput');
    this.searchButton = document.querySelector('.search-box__button');
    this.searchDropdown = document.getElementById('searchDropdown');
    this.searchResultsContainer = document.getElementById('searchResults');
    this.searchLoadingElement = this.searchDropdown?.querySelector(
      '.search-dropdown__loading'
    );
    this.searchNoResultsElement = this.searchDropdown?.querySelector(
      '.search-dropdown__no-results'
    );
    this.conditionBtns = document.querySelectorAll('.condition-btn');
    this.albumCard = document.querySelector('.album-card');
    this.albumCardInfo = document.querySelector('.album-card__info');
    this.albumCardCover = document.querySelector('.album-card__cover');
    this.quoteForm = document.querySelector('.quote-form');
  },

  bindEvents() {
    // Real-time search with debouncing
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(this.state.searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
          this.hideDropdown();
          return;
        }

        this.state.searchTimeout = setTimeout(() => {
          this.performSearch(query);
        }, 300);
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box-container')) {
          this.hideDropdown();
        }
      });
    }

    // Search button (for manual search)
    if (this.searchButton) {
      this.searchButton.addEventListener('click', () => {
        this.performSearch(this.searchInput.value.trim());
      });
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.performSearch(this.searchInput.value.trim());
        }
      });
    }

    // Condition buttons
    this.conditionBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Remove selected from siblings
        btn.parentElement.querySelectorAll('.condition-btn').forEach((b) => {
          b.classList.remove('condition-btn--selected');
        });
        // Add selected to clicked button
        btn.classList.add('condition-btn--selected');
        // Update quote if album is selected
        if (this.state.selectedAlbum) {
          this.updateQuote(this.state.selectedAlbum);
        }
      });
    });
  },

  calculateBuyingPrice(album) {
    // If backend calculated ourPrice (respects current pricing policy), use that
    if (album.ourPrice !== null && album.ourPrice !== undefined) {
      return album.ourPrice;
    }

    let basePrice = this.getBasePrice(album);

    // If no market data, use estimated price based on format/age
    if (!basePrice) {
      basePrice = this.estimatePrice(album);
    }

    if (!basePrice) return null;

    const buyerPercentage = 0.55; // Fallback: We offer sellers 55% of market value
    return basePrice * buyerPercentage;
  },

  getBasePrice(album) {
    const marketSnapshot = album.marketSnapshots?.[0];
    if (!marketSnapshot) return 0;
    return parseFloat(marketSnapshot.statLow || marketSnapshot.statMedian || 0);
  },

  estimatePrice(album) {
    // Fallback pricing estimation when market data unavailable
    // Based on vinyl record market analysis
    let baseEstimate = 20; // Modern vinyl baseline €20

    // Adjust by genre (collectible genres worth more)
    const highValueGenres = ['Jazz', 'Electronic', 'Hip-Hop', 'Soul'];
    const standardGenres = ['Rock', 'Pop', 'Indie', 'Metal'];

    if (album.genre) {
      const genreLower = album.genre.toLowerCase();
      if (highValueGenres.some((g) => genreLower.includes(g.toLowerCase()))) {
        baseEstimate += 10; // Hip-Hop, Electronic, Jazz: +€10
      } else if (standardGenres.some((g) => genreLower.includes(g.toLowerCase()))) {
        baseEstimate += 5; // Standard genres: +€5
      }
    }

    // Adjust by age (older records often more valuable, recent releases command premium)
    if (album.releaseYear) {
      const age = new Date().getFullYear() - album.releaseYear;
      if (age > 30) {
        baseEstimate += 15; // Vintage (pre-1995)
      } else if (age > 20) {
        baseEstimate += 10; // Older records (1995-2005)
      } else if (age > 10) {
        baseEstimate += 5; // Established records (2005-2015)
      } else if (age <= 3) {
        baseEstimate += 8; // Recent releases often command premium (within 3 years)
      }
    }

    return baseEstimate;
  },

  async performSearch(query) {
    if (!query || query.length < 2) {
      this.hideDropdown();
      return;
    }

    this.showLoading();

    try {
      const response = await fetch(
        `/api/v1/catalog/search?q=${encodeURIComponent(query)}&limit=20`
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.state.searchResults = data.data?.results || [];

      console.log('Search results:', this.state.searchResults);

      if (this.state.searchResults.length === 0) {
        this.showNoResults();
        return;
      }

      this.displayDropdownResults();
    } catch (error) {
      console.error('Search error:', error);
      this.showNoResults();
    }
  },

  showLoading() {
    if (this.searchLoadingElement) {
      this.searchLoadingElement.style.display = 'block';
    }
    if (this.searchNoResultsElement) {
      this.searchNoResultsElement.style.display = 'none';
    }
    if (this.searchResultsContainer) {
      this.searchResultsContainer.innerHTML = '';
    }
    this.showDropdown();
  },

  showNoResults() {
    if (this.searchLoadingElement) {
      this.searchLoadingElement.style.display = 'none';
    }
    if (this.searchNoResultsElement) {
      this.searchNoResultsElement.style.display = 'block';
    }
    this.showDropdown();
  },

  displayDropdownResults() {
    if (!this.searchResultsContainer) return;

    if (this.searchLoadingElement) {
      this.searchLoadingElement.style.display = 'none';
    }
    if (this.searchNoResultsElement) {
      this.searchNoResultsElement.style.display = 'none';
    }

    this.searchResultsContainer.innerHTML = this.state.searchResults
      .map((result, idx) => this.createResultItem(result, idx))
      .join('');

    // Attach click listeners
    this.searchResultsContainer
      .querySelectorAll('.search-result-item')
      .forEach((item) => {
        item.addEventListener('click', () => {
          const resultIdx = parseInt(item.dataset.index);
          this.selectFromDropdown(this.state.searchResults[resultIdx]);
        });
      });

    this.showDropdown();
  },

  createResultItem(album, idx) {
    const buyingPrice = this.calculateBuyingPrice(album);
    const priceDisplay = buyingPrice ? `€${buyingPrice.toFixed(2)}` : 'N/A';
    const coverUrl = album.coverArtUrl || '';

    return `
      <div class="search-result-item" data-index="${idx}">
        <div class="search-result-item__cover">
          ${
  coverUrl
    ? `<img src="${coverUrl}" alt="${album.title}" />`
    : '<div class="search-result-item__cover-placeholder">♫</div>'
}
        </div>
        <div class="search-result-item__content">
          <h4 class="search-result-item__title">${album.title || 'Unknown'}</h4>
          <p class="search-result-item__artist">${album.artist || 'Unknown Artist'}</p>
          <p class="search-result-item__meta">${album.label ? `${album.label} • ` : ''}${album.releaseYear || ''}</p>
        </div>
        <div class="search-result-item__price">
          <div class="search-result-item__price-label">Our Price</div>
          <div class="search-result-item__price-value">${priceDisplay}</div>
        </div>
      </div>
    `;
  },

  selectFromDropdown(album) {
    this.selectAlbum(album);
    this.hideDropdown();
    this.searchInput.value = `${album.title} - ${album.artist}`;
  },

  showDropdown() {
    if (this.searchDropdown) {
      this.searchDropdown.style.display = 'block';
    }
  },

  hideDropdown() {
    if (this.searchDropdown) {
      this.searchDropdown.style.display = 'none';
    }
  },

  selectAlbum(album) {
    this.state.selectedAlbum = album;
    console.log('Selected album:', album);

    // Update album cover
    if (this.albumCardCover && album.coverArtUrl) {
      this.albumCardCover.innerHTML = `<img src="${album.coverArtUrl}" alt="${album.title}" style="width: 100%; height: 100%; object-fit: cover;" />`;
    }

    // Update album card info
    if (this.albumCardInfo) {
      this.albumCardInfo.innerHTML = `
        <h3>${album.title || 'Unknown Album'}</h3>
        <p class="album-artist">${album.artist || 'Unknown Artist'}</p>
        <p class="album-details">
          ${album.releaseYear || 'Year unknown'} • ${album.label || 'Unknown Label'}
        </p>
      `;
    }

    // Calculate and update quote based on market data
    this.updateQuote(album);
  },

  updateQuote(album) {
    // Get base price from backend calculation (respects current pricing policy)
    // If backend calculated ourPrice, use that; otherwise fall back to local calculation
    let baseOffer;
    if (album.ourPrice !== null && album.ourPrice !== undefined) {
      baseOffer = album.ourPrice;
    } else {
      let basePrice = this.getBasePrice(album);
      if (!basePrice) {
        basePrice = this.estimatePrice(album);
      }
      const sellerPercentage = 0.55;
      baseOffer = basePrice * sellerPercentage;
    }

    // Get selected condition
    const mediaCondition = document.querySelector(
      '.condition-grid:nth-of-type(1) .condition-btn--selected'
    );
    const sleeveCondition = document.querySelector(
      '.condition-grid:nth-of-type(2) .condition-btn--selected'
    );

    // Apply condition adjustments
    let conditionAdjustment = 1.0;
    if (mediaCondition) {
      const condition = mediaCondition.dataset.condition;
      // Condition multipliers
      const multipliers = {
        mint: 1.0,
        nm: 0.9,
        vgp: 0.75,
        vg: 0.6,
        vgm: 0.45,
        good: 0.3,
      };
      conditionAdjustment *= multipliers[condition] || 1.0;
    }

    if (sleeveCondition) {
      const condition = sleeveCondition.dataset.condition;
      const multipliers = {
        mint: 1.0,
        nm: 0.95,
        vgp: 0.8,
        vg: 0.7,
        vgm: 0.55,
        good: 0.4,
      };
      conditionAdjustment *= multipliers[condition] || 1.0;
    }

    const finalOffer = Math.round(baseOffer * conditionAdjustment * 100) / 100;
    const adjustmentPercent = Math.round((conditionAdjustment - 1) * 100);

    // Update quote display
    const quoteItems = document.querySelectorAll('.quote-item');
    if (quoteItems[0]) {
      quoteItems[0].innerHTML = `<span>Base Offer</span><span class="quote-value">$${baseOffer.toFixed(2)}</span>`;
    }
    if (quoteItems[1]) {
      quoteItems[1].innerHTML = `<span>Condition Adjustment</span><span class="quote-value quote-value--muted">${adjustmentPercent}%</span>`;
    }
    if (quoteItems[2]) {
      quoteItems[2].innerHTML = `<span>Your Offer</span><span class="quote-value quote-value--large">$${finalOffer.toFixed(2)}</span>`;
    }

    console.log('Quote updated:', {
      baseOffer,
      conditionAdjustment,
      finalOffer,
    });
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  sellerApp.init();
});
