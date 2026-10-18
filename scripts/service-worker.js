// ReviewSpy AI - Background Service Worker (Manifest V3)

// Set side panel to open when user clicks the extension action icon in the toolbar
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    console.log('[ReviewSpy] Side panel behavior set to openPanelOnActionClick');
  } catch (err) {
    console.error('[ReviewSpy] Failed to set side panel behavior:', err);
  }
});

// Listener for background actions (e.g. fetching review pages via user browser session)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_AMAZON_REVIEWS_URL') {
    (async () => {
      try {
        const response = await fetch(message.url, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          credentials: 'include' // Use user's active Amazon session/cookies
        });

        if (!response.ok) {
          sendResponse({ success: false, status: response.status, error: `HTTP ${response.status}` });
          return;
        }

        const html = await response.text();
        sendResponse({ success: true, html });
      } catch (err) {
        console.error('[ReviewSpy SW] Fetch error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
