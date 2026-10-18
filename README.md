# 🕵️‍♂️ ReviewSpy AI - Amazon & Shopify Competitor Intelligence

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-indigo.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Model](https://img.shields.io/badge/AI-Gemini%203.8%20Flash-blue.svg)](https://ai.google.dev/)
[![Version](https://img.shields.io/badge/Version-1.0.0-emerald.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-Proprietary-slate.svg)](#license)

**ReviewSpy AI** is a production-grade Google Chrome Extension (Manifest V3) purpose-built for US e-commerce solopreneurs (Amazon FBA, Private Label & Shopify DTC). It extracts customer reviews directly from competitor product listings and generates deep, actionable teardowns using **Google Gemini 3.8 Flash**—uncovering critical product flaws, unmet customer desires, and high-converting advertising hooks in seconds.

---

## 🎯 Value Proposition

Reading hundreds of competitor reviews manually takes hours. ReviewSpy AI automates this entire workflow:
1. **Top Complaints (Product Flaws):** Highlights fatal defects with severity levels, direct customer quotes, and actionable product improvement recommendations.
2. **Feature Opportunities:** Identifies variations, accessories, or features customers are actively begging for.
3. **What Customers Love:** Outlines the competitor's core strengths that your product must match.
4. **Marketing & Ad Hooks:** Generates 3 punchy, high-converting ad angles tailored to capitalize on competitor shortcomings.
5. **Raw Data Export:** Instant 1-click download of all parsed reviews into a clean CSV file.

---

## 🏗️ Technical Architecture

```text
review-spy-extension/
├── manifest.json            # Manifest V3 specification
├── assets/
│   ├── icons/               # 16x16, 48x48, 128x128 PNG icons
│   └── generate-icons.js    # Pure Node.js lossless icon generator
├── sidepanel/
│   ├── sidepanel.html       # Modern dark-mode dashboard
│   ├── sidepanel.css        # Responsive, zero-dependency styling
│   └── sidepanel.js         # State machine & orchestrator
├── scripts/
│   ├── content-amazon.js    # 3-pass resilient Amazon review scraper
│   ├── content-shopify.js   # Scraper for Judge.me, Loox & generic widgets
│   ├── service-worker.js    # Background event handling & side panel configuration
│   └── package.js           # Automated Chrome Web Store packaging script
├── utils/
│   ├── gemini-client.js     # Gemini 3.8 Flash client with self-healing model discovery
│   ├── csv-exporter.js      # RFC-4180 compliant CSV export generator
│   └── license-validator.js # Lemon Squeezy license manager & freemium counter
├── CHANGELOG.md             # Version history adhering to Keep a Changelog
├── SECURITY.md              # Security policy, credential protection & privacy details
└── package.json             # Build scripts and project metadata
```

---

## 📌 Versioning Concept & Git Strategy

This project adheres strictly to **[Semantic Versioning (SemVer)](https://semver.org/)** (`vMAJOR.MINOR.PATCH`):

| Type | Format | When to Increment | Chrome Web Store Impact |
| :--- | :--- | :--- | :--- |
| **PATCH** | `1.0.X` | Bug fixes, Amazon DOM selector adaptations, UI minor tweaks | Direct submission as a maintenance update. |
| **MINOR** | `1.X.0` | Backward-compatible new features (e.g., Walmart scraper, sentiment charts) | Feature release with release notes. |
| **MAJOR** | `X.0.0` | Architectural overhauls, Manifest specification upgrades | Major milestone release. |

> [!IMPORTANT]
> **Google Chrome Web Store Rule:** The version string in `manifest.json` **must strictly increase** on every new upload. Google will reject duplicate or lower version numbers.

### Release & Tagging Workflow:
```bash
# 1. Update version in manifest.json and package.json (e.g. 1.0.1)
# 2. Update CHANGELOG.md with the new release notes
# 3. Commit changes
git add .
git commit -m "chore(release): v1.0.1"

# 4. Create annotated Git tag
git tag -a v1.0.1 -m "Release v1.0.1: [brief description]"

# 5. Push commits and tags to GitHub
git push origin main --tags
```

---

## 🚀 Quickstart & Developer Testing

### 1. Load Unpacked in Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **"Developer mode"** in the top right corner.
3. Click **"Load unpacked"** in the top left corner.
4. Select this directory:
   ```text
   /Users/yulioaldiw/Projects/yulioaldiw/review-spy-extension
   ```
5. Click the extension icon in your Chrome toolbar to open the **ReviewSpy AI Side Panel**.

### 2. Configure Google Gemini API Key
1. Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open the extension Side Panel -> Go to the **Settings** tab.
3. Paste your key and click **Save Key**.

### 3. Test on Amazon
Open any product listing on [Amazon.com](https://www.amazon.com) (e.g., gaming PCs, headphones, water bottles) and click **"Analyze Competitor Reviews"**.

---

## 📦 Production Packaging

To generate a clean, Chrome Web Store-compliant `.zip` package:
```bash
npm run package
```
This script will produce a distribution zip located at:
```text
dist/review-spy-extension-v1.0.0.zip
```
All system junk (`.DS_Store`), Git history, tests, and documentation files are automatically excluded.

---

## 🌐 Linking to GitHub

### Option A: Using SSH (Recommended)
```bash
cd /Users/yulioaldiw/Projects/yulioaldiw/review-spy-extension
git remote add origin git@github.com:yulioaldiw/review-spy-extension.git
git branch -M main
git push -u origin main --tags
```

### Option B: Using HTTPS
```bash
cd /Users/yulioaldiw/Projects/yulioaldiw/review-spy-extension
git remote add origin https://github.com/yulioaldiw/review-spy-extension.git
git branch -M main
git push -u origin main --tags
```

---

## 🔒 Security & Privacy

ReviewSpy AI operates on a **zero-telemetry, zero-tracking** architecture:
* Your API key is stored locally in `chrome.storage.local` and never leaves your machine.
* AI inference calls travel directly from your browser to Google's official endpoints over HTTPS.
* Review our complete policy in [SECURITY.md](SECURITY.md).

---

## 📄 License
Proprietary & Confidential. All rights reserved.
