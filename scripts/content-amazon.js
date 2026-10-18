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

  // Parse a single review DOM element with deep fallback selectors
  function parseReviewElement(el) {
    try {
      // 1. Star rating
      let rating = null;
      const starEl = el.querySelector(
        '[data-hook="review-star-rating"], [data-hook="cmps-review-star-rating"], i.a-icon-star, [class*="a-star-"], .review-rating'
      );
      if (starEl) {
        const match = starEl.textContent.match(/([0-5](?:\.[0-9])?)/);
        if (match) rating = parseFloat(match[1]);
      }

      // 2. Review Title (stripping inner star rating text if present)
      let title = '';
      const titleEl = el.querySelector(
        '[data-hook="review-title"], a.review-title, .review-title, a[data-hook="review-title"]'
      );
      if (titleEl) {
        const clone = titleEl.cloneNode(true);
        clone.querySelectorAll('.a-icon-alt, i, .a-icon, [data-hook="review-star-rating"]').forEach(n => n.remove());
        title = clone.textContent.trim();
      }

      // 3. Review Body (clean text from container)
      let body = '';
      const bodyEl = el.querySelector(
        '[data-hook="review-body"], .review-text-content, .review-text, [data-hook="review-collapsed"], .review-data, .a-expander-content'
      );
      if (bodyEl) {
        // Strip trailing "Read more" links
        body = bodyEl.textContent.replace(/Read more\s*$/i, '').trim();
      }

      // 4. Date
      let date = '';
      const dateEl = el.querySelector('[data-hook="review-date"], .review-date');
      if (dateEl) {
        date = dateEl.textContent.trim();
      }

      // 5. Author
      const authorEl = el.querySelector('.a-profile-name, [data-hook="genome-widget"]');
      const author = authorEl ? authorEl.textContent.trim() : 'Customer';

      // 6. Verified Purchase
      const verified = !!el.querySelector(
        '[data-hook="avp-badge"], [data-hook="avp-badge-linkless"], .a-declarative[data-action="reviews:filter-action:avp"]'
      );

      // Must have either body or title
      if (!body && !title) return null;

      return {
        id: el.id || `amz_rev_${Math.random().toString(36).substr(2, 9)}`,
        rating: rating !== null ? rating : 5,
        title,
        body,
        author,
        date,
        verified
      };
    } catch (e) {
      console.warn('[ReviewSpy] Failed to parse a review element:', e);
      return null;
    }
  }

  // Scrape reviews present on the current DOM using comprehensive selectors
  function scrapeDomReviews(root = document) {
    const selectors = [
      '[id^="customer_review-"]',
      '[data-hook="review"]',
      'div.review',
      'li[data-hook="review"]',
      '#cm-cr-dp-review-list li',
      '#cm-cr-dp-review-list .a-section.review',
      '[data-csa-c-content-id^="customer_review-"]'
    ];

    const elements = Array.from(root.querySelectorAll(selectors.join(', ')));
    const uniqueElements = Array.from(new Set(elements));
    const results = [];

    uniqueElements.forEach(el => {
      const parsed = parseReviewElement(el);
      if (parsed) results.push(parsed);
    });

    console.log(`[ReviewSpy] Scraped ${results.length} reviews from DOM (found ${uniqueElements.length} containers).`);
    return results;
  }

  // In-tab fetch for all reviews page (bypasses bot detection because it runs in active user tab session)
  async function fetchAdditionalReviews(asin) {
    if (!asin) return [];
    try {
      console.log(`[ReviewSpy] Fetching additional reviews page for ASIN ${asin}...`);
      const url = `https://www.amazon.com/product-reviews/${asin}/ref=cm_cr_arp_d_viewopt_srt?pageNumber=1&sortBy=recent`;
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        console.warn(`[ReviewSpy] Review page fetch returned status ${response.status}`);
        return [];
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const pagedReviews = scrapeDomReviews(doc);
      console.log(`[ReviewSpy] Successfully parsed ${pagedReviews.length} reviews from product-reviews page.`);
      return pagedReviews;
    } catch (err) {
      console.warn('[ReviewSpy] In-tab review pagination error:', err);
      return [];
    }
  }

  // Deduplicate array of review objects by body & title
  function deduplicate(list) {
    const seen = new Set();
    return list.filter(item => {
      const key = `${(item.title || '')}_${(item.body || '')}`.toLowerCase();
      if (!key.trim() || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Message listener for Side Panel commands
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PAGE_INFO') {
      const details = getProductDetails();
      const localReviews = scrapeDomReviews();
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
          // 1. Scrape reviews currently on page
          let reviews = scrapeDomReviews();

          // 2. If fewer than 20 reviews, fetch dedicated review page within active tab session
          const asin = getAsin();
          if (asin && reviews.length < 20) {
            const paged = await fetchAdditionalReviews(asin);
            reviews = deduplicate([...reviews, ...paged]);
          }

          sendResponse({
            success: true,
            platform: 'amazon',
            reviews
          });
        } catch (err) {
          console.error('[ReviewSpy] SCRAPE_PAGE_REVIEWS failed:', err);
          sendResponse({
            success: false,
            platform: 'amazon',
            error: err.message,
            reviews: []
          });
        }
      })();
      return true; // Keep message channel open for async response
    }
  });

  console.log('[ReviewSpy] Amazon content script loaded and active on:', window.location.pathname);
})();
