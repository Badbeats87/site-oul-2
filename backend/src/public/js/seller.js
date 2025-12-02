// Seller Site Interactions
const sellerApp = {
  state: {
    searchResults: [],
    selectedAlbum: null,
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
    // Search button - explicit search only (no live search)
    if (this.searchButton) {
      this.searchButton.addEventListener('click', () => {
        const query = this.searchInput?.value.trim();
        if (query && query.length >= 2) {
          this.performSearch(query);
        }
      });
    }

    // Enter key also triggers search
    if (this.searchInput) {
      this.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const query = e.target.value.trim();
          if (query.length >= 2) {
            this.performSearch(query);
          }
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box-container')) {
          this.hideDropdown();
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

    // Add to list buttons (both in form and summary)
    const addToListButtons = document.querySelectorAll(
      '.quote-form .button--accent, .quote-summary .button--success'
    );
    addToListButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.addToSellingList();
      });
    });

    // Submit selling list button
    const submitButton = document.querySelector('.submission-section .button--primary');
    if (submitButton) {
      submitButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.submitSellingList();
      });
    }
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
        `/api/v1/catalog/search?q=${encodeURIComponent(
          query
        )}&limit=20&source=DISCOGS`
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
    // Show "Click to quote" since we don't have pricing yet
    const priceDisplay = 'Click to quote';
    const coverUrl = album.coverArtUrl || '';

    return `
      <div class="search-result-item" data-index="${idx}" style="cursor: pointer;">
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
          <p class="search-result-item__meta">${album.year || ''}</p>
        </div>
        <div class="search-result-item__price">
          <div class="search-result-item__price-label">Our Price</div>
          <div class="search-result-item__price-value">${priceDisplay}</div>
        </div>
      </div>
    `;
  },

  selectFromDropdown(album) {
    // Fetch actual quote when user selects
    this.fetchDiscogsQuote(album);
  },

  async fetchDiscogsQuote(album) {
    try {
      this.showLoading();

      // Get auth token
      const token =
        localStorage.getItem('auth_token') ||
        sessionStorage.getItem('auth_token');

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/v1/catalog/discogs/quote?discogsId=${album.id}&type=${album.type}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch quote: ${response.statusText}`);
      }

      const data = await response.json();
      const enrichedAlbum = data.data;

      // Now select the enriched album with pricing
      this.selectAlbum(enrichedAlbum);
      this.hideDropdown();
      this.searchInput.value = `${enrichedAlbum.title} - ${enrichedAlbum.artist}`;
    } catch (error) {
      console.error('Error fetching quote:', error);
      alert('Failed to fetch quote. Please try again.');
    }
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
    console.log('=== updateQuote DEBUG ===');
    console.log('Album object keys:', Object.keys(album));
    console.log('album.ourPrice type:', typeof album.ourPrice);
    console.log('album.ourPrice value:', album.ourPrice);
    console.log('album.ourPrice !== null:', album.ourPrice !== null);
    console.log('album.ourPrice !== undefined:', album.ourPrice !== undefined);

    let baseOffer;
    if (album.ourPrice !== null && album.ourPrice !== undefined) {
      baseOffer = album.ourPrice;
      console.log('✓ Using API ourPrice:', baseOffer);
    } else {
      console.log('✗ ourPrice not available, calculating from market data');
      let basePrice = this.getBasePrice(album);
      console.log('Market basePrice:', basePrice);
      if (!basePrice) {
        basePrice = this.estimatePrice(album);
        console.log('Estimated basePrice:', basePrice);
      }
      const sellerPercentage = 0.55;
      baseOffer = basePrice * sellerPercentage;
      console.log('Calculated baseOffer from market:', { basePrice, sellerPercentage, baseOffer });
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

    console.log('Final quote calculation:', {
      baseOffer,
      mediaConditionSelected: mediaCondition?.dataset.condition,
      sleeveConditionSelected: sleeveCondition?.dataset.condition,
      conditionAdjustment,
      finalOffer,
      adjustmentPercent,
    });

    // Update quote display
    const quoteItems = document.querySelectorAll('.quote-item');
    if (quoteItems[0]) {
      quoteItems[0].innerHTML = `<span>Base Offer</span><span class="quote-value">€${baseOffer.toFixed(2)}</span>`;
    }
    if (quoteItems[1]) {
      quoteItems[1].innerHTML = `<span>Condition Adjustment</span><span class="quote-value quote-value--muted">${adjustmentPercent}%</span>`;
    }
    if (quoteItems[2]) {
      quoteItems[2].innerHTML = `<span>Your Offer</span><span class="quote-value quote-value--large">€${finalOffer.toFixed(2)}</span>`;
    }

    console.log('Quote updated:', {
      baseOffer,
      conditionAdjustment,
      finalOffer,
    });
  },

  addToSellingList() {
    if (!this.state.selectedAlbum) {
      alert('Please select an album first');
      return;
    }

    // Get conditions
    const mediaCondition = document.querySelector(
      '.condition-grid:nth-of-type(1) .condition-btn--selected'
    );
    const sleeveCondition = document.querySelector(
      '.condition-grid:nth-of-type(2) .condition-btn--selected'
    );
    const quantityInput = document.getElementById('quantity');
    const quantity = parseInt(quantityInput?.value) || 1;
    const notes = document.getElementById('notes')?.value || '';

    // Get current price from quote display
    const quoteItems = document.querySelectorAll('.quote-item');
    const priceDisplay = quoteItems[2]?.querySelector('.quote-value--large')?.textContent || '';
    const finalPrice = parseFloat(priceDisplay.replace('€', '')) || 0;

    // Create item object
    const item = {
      id: Date.now(), // Temporary ID for frontend
      album: this.state.selectedAlbum,
      mediaCondition: mediaCondition?.dataset.condition || 'nm',
      sleeveCondition: sleeveCondition?.dataset.condition || 'nm',
      quantity,
      notes,
      pricePerRecord: finalPrice,
      totalPrice: finalPrice * quantity,
    };

    // Initialize list if it doesn't exist
    if (!this.state.sellingList) {
      this.state.sellingList = [];
    }

    // Add to list
    this.state.sellingList.push(item);
    console.log('Added to selling list:', item);
    console.log('Selling list now:', this.state.sellingList);

    // Update UI
    this.updateSellingListUI();

    // Show success message
    alert(`Added "${item.album.title}" to your selling list!`);

    // Reset form for next item
    this.resetForm();
  },

  updateSellingListUI() {
    const emptyState = document.getElementById('emptyState');
    const listItems = document.getElementById('listItems');
    const tableBody = document.getElementById('tableBody');

    if (!this.state.sellingList || this.state.sellingList.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (listItems) listItems.style.display = 'none';
      return;
    }

    // Hide empty state, show list
    if (emptyState) emptyState.style.display = 'none';
    if (listItems) listItems.style.display = 'block';

    // Update table
    if (tableBody) {
      tableBody.innerHTML = this.state.sellingList
        .map((item, idx) => `
          <tr>
            <td>
              <strong>${item.album.title || 'Unknown Album'}</strong><br />
              <span class="text-muted">${item.album.artist || 'Unknown Artist'}</span>
            </td>
            <td>
              Media: ${this.formatCondition(item.mediaCondition)}<br />
              Sleeve: ${this.formatCondition(item.sleeveCondition)}
            </td>
            <td>${item.quantity}</td>
            <td class="text-right">€${item.pricePerRecord.toFixed(2)}</td>
            <td class="text-right"><strong>€${item.totalPrice.toFixed(2)}</strong></td>
            <td>
              <button class="button button--sm button--secondary" onclick="sellerApp.removeFromList(${idx})">
                Remove
              </button>
            </td>
          </tr>
        `)
        .join('');
    }

    // Update totals
    const totalPrice = this.state.sellingList.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalItems = this.state.sellingList.reduce((sum, item) => sum + item.quantity, 0);

    const totalsSection = document.querySelector('.list-totals');
    if (totalsSection) {
      totalsSection.innerHTML = `
        <div class="total-row">
          <span>Subtotal (${totalItems} record${totalItems !== 1 ? 's' : ''})</span>
          <span class="total-value">€${totalPrice.toFixed(2)}</span>
        </div>
      `;
    }
  },

  formatCondition(condition) {
    const conditionMap = {
      mint: 'Mint',
      nm: 'Near Mint',
      vgp: 'VG+',
      vg: 'VG',
      vgm: 'VG-',
      good: 'Good',
    };
    return conditionMap[condition] || condition;
  },

  removeFromList(index) {
    if (this.state.sellingList) {
      this.state.sellingList.splice(index, 1);
      this.updateSellingListUI();
    }
  },

  resetForm() {
    // Reset quantity
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) quantityInput.value = '1';

    // Reset notes
    const notesInput = document.getElementById('notes');
    if (notesInput) notesInput.value = '';

    // Reset search input
    if (this.searchInput) this.searchInput.value = '';

    // Clear selected album to prepare for next search
    this.state.selectedAlbum = null;

    // Reset condition buttons to defaults
    const conditionBtns = document.querySelectorAll('.condition-btn');
    conditionBtns.forEach((btn) => {
      btn.classList.remove('condition-btn--selected');
    });
    // Re-select defaults
    const defaultMediaBtn = document.querySelector('.condition-grid:nth-of-type(1) .condition-btn[data-condition="mint"]');
    const defaultSleeveBtn = document.querySelector('.condition-grid:nth-of-type(2) .condition-btn[data-condition="nm"]');
    if (defaultMediaBtn) defaultMediaBtn.classList.add('condition-btn--selected');
    if (defaultSleeveBtn) defaultSleeveBtn.classList.add('condition-btn--selected');

    // Reset card display
    if (this.albumCardInfo) {
      this.albumCardInfo.innerHTML = `
        <h3>Dark Side of the Moon</h3>
        <p class="album-artist">Pink Floyd</p>
        <p class="album-details">
          1973 • UK Pressing • Harvest Records
        </p>
      `;
    }
  },

  async submitSellingList() {
    // Validate
    if (!this.state.sellingList || this.state.sellingList.length === 0) {
      alert('Please add at least one record to your selling list before submitting');
      return;
    }

    // Get form data
    const email = document.getElementById('email')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const payout = document.getElementById('payout')?.value;
    const agreeCheckbox = document.querySelector('.checkbox-label input');
    const agreed = agreeCheckbox?.checked || false;

    // Validate required fields
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    if (!agreed) {
      alert('Please agree to the terms and conditions');
      return;
    }

    try {
      // Get or create auth token
      const token =
        localStorage.getItem('auth_token') ||
        sessionStorage.getItem('auth_token');

      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Step 1: Register seller
      console.log('Registering seller...');
      const sellerResponse = await fetch('/api/v1/sellers/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          name: email.split('@')[0], // Use email prefix as name if not provided
          phone,
        }),
      });

      if (!sellerResponse.ok) {
        throw new Error(`Failed to register seller: ${sellerResponse.statusText}`);
      }

      const sellerData = await sellerResponse.json();
      const sellerId = sellerData.data.id;
      console.log('Seller registered:', sellerId);

      // Step 2: Submit items
      console.log('Submitting items...');
      const items = this.state.sellingList.map((item) => ({
        discogsId: item.album.id,
        quantity: item.quantity,
        conditionMedia: this.mapConditionToCode(item.mediaCondition),
        conditionSleeve: this.mapConditionToCode(item.sleeveCondition),
      }));

      const submissionResponse = await fetch(`/api/v1/submissions/${sellerId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items }),
      });

      if (!submissionResponse.ok) {
        throw new Error(`Failed to submit items: ${submissionResponse.statusText}`);
      }

      const submissionData = await submissionResponse.json();
      console.log('Submission created:', submissionData.data);

      // Success!
      alert(
        `✅ Submission successful!\n\nWe received ${items.length} record${
          items.length !== 1 ? 's' : ''
        } valued at €${submissionData.data.totalOffered}.\n\nWe'll review your items and send you an offer within 24 hours.`
      );

      // Reset everything for next submission
      this.state.sellingList = [];
      this.updateSellingListUI();
      this.resetForm();
      document.getElementById('email').value = '';
      document.getElementById('phone').value = '';
      document.getElementById('payout').value = 'ACH Bank Transfer';
      if (agreeCheckbox) agreeCheckbox.checked = false;
    } catch (error) {
      console.error('Submission error:', error);
      alert(`Error submitting: ${error.message}`);
    }
  },

  mapConditionToCode(condition) {
    // Map display conditions to backend codes (e.g., "Near Mint" -> "NM")
    const conditionMap = {
      mint: 'MINT',
      nm: 'NM',
      vgp: 'VG_PLUS',
      vg: 'VG',
      vgm: 'VG_MINUS',
      good: 'GOOD',
    };
    return conditionMap[condition] || condition.toUpperCase();
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  sellerApp.init();
});
