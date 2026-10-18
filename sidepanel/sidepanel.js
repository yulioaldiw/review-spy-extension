// ReviewSpy AI - Side Panel Controller
import { GeminiClient } from '../utils/gemini-client.js';
import { CsvExporter } from '../utils/csv-exporter.js';
import { LicenseManager } from '../utils/license-validator.js';

// DOM Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const tabReviewCount = document.getElementById('tab-review-count');

// Product Banner Elements
const productCard = document.getElementById('product-card');
const productImg = document.getElementById('product-img');
const productTitle = document.getElementById('product-title');
const productAsin = document.getElementById('product-asin');
const productPrice = document.getElementById('product-price');
const platformTag = document.getElementById('platform-tag');

// Insights Tab Elements
const unsupportedBanner = document.getElementById('unsupported-banner');
const actionPanel = document.getElementById('action-panel');
const btnAnalyze = document.getElementById('btn-analyze');
const quotaIndicator = document.getElementById('quota-indicator');
const quotaLeft = document.getElementById('quota-left');
const loadingState = document.getElementById('loading-state');
const loadingTitle = document.getElementById('loading-title');
const loadingSubtitle = document.getElementById('loading-subtitle');
const emptyState = document.getElementById('empty-state');
const resultsContainer = document.getElementById('results-container');
const planBadge = document.getElementById('plan-badge');

// Results Cards
const satisfactionBadge = document.getElementById('satisfaction-badge');
const summaryText = document.getElementById('summary-text');
const complaintsList = document.getElementById('complaints-list');
const opportunitiesList = document.getElementById('opportunities-list');
const strengthsList = document.getElementById('strengths-list');
const hooksList = document.getElementById('hooks-list');

// Reviews Tab Elements
const reviewSearch = document.getElementById('review-search');
const btnExportCsv = document.getElementById('btn-export-csv');
const reviewsListContainer = document.getElementById('reviews-list-container');

// Settings Elements
const inputGeminiKey = document.getElementById('input-gemini-key');
const btnToggleKey = document.getElementById('btn-toggle-key-visibility');
const btnSaveKey = document.getElementById('btn-save-key');
const keySaveStatus = document.getElementById('key-save-status');
const inputLicenseKey = document.getElementById('input-license-key');
const btnValidateLicense = document.getElementById('btn-validate-license');
const licenseSaveStatus = document.getElementById('license-save-status');
const btnClearCache = document.getElementById('btn-clear-cache');

// Application State
let activeTabInfo = null;
let currentProduct = null;
let currentReviews = [];
let geminiApiKey = '';

// --- INITIALIZATION ---
async function init() {
  setupTabs();
  setupSettingsHandlers();
  await loadStoredData();
  await refreshActiveTab();
}

// Setup Tab Switching
function setupTabs() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(targetId)?.classList.add('active');
    });
  });
}

// Load API Keys & License from chrome.storage
async function loadStoredData() {
  const data = await chrome.storage.local.get(['geminiApiKey', 'licenseKey', 'isPro']);
  if (data.geminiApiKey) {
    geminiApiKey = data.geminiApiKey;
    inputGeminiKey.value = data.geminiApiKey;
  }
  if (data.licenseKey) {
    inputLicenseKey.value = data.licenseKey;
  }

  await updatePlanUI();
}

async function updatePlanUI() {
  const usage = await LicenseManager.getUsage();
  if (usage.isPro) {
    planBadge.textContent = 'PRO';
    planBadge.className = 'badge badge-pro';
    quotaIndicator.innerHTML = '✨ <strong>Pro Plan:</strong> Unlimited analyses active';
  } else {
    planBadge.textContent = 'FREE';
    planBadge.className = 'badge badge-free';
    const remaining = Math.max(0, usage.limit - usage.count);
    quotaLeft.textContent = String(remaining);
  }
}

// Refresh Current Active Tab
async function refreshActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  activeTabInfo = tab;

  // Ask content script for page details
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' });
    if (res && res.success && res.isSupported) {
      handleSupportedPage(res);
    } else {
      handleUnsupportedPage();
    }
  } catch (err) {
    // Content script not loaded or unsupported page
    handleUnsupportedPage();
  }
}

// Handle Supported Page (Amazon or Shopify)
function handleSupportedPage(res) {
  unsupportedBanner.classList.add('hidden');
  actionPanel.classList.remove('hidden');
  productCard.classList.remove('hidden');

  currentProduct = res.details;
  productTitle.textContent = currentProduct.title || 'Product';
  platformTag.textContent = res.platform.toUpperCase();

  if (res.platform === 'amazon') {
    productAsin.textContent = `ASIN: ${currentProduct.asin || '-'}`;
    platformTag.style.backgroundColor = '#f59e0b';
  } else {
    productAsin.textContent = 'Shopify Store';
    platformTag.style.backgroundColor = '#10b981';
  }

  productPrice.textContent = currentProduct.price || '';
  if (currentProduct.image) {
    productImg.src = currentProduct.image;
    productImg.classList.remove('hidden');
  } else {
    productImg.classList.add('hidden');
  }

  if (res.localReviewCount) {
    tabReviewCount.textContent = String(res.localReviewCount);
  }

  // Check if we have cached analysis for this product
  checkCache(currentProduct);
}

// Handle Unsupported Page
function handleUnsupportedPage() {
  unsupportedBanner.classList.remove('hidden');
  actionPanel.classList.add('hidden');
  productCard.classList.add('hidden');
  resultsContainer.classList.add('hidden');
  emptyState.classList.add('hidden');
  currentProduct = null;
  currentReviews = [];
  renderReviewsList();
}

// Check local cache for previously analyzed product
async function checkCache(product) {
  const cacheKey = `analysis_${product.asin || product.url}`;
  const data = await chrome.storage.local.get([cacheKey, `reviews_${product.asin || product.url}`]);

  if (data[cacheKey]) {
    renderInsights(data[cacheKey]);
    if (data[`reviews_${product.asin || product.url}`]) {
      currentReviews = data[`reviews_${product.asin || product.url}`];
      renderReviewsList();
    }
  } else {
    resultsContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
  }
}

// --- ANALYSIS WORKFLOW ---
btnAnalyze.addEventListener('click', async () => {
  if (!geminiApiKey) {
    alert('Please enter your Google Gemini API Key in the Settings tab first.');
    // Switch to settings tab
    document.querySelector('[data-tab="tab-settings"]')?.click();
    inputGeminiKey.focus();
    return;
  }

  const quota = await LicenseManager.canAnalyze();
  if (!quota.allowed) {
    alert('You have reached your monthly free limit (3 analyses). Please upgrade to Pro in Settings for unlimited access!');
    document.querySelector('[data-tab="tab-settings"]')?.click();
    return;
  }

  // Start Extraction & Analysis
  try {
    // 1. Ask content script to scrape reviews (including in-tab pagination if needed)
    let reviews = [];
    try {
      const scrapeRes = await chrome.tabs.sendMessage(activeTabInfo.id, { type: 'SCRAPE_PAGE_REVIEWS' });
      if (scrapeRes && scrapeRes.reviews && scrapeRes.reviews.length > 0) {
        reviews = scrapeRes.reviews;
      }
    } catch (msgErr) {
      console.warn('[ReviewSpy] Content script messaging failed, trying direct probe:', msgErr);
    }

    // 2. Direct DOM fallback via scripting API if message yielded 0 reviews
    if (reviews.length === 0) {
      showLoading('Scanning Page DOM...', 'Probing review elements directly on active tab...');
      try {
        const injectedResults = await chrome.scripting.executeScript({
          target: { tabId: activeTabInfo.id },
          func: () => {
            const selectors = [
              '[id^="customer_review-"]',
              '[data-hook="review"]',
              'div.review',
              'li[data-hook="review"]',
              '#cm-cr-dp-review-list li',
              '#cm-cr-dp-review-list .a-section.review',
              '[data-csa-c-content-id^="customer_review-"]'
            ];
            const found = Array.from(document.querySelectorAll(selectors.join(', ')));
            return found.map(el => {
              // Star
              const starEl = el.querySelector('[data-hook="review-star-rating"], [data-hook="cmps-review-star-rating"], i.a-icon-star, .review-rating');
              const match = starEl?.textContent.match(/([0-5](?:\.[0-9])?)/);
              const rating = match ? parseFloat(match[1]) : 5;

              // Title
              const titleEl = el.querySelector('[data-hook="review-title"], a.review-title, .review-title');
              let title = '';
              if (titleEl) {
                const clone = titleEl.cloneNode(true);
                clone.querySelectorAll('.a-icon-alt, i, .a-icon').forEach(n => n.remove());
                title = clone.textContent.trim();
              }

              // Body
              const bodyEl = el.querySelector('[data-hook="review-body"], .review-text-content, .review-text, [data-hook="review-collapsed"], .review-data');
              const body = bodyEl ? bodyEl.textContent.replace(/Read more\s*$/i, '').trim() : '';

              // Date & Verified
              const dateEl = el.querySelector('[data-hook="review-date"], .review-date');
              const date = dateEl ? dateEl.textContent.trim() : '';
              const verified = !!el.querySelector('[data-hook="avp-badge"], [data-hook="avp-badge-linkless"]');

              return { id: el.id || Math.random().toString(36), rating, title, body, date, verified };
            }).filter(r => r.body || r.title);
          }
        });

        if (injectedResults && injectedResults[0]?.result?.length > 0) {
          reviews = injectedResults[0].result;
          console.log(`[ReviewSpy] Direct DOM probe recovered ${reviews.length} reviews.`);
        }
      } catch (probeErr) {
        console.warn('[ReviewSpy] Direct script injection failed:', probeErr);
      }
    }

    // 3. Background fetch fallback if still < 10 reviews
    if (reviews.length < 10 && currentProduct.platform === 'amazon' && currentProduct.asin) {
      showLoading('Fetching Review Archive...', 'Querying Amazon reviews page...');
      const pagedReviews = await fetchAmazonPagedReviews(currentProduct.asin);
      reviews = deduplicateReviews([...reviews, ...pagedReviews]);
    }

    if (reviews.length === 0) {
      throw new Error('No customer reviews could be found on this page. Please ensure you are viewing a product with customer reviews.');
    }

    currentReviews = reviews;
    renderReviewsList();

    // 3. Send to Gemini AI
    showLoading('Analyzing Sentiment with Gemini AI...', `Processing ${reviews.length} reviews for flaws and marketing hooks...`);
    const client = new GeminiClient(geminiApiKey);
    const analysis = await client.analyzeReviews(currentProduct.title, reviews);

    // 4. Save to Cache & Deduct quota
    const cacheKey = `analysis_${currentProduct.asin || currentProduct.url}`;
    const reviewsKey = `reviews_${currentProduct.asin || currentProduct.url}`;
    await chrome.storage.local.set({
      [cacheKey]: analysis,
      [reviewsKey]: reviews
    });

    await LicenseManager.incrementUsage();
    await updatePlanUI();

    // 5. Render Output
    hideLoading();
    renderInsights(analysis);

  } catch (err) {
    hideLoading();
    alert(`Analysis Failed: ${err.message}`);
    console.error('[ReviewSpy] Analysis error:', err);
  }
});

// Background fetch for Amazon pagination
async function fetchAmazonPagedReviews(asin) {
  const pagedList = [];
  // Fetch up to 2 pagination pages
  for (let page = 1; page <= 2; page++) {
    try {
      const url = `https://www.amazon.com/product-reviews/${asin}/ref=cm_cr_arp_d_paging_btm_next_${page}?pageNumber=${page}&sortBy=recent`;
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_AMAZON_REVIEWS_URL',
        url
      });

      if (response && response.success && response.html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.html, 'text/html');
        const reviewEls = doc.querySelectorAll('[id^="customer_review-"], [data-hook="review"], .review, li[data-hook="review"]');

        reviewEls.forEach(el => {
          const starEl = el.querySelector('[data-hook="review-star-rating"], [data-hook="cmps-review-star-rating"], i.a-icon-star, .review-rating');
          const match = starEl?.textContent.match(/([0-5](?:\.[0-9])?)/);
          const rating = match ? parseFloat(match[1]) : 5;

          const titleEl = el.querySelector('[data-hook="review-title"], a.review-title, .review-title');
          let title = '';
          if (titleEl) {
            const clone = titleEl.cloneNode(true);
            clone.querySelectorAll('.a-icon-alt, i, .a-icon').forEach(n => n.remove());
            title = clone.textContent.trim();
          }

          const bodyEl = el.querySelector('[data-hook="review-body"], .review-text-content, .review-text, [data-hook="review-collapsed"], .review-data');
          const body = bodyEl ? bodyEl.textContent.replace(/Read more\s*$/i, '').trim() : '';

          const dateEl = el.querySelector('[data-hook="review-date"], .review-date');
          const date = dateEl ? dateEl.textContent.trim() : '';

          if (body || title) {
            pagedList.push({
              id: el.id || `amz_pg_${Math.random().toString(36).substr(2, 9)}`,
              rating,
              title,
              body,
              date,
              verified: !!el.querySelector('[data-hook="avp-badge"], [data-hook="avp-badge-linkless"]')
            });
          }
        });
      }
    } catch (e) {
      console.warn(`[ReviewSpy] Failed page ${page}:`, e);
      break;
    }
  }
  return pagedList;
}

function deduplicateReviews(list) {
  const seen = new Set();
  return list.filter(item => {
    const key = (item.title + item.body).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Render Insights into UI
function renderInsights(data) {
  emptyState.classList.add('hidden');
  resultsContainer.classList.remove('hidden');

  // Summary
  summaryText.textContent = data.summary || 'Summary unavailable.';
  if (data.satisfaction_rate !== undefined) {
    satisfactionBadge.textContent = `${data.satisfaction_rate}% Satisfaction`;
  }

  // Top Complaints
  complaintsList.innerHTML = '';
  if (data.top_complaints && data.top_complaints.length > 0) {
    data.top_complaints.forEach(item => {
      const el = document.createElement('div');
      const sevClass = item.severity === 'high' ? 'severity-high' : 'severity-medium';
      el.className = `insight-item ${sevClass}`;
      el.innerHTML = `
        <div class="insight-item-title">
          <span>${escapeHtml(item.title)}</span>
          <span class="severity-tag ${item.severity}">${escapeHtml(item.severity || 'issue')}</span>
        </div>
        ${item.evidence ? `<div class="insight-item-evidence">"${escapeHtml(item.evidence)}"</div>` : ''}
        ${item.fix ? `<div class="insight-item-fix"><strong>💡 Fix:</strong> ${escapeHtml(item.fix)}</div>` : ''}
      `;
      complaintsList.appendChild(el);
    });
  } else {
    complaintsList.innerHTML = '<p class="text-muted">No critical complaints found.</p>';
  }

  // Feature Opportunities
  opportunitiesList.innerHTML = '';
  if (data.feature_opportunities && data.feature_opportunities.length > 0) {
    data.feature_opportunities.forEach(item => {
      const el = document.createElement('div');
      el.className = 'insight-item';
      el.innerHTML = `
        <div class="insight-item-title">${escapeHtml(item.feature)}</div>
        <div class="insight-item-fix">${escapeHtml(item.why)}</div>
      `;
      opportunitiesList.appendChild(el);
    });
  }

  // What Customers Love
  strengthsList.innerHTML = '';
  if (data.what_customers_love && data.what_customers_love.length > 0) {
    data.what_customers_love.forEach(txt => {
      const li = document.createElement('li');
      li.textContent = txt;
      strengthsList.appendChild(li);
    });
  }

  // Marketing Hooks
  hooksList.innerHTML = '';
  if (data.marketing_hooks && data.marketing_hooks.length > 0) {
    data.marketing_hooks.forEach(hook => {
      const div = document.createElement('div');
      div.className = 'hook-item';
      div.innerHTML = `
        <span class="hook-text">"${escapeHtml(hook)}"</span>
        <button class="btn-copy" title="Copy Hook">📋</button>
      `;
      div.querySelector('.btn-copy').addEventListener('click', (e) => {
        navigator.clipboard.writeText(hook);
        e.target.textContent = '✅';
        setTimeout(() => { e.target.textContent = '📋'; }, 1500);
      });
      hooksList.appendChild(div);
    });
  }
}

// Render Raw Reviews Tab
function renderReviewsList(filteredList = null) {
  const list = filteredList || currentReviews;
  tabReviewCount.textContent = String(currentReviews.length);

  if (!list || list.length === 0) {
    reviewsListContainer.innerHTML = '<div class="empty-reviews">No reviews found. Click "Analyze" on a product page.</div>';
    return;
  }

  reviewsListContainer.innerHTML = '';
  list.forEach(r => {
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-card-header">
        <span class="review-stars">${'★'.repeat(Math.round(r.rating || 5))}${'☆'.repeat(5 - Math.round(r.rating || 5))}</span>
        <span class="review-date">${escapeHtml(r.date || '')}</span>
      </div>
      ${r.title ? `<div class="review-card-title">${escapeHtml(r.title)}</div>` : ''}
      <div class="review-card-body">${escapeHtml(r.body)}</div>
    `;
    reviewsListContainer.appendChild(card);
  });
}

// Search reviews
reviewSearch.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderReviewsList();
    return;
  }
  const filtered = currentReviews.filter(r =>
    (r.title && r.title.toLowerCase().includes(query)) ||
    (r.body && r.body.toLowerCase().includes(query))
  );
  renderReviewsList(filtered);
});

// CSV Export
btnExportCsv.addEventListener('click', () => {
  if (currentReviews.length === 0) {
    alert('No reviews to export.');
    return;
  }
  const filename = `${(currentProduct?.asin || 'reviews')}_export.csv`;
  CsvExporter.exportReviews(currentReviews, filename);
});

// Settings Handlers
function setupSettingsHandlers() {
  // Toggle Gemini Key Visibility
  btnToggleKey.addEventListener('click', () => {
    inputGeminiKey.type = inputGeminiKey.type === 'password' ? 'text' : 'password';
  });

  // Save Gemini Key
  btnSaveKey.addEventListener('click', async () => {
    const key = inputGeminiKey.value.trim();
    if (!key) {
      showStatus(keySaveStatus, 'Please enter a valid key.', false);
      return;
    }
    await chrome.storage.local.set({ geminiApiKey: key });
    geminiApiKey = key;
    showStatus(keySaveStatus, '✅ Gemini API Key saved successfully!', true);
  });

  // Validate Lemon Squeezy License
  btnValidateLicense.addEventListener('click', async () => {
    const key = inputLicenseKey.value.trim();
    if (!key) {
      showStatus(licenseSaveStatus, 'Please enter a license key.', false);
      return;
    }

    btnValidateLicense.disabled = true;
    btnValidateLicense.textContent = 'Verifying...';

    try {
      const res = await LicenseManager.validateLemonSqueezyLicense(key);
      if (res.success) {
        showStatus(licenseSaveStatus, `✅ Pro Activated! (${res.customerEmail})`, true);
        await updatePlanUI();
      } else {
        showStatus(licenseSaveStatus, `❌ ${res.error}`, false);
      }
    } catch (err) {
      showStatus(licenseSaveStatus, `❌ ${err.message}`, false);
    } finally {
      btnValidateLicense.disabled = false;
      btnValidateLicense.textContent = 'Activate License';
    }
  });

  // Clear Cache
  btnClearCache.addEventListener('click', async () => {
    const all = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(all).filter(k => k.startsWith('analysis_') || k.startsWith('reviews_'));
    await chrome.storage.local.remove(keysToRemove);
    alert('Analysis cache cleared!');
    if (currentProduct) checkCache(currentProduct);
  });
}

// Helpers
function showLoading(title, subtitle) {
  loadingState.classList.remove('hidden');
  resultsContainer.classList.add('hidden');
  emptyState.classList.add('hidden');
  loadingTitle.textContent = title;
  loadingSubtitle.textContent = subtitle;
}

function hideLoading() {
  loadingState.classList.add('hidden');
}

function showStatus(el, msg, isSuccess) {
  el.textContent = msg;
  el.className = `status-msg ${isSuccess ? 'status-success' : 'status-error'}`;
  setTimeout(() => { el.textContent = ''; }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Listen to tab updates (when user changes URL in the browser)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    refreshActiveTab();
  }
});

// Run Init
init();
