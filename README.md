# 🕵️‍♂️ ReviewSpy AI - Amazon & Shopify Competitor Intelligence

ReviewSpy AI adalah Chrome Extension (Manifest V3) yang dirancang khusus untuk penjual e-commerce pasar Amerika Serikat (Amazon FBA & Shopify). Ekstensi ini secara otomatis mengekstrak ratusan ulasan pelanggan kompetitor, lalu menggunakan Google Gemini AI untuk menganalisis cacat produk, celah fitur baru, dan merumuskan sudut pandang iklan (*ad copy hooks*) dengan tingkat konversi tinggi.

---

## 🚀 Fitur Utama
1. **One-Click Review Scraper:** Mengekstrak ulasan langsung dari halaman aktif Amazon (`amazon.com/dp/...`) dan toko Shopify (Judge.me, Loox, Generic).
2. **Deep Teardown dengan Gemini 1.5 Flash:**
   - 🔴 **Top Customer Complaints:** Mengidentifikasi kelemahan fatal produk kompetitor lengkap dengan tingkat keparahan & kutipan asli pembeli.
   - 💡 **Feature Opportunities:** Menemukan variasi produk atau fitur yang paling banyak diminta pembeli tapi belum ada di pasar.
   - 🟢 **What Customers Love:** Nilai jual terkuat kompetitor yang wajib dipertahankan.
   - 🎯 **Marketing Hooks:** 3 sudut pandang headline iklan untuk merebut pembeli kompetitor.
3. **Chrome Side Panel Interface:** Bekerja di panel sisi kanan browser tanpa menutup halaman produk.
4. **Export to CSV:** Mengunduh seluruh ulasan mentah ke format CSV yang siap diolah di Excel.
5. **Freemium & Lemon Squeezy Monetization:** Sistem kuota 3x analisis gratis/bulan dengan verifikasi lisensi Pro (\$19/bln).

---

## 🛠️ Panduan Instalasi Lokal (Developer Mode)

1. Buka browser **Google Chrome** (atau Brave / Edge).
2. Di kolom URL, ketik: `chrome://extensions` lalu tekan **Enter**.
3. Aktifkan toggle **"Developer mode"** di pojok kanan atas.
4. Klik tombol **"Load unpacked"** di pojok kiri atas.
5. Pilih folder:
   ```text
   /Users/yulioaldiw/Projects/yulioaldiw/review-spy-extension
   ```
6. Ekstensi **ReviewSpy AI** akan langsung terpasang di toolbar Chrome!

---

## 🔑 Cara Mendapatkan Google Gemini API Key (Gratis 1 Menit)

1. Buka [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Login dengan akun Google-mu.
3. Klik tombol **"Create API Key"** (pilih project default atau buat baru).
4. Salin kuncinya (format diawali dengan `AIzaSy...`).
5. Buka ekstensi ReviewSpy di browser -> Buka tab **Settings** -> Tempelkan kunci -> Klik **Save Key**.

---

## 🌐 Menghubungkan ke GitHub Pribadi

1. Buka [GitHub New Repository](https://github.com/new).
2. Buat repo baru bernama: `review-spy-extension` (Pilih **Private**).
3. Di terminal Mac kamu, jalankan perintah berikut:
   ```bash
   cd /Users/yulioaldiw/Projects/yulioaldiw/review-spy-extension
   git remote add origin git@github.com:USERNAME/review-spy-extension.git
   git push -u origin main
   ```
   *(Ganti `USERNAME` dengan username GitHub-mu).*

---

## 📁 Struktur Direktori
```text
review-spy-extension/
├── manifest.json            # Konfigurasi Manifest V3
├── assets/
│   ├── icons/               # Icon resmi 16px, 48px, 128px
│   └── generate-icons.js    # Skrip pembuat icon PNG murni
├── sidepanel/
│   ├── sidepanel.html       # UI Dashboard Side Panel
│   ├── sidepanel.css        # Styling modern dark theme
│   └── sidepanel.js         # Logic orchestrator & state management
├── scripts/
│   ├── service-worker.js    # Background worker (SidePanel & background fetcher)
│   ├── content-amazon.js    # Parser ulasan Amazon.com
│   └── content-shopify.js   # Parser ulasan toko Shopify
└── utils/
    ├── gemini-client.js     # Client API Gemini Flash dengan strict JSON mode
    ├── csv-exporter.js      # Generator CSV
    └── license-validator.js # Handler kuota gratis & Lemon Squeezy license
```
