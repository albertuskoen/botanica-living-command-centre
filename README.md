# Botanica Living — Command Centre

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Import the repo in Vercel
3. Framework: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output dir: `dist`
6. Deploy

## File Structure

```
/
├── index.html
├── package.json
├── vite.config.js
├── README.md
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx              ← Entry point
    ├── App.jsx               ← Root, routing, state, seed data
    ├── Sidebar.jsx           ← Navigation
    ├── global.js             ← All CSS + colour tokens (T)
    ├── format.js             ← ZAR, USD, pct, nextId helpers
    ├── Dashboard.jsx
    ├── BusinessProgress.jsx  ← Self-contained with own localStorage
    ├── Suppliers.jsx
    ├── Products.jsx
    ├── Calculator.jsx
    ├── CheckersHyper.jsx
    ├── FoundersCollection.jsx
    └── Strategy.jsx
```

## Resetting Data

DevTools → Application → Local Storage → delete `bl_suppliers`, `bl_products`, `bl_progress` → refresh.
