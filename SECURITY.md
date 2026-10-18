# Security Policy & Architecture

## 1. Data Privacy & Local Storage
* **Bring Your Own Key (BYOK):** The user's Google Gemini API Key is stored strictly inside `chrome.storage.local` within the user's local browser profile. It is never logged, exported, or transmitted to any third-party server.
* **Direct Cloud Inference:** Review text sent for AI analysis travels directly from the user's browser over encrypted HTTPS to Google Generative Language endpoints (`generativelanguage.googleapis.com`). No intermediate proxy or telemetry server intercepts this payload.
* **Zero User Tracking:** ReviewSpy AI contains no third-party tracking pixels, analytics scripts (Google Analytics, Mixpanel, etc.), or external fingerprinting libraries.

## 2. Permissions Architecture (Least Privilege)
ReviewSpy AI follows the principle of least privilege in its `manifest.json`:
* `sidePanel`: Required solely to render the analyst dashboard side-by-side with the product page.
* `storage`: Required to store local analysis cache, API keys, and license state.
* `activeTab`: Grants access to extract review DOM nodes only on the user-selected active product tab.
* `scripting`: Used to inject content scripts seamlessly on active product tabs.
* `host_permissions`: Restricted to `https://*.amazon.com/*` and target storefronts.

## 3. Credential Protection in Version Control
* All environment files (`.env`, `.env.*`), private keys (`*.pem`, `*.key`), and developer credentials are permanently excluded via `.gitignore`.
* Never commit hardcoded API keys or license tokens to this repository.

## 4. Reporting Security Vulnerabilities
If you discover a potential security vulnerability within this repository, please open a private security advisory on GitHub or email the maintainer directly.
