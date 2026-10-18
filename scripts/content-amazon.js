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
    const titleEl = document.querySelector('#productTitle, #title, h1.product-title');
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

  // Parse review DOM elements into structured objects
  function parseReviewElement(el) {
    try {
      // Star rating
      let rating = null;
      const starEl = el.querySelector('i[data-hook="review-star-rating"] span.a-icon-alt, i[data-hook="cmps-review-star-rating"] span, i.a-icon-star span');
      if (starEl) {
        const match = starEl.textContent.match(/([0-5](?:\.[0-9])?)/);
        if (match) rating = parseFloat(match[1]);
      }

      // Review Title
      let title = '';
      const titleEl = el.querySelector('a[data-hook="review-title"] span, span[data-hook="review-title"] span, a.review-title span');
      if (titleEl) {
        title = titleEl.textContent.trim();
      }

      // Review Body
      let body = '';
      const bodyEl = el.querySelector('span[data-hook="review-body"] span, div.review-text-content span');
      if (bodyEl) {
        body = bodyEl.textContent.trim();
      }

      // Date
      let date = '';
      const dateEl = el.querySelector('span[data-hook="review-date"]');
      if (dateEl) {
        date = dateEl.textContent.trim();
      }

      // Verified Purchase
      const verified = !!el.querySelector('span[data-hook="avp-badge"], [data-hook="avp-badge-linkless"]');

      if (!body && !title) return null;

      return {
        id: el.id || `amz_rev_${Math.random().toString(36).substr(2, 9)}`,
        rating: rating !== null ? rating : 0,
        title,
        body,
        date,
        verified
      };
    } catch (e) {
      console.warn('[ReviewSpy] Failed to parse a review element:', e);
      return null;
    }
  }

  // Scrape reviews present on the current DOM
  function scrapeDomReviews(root = document) {
    const reviewElements = root.querySelectorAll('div[data-hook="review"], div.review');
    const results = [];
    reviewElements.forEach(el => {
      const parsed = parseReviewElement(el);
      if (parsed) results.push(parsed);
    });
    return results;
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
      const reviews = scrapeDomReviews();
      sendResponse({
        success: true,
        platform: 'amazon',
        reviews
      });
      return false;
    }
  });

  console.log('[ReviewSpy] Amazon content script loaded on:', window.location.hostname);
})();
