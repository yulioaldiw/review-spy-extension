// ReviewSpy AI - Amazon Content Script (Manifest V3)
(() => {
  'use strict';

  // Helper to extract ASIN from URL or DOM
  function getAsin() {
    const urlMatch = window.location.pathname.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (urlMatch && urlMatch[1]) return urlMatch[1].toUpperCase();

    const inputAsin = document.querySelector('input#ASIN, input[name="ASIN"]');
    if (inputAsin && inputAsin.value) return inputAsin.value.trim().toUpperCase();

    const dataAsinEl = document.querySelector('[data-asin]');
    if (dataAsinEl && dataAsinEl.getAttribute('data-asin')) {
      const val = dataAsinEl.getAttribute('data-asin').trim();
      if (val.length === 10) return val.toUpperCase();
    }
    return null;
  }

  // Helper to get Product Details
  function getProductDetails() {
    const asin = getAsin();
    const titleEl = document.querySelector('#productTitle, #title, h1.product-title, span#productTitle');
    const title = titleEl ? titleEl.textContent.trim() : document.title.replace(/amazon\.com.*$/i, '').trim();

    const priceEl = document.querySelector('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, #corePriceDisplay_desktop_feature_div .a-offscreen');
    const price = priceEl ? priceEl.textContent.trim() : null;

    const ratingEl = document.querySelector('span[data-hook="rating-out-of-text"], #acrPopover span.a-size-base, span.a-icon-alt');
    const rating = ratingEl ? ratingEl.textContent.trim() : null;

    const imgEl = document.querySelector('#landingImage, #imgBlkFront, #main-image');
    const image = imgEl ? (imgEl.src || imgEl.getAttribute('data-old-hires')) : null;

    return {
      platform: 'amazon',
      asin,
      title,
      price,
      rating,
      image,
      url: window.location.href
    };
  }

  // Parse a single review DOM node with full fallbacks
  function parseReviewNode(el, hintDate = '') {
    try {
      // 1. Star Rating
      let rating = 5;
      const starEl = el.querySelector('[data-hook*="star-rating"], [class*="a-star-"], .review-rating, i.a-icon-star');
      if (starEl) {
        const match = starEl.textContent.match(/([0-5](?:\.[0-9])?)/);
        if (match) rating = parseFloat(match[1]);
      } else {
        const match = el.textContent.match(/([1-5](?:\.0)?)\s*out of 5 stars/i);
        if (match) rating = parseFloat(match[1]);
      }

      // 2. Date
      let date = hintDate;
      if (!date) {
        const dateEl = el.querySelector('[data-hook="review-date"], .review-date');
        if (dateEl) {
          date = dateEl.textContent.trim();
        } else {
          const dateMatch = el.textContent.match(/Reviewed in [A-Za-z\s]+ on [A-Za-z]+ \d{1,2}, \d{4}/i);
          if (dateMatch) date = dateMatch[0];
        }
      }

      // 3. Title
      let title = '';
      const titleEl = el.querySelector('[data-hook="review-title"], a.review-title, .review-title, h5');
      if (titleEl) {
        const clone = titleEl.cloneNode(true);
        clone.querySelectorAll('.a-icon-alt, i, .a-icon, [class*="star"]').forEach(n => n.remove());
        title = clone.textContent.trim();
      }

      // 4. Body
      let body = '';
      const bodyEl = el.querySelector('[data-hook="review-body"], .review-text-content, .review-text, [data-hook="review-collapsed"], .review-data');
      if (bodyEl) {
        body = bodyEl.textContent.replace(/Read more\s*$/i, '').trim();
      } else {
        // Fallback: take textual content minus buttons and profile names
        const clone = el.cloneNode(true);
        clone.querySelectorAll('button, input, a, .a-profile, [class*="star"], [data-hook="review-date"]').forEach(n => n.remove());
        const raw = clone.textContent.trim();
        if (raw.length > 20) {
          body = raw;
        }
      }

      // 5. Author
      const authorEl = el.querySelector('.a-profile-name, [data-hook="genome-widget"]');
      const author = authorEl ? authorEl.textContent.trim() : 'Customer';

      // 6. Verified
      const verified = /Verified Purchase/i.test(el.textContent);

      if (!body && !title) return null;

      return {
        id: el.id || `rev_${Math.random().toString(36).substr(2, 9)}`,
        rating,
        title,
        body,
        author,
        date,
        verified
      };
    } catch (e) {
      console.warn('[ReviewSpy] Node parse error:', e);
      return null;
    }
  }

  // 3-Pass Resilient Review Extractor
  function extractAmazonReviews(root = document) {
    const reviews = [];
    const seen = new Set();

    function add(item) {
      if (!item || (!item.body && !item.title)) return;
      const key = (item.body || item.title).slice(0, 100).toLowerCase().trim();
      if (seen.has(key)) return;
      seen.add(key);
      reviews.push(item);
    }

    // PASS 1: Selectors
    const selectors = [
      '[id^="customer_review-"]',
      '[data-hook="review"]',
      'div.review',
      'li[data-hook="review"]',
      '#cm-cr-dp-review-list li',
      '#cm-cr-dp-review-list .a-section.review',
      '[data-csa-c-content-id^="customer_review-"]',
      '.cr-widget-desktop-reviews .a-section'
    ];

    const elements = root.querySelectorAll(selectors.join(', '));
    elements.forEach(el => add(parseReviewNode(el)));

    // PASS 2: Semantic Landmark Detection ("Reviewed in ... on ...")
    if (reviews.length === 0) {
      console.log('[ReviewSpy] Pass 1 yielded 0 reviews, trying Pass 2 (Date Landmark)...');
      const allTextNodes = root.querySelectorAll('span, div, p');
      for (const el of allTextNodes) {
        if (el.children.length <= 1 && /Reviewed in .+ on \w+ \d+/i.test(el.textContent)) {
          let container = el.parentElement;
          let depth = 0;
          while (container && depth < 6) {
            if (container.id && (container.id.startsWith('customer_review') || container.id.startsWith('R'))) break;
            if (container.querySelector && (container.querySelector('.a-profile-name') || container.querySelector('[class*="star"]'))) break;
            container = container.parentElement;
            depth++;
          }
          if (container) {
            add(parseReviewNode(container, el.textContent.trim()));
          }
        }
      }
    }

    // PASS 3: Helpful Button Landmark Detection
    if (reviews.length === 0) {
      console.log('[ReviewSpy] Pass 2 yielded 0 reviews, trying Pass 3 (Helpful Buttons Landmark)...');
      const buttons = root.querySelectorAll('input[type="submit"][value*="Helpful"], button, .a-button-text');
      for (const btn of buttons) {
        const txt = (btn.textContent || btn.value || '').toLowerCase();
        if (txt.includes('helpful')) {
          let container = btn.closest('.a-section') || btn.parentElement?.parentElement?.parentElement?.parentElement;
          if (container) {
            add(parseReviewNode(container));
          }
        }
      }
    }

    console.log(`[ReviewSpy] extractAmazonReviews completed: found ${reviews.length} reviews.`);
    return reviews;
  }

  // In-tab fetch for all reviews page
  async function fetchAdditionalReviews(asin) {
    if (!asin) return [];
    try {
      console.log(`[ReviewSpy] Fetching dedicated reviews page for ASIN ${asin}...`);
      const url = `https://www.amazon.com/product-reviews/${asin}/ref=cm_cr_arp_d_viewopt_srt?pageNumber=1&sortBy=recent`;
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        console.warn(`[ReviewSpy] Review page fetch status: ${response.status}`);
        return [];
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const pagedReviews = extractAmazonReviews(doc);
      console.log(`[ReviewSpy] In-tab review pagination retrieved ${pagedReviews.length} reviews.`);
      return pagedReviews;
    } catch (err) {
      console.warn('[ReviewSpy] In-tab pagination error:', err);
      return [];
    }
  }

  // Message listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ pong: true });
      return false;
    }

    if (message.type === 'GET_PAGE_INFO') {
      const details = getProductDetails();
      const localReviews = extractAmazonReviews();
      sendResponse({
        success: true,
        isSupported: !!details.asin,
        platform: 'amazon',
        details,
        localReviewCount: localReviews.length
      });
      return false;
    }

    if (message.type === 'SCRAPE_PAGE_REVIEWS') {
      (async () => {
        try {
          let reviews = extractAmazonReviews();

          const asin = getAsin();
          if (asin && reviews.length < 15) {
            const paged = await fetchAdditionalReviews(asin);
            const seen = new Set(reviews.map(r => (r.body || r.title).slice(0, 100).toLowerCase().trim()));
            paged.forEach(p => {
              const k = (p.body || p.title).slice(0, 100).toLowerCase().trim();
              if (!seen.has(k)) {
                seen.add(k);
                reviews.push(p);
              }
            });
          }

          sendResponse({
            success: true,
            platform: 'amazon',
            reviews
          });
        } catch (err) {
          console.error('[ReviewSpy] SCRAPE_PAGE_REVIEWS error:', err);
          sendResponse({
            success: false,
            platform: 'amazon',
            error: err.message,
            reviews: []
          });
        }
      })();
      return true;
    }
  });

  console.log('[ReviewSpy] Amazon content script initialized on:', window.location.pathname);
})();
