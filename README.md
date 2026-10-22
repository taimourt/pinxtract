# PinXtract - Ultimate Pinterest Video, GIF & Image Downloader

> A modern, high-speed, and ultra-reliable web application built to extract and download Pinterest media with superior quality.

---

## 🌟 Key Improvements Over Legacy Downloaders

| Feature | Legacy Downloaders (e.g. KlickPin) | PinXtract (This Project) |
| :--- | :--- | :--- |
| **UI / Aesthetics** | Outdated Bootstrap 4 layout filled with intrusive ads | **Sleek, modern glassmorphic interface**, glowing ambient lights, curated typography (Plus Jakarta Sans & Outfit) |
| **Dark / Light Mode** | Light only | **Instant smooth Dark & Light mode toggle** with preference persistence |
| **Direct Browser Downloads** | Often opens CDN URLs in a new browser tab | **Native streaming proxy (`/api/download`)** setting `Content-Disposition: attachment` for 1-click camera roll & download folder saves |
| **Download History** | Not available | **Built-in Local History Drawer** saving downloaded pins for fast re-access |
| **Mobile Integration** | Manual URL copying | **1-Click Mobile QR Code generator** to open and save downloads directly on smartphones |
| **Interactive Video Player** | Basic preview | **Custom player** with loop toggle, playback speed control (0.75x to 2x), and Picture-in-Picture |
| **Resolution Extraction** | Single fallback link | **Multi-tier stream detection**: 1080p Full HD, 720p HD MP4, 480p SD, original 4K/2K images, and video posters with live file sizes |
| **Multi-Media Support** | Standard video only | Single Pins (`pin.it` / `pinterest.com`), animated GIFs, original high-res photos, ideas collections, and story carousels |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Start the application
npm start
```

Open your browser at:
```
http://localhost:3000
```

---

## 🏗️ Architecture

- **`server.js`**: Express server handling static asset delivery, `/api/resolve` scraper endpoint, `/api/download` streaming proxy, and `/api/proxy-media`.
- **`pinterestScraper.js`**: Multi-tiered Pinterest media extractor (handles `pin.it` redirects, JSON-LD schema objects, relay completed queries, and CDN originals).
- **`public/index.html`**: Semantic, accessible HTML5 layout featuring hero search, resolution cards, step-by-step guides, comparison table, FAQ, and extensions showcase.
- **`public/style.css`**: Vanilla CSS design system with custom properties, glassmorphism, fluid typography, and responsive breakpoints.
- **`public/app.js`**: Frontend controller managing 1-click clipboard paste, multi-stage progress tracking, media playback, history, and QR generation.
