// Seller Site Interactions
const sellerApp = {
  state: {
    searchResults: [],
    selectedAlbum: null,
  },

  init() {
    this.cacheElements();
    this.bindEvents();
  },

  cacheElements() {
    this.searchInput = document.getElementById('searchInput');
    this.searchButton = document.querySelector('.search-box__button');
    this.conditionBtns = document.querySelectorAll('.condition-btn');
    this.albumCard = document.querySelector('.album-card');
    this.albumCardInfo = document.querySelector('.album-card__info');
    this.quoteForm = document.querySelector('.quote-form');
  },

  bindEvents() {
    // Search functionality
    if (this.searchButton) {
      this.searchButton.addEventListener('click', () => this.performSearch());
    }
    if (this.searchInput) {
      this.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.performSearch();
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
      });
    });
  },

  async performSearch() {
    const query = this.searchInput.value.trim();
    console.log('Search started with query:', query);

    if (!query) {
      alert('Please enter a search term');
      return;
    }

    if (query.length < 2) {
      alert('Search term must be at least 2 characters');
      return;
    }

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
        alert('No records found. Try a different search term.');
        return;
      }

      // Show results and let user select first result
      this.showSearchResults();
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    }
  },

  showSearchResults() {
    if (this.state.searchResults.length === 0) return;

    // Auto-select first result
    this.selectAlbum(this.state.searchResults[0]);

    // If multiple results, show a simple selector
    if (this.state.searchResults.length > 1) {
      const resultsList = this.state.searchResults
        .map((r, idx) => `${idx + 1}. ${r.title} by ${r.artist}`)
        .join('\n');
      const selected = prompt(
        `Found ${this.state.searchResults.length} results:\n\n${resultsList}\n\nShowing first result. Click OK to continue.`
      );
    }
  },

  selectAlbum(album) {
    this.state.selectedAlbum = album;
    console.log('Selected album:', album);

    // Update album card
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
    // Get market data
    const marketSnapshot = album.marketSnapshots?.[0];
    let basePrice = 0;

    if (marketSnapshot) {
      // Use statLow if available, otherwise statMedian
      const price = marketSnapshot.statLow || marketSnapshot.statMedian || 0;
      basePrice = parseFloat(price);
    }

    // Apply seller percentage (standard 55% for sellers)
    const sellerPercentage = 0.55;
    let baseOffer = basePrice * sellerPercentage;

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

    console.log('Quote updated:', { baseOffer, conditionAdjustment, finalOffer });
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  sellerApp.init();
});
