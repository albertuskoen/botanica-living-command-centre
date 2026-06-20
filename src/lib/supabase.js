// src/lib/supabase.js — v1.7
// Real Supabase integration. Bucket: "Botanica living - Documents"
// Tables: documents, transactions, document_extractions
//
// REQUIRED VERCEL ENVIRONMENT VARIABLES:
//   VITE_SUPABASE_URL      → Project Settings → API → Project URL
//   VITE_SUPABASE_ANON_KEY → Project Settings → API → anon/public key
//
// Offline: operations queue to IndexedDB and sync when online again.

import { storeFile as idbStore, deleteFile as idbDelete } from './fileStore.js'

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || ''
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// EXACT bucket name — must match what is in Supabase Storage
export const BUCKET = 'Botanica living - Documents'

export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON)
export const OCR_CONFIGURED      = Boolean(import.meta.env.VITE_OCR_API_KEY)

// ── Client ────────────────────────────────────────────────────────────────────
let _client = null

export async function getClient() {
  if (!SUPABASE_CONFIGURED) throw new Error('SUPABASE_NOT_CONFIGURED')
  if (_client) return _client
  try {
    const { createClient } = await import('@supabase/supabase-js')
    _client = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } })
    return _client
  } catch {
    throw new Error('Could not load @supabase/supabase-js. Run: npm install @supabase/supabase-js')
  }
}

export const isOnline = () => (typeof navigator !== 'undefined' ? navigator.onLine : true)

// ── Offline sync queue (IndexedDB-backed) ─────────────────────────────────────
const Q_DB = 'botanica-sync-queue', Q_VER = 1, Q_ST = 'queue'
let _qDb = null

function openQueueDb() {
  if (_qDb) return Promise.resolve(_qDb)
  return new Promise((res, rej) => {
    const r = indexedDB.open(Q_DB, Q_VER)
    r.onupgradeneeded = e => e.target.result.createObjectStore(Q_ST, { keyPath: 'id', autoIncrement: true })
    r.onsuccess = e => { _qDb = e.target.result; res(_qDb) }
    r.onerror   = e => rej(e.target.error)
  })
}

async function enqueue(op) {
  const db = await openQueueDb()
  const st = db.transaction(Q_ST, 'readwrite').objectStore(Q_ST)
  return new Promise((res, rej) => { const r = st.add({ ...op, queuedAt: new Date().toISOString() }); r.onsuccess = res; r.onerror = e => rej(e.target.error) })
}

async function dequeue(id) {
  const db = await openQueueDb()
  const st = db.transaction(Q_ST, 'readwrite').objectStore(Q_ST)
  return new Promise((res, rej) => { const r = st.delete(id); r.onsuccess = res; r.onerror = e => rej(e.target.error) })
}

async function getAllQueued() {
  const db = await openQueueDb()
  const st = db.transaction(Q_ST, 'readonly').objectStore(Q_ST)
  return new Promise((res, rej) => { const r = st.getAll(); r.onsuccess = e => res(e.target.result||[]); r.onerror = e => rej(e.target.error) })
}

// ── Flush sync queue when online ──────────────────────────────────────────────
export async function flushSyncQueue() {
  if (!SUPABASE_CONFIGURED || !isOnline()) return { flushed: 0, failed: 0 }
  const queued = await getAllQueued()
  if (!queued.length) return { flushed: 0, failed: 0 }

  const client = await getClient()
  let flushed = 0, failed = 0

  for (const op of queued) {
    try {
      if (op.type === 'insert_document')     await client.from('documents').insert(op.data)
      else if (op.type === 'insert_txn')     await client.from('transactions').insert(op.data)
      else if (op.type === 'delete_doc')     { await client.storage.from(BUCKET).remove([op.path]); await client.from('documents').delete().eq('id', op.id) }
      else if (op.type === 'delete_txn')     await client.from('transactions').delete().eq('id', op.id)
      else if (op.type === 'link_doc')       await client.from('documents').update({ linked_transaction_id: op.transactionId }).eq('id', op.documentId)
      await dequeue(op.id)
      flushed++
    } catch (err) {
      console.warn('[Supabase queue]', op.type, err.message)
      failed++
    }
  }
  console.log(`[Supabase sync] flushed ${flushed}, failed ${failed}`)
  return { flushed, failed }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setTimeout(() => flushSyncQueue().catch(console.warn), 1500))
}

// ── DOCUMENT UPLOAD ────────────────────────────────────────────────────────────
// Uploads file to Supabase Storage, saves metadata to documents table,
// caches file in IndexedDB for offline preview.
// Returns document record ({ id, storage_path, public_url, ... })
export async function uploadDocument(file, meta = {}) {
  const ext  = file.name.split('.').pop().toLowerCase()
  const path = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`

  // Always cache in IndexedDB first (instant offline access)
  const localKey = meta.localDocId || `upload-${Date.now()}`
  try { await idbStore(localKey, file) } catch (e) { console.warn('[IDB] cache failed:', e.message) }

  // If offline or not configured → queue + return local record
  if (!SUPABASE_CONFIGURED || !isOnline()) {
    const local = {
      id: localKey, file_name: file.name, file_type: ext,
      file_size_bytes: file.size, file_size_display: fmtBytes(file.size),
      category: meta.category || 'General', storage_path: path, public_url: null,
      notes: meta.notes || null, supplier_name: meta.supplierName || null,
      date_uploaded: meta.dateUploaded || today(), _local: true, _idb_key: localKey,
    }
    await enqueue({ type: 'insert_document', data: omit(local, ['_local','_idb_key']) })
    return local
  }

  const client = await getClient()

  // 1. Upload to Storage
  const { error: upErr } = await client.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false, cacheControl: '3600' })
  if (upErr) throw new Error(`Storage upload: ${upErr.message}`)

  // 2. Save to database. public_url intentionally NOT stored.
  // All access via createSignedUrl only — bucket must be private.
  const { data: doc, error: dbErr } = await client.from('documents').insert({
    file_name:         file.name,
    file_type:         ext,
    file_size_bytes:   file.size,
    file_size_display: fmtBytes(file.size),
    category:          meta.category     || 'General',
    storage_path:      path,
    public_url:        null,   // Always null — signed URLs used for all access
    notes:             meta.notes        || null,
    supplier_name:     meta.supplierName || null,
    date_uploaded:     meta.dateUploaded || today(),
  }).select().single()
  if (dbErr) throw new Error(`DB insert: ${dbErr.message}`)

  // 4. Re-cache under the real Supabase ID so preview/download works by ID
  try { await idbStore(doc.id, file) } catch { /* non-fatal */ }

  return doc
}

// ── DOCUMENT URL (preview / download) ────────────────────────────────────────
// Returns { url: string, source: 'indexeddb'|'public'|'signed', revoke: bool }
export async function getDocumentUrl(doc, expiresIn = 3600) {
  // ── PRIORITY 1: Fresh Supabase signed URL ────────────────────────────────────
  // Always preferred over stored public_url because:
  //   - Signed URLs are generated fresh each time (no stale/encoded URL issues)
  //   - Works for both public AND private buckets
  //   - Avoids "Bucket not found" errors caused by URL-encoded bucket names in stored public_url
  //   - Works on every device, not just the one that uploaded
  if (SUPABASE_CONFIGURED && doc.storage_path) {
    try {
      const client = await getClient()
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, expiresIn)
      if (!error && data?.signedUrl) {
        return { url: data.signedUrl, source: 'signed', revoke: false }
      }
      // If signed URL fails, log and fall through
      if (error) console.warn('[Supabase] createSignedUrl failed:', error.message, '— falling back to IndexedDB')
    } catch (e) {
      console.warn('[Supabase] createSignedUrl threw:', e.message, '— falling back to IndexedDB')
    }
  }

  // ── PRIORITY 2: IndexedDB cache (same-device offline fallback) ──────────────
  // public_url is intentionally NOT used — bucket is private, all access via signed URL.

  // ── PRIORITY 3: IndexedDB cache (offline / same-device fallback) ─────────────
  const idbKey = doc.id || doc._idb_key
  if (idbKey) {
    try {
      const { createObjectURL } = await import('./fileStore.js')
      const url = await createObjectURL(idbKey)
      if (url) return { url, source: 'indexeddb', revoke: true }
    } catch { /* fall through */ }
  }

  if (!SUPABASE_CONFIGURED) {
    throw new Error('Supabase not configured — document only available on the device it was uploaded from.')
  }
  throw new Error('Document not available — signed URL failed and no local copy found.')
}

// ── DOCUMENT DELETE ───────────────────────────────────────────────────────────
export async function deleteDocumentCloud(doc) {
  // Remove local cache
  const key = doc.id || doc._idb_key
  try { if (key) await idbDelete(key) } catch { /* non-fatal */ }

  if (!SUPABASE_CONFIGURED || !isOnline()) {
    if (doc.id && !doc._local) await enqueue({ type: 'delete_doc', id: doc.id, path: doc.storage_path })
    return
  }

  const client = await getClient()
  if (doc.storage_path) {
    const { error: se } = await client.storage.from(BUCKET).remove([doc.storage_path])
    if (se) console.warn('[Supabase] Storage delete:', se.message)
  }
  const { error: de } = await client.from('documents').delete().eq('id', doc.id)
  if (de) throw new Error(`DB delete: ${de.message}`)
}

// ── LINK DOCUMENT → TRANSACTION ───────────────────────────────────────────────
export async function linkDocumentToTransaction(documentId, transactionId) {
  if (!documentId || !transactionId) return
  if (!SUPABASE_CONFIGURED || !isOnline()) {
    await enqueue({ type: 'link_doc', documentId, transactionId })
    return
  }
  const client = await getClient()
  const { error } = await client.from('documents')
    .update({ linked_transaction_id: transactionId })
    .eq('id', documentId)
  if (error) throw new Error(error.message)
}

// ── TRANSACTION INSERT ────────────────────────────────────────────────────────
export async function insertTransactionCloud(txn) {
  const row = {
    date:              txn.date,
    type:              txn.type,
    amount:            parseFloat(txn.amount) || 0,
    category:          txn.category,
    description:       txn.description,
    supplier_payee:    txn.supplierPayee    || null,
    payment_method:    txn.paymentMethod    || 'EFT',
    notes:             txn.notes            || null,
    invoice_number:    txn.invoiceNumber    || null,
    vat_amount:        parseFloat(txn.vatAmount) || 0,
    source:            txn.source           || 'manual',
    source_document_id:txn.sourceDocumentId || null,
    source_file:       txn.sourceFile       || null,
  }

  if (!SUPABASE_CONFIGURED || !isOnline()) {
    await enqueue({ type: 'insert_txn', data: row })
    return null
  }

  const client = await getClient()
  const { data, error } = await client.from('transactions').insert(row).select().single()
  if (error) throw new Error(error.message)
  return data
}

// ── TRANSACTION DELETE ────────────────────────────────────────────────────────
export async function deleteTransactionCloud(id) {
  if (!SUPABASE_CONFIGURED || !isOnline()) {
    await enqueue({ type: 'delete_txn', id })
    return
  }
  const client = await getClient()
  const { error } = await client.from('transactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return '0 B'
  const k = 1024, i = Math.floor(Math.log(b) / Math.log(k))
  return `${+(b / k ** i).toFixed(1)} ${['B','KB','MB','GB'][i] || 'GB'}`
}

function today() { return new Date().toISOString().split('T')[0] }

function omit(obj, keys) {
  const out = { ...obj }
  keys.forEach(k => delete out[k])
  return out
}

// ── LOAD DOCUMENTS FROM SUPABASE ──────────────────────────────────────────────
// Called on app mount to sync Supabase records into local state.
export async function loadDocumentsFromCloud() {
  if (!SUPABASE_CONFIGURED || !isOnline()) return null
  const client = await getClient()
  const { data, error } = await client
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

// ── LOAD TRANSACTIONS FROM SUPABASE ───────────────────────────────────────────
// Called on app mount so data survives page refresh from any device.
export async function loadTransactionsFromCloud() {
  if (!SUPABASE_CONFIGURED || !isOnline()) return null
  const client = await getClient()
  const { data, error } = await client
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

// ── SAVE OCR EXTRACTION TO document_extractions TABLE ─────────────────────────
// Called after OCR runs, before the review screen opens.
export async function saveExtractionToCloud(documentId, extracted, ocrMethod) {
  if (!SUPABASE_CONFIGURED || !documentId) return null
  if (!isOnline()) return null  // not queued — extraction is ephemeral

  const client = await getClient()
  const { data, error } = await client.from('document_extractions').insert({
    document_id:           documentId,
    raw_text:              extracted?.rawText             || null,
    extracted_supplier:    extracted?.supplierName        || null,
    extracted_invoice_num: extracted?.invoiceNumber       || null,
    extracted_date:        extracted?.invoiceDate         || null,
    extracted_total:       extracted?.totalAmount         || null,
    extracted_vat:         extracted?.vatAmount           || null,
    extracted_currency:    'ZAR',
    suggested_type:        extracted?.suggestedType       || null,
    suggested_category:    extracted?.suggestedCategory   || null,
    suggested_description: extracted?.description         || null,
    confidence:            extracted?.confidence          || 'Needs Review',
    ocr_method:            ocrMethod                      || null,
    status:                'pending',
  }).select().single()
  if (error) console.warn('[Supabase] extraction insert:', error.message)
  return data || null
}

// ── UPDATE EXTRACTION STATUS ───────────────────────────────────────────────────
export async function updateExtractionStatus(extractionId, status) {
  if (!SUPABASE_CONFIGURED || !extractionId || !isOnline()) return
  const client = await getClient()
  const { error } = await client
    .from('document_extractions')
    .update({ status })
    .eq('id', extractionId)
  if (error) console.warn('[Supabase] extraction update:', error.message)
}
