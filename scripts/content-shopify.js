// ReviewSpy AI - Shopify Content Script (Manifest V3)
(() => {
  'use strict';

  // Immediately bail out if we are on Amazon
  if (window.location.hostname.includes('amazon.')) {
    return;
  }

  // Check if current page is a Shopify store
  function isShopifyStore() {
    return !!(
      window.Shopify ||
      document.querySelector('script[id*="shopify"], link[href*="cdn.shopify.com"], meta[name="generator"][content*="Shopify"]') ||
      window.location.pathname.includes('/products/')
    );
  }

  // Get Shopify Product Info
  function getShopifyProductDetails() {
    const isShopify = isShopifyStore();
    const isProductPage = window.location.pathname.includes('/products/');
    
    const titleEl = document.querySelector('h1.product-title, h1.product__title, .product-single__title, h1');
    const title = titleEl ? titleEl.textContent.trim() : document.title;

    const priceEl = document.querySelector('.price-item--regular, .product__price, .price, span[data-product-price]');
    const price = priceEl ? priceEl.textContent.trim() : null;

    const imgEl = document.querySelector('.product__media img, .product-featured-media img, .product-single__photo img, meta[property="og:image"]');
    const image = imgEl ? (imgEl.src || imgEl.getAttribute('content')) : null;

    return {
      platform: 'shopify',
      isShopify,
      isProductPage,
      title,
      price,
      image,
      url: window.location.href
    };
  }

  // Scrape reviews from Judge.me widget
  function scrapeJudgemeReviews() {
    const items = document.querySelectorAll('.jdgm-rev');
    const reviews = [];
    items.forEach(el => {
      try {
        const ratingEl = el.querySelector('.jdgm-rev__rating');
        const rating = ratingEl ? parseFloat(ratingEl.getAttribute('data-score') || '5') : 5;
        const titleEl = el.querySelector('.jdgm-rev__title');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const bodyEl = el.querySelector('.jdgm-rev__body');
        const body = bodyEl ? bodyEl.textContent.trim() : '';
        const dateEl = el.querySelector('.jdgm-rev__timestamp');
        const date = dateEl ? dateEl.textContent.trim() : '';

        if (body || title) {
          reviews.push({
            id: `jdgm_${Math.random().toString(36).substr(2, 9)}`,
            rating,
            title,
            body,
            date,
            verified: !!el.querySelector('.jdgm-rev__buyer-badge')
          });
        }
      } catch (e) {
        console.warn('[ReviewSpy] Failed to parse Judge.me review:', e);
      }
    });
    return reviews;
  }

  // Scrape reviews from Loox widget
  function scrapeLooxReviews() {
    const items = document.querySelectorAll('.grid-item-review, .loox-review, [data-review-id]');
    const reviews = [];
    items.forEach(el => {
      try {
        const rating = parseFloat(el.getAttribute('data-rating') || '5');
        const titleEl = el.querySelector('.review-title, .title');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const bodyEl = el.querySelector('.main-text, .review-body, .comment');
        const body = bodyEl ? bodyEl.textContent.trim() : '';
        const dateEl = el.querySelector('.time, .date');
        const date = dateEl ? dateEl.textContent.trim() : '';

        if (body || title) {
          reviews.push({
            id: `loox_${Math.random().toString(36).substr(2, 9)}`,
            rating,
            title,
            body,
            date,
            verified: true
          });
        }
      } catch (e) {
        console.warn('[ReviewSpy] Failed to parse Loox review:', e);
      }
    });
    return reviews;
  }

  // Scrape reviews from generic or Shopify Product Reviews (SPR)
  function scrapeGenericReviews() {
    const items = document.querySelectorAll('.spr-review, .product-review, [itemprop="review"]');
    const reviews = [];
    items.forEach(el => {
      try {
        const titleEl = el.querySelector('.spr-review-header-title, [itemprop="name"]');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const bodyEl = el.querySelector('.spr-review-content-body, [itemprop="reviewBody"]');
        const body = bodyEl ? bodyEl.textContent.trim() : '';
        const dateEl = el.querySelector('.spr-review-header-date, [itemprop="datePublished"]');
        const date = dateEl ? dateEl.textContent.trim() : '';

        if (body || title) {
          reviews.push({
            id: `spr_${Math.random().toString(36).substr(2, 9)}`,
            rating: 5,
            title,
            body,
            date,
            verified: false
          });
        }
      } catch (e) {
        console.warn('[ReviewSpy] Failed to parse generic review:', e);
      }
    });
    return reviews;
  }

  // Combine and deduplicate
  function scrapeAllShopifyReviews() {
    let list = scrapeJudgemeReviews();
    if (list.length === 0) list = scrapeLooxReviews();
    if (list.length === 0) list = scrapeGenericReviews();
    return list;
  }

  // Listener for Side Panel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only process if we are on a Shopify store
    if (!isShopifyStore()) return false;

    if (message.type === 'GET_PAGE_INFO') {
      const details = getShopifyProductDetails();
      const reviews = scrapeAllShopifyReviews();
      sendResponse({
        success: true,
        isSupported: details.isProductPage,
        platform: 'shopify',
        details,
        localReviewCount: reviews.length
      });
      return false;
    }

    if (message.type === 'SCRAPE_PAGE_REVIEWS') {
      const reviews = scrapeAllShopifyReviews();
      sendResponse({
        success: true,
        platform: 'shopify',
        reviews
      });
      return false;
    }
  });

  if (isShopifyStore()) {
    console.log('[ReviewSpy] Shopify content script active on store.');
  }
})();
