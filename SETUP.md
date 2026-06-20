# Botanica Living Group — Command Centre Setup Guide
## Version 1.5 — Document Intelligence Edition

---

## What Works Right Now (No Setup Required)

✅ Manual transaction entry  
✅ Finance summaries (overview, monthly, categories)  
✅ Business Progress tracker  
✅ Action Centre  
✅ Import Calculator (EXW/FOB/CIF)  
✅ Checkers Hyper scenario builder  
✅ Products & Suppliers management  
✅ Settings + local backup/restore  
✅ PDF text extraction (text-based PDFs via pdf.js)  
✅ CSV import with multi-row review  
✅ Document metadata management  
✅ PWA installable (Add to Home Screen)

---

## What Requires Supabase Setup

☁ Permanent document file storage  
☁ Database-backed transaction history  
☁ Document records stored in cloud  
☁ Cross-device data sync  

---

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose a region close to South Africa (preferably Frankfurt or EU)
4. Note your **Project URL** and **anon/public key** — you'll need these

---

## Step 2: Run Database Schema

1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Copy and paste the entire contents of **`supabase/schema.sql`**
3. Click **Run**
4. Verify tables were created: Database → Tables should show `documents`, `transactions`, `document_extractions`

---

## Step 3: Create Storage Bucket

1. In Supabase Dashboard → **Storage** → **New Bucket**
2. Name: `botanica-documents`
3. Toggle **Public bucket** ON (simplest for single-owner use)
   - If you need private: toggle OFF and use the signed URL policy in the SQL schema comments
4. Click **Create bucket**

---

## Step 4: Configure Environment Variables

### Local Development

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these from: Supabase Dashboard → Project Settings → API

### Vercel Deployment

1. Go to [vercel.com](https://vercel.com) → your project
2. **Settings** → **Environment Variables**
3. Add:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Production + Preview + Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Production + Preview + Development |
| `VITE_OCR_API_KEY` | `enabled` | Production + Preview + Development |

4. Redeploy after adding variables

---

## Step 5: Enable AI Document Extraction (Optional)

The app has a complete AI extraction pipeline using Anthropic Claude. To enable it:

### 5a. Get an Anthropic API Key
1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Create an account and add billing
3. Go to API Keys → Create Key
4. Copy the key (starts with `sk-ant-`)

### 5b. Add to Vercel (SERVER-ONLY — NEVER in .env or browser)

In Vercel → Settings → Environment Variables, add:

| Key | Value | Environment |
|-----|-------|-------------|
| `OCR_SECRET_KEY` | `sk-ant-api03-...` | **Production only** |

**Important:** Do NOT prefix with `VITE_`. This key must NEVER be exposed to the browser.

Also add the feature flag (safe to expose — tells frontend OCR is available):
| `VITE_OCR_API_KEY` | `enabled` | Production + Preview + Development |

### 5c. How it works

```
User uploads invoice
       ↓
Frontend → extracts PDF text (pdf.js, free, no key)
       ↓
Frontend → POST /api/extract (Vercel serverless function)
                ↓
         Server reads OCR_SECRET_KEY (never sent to browser)
                ↓
         Calls Anthropic Claude API
                ↓
         Returns structured JSON
       ↓
Frontend shows review screen with pre-filled fields
       ↓
User edits and approves
       ↓
Transaction saved
```

---

## Step 6: Install npm Dependencies

```bash
npm install
npm install @supabase/supabase-js
npm run dev
```

For Vercel, add to `package.json` dependencies:
```json
"@supabase/supabase-js": "^2.45.0"
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER (Frontend)                       │
│                                                              │
│  FinanceCentre.jsx          BusinessDocuments.jsx            │
│  ├── Manual entry           ├── Upload UI                    │
│  │   └── localStorage       │   └── Drag & drop             │
│  └── Import workflow        └── Preview / Download           │
│      ├── pdf.js (CDN)                                        │
│      │   text extraction                                     │
│      ├── CSV parser                                          │
│      └── /api/extract ──────────────────────────────┐        │
│                                                      │        │
│  src/lib/supabase.js                                │        │
│  └── Supabase client                                │        │
│      ├── Storage upload                              │        │
│      ├── Document CRUD                              │        │
│      └── Transaction CRUD                           │        │
└───────────────────────┬─────────────────────────────┘        │
                        │                             │        │
                        ▼                             ▼        │
┌───────────────┐  ┌─────────────────────────────────────┐   │
│   Supabase    │  │        Vercel Edge Function          │   │
│               │  │        /api/extract.js               │◄──┘
│  Storage      │  │                                      │
│  (files)      │  │  Reads: OCR_SECRET_KEY (server only) │
│               │  │  Calls: Anthropic Claude API         │
│  PostgreSQL   │  │  Returns: structured JSON            │
│  (metadata)   │  │                                      │
└───────────────┘  └─────────────────────────────────────┘
```

---

## localStorage Keys (local mode / fallback)

| Key | Contents |
|-----|---------|
| `bl_suppliers` | Supplier array |
| `bl_products` | Product array |
| `bl_progress` | Business progress sections |
| `bl_finance` | Finance transactions |
| `bl_tasks` | Action centre tasks |
| `bl_documents` | Document metadata + local file data |
| `bl_device_id` | Unique device identifier for backups |

---

## Fallback Behaviour

If Supabase is not configured:
- App loads normally — no errors
- Manual transactions saved to localStorage
- Documents saved to localStorage (with file content as base64)
- Warning banner shown: "Cloud storage is not connected"
- All other app features work normally

If OCR is not configured:
- Document upload still works
- PDF text extraction via pdf.js still works for text-based PDFs
- Review screen shown with pre-filled fields from heuristic parsing
- Clear message shown: "AI extraction not connected — please review manually"
- User manually reviews and approves before transaction is created
