// src/lib/ocr.js — v1.6
// ─────────────────────────────────────────────────────────────────────────────
// REAL OCR IMPLEMENTATION
//
// LAYER 1 — ✅ Working now (no setup):
//   • PDF text extraction via pdf.js (CDN) — digital/text PDFs
//   • Tesseract.js in-browser OCR (CDN) — photos of invoices, image receipts
//   • CSV / TSV row parsing
//   • Heuristic field extraction (regex patterns)
//   • Classification rules (supplier name, category, confidence)
//
// LAYER 2 — 🔑 Setup required (API key in Vercel):
//   • AI-structured extraction via /api/extract (Anthropic Claude)
//   • Much more accurate than regex — reads messy or hand-written invoices
//   • Setup: Add OCR_SECRET_KEY to Vercel environment variables
//
// TESSERACT NOTE:
//   Tesseract.js runs entirely in the browser via WebAssembly.
//   It downloads its own ~30MB model files from CDN on first use.
//   These are cached by the browser — subsequent uses are fast.
//   No API key required. Works offline after first use.
//   Accuracy: good for clear printed text, fair for photos, poor for handwriting.
// ─────────────────────────────────────────────────────────────────────────────

import { today } from '../utils/format.js'

export const OCR_AVAILABLE = Boolean(import.meta.env.VITE_OCR_API_KEY)

// ── PDF.js loader ─────────────────────────────────────────────────────────────
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib
  return new Promise((resolve, reject) => {
    const s  = document.createElement('script')
    s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve(window.pdfjsLib)
    }
    s.onerror = () => reject(new Error('Could not load pdf.js from CDN'))
    document.head.appendChild(s)
  })
}

// ── Tesseract.js loader ────────────────────────────────────────────────────────
async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract
  return new Promise((resolve, reject) => {
    const s  = document.createElement('script')
    s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js'
    s.onload = () => resolve(window.Tesseract)
    s.onerror = () => reject(new Error('Could not load Tesseract.js from CDN'))
    document.head.appendChild(s)
  })
}

// ── PDF text extraction ────────────────────────────────────────────────────────
// ✅ Working now — extracts embedded text from digital PDFs
export async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs()
  const buffer   = await file.arrayBuffer()
  const pdf      = await pdfjsLib.getDocument({ data: buffer }).promise
  let fullText   = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map(item => item.str).join(' ') + '\n'
  }
  const text        = fullText.trim()
  const isTextBased = text.length > 50
  return { text, pageCount: pdf.numPages, isTextBased }
}

// ── PDF → canvas → image (for Tesseract OCR of scanned PDFs) ──────────────────
export async function pdfPageToImageBlob(file, pageNum = 1, scale = 2.0) {
  const pdfjsLib = await loadPdfJs()
  const buffer   = await file.arrayBuffer()
  const pdf      = await pdfjsLib.getDocument({ data: buffer }).promise
  const page     = await pdf.getPage(Math.min(pageNum, pdf.numPages))
  const viewport = page.getViewport({ scale })
  const canvas   = document.createElement('canvas')
  canvas.width   = viewport.width
  canvas.height  = viewport.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

// ── Tesseract.js in-browser OCR ────────────────────────────────────────────────
// ✅ Working now — no API key needed
// Runs in browser via WebAssembly. Downloads ~30MB model on first use (cached).
export async function ocrImage(imageSource, onProgress) {
  const Tesseract = await loadTesseract()
  const result    = await Tesseract.recognize(imageSource, 'eng', {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })
  return result.data.text || ''
}

// ── CSV / TSV extraction ───────────────────────────────────────────────────────
export async function extractCsvRows(file) {
  const text  = await file.text()
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const delim   = (lines[0].match(/\t/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? '\t' : ','
  const headers = lines[0].split(delim).map(h => h.replace(/"/g, '').trim())
  const rows    = lines.slice(1).map(l => l.split(delim).map(c => c.replace(/"/g, '').trim()))
    .filter(r => r.some(c => c.length > 0))
  return { headers, rows }
}

// ── Heuristic field extraction ────────────────────────────────────────────────
// ✅ Working now — regex-based parsing of any text
// Good for: clean digital PDFs, CSV, and text-based invoices
// Poor for: handwritten receipts, rotated text, complex layouts
export function heuristicExtract(text) {
  const out = {
    supplierName:  '',
    invoiceNumber: '',
    invoiceDate:   today(),
    totalAmount:   0,
    vatAmount:     0,
    description:   '',
    lineItems:     [],
    rawText:       text,
  }
  if (!text || text.trim().length < 5) return out

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Supplier name: first non-header meaningful line
  const skipPat = /invoice|receipt|tax invoice|statement|date|vat|reg|pty|ltd|inc|co\.|page\s*\d/i
  for (const l of lines.slice(0, 10)) {
    if (!skipPat.test(l) && l.length > 3 && l.length < 70) { out.supplierName = l; break }
  }

  // Invoice number
  const invM = text.match(/inv(?:oice)?\s*(?:no\.?|number|#|:)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,20})/i)
  if (invM) out.invoiceNumber = invM[1].trim()

  // Date (multiple formats)
  const dateM = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\s+\w+\s+\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/)
  if (dateM) {
    try { const d = new Date(dateM[1]); if (!isNaN(d.getTime())) out.invoiceDate = d.toISOString().split('T')[0] }
    catch {}
  }

  // Total amount
  const totM = text.match(/(?:total|amount due|balance due|grand total|amount payable)[^\d]{0,20}R?\s*([\d\s,]+\.?\d{0,2})/i)
  if (totM) {
    out.totalAmount = parseFloat(totM[1].replace(/[\s,]/g, '')) || 0
  } else {
    const amts = [...text.matchAll(/R\s?([\d\s,]+\.?\d{0,2})/g)]
      .map(m => parseFloat(m[1].replace(/[\s,]/g, '')))
      .filter(n => isFinite(n) && n > 0)
    if (amts.length) out.totalAmount = Math.max(...amts)
  }

  // VAT
  const vatM = text.match(/(?:vat|tax\s*\(?15%?\)?)[^\d]{0,12}R?\s*([\d,]+\.?\d{0,2})/i)
  if (vatM) out.vatAmount = parseFloat(vatM[1].replace(/,/g, '')) || 0

  // Description
  out.description = lines
    .filter(l => l.length > 5 && l.length < 120 && !/^\d+$/.test(l) && !/^R[\d,.]/.test(l))
    .slice(0, 4).join(' · ').substring(0, 200)

  return out
}

// ── Classification rules ────────────────────────────────────────────────────────
const CLASSIFY_RULES = [
  [/capital|owner deposit|founder contribution|transfer from owner/, 'Owner Investment', 'Owner Capital',       'High Confidence'],
  [/payment received|deposit from customer|sales invoice paid/,     'Business Income',  'Product Sales',        'Medium Confidence'],
  [/\bcipc\b/,                                                       'Business Expense', 'CIPC / Compliance',   'High Confidence'],
  [/\bsars\b|south african revenue|income tax/,                      'Business Expense', 'SARS / Tax',          'High Confidence'],
  [/domain|email|domains\.co\.za|web hosting/,                       'Business Expense', 'Domain & Email',      'High Confidence'],
  [/vercel|github|netlify|hosting|website/,                          'Business Expense', 'Website & Digital',   'High Confidence'],
  [/dhl|fedex|courier|shipping|freight/,                             'Business Expense', 'Freight & Courier',   'High Confidence'],
  [/customs|clearing|duty|import duty|excise/,                       'Business Expense', 'Customs & Clearing',  'High Confidence'],
  [/\bsample\b|supplier sample/,                                     'Business Expense', 'Supplier Samples',    'High Confidence'],
  [/marketing|facebook|google ads|instagram/,                        'Business Expense', 'Marketing',           'High Confidence'],
  [/packaging|assembly|pot |packing/,                                'Business Expense', 'Assembly & Packaging','High Confidence'],
  [/bank fee|service fee|monthly fee|account fee/,                   'Business Expense', 'Banking Fees',        'High Confidence'],
  [/travel|uber|petrol|fuel|accommodation/,                          'Business Expense', 'Travel',              'Medium Confidence'],
]

export function classifyText(text) {
  const d = (text || '').toLowerCase()
  for (const [re, type, category, confidence] of CLASSIFY_RULES) {
    if (re.test(d)) return { type, category, confidence }
  }
  return { type: 'Business Expense', category: 'Other Expense', confidence: 'Needs Review' }
}

// ── AI extraction via /api/extract (requires backend setup) ────────────────────
// 🔑 Requires: OCR_SECRET_KEY in Vercel environment variables
export async function extractViaBackend(file, rawText = '') {
  if (!OCR_AVAILABLE) throw new Error('OCR_NOT_CONFIGURED')

  const formData = new FormData()
  formData.append('file', file)
  if (rawText) formData.append('rawText', rawText)

  const response = await fetch('/api/extract', { method: 'POST', body: formData })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API error ${response.status}: ${err}`)
  }
  return response.json()
}
