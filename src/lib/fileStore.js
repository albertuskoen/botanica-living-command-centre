// src/lib/fileStore.js
// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB-backed file storage for Botanica Living Group Command Centre.
//
// STATUS: ✅ Working now — no setup required.
//
// Why IndexedDB instead of localStorage?
//   • localStorage: 5–10 MB limit, synchronous, blocks UI
//   • IndexedDB: 50–500+ MB, async, non-blocking, survives page reloads
//   • Stores actual File/Blob objects — no base64 conversion overhead
//
// API:
//   await storeFile(docId, file)        → stores File blob, returns { id, name, type, size }
//   await retrieveFile(docId)           → returns File | null
//   await deleteFile(docId)             → removes file
//   await createObjectURL(docId)        → creates blob URL for preview/download (revoke when done)
//   await getStorageUsage()             → { usedMB, quota }
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME    = 'botanica-files'
const DB_VERSION = 1
const STORE_NAME = 'files'

// ── Open (or create) the database ─────────────────────────────────────────────
let _db = null

function openDB() {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db    = e.target.result
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'docId' })
      store.createIndex('name', 'name', { unique: false })
    }
    req.onsuccess  = e => { _db = e.target.result; resolve(_db) }
    req.onerror    = e => reject(new Error(`IndexedDB open failed: ${e.target.error?.message}`))
    req.onblocked  = ()  => reject(new Error('IndexedDB blocked — close other tabs with this app open'))
  })
}

function tx(mode) {
  return openDB().then(db => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME))
}

function idbRequest(req) {
  return new Promise((res, rej) => {
    req.onsuccess = e => res(e.target.result)
    req.onerror   = e => rej(new Error(e.target.error?.message || 'IndexedDB error'))
  })
}

// ── Store a File ───────────────────────────────────────────────────────────────
/**
 * Store a File object in IndexedDB under the given docId.
 * If a file already exists for that docId, it is replaced.
 *
 * @param {string|number} docId  — unique document record ID
 * @param {File} file            — the File from an <input> or drag event
 * @returns {{ docId, name, type, size, storedAt }}
 */
export async function storeFile(docId, file) {
  const store = await tx('readwrite')
  const record = {
    docId:    String(docId),
    name:     file.name,
    type:     file.type || detectMime(file.name),
    size:     file.size,
    blob:     file,                // store the raw Blob — IndexedDB handles binary natively
    storedAt: new Date().toISOString(),
  }
  await idbRequest(store.put(record))
  return { docId: record.docId, name: record.name, type: record.type, size: record.size, storedAt: record.storedAt }
}

// ── Retrieve a File ────────────────────────────────────────────────────────────
/**
 * Get a stored file by docId.
 * Returns a File object (reconstructed from the stored Blob), or null if not found.
 */
export async function retrieveFile(docId) {
  const store  = await tx('readonly')
  const record = await idbRequest(store.get(String(docId)))
  if (!record) return null
  // Re-wrap the blob as a File so callers get a proper File object
  return new File([record.blob], record.name, { type: record.type, lastModified: new Date(record.storedAt).getTime() })
}

// ── Get file metadata without the blob ────────────────────────────────────────
export async function getFileMeta(docId) {
  const store  = await tx('readonly')
  const record = await idbRequest(store.get(String(docId)))
  if (!record) return null
  return { docId: record.docId, name: record.name, type: record.type, size: record.size, storedAt: record.storedAt }
}

// ── Check if a file exists ─────────────────────────────────────────────────────
export async function hasFile(docId) {
  const meta = await getFileMeta(String(docId))
  return meta !== null
}

// ── Delete a file ──────────────────────────────────────────────────────────────
export async function deleteFile(docId) {
  const store = await tx('readwrite')
  await idbRequest(store.delete(String(docId)))
}

// ── Create a blob URL for preview/download ────────────────────────────────────
/**
 * Returns a blob URL you can use in <iframe src="…">, <img src="…">, or <a href="…">.
 * IMPORTANT: Call URL.revokeObjectURL(url) when done to free memory.
 */
export async function createObjectURL(docId) {
  const file = await retrieveFile(docId)
  if (!file) return null
  return URL.createObjectURL(file)
}

// ── Trigger download ───────────────────────────────────────────────────────────
export async function downloadFileById(docId, filename) {
  const url = await createObjectURL(docId)
  if (!url) return false
  const a      = document.createElement('a')
  a.href       = url
  a.download   = filename || docId
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}

// ── Storage usage estimate ─────────────────────────────────────────────────────
export async function getStorageUsage() {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { usage, quota } = await navigator.storage.estimate()
      return {
        usedMB:   +(usage  / 1024 / 1024).toFixed(1),
        quotaMB:  +(quota  / 1024 / 1024).toFixed(0),
        usedPct:  quota > 0 ? +((usage / quota) * 100).toFixed(1) : 0,
      }
    }
  } catch {}
  return { usedMB: 0, quotaMB: 0, usedPct: 0 }
}

// ── List all stored file keys ──────────────────────────────────────────────────
export async function listAllFileIds() {
  const store  = await tx('readonly')
  const keys   = await idbRequest(store.getAllKeys())
  return keys || []
}

// ── Delete all files (for data clear) ─────────────────────────────────────────
export async function clearAllFiles() {
  const store = await tx('readwrite')
  await idbRequest(store.clear())
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectMime(name = '') {
  const ext = name.split('.').pop().toLowerCase()
  const map = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp',
    svg: 'image/svg+xml',
    csv: 'text/csv', tsv: 'text/tab-separated-values',
    txt: 'text/plain',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls:  'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return map[ext] || 'application/octet-stream'
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${+(bytes / k ** i).toFixed(1)} ${['B','KB','MB','GB'][i] || 'GB'}`
}
