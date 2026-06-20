# Botanica Living Group — Implementation Checklist
## v1.6 — June 2026

---

## ✅ Working Now — No Setup Required

### Document Vault (BusinessDocuments.jsx)
- [x] Upload any file type (PDF, image, CSV, Excel, Word, etc.)
- [x] Store files permanently in **IndexedDB** (not localStorage — much larger capacity)
- [x] Survive page reloads and app restarts
- [x] Preview PDFs inline via iframe + blob URL
- [x] Preview images (JPG, PNG, WEBP, GIF, BMP, SVG) inline
- [x] Preview CSV/TSV as formatted table (first 25 rows)
- [x] Download files back to device
- [x] Open files in new browser tab
- [x] Delete files (removes from IndexedDB + metadata)
- [x] Search by name, supplier, category, notes
- [x] Filter by category (CIPC, SARS, Banking, etc.)
- [x] Category grid with document counts
- [x] Detail panel with metadata
- [x] Link documents to finance transactions
- [x] Show linked transaction in detail panel
- [x] Storage usage bar (shows IndexedDB quota)
- [x] Drag & drop upload

### Finance Centre (FinanceCentre.jsx)
- [x] Manual transaction entry (date, type, category, amount, description, payee, payment method, VAT, notes)
- [x] Form validation with inline error messages
- [x] Edit and delete existing transactions
- [x] Filter by transaction type
- [x] Overview tab with finance insight text
- [x] Monthly summary table
- [x] Category breakdown table
- [x] Import from CSV/TSV with multi-row review table
- [x] PDF text extraction via pdf.js (CDN, no setup, works offline after load)
- [x] **Tesseract.js in-browser OCR** — reads text from:
  - [x] Photos of invoices
  - [x] Images of receipts
  - [x] Scanned PDFs (renders page to canvas, runs OCR)
  - Downloads ~30MB language model on first use, cached by browser
- [x] Side-by-side review screen (preview left, form right)
- [x] Editable review form — user must approve before transaction is created
- [x] Source document linked to transaction (stored in IndexedDB)
- [x] View/download source document from transaction row (📄 ⬇ buttons)
- [x] Classification rules (CIPC, SARS, domain, shipping, etc.)
- [x] Heuristic field extraction (regex — supplier, date, amount, VAT, invoice number)

### Other Features
- [x] Business Progress tracker with status updates
- [x] Action Centre with task management
- [x] Import Calculator (EXW/FOB/CIF incoterms)
- [x] Checkers Hyper scenario builder
- [x] Suppliers CRUD with duplicate name check
- [x] Products CRUD with validation
- [x] Settings: data backup to JSON
- [x] Settings: restore from JSON backup
- [x] Settings: storage usage (localStorage + IndexedDB)
- [x] Settings: real Supabase setup instructions
- [x] Settings: real AI OCR setup instructions
- [x] Layout Health audit tool
- [x] PWA installable (Add to Home Screen)
- [x] Global error boundary
- [x] Samsung Tab S8 Ultra responsive layout

---

## 🔑 Setup Required — Step-by-Step Instructions in Settings

### Supabase Cloud Storage & Database
- [ ] Requires: Free Supabase account at supabase.com
- [ ] Requires: `VITE_SUPABASE_URL` in Vercel environment variables
- [ ] Requires: `VITE_SUPABASE_ANON_KEY` in Vercel environment variables
- [ ] Requires: `npm install @supabase/supabase-js`
- [ ] Enables: Files uploaded to Supabase Storage (accessible from any device)
- [ ] Enables: Transactions and documents saved to PostgreSQL
- [ ] Enables: Cross-device data access via signed URLs
- **Setup instructions**: Settings page → Supabase section (exact steps shown)
- **Schema**: `supabase/schema.sql` included in project

### AI Document Extraction (Anthropic Claude)
- [ ] Requires: Paid Anthropic API account at console.anthropic.com
- [ ] Requires: `OCR_SECRET_KEY` in Vercel environment variables (server-only)
- [ ] Requires: `VITE_OCR_API_KEY = enabled` in Vercel environment variables
- [ ] The `/api/extract.js` serverless function is already written and included
- [ ] Enables: Structured extraction of all invoice fields with much higher accuracy
- [ ] Enables: Line item extraction
- [ ] Enables: Multi-currency detection
- **Note**: Tesseract.js OCR already works without this — AI is an enhancement
- **Setup instructions**: Settings page → AI OCR section (exact steps shown)

---

## ⚠ Not Technically Possible Without Paid/External Service

### Real-time multi-device sync
- **Why**: Requires a WebSocket server (Supabase Realtime, Firebase, or Ably)
- **What's needed**: Supabase setup (above) + Realtime subscription code
- **Status**: Architecture is ready (IndexedDB + Supabase schema). Needs Supabase + 1–2 days of dev work to add subscription listeners.

### Push notifications
- **Why**: Requires a push notification service (Firebase Cloud Messaging, OneSignal)
- **Status**: Not built. PWA Web Push API needs a service worker + push server.

### Login / authentication
- **Why**: Requires an auth provider (Supabase Auth, Auth0, etc.)
- **Status**: App is currently single-user/single-device. Supabase Auth can be added when multi-user is needed.

### Google Drive / OneDrive auto-backup
- **Why**: Requires OAuth 2.0 authentication and access to Google/Microsoft APIs
- **Status**: Manual backup/restore works now. Auto-backup requires OAuth flow.

---

## Technology Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React 18 + Vite 5 | ✅ Working |
| State | useState + useLocalStorage | ✅ Working |
| File Storage | IndexedDB (native browser API) | ✅ Working |
| PDF parsing | pdf.js 3.11 (CDN) | ✅ Working |
| Image OCR | Tesseract.js 4.1 (CDN) | ✅ Working |
| CSV parsing | Custom parser | ✅ Working |
| Cloud database | Supabase (PostgreSQL) | 🔑 Setup required |
| Cloud files | Supabase Storage | 🔑 Setup required |
| AI extraction | Anthropic Claude (Haiku) | 🔑 Setup required |
| Deployment | Vercel | ✅ Configured |
| PWA | vite-plugin-pwa | ✅ Working |
