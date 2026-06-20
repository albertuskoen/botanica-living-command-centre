// src/lib/ocr.js
// ──────────────────────────────────────────────────────────────────────────────
// Document intelligence / OCR abstraction
//
// ARCHITECTURE:
//
//   LAYER 1 — Always available (no API key needed):
//     • PDF text extraction via pdf.js (CDN)
//       Works on text-based PDFs (digital invoices, quotes)
//       Does NOT work on scanned/image PDFs
//     • CSV parsing
//
//   LAYER 2 — Requires backend/serverless (NEVER expose secret key in frontend):
//     • Image OCR (photos of invoices, receipts)
//     • Scanned PDF OCR
//     • AI data extraction (GPT-4 Vision, Claude, etc.)
//
//   The Vercel function in /api/extract.js handles Layer 2.
//   Frontend calls /api/extract and passes the file.
//   Secret API keys live only in Vercel environment variables.
//
// HOW TO ENABLE FULL OCR:
//   1. Add VITE_OCR_API_KEY to Vercel environment variables (marks feature as enabled)
//   2. Add OCR_SECRET_KEY to Vercel environment variables (used by /api/extract.js ONLY)
//   3. Deploy. The /api/extract serverless function handles the actual OCR.
//   4. Frontend checks VITE_OCR_API_KEY to decide whether to show "Auto Extract" button.

import { today } from '../utils/format.js'

// ── Config ────────────────────────────────────────────────────────────────────
export const OCR_AVAILABLE = Boolean(import.meta.env.VITE_OCR_API_KEY)

// ── PDF text extraction (Layer 1 — always works, no API key) ──────────────────

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve(window.pdfjsLib)
    }
    s.onerror = () => reject(new Error('Could not load pdf.js from CDN. Check your internet connection.'))
    document.head.appendChild(s)
  })
}

/**
 * Extract text from a text-based PDF using pdf.js.
 * Returns { text, pageCount, isTextBased }
 * If the PDF has no embedded text (scanned), text will be empty or very short.
 */
export async function extractPdfText(file) {
  try {
    const pdfjsLib   = await loadPdfJs()
    const buffer     = await file.arrayBuffer()
    const pdf        = await pdfjsLib.getDocument({ data: buffer }).promise
    let fullText     = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i)
      const content = await page.getTextContent()
      fullText += content.items.map(item => item.str).join(' ') + '\n'
    }
    const text        = fullText.trim()
    const isTextBased = text.length > 50
    return { text, pageCount: pdf.numPages, isTextBased }
  } catch (err) {
    throw new Error(`PDF reading failed: ${err.message}`)
  }
}

/**
 * Parse a CSV/TSV file into rows.
 */
export async function extractCsvRows(file) {
  const text  = await file.text()
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const delim   = (lines[0].match(/\t/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? '\t' : ','
  const headers = lines[0].split(delim).map(h => h.replace(/"/g, '').trim())
  const rows    = lines.slice(1).map(line =>
    line.split(delim).map(c => c.replace(/"/g, '').trim())
  ).filter(row => row.some(c => c.length > 0))
  return { headers, rows }
}

// ── AI extraction (Layer 2 — backend serverless only) ─────────────────────────

/**
 * Send a document to the /api/extract Vercel serverless function.
 * The serverless function holds the secret API key and calls the OCR/AI provider.
 *
 * @param {File} file — the uploaded file
 * @param {string} rawText — pre-extracted PDF text (if available)
 * @returns {ExtractionResult}
 */
export async function extractViaBackend(file, rawText = '') {
  if (!OCR_AVAILABLE) {
    throw new Error('OCR_NOT_CONFIGURED')
  }

  const formData = new FormData()
  formData.append('file', file)
  if (rawText) formData.append('rawText', rawText)

  const response = await fetch('/api/extract', {
    method: 'POST',
    body:   formData,
    // Note: do NOT set Content-Type header — browser sets multipart/form-data boundary automatically
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Extraction API error ${response.status}: ${err}`)
  }

  const result = await response.json()
  return result
}

// ── LOCAL text extraction (heuristic, no AI, always available) ────────────────

/**
 * Apply heuristic field extraction to raw text.
 * This is NOT OCR — it is regex-based parsing of already-extracted text.
 * Works well on digital/text PDFs. Unreliable on images or hand-written documents.
 */
export function heuristicExtract(text) {
  const out = {
    supplierName:   '',
    invoiceNumber:  '',
    invoiceDate:    today(),
    totalAmount:    0,
    vatAmount:      0,
    description:    '',
    lineItems:      [],
    rawText:        text,
  }
  if (!text || text.trim().length < 10) return out

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Supplier name: first non-header meaningful line
  const skipPat = /invoice|receipt|tax invoice|statement|date|vat|reg|pty|ltd|inc|co\./i
  for (const l of lines.slice(0, 10)) {
    if (!skipPat.test(l) && l.length > 3 && l.length < 70) {
      out.supplierName = l
      break
    }
  }

  // Invoice number
  const invM = text.match(/inv(?:oice)?\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,})/i)
  if (invM) out.invoiceNumber = invM[1].trim()

  // Date — several formats
  const dateM = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\s+\w+\s+\d{4})\b/)
  if (dateM) {
    try {
      const d = new Date(dateM[1])
      if (!isNaN(d.getTime())) out.invoiceDate = d.toISOString().split('T')[0]
    } catch {}
  }

  // Total — look for labelled total first
  const totM = text.match(/(?:total|amount due|balance due|grand total)[^\d]{0,15}R?\s*([\d\s,]+\.?\d{0,2})/i)
  if (totM) {
    out.totalAmount = parseFloat(totM[1].replace(/[\s,]/g, '')) || 0
  } else {
    // Fallback: largest R-prefixed amount
    const amts = [...text.matchAll(/R\s?([\d\s,]+\.?\d{0,2})/g)]
      .map(m => parseFloat(m[1].replace(/[\s,]/g, '')))
      .filter(n => isFinite(n) && n > 0)
    if (amts.length) out.totalAmount = Math.max(...amts)
  }

  // VAT
  const vatM = text.match(/(?:vat|tax\s*\(?15%?\)?)[^\d]{0,10}R?\s*([\d,]+\.?\d{0,2})/i)
  if (vatM) out.vatAmount = parseFloat(vatM[1].replace(/,/g, '')) || 0

  // Description: first few meaningful lines
  out.description = lines
    .filter(l => l.length > 5 && l.length < 120 && !/^\d+$/.test(l) && !/^R[\d,.]/.test(l))
    .slice(0, 4)
    .join(' · ')
    .substring(0, 200)

  return out
}

// ── Classification rules ───────────────────────────────────────────────────────

const CLASSIFY_RULES = [
  [/capital|owner deposit|founder contribution|transfer from owner/, 'Owner Investment', 'Owner Capital',         'High Confidence'],
  [/payment received|deposit from customer|sales invoice paid/,     'Business Income',  'Product Sales',          'Medium Confidence'],
  [/\bcipc\b/,                                                       'Business Expense', 'CIPC / Compliance',      'High Confidence'],
  [/\bsars\b|south african revenue|income tax/,                      'Business Expense', 'SARS / Tax',             'High Confidence'],
  [/domain|email|domains\.co\.za|web hosting/,                       'Business Expense', 'Domain & Email',         'High Confidence'],
  [/vercel|github|netlify|hosting|website/,                          'Business Expense', 'Website & Digital',      'High Confidence'],
  [/dhl|fedex|courier|shipping|freight/,                             'Business Expense', 'Freight & Courier',      'High Confidence'],
  [/customs|clearing|duty|import duty|excise/,                       'Business Expense', 'Customs & Clearing',     'High Confidence'],
  [/\bsample\b|supplier sample/,                                     'Business Expense', 'Supplier Samples',       'High Confidence'],
  [/marketing|facebook|google ads|instagram/,                        'Business Expense', 'Marketing',              'High Confidence'],
  [/packaging|assembly|pot |packing/,                                'Business Expense', 'Assembly & Packaging',   'High Confidence'],
  [/bank fee|service fee|monthly fee|account fee/,                   'Business Expense', 'Banking Fees',           'High Confidence'],
  [/travel|uber|petrol|fuel|accommodation/,                          'Business Expense', 'Travel',                 'Medium Confidence'],
]

export function classifyText(text, amount) {
  const d = (text || '').toLowerCase()
  for (const [re, type, category, confidence] of CLASSIFY_RULES) {
    if (re.test(d)) return { type, category, confidence }
  }
  // Default
  return {
    type:       'Business Expense',
    category:   'Other Expense',
    confidence: 'Needs Review',
  }
}
