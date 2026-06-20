# Botanica Living Group — Supabase + Vercel Deployment Guide
## Exact steps for connecting your live Supabase project

---

## PART 1 — VERCEL ENVIRONMENT VARIABLES

Add these in **Vercel → your project → Settings → Environment Variables**.

Set scope to **Production + Preview + Development** for all VITE_ variables.

### Required variables

| Variable Name | Where to find the value | Example value |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project "Botanica Living" → Settings (gear) → API → **Project URL** | `https://abcdefghijkl.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Same page → **Project API keys** → **anon public** (the long JWT) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional — AI document extraction

| Variable Name | Where to find | Scope |
|---|---|---|
| `VITE_OCR_API_KEY` | Set value to literally `enabled` — this is just a feature flag | Production + Preview |
| `OCR_SECRET_KEY` | console.anthropic.com → API Keys → Create Key | **Production only** — NEVER VITE_ prefix |

---

## PART 2 — SQL TO RUN IN SUPABASE

Go to: **Supabase Dashboard → SQL Editor → New query**

Paste the entire contents of `supabase/schema.sql` and click **Run**.

The schema creates:
- `documents` table
- `transactions` table
- `document_extractions` table
- Indexes for performance
- RLS policies (anon key has full access — single-owner app)
- Storage policies for `"Botanica living - Documents"` bucket
- Updated_at triggers

**The schema is safe to re-run** — all statements use `IF NOT EXISTS` or `DROP ... IF EXISTS` guards.

After running, verify in the output:
```
table_name
------------------
document_extractions
documents
transactions
```

---

## PART 3 — STORAGE BUCKET CONFIGURATION

Your bucket is already created: **"Botanica living - Documents"**

Verify these settings in Supabase → Storage → "Botanica living - Documents":

| Setting | Required value |
|---|---|
| Bucket name | `Botanica living - Documents` (exact — spaces and capitalisation matter) |
| Public bucket | ✅ **ON** (simplest for single-owner — files get a permanent public URL) |
| File size limit | 50 MB (or as needed) |
| Allowed MIME types | Leave blank (allow all) OR: `application/pdf, image/*, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

If bucket is set to **Private** (not public), the app will request signed URLs (1-hour expiry) automatically. Both modes work — public is simpler.

### Storage policies

The schema.sql already includes these, but if you need to add them manually:

In Supabase → Storage → Policies:

**Policy 1 — Allow uploads:**
```sql
CREATE POLICY "anon_upload_docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'Botanica living - Documents');
```

**Policy 2 — Allow downloads:**
```sql
CREATE POLICY "anon_read_docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'Botanica living - Documents');
```

**Policy 3 — Allow deletes:**
```sql
CREATE POLICY "anon_delete_docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'Botanica living - Documents');
```

---

## PART 4 — DEPLOY TO VERCEL

```bash
# 1. Push to GitHub
git add .
git commit -m "v1.7 — Supabase integration"
git push

# 2. Vercel will auto-deploy. Or manually:
vercel --prod
```

After deploy, open the app → Business Documents → upload a test file.
Check Supabase → Storage → "Botanica living - Documents" → confirm file appears.
Check Supabase → Table Editor → documents → confirm row was inserted.

---

## PART 5 — HOW THE INTEGRATION WORKS

### Upload flow
```
User picks file
  → Store in IndexedDB (instant, local cache)
  → Upload binary to Supabase Storage bucket
  → Get public URL (or generate signed URL)
  → INSERT row in documents table
  → Return { id, storage_path, public_url }
  → Save record to localStorage (app state)
```

### Preview / download flow
```
User clicks Preview
  → Try IndexedDB first (instant, works offline)
  → If not in IndexedDB:
      → If public bucket: use public_url directly
      → If private bucket: call createSignedUrl (1 hour)
  → Display in modal (PDF iframe, image, CSV table)
```

### Delete flow
```
User clicks Remove
  → Remove from IndexedDB
  → Remove file from Supabase Storage
  → DELETE row from documents table
  → Remove from localStorage (app state)
```

### Offline behaviour
```
No internet connection:
  → File stored in IndexedDB only
  → Upload op queued in IndexedDB sync queue
  → "local" placeholder returned to app

When connectivity returns:
  → window.addEventListener('online') fires
  → flushSyncQueue() runs automatically
  → All queued ops sent to Supabase
```

---

## PART 6 — WHAT TO CHECK IF UPLOADS FAIL

| Symptom | Cause | Fix |
|---|---|---|
| "SUPABASE_NOT_CONFIGURED" | Env vars not set or not redeployed | Add vars in Vercel → Redeploy |
| "Storage upload: new row violates..." | RLS policy missing on storage.objects | Run storage policy SQL above |
| "Storage upload: The resource already exists" | Duplicate file path (shouldn't happen) | Already handled with random path |
| "DB insert: relation does not exist" | Schema not run | Run supabase/schema.sql in SQL Editor |
| "anon key" rejected | Wrong key used (used service_role instead of anon) | Use the **anon public** key only |
| File uploads but no DB row | DB insert error (check browser console) | Check Supabase logs → API |
| Preview works locally but not after refresh | Public bucket toggled off | Turn public ON in bucket settings |

---

## PART 7 — SUPABASE DASHBOARD QUICK LINKS

From supabase.com → project "Botanica Living":

| What | Path |
|---|---|
| API keys | Project Settings → API |
| SQL Editor | Left sidebar → SQL Editor |
| Tables | Left sidebar → Table Editor |
| Storage bucket | Left sidebar → Storage → "Botanica living - Documents" |
| Storage policies | Storage → Policies |
| Logs | Left sidebar → Logs → API |
| Table data | Table Editor → select table → browse |
