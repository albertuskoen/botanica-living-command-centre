# Botanica Living Group — Command Centre v1.2

## Quick Start

```bash
npm install
npm run build
npm run preview
```

Or for development:
```bash
npm run dev
```

## Deploy to Vercel

1. Push this folder to a GitHub repo root
2. Import repo in Vercel — framework auto-detects as Vite
3. Build command: `npm run build` · Output: `dist`
4. Deploy ✓

## Install on Samsung / Android (PWA)

1. Open deployed URL in Chrome or Samsung Internet
2. Tap menu (⋮) → "Add to Home Screen" or "Install App"
3. Confirm — app opens in standalone mode

## File Structure

```
/
├── index.html
├── package.json
├── vite.config.js           ← Vite + PWA plugin
├── README.md
├── public/
│   ├── favicon.svg
│   ├── manifest.json        ← PWA manifest
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
└── src/
    ├── main.jsx
    ├── App.jsx              ← Root, routing, all state
    ├── components/
    │   ├── Sidebar.jsx
    │   └── Modal.jsx
    ├── pages/
    │   ├── Dashboard.jsx
    │   ├── FinanceCentre.jsx
    │   ├── ActionCentre.jsx
    │   ├── BusinessDocuments.jsx
    │   ├── BusinessProgress.jsx
    │   ├── Suppliers.jsx
    │   ├── Products.jsx
    │   ├── Settings.jsx
    │   └── OtherPages.jsx   ← Calculator, CheckersHyper, FoundersCollection, Strategy
    ├── hooks/
    │   └── useLocalStorage.js
    └── utils/
        ├── tokens.js        ← Colour palette
        ├── css.js           ← All global CSS
        ├── format.js        ← ZAR, USD, pct helpers
        └── data.js          ← Seed data + NAV config
```

## localStorage Keys

- `bl_suppliers` · `bl_products` · `bl_progress`
- `bl_finance` · `bl_tasks` · `bl_documents`

## Reset Data

DevTools → Application → Local Storage → delete all `bl_*` keys → refresh.
