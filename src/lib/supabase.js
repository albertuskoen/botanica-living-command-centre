// src/lib/supabase.js
// ──────────────────────────────────────────────────────────────────────────────
// Supabase integration for Botanica Living Group Command Centre
//
// SETUP:
//   1. Copy .env.example → .env  (local dev)
//   2. Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
//   3. Add same keys to Vercel → Project Settings → Environment Variables
//
// WHAT WORKS WITHOUT KEYS:
//   - Manual transaction entry (localStorage)
//   - All other app features
//
// WHAT REQUIRES KEYS:
//   - Document upload to Supabase Storage
//   - Document records saved to database
//   - Transaction records saved to database
//   - Document download via signed URL

// ── Connection status ──────────────────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || ''
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON)
export const OCR_CONFIGURED      = Boolean(import.meta.env.VITE_OCR_API_KEY)

// ── Lazy Supabase client ───────────────────────────────────────────────────────
// We import @supabase/supabase-js only when keys are present so the app
// loads correctly even without the package installed (fallback mode).
let _client = null

async function getClient() {
  if (!SUPABASE_CONFIGURED) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
  if (_client) return _client
  try {
    const { createClient } = await import('@supabase/supabase-js')
    _client = createClient(SUPABASE_URL, SUPABASE_ANON)
    return _client
  } catch {
    throw new Error('Could not load Supabase client. Run: npm install @supabase/supabase-js')
  }
}

// ── Storage bucket ─────────────────────────────────────────────────────────────
const BUCKET = 'botanica-documents'

// ── DOCUMENT STORAGE ──────────────────────────────────────────────────────────

/**
 * Upload a file to Supabase Storage and save metadata to the documents table.
 * Returns the document record.
 *
 * @param {File} file
 * @param {{ category: string, notes: string, supplierName: string }} meta
 */
export async function uploadDocument(file, meta = {}) {
  const client = await getClient()
  const ext    = file.name.split('.').pop().toLowerCase()
  const path   = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  // 1. Upload file to storage
  const { error: uploadErr } = await client.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

  // 2. Get public/signed URL
  // Use getPublicUrl (works for public buckets) — for private buckets use createSignedUrl
  const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = urlData?.publicUrl || null

  // 3. Save document metadata to database
  const { data: doc, error: dbErr } = await client
    .from('documents')
    .insert({
      file_name:          file.name,
      file_type:          ext,
      file_size:          file.size,
      file_size_display:  formatBytes(file.size),
      category:           meta.category || 'General',
      storage_path:       path,
      public_url:         publicUrl,
      notes:              meta.notes || null,
      supplier_name:      meta.supplierName || null,
    })
    .select()
    .single()

  if (dbErr) throw new Error(`Database insert failed: ${dbErr.message}`)
  return doc
}

/**
 * Generate a short-lived signed URL for viewing/downloading a private document.
 * Falls back to public_url if already set.
 */
export async function getDocumentUrl(doc, expiresInSeconds = 3600) {
  if (doc.public_url) return doc.public_url
  const client = await getClient()
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, expiresInSeconds)
  if (error) throw new Error(`Could not generate download URL: ${error.message}`)
  return data.signedUrl
}

/**
 * Delete a document from storage and the database.
 */
export async function deleteDocument(doc) {
  const client = await getClient()
  const { error: storageErr } = await client.storage
    .from(BUCKET)
    .remove([doc.storage_path])
  if (storageErr) console.warn('Storage delete failed:', storageErr.message)

  const { error: dbErr } = await client.from('documents').delete().eq('id', doc.id)
  if (dbErr) throw new Error(`Database delete failed: ${dbErr.message}`)
}

// ── DOCUMENT QUERIES ──────────────────────────────────────────────────────────

export async function listDocuments({ category, search } = {}) {
  const client = await getClient()
  let q = client.from('documents').select('*').order('created_at', { ascending: false })
  if (category && category !== 'All') q = q.eq('category', category)
  if (search) q = q.or(`file_name.ilike.%${search}%,notes.ilike.%${search}%,supplier_name.ilike.%${search}%`)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data || []
}

export async function updateDocumentLink(documentId, transactionId) {
  const client = await getClient()
  const { error } = await client.from('documents').update({ linked_transaction_id: transactionId }).eq('id', documentId)
  if (error) throw new Error(error.message)
}

// ── TRANSACTION QUERIES ────────────────────────────────────────────────────────

export async function listTransactions({ type } = {}) {
  const client = await getClient()
  let q = client.from('transactions').select('*, documents(file_name, storage_path, public_url)').order('date', { ascending: false })
  if (type && type !== 'All') q = q.eq('type', type)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data || []
}

export async function insertTransaction(txn) {
  const client = await getClient()
  const { data, error } = await client.from('transactions').insert({
    date:               txn.date,
    type:               txn.type,
    amount:             parseFloat(txn.amount) || 0,
    category:           txn.category,
    description:        txn.description,
    supplier_payee:     txn.supplierPayee || null,
    payment_method:     txn.paymentMethod || 'EFT',
    notes:              txn.notes || null,
    invoice_number:     txn.invoiceNumber || null,
    vat_amount:         parseFloat(txn.vatAmount) || 0,
    source_document_id: txn.sourceDocumentId || null,
    source:             txn.source || 'manual',
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteTransaction(id) {
  const client = await getClient()
  const { error } = await client.from('transactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── EXTRACTION RECORDS ─────────────────────────────────────────────────────────

export async function saveExtraction(documentId, extractionData) {
  const client = await getClient()
  const { data, error } = await client.from('document_extractions').insert({
    document_id:            documentId,
    raw_text:               extractionData.rawText || null,
    extracted_supplier:     extractionData.supplierName || null,
    extracted_invoice_num:  extractionData.invoiceNumber || null,
    extracted_date:         extractionData.invoiceDate || null,
    extracted_total:        extractionData.totalAmount || null,
    extracted_vat:          extractionData.vatAmount || null,
    extracted_line_items:   extractionData.lineItems ? JSON.stringify(extractionData.lineItems) : null,
    suggested_type:         extractionData.suggestedType || null,
    suggested_category:     extractionData.suggestedCategory || null,
    suggested_description:  extractionData.description || null,
    confidence:             extractionData.confidence || 'Needs Review',
    status:                 'pending',
    error_message:          extractionData.error || null,
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateExtractionStatus(id, status) {
  const client = await getClient()
  const { error } = await client.from('document_extractions').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

// ── UTILITIES ──────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B','KB','MB','GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
