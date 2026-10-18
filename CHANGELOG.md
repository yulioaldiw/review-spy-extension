# Changelog

All notable changes to the **ReviewSpy AI** Chrome extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-19

### Added
- **Amazon Product Reviews Scraper:** Resilient multi-pass extractor targeting ASIN, star rating, verified badge, review title, body text, and review date.
- **Shopify Review Support:** Scrapers for popular Shopify review widgets (Judge.me, Loox, Generic).
- **Gemini 3.8 Flash AI Integration:** Teardown analysis generating:
  - Executive Sentiment Summary with satisfaction score.
  - Top Customer Complaints (ranked with severity, quotes, and competitor opportunity fixes).
  - Feature Opportunities & Unmet Needs.
  - What Customers Love (must-keep features).
  - High-Converting Ad Hooks with 1-click clipboard copy.
- **Chrome Side Panel Dashboard:** Sleek dark-mode interface powered by Chrome Side Panel API.
- **CSV Data Exporter:** One-click download of parsed customer reviews into clean CSV format.
- **Freemium & Monetization Architecture:**
  - 3 free analyses per month.
  - Lemon Squeezy license validation with 7-day offline grace period.
- **Self-Healing AI Model Resolution:** Dynamic discovery via `ModelService.ListModels` with auto-fallback to `gemini-3.8-flash`.
- **Automated Packaging:** Build script (`npm run package`) to produce compliant `.zip` distribution bundles.
