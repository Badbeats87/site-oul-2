/**
 * Seller Submission Form Manager
 * Handles multi-step form for submitting records for sale
 */

const submitForm = {
  currentStep: 1,
  totalSteps: 4,
  submission: {
    records: [],
    shipping: {},
    payout: ''
  },

  init() {
    this.cacheElements();
    this.bindEvents();
    this.updateProgressIndicator();
  },

  cacheElements() {
    this.steps = document.querySelectorAll('.form-step');
    this.progressSteps = document.querySelectorAll('.progress-step');
    this.stepButtons = {
      next1: document.getElementById('nextStep1'),
      back2: document.getElementById('backStep2'),
      next2: document.getElementById('nextStep2'),
      back3: document.getElementById('backStep3'),
      next3: document.getElementById('nextStep3')
    };
    this.elements = {
      searchInput: document.getElementById('searchInput'),
      emptyState: document.getElementById('emptyState'),
      tableWrapper: document.getElementById('tableWrapper'),
      totalsSection: document.getElementById('totalsSection'),
      submissionTableBody: document.getElementById('submissionTableBody'),
      totalItems: document.getElementById('totalItems'),
      totalAmount: document.getElementById('totalAmount'),
      reviewList: document.getElementById('reviewList'),
      reviewTotalRecords: document.getElementById('reviewTotalRecords'),
      reviewTotalAmount: document.getElementById('reviewTotalAmount'),
      searchResults: document.getElementById('searchResults'),
      searchButton: document.querySelector('.search-box__button')
    };
  },

  bindEvents() {
    // Step navigation
    this.stepButtons.next1.addEventListener('click', () => this.nextStep());
    this.stepButtons.back2.addEventListener('click', () => this.prevStep());
    this.stepButtons.next2.addEventListener('click', () => this.nextStep());
    this.stepButtons.back3.addEventListener('click', () => this.prevStep());
    this.stepButtons.next3.addEventListener('click', () => this.submitForm());

    // Search
    this.elements.searchButton.addEventListener('click', () => this.performSearch());
    this.elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });
  },

  async performSearch() {
    const query = this.elements.searchInput.value.trim();
    if (!query) {
      alert('Please enter a search term');
      return;
    }

    try {
      // Get auth token if available
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Call catalog search API
      const response = await fetch(
        `/api/v1/catalog/search?q=${encodeURIComponent(query)}&limit=10`,
        { headers }
      );

      if (!response.ok) {
        console.error('Search response status:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Search error data:', errorData);

        if (response.status === 401) {
          throw new Error('Authentication required. Please log in first.');
        }
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      let results = data.data || [];

      // Fallback to mock results for demo if no results found
      if (results.length === 0) {
        console.warn('No results from API, using mock data for demo');
        results = [
          {
            id: 'mock-1',
            title: 'Dark Side of the Moon',
            artists: [{ name: 'Pink Floyd' }],
            year: 1973,
            marketData: { median: 85 }
          },
          {
            id: 'mock-2',
            title: 'Abbey Road',
            artists: [{ name: 'The Beatles' }],
            year: 1969,
            marketData: { median: 95 }
          },
          {
            id: 'mock-3',
            title: 'Led Zeppelin IV',
            artists: [{ name: 'Led Zeppelin' }],
            year: 1971,
            marketData: { median: 75 }
          }
        ];
      }

      // Transform results to expected format
      const transformedResults = results.map((release) => {
        // Use median price from market data if available, otherwise use default
        const medianPrice = release.marketData?.median || 25;

        return {
          id: release.id,
          title: release.title,
          artist: release.artists?.[0]?.name || 'Unknown Artist',
          year: release.year || 'N/A',
          quote: Math.round(medianPrice * 0.55 * 100) / 100, // 55% of median as buyer offer
          releaseData: release
        };
      });

      this.displaySearchResults(transformedResults);
    } catch (error) {
      console.error('Search error:', error);
      alert(`Search failed: ${error.message}`);
    }
  },

  displaySearchResults(results) {
    const resultsList = this.elements.searchResults.querySelector('.results-list');
    resultsList.innerHTML = '';

    results.forEach(result => {
      const card = document.createElement('div');
      card.className = 'result-card';
      card.innerHTML = `
        <div class="result-card__title">${result.title}</div>
        <div class="result-card__artist">${result.artist} • ${result.year}</div>
        <button class="button button--secondary result-card__button">
          Quote: $${result.quote.toFixed(2)}
        </button>
      `;

      card.querySelector('button').addEventListener('click', () => {
        this.addRecordToSubmission(result);
      });

      resultsList.appendChild(card);
    });

    this.elements.searchResults.style.display = 'block';
  },

  addRecordToSubmission(record) {
    const existingRecord = this.submission.records.find(r => r.id === record.id);

    if (existingRecord) {
      existingRecord.quantity += 1;
    } else {
      this.submission.records.push({
        ...record,
        quantity: 1,
        mediaCondition: 'NM',
        sleeveCondition: 'NM'
      });
    }

    this.updateSubmissionList();
    this.elements.searchInput.value = '';
    this.elements.searchResults.style.display = 'none';
    this.stepButtons.next1.disabled = false;

    alert('Added to your submission list!');
  },

  updateSubmissionList() {
    if (this.submission.records.length === 0) {
      this.elements.emptyState.style.display = 'block';
      this.elements.tableWrapper.style.display = 'none';
      this.elements.totalsSection.style.display = 'none';
      return;
    }

    this.elements.emptyState.style.display = 'none';
    this.elements.tableWrapper.style.display = 'block';
    this.elements.totalsSection.style.display = 'block';

    this.elements.submissionTableBody.innerHTML = '';
    let totalAmount = 0;

    this.submission.records.forEach((record, index) => {
      const row = document.createElement('tr');
      const total = record.quote * record.quantity;
      totalAmount += total;

      row.innerHTML = `
        <td>
          <strong>${record.title}</strong><br>
          <span style="color: #666; font-size: 0.9em">${record.artist}</span>
        </td>
        <td>Media: ${record.mediaCondition}<br>Sleeve: ${record.sleeveCondition}</td>
        <td>${record.quantity}</td>
        <td class="text-right">$${record.quote.toFixed(2)}</td>
        <td>
          <button class="button button--sm button--secondary" onclick="submitForm.removeRecord(${index})">
            Remove
          </button>
        </td>
      `;
      this.elements.submissionTableBody.appendChild(row);
    });

    this.elements.totalItems.textContent = this.submission.records.reduce((sum, r) => sum + r.quantity, 0);
    this.elements.totalAmount.textContent = `$${totalAmount.toFixed(2)}`;
  },

  removeRecord(index) {
    this.submission.records.splice(index, 1);
    this.updateSubmissionList();

    if (this.submission.records.length === 0) {
      this.stepButtons.next1.disabled = true;
    }
  },

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      // Validate step before proceeding
      if (this.currentStep === 2) {
        this.populateReviewStep();
      }

      this.currentStep++;
      this.showStep(this.currentStep);
      this.updateProgressIndicator();
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showStep(this.currentStep);
      this.updateProgressIndicator();
    }
  },

  showStep(stepNumber) {
    this.steps.forEach(step => {
      const stepNum = step.getAttribute('data-step');
      if (stepNum == stepNumber) {
        step.classList.add('form-step--active');
      } else {
        step.classList.remove('form-step--active');
      }
    });
  },

  updateProgressIndicator() {
    this.progressSteps.forEach(step => {
      const stepNum = parseInt(step.getAttribute('data-step'));
      if (stepNum === this.currentStep) {
        step.classList.add('progress-step--active');
      } else {
        step.classList.remove('progress-step--active');
      }
    });

    // Scroll to top of form
    document.querySelector('.submit-form-container').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  },

  populateReviewStep() {
    let reviewHTML = '';
    let totalRecords = 0;
    let totalAmount = 0;

    this.submission.records.forEach(record => {
      const itemTotal = record.quote * record.quantity;
      totalRecords += record.quantity;
      totalAmount += itemTotal;

      reviewHTML += `
        <div class="review-item">
          <div class="review-item__title">${record.title}</div>
          <div class="review-item__details">
            <div><strong>Artist:</strong> ${record.artist}</div>
            <div><strong>Year:</strong> ${record.year}</div>
            <div><strong>Quantity:</strong> ${record.quantity}</div>
            <div><strong>Quote:</strong> $${record.quote.toFixed(2)}/ea</div>
            <div><strong>Total:</strong> $${itemTotal.toFixed(2)}</div>
          </div>
        </div>
      `;
    });

    this.elements.reviewList.innerHTML = reviewHTML;
    this.elements.reviewTotalRecords.textContent = totalRecords;
    this.elements.reviewTotalAmount.textContent = `$${totalAmount.toFixed(2)}`;
  },

  async submitForm() {
    // Get form values
    const name = document.querySelector('.shipping-form input[placeholder="John Collector"]')?.value;
    const email = document.querySelector('.shipping-form input[placeholder="your@email.com"]')?.value;

    if (!name || !email) {
      alert('Please fill in all required fields');
      return;
    }

    if (this.submission.records.length === 0) {
      alert('Please add at least one record to your submission');
      return;
    }

    try {
      // Step 1: Register or get seller account
      const sellerResponse = await fetch('/api/v1/sellers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          notes: 'Seller submission from web form'
        })
      });

      if (!sellerResponse.ok) {
        throw new Error(`Seller registration failed: ${sellerResponse.statusText}`);
      }

      const sellerData = await sellerResponse.json();
      const sellerId = sellerData.data.id;

      // Step 2: Submit the records
      const items = this.submission.records.map(record => ({
        releaseId: record.id,
        quantity: record.quantity,
        conditionMedia: record.mediaCondition || 'NM',
        conditionSleeve: record.sleeveCondition || 'NM'
      }));

      const submissionResponse = await fetch(
        `/api/v1/submissions/${sellerId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items })
        }
      );

      if (!submissionResponse.ok) {
        throw new Error(`Submission failed: ${submissionResponse.statusText}`);
      }

      const submissionData = await submissionResponse.json();

      // Store submission info for confirmation page
      localStorage.setItem('pending_submission', JSON.stringify({
        sellerId,
        submissionId: submissionData.data.id,
        email,
        name,
        totalAmount: this.submission.records.reduce((sum, r) => sum + (r.quote * r.quantity), 0),
        timestamp: new Date().toISOString()
      }));

      // Move to completion step
      this.currentStep = 4;
      this.showStep(this.currentStep);
      this.updateProgressIndicator();
    } catch (error) {
      console.error('Submission error:', error);
      alert(`Submission failed: ${error.message}`);
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    submitForm.init();
  });
} else {
  submitForm.init();
}

// Make submitForm globally accessible for inline event handlers
window.submitForm = submitForm;
