// FinanceCentre.jsx — v1.5
// Architecture:
//   • Manual transaction entry → always works, saves to localStorage
//   • Document import → uploads to Supabase Storage (if configured), falls back to local preview
//   • PDF text extraction → pdf.js (CDN, no key needed) for text-based PDFs
//   • OCR/AI extraction → calls /api/extract serverless function (requires OCR_SECRET_KEY in Vercel)
//   • Review screen → user edits all fields before any transaction is created
//   • localStorage is the authoritative data store until Supabase is connected

import { useState, useRef, useCallback, useMemo } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, fmtDate, nextId, today, parseNum, safeAmount } from '../utils/format.js'
import { FINANCE_CATEGORIES, PAYMENT_METHODS } from '../utils/data.js'
import Modal from '../components/Modal.jsx'
import {
  SUPABASE_CONFIGURED,
  OCR_CONFIGURED as SB_OCR_CONFIGURED,
  uploadDocument,
  insertTransaction,
  updateDocumentLink,
} from '../lib/supabase.js'
import {
  OCR_AVAILABLE,
  extractPdfText,
  extractCsvRows,
  heuristicExtract,
  classifyText,
  extractViaBackend,
} from '../lib/ocr.js'

// ── Constants ──────────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  'Owner Investment': T.teal,
  'Business Income':  T.green,
  'Business Expense': T.red,
}
const TYPE_BG = {
  'Owner Investment': T.tealPale,
  'Business Income':  T.greenPale,
  'Business Expense': T.redPale,
}
const CONF_COLORS = {
  'High Confidence':   T.green,
  'Medium Confidence': T.gold,
  'Needs Review':      T.danger,
}
const BLANK_TXN = {
  date: today(), type: 'Business Expense', category: 'Other Expense',
  description: '', amount: '', supplierPayee: '', paymentMethod: 'EFT',
  notes: '', invoiceNumber: '', vatAmount: '',
}

// ── Safe finance aggregation ───────────────────────────────────────────────────
function sumByType(finance, type) {
  if (!Array.isArray(finance)) return 0
  return finance
    .filter(t => t?.type === type)
    .reduce((s, t) => s + safeAmount(t?.amount), 0)
}

// ── Form validation ────────────────────────────────────────────────────────────
function validateTxn(form) {
  const errors = {}
  if (!form.description?.trim()) errors.description = 'Description is required'
  const amt = parseNum(form.amount)
  if (!form.amount || amt <= 0) errors.amount = 'Amount must be greater than zero'
  if (isNaN(new Date(form.date).getTime())) errors.date = 'Enter a valid date'
  return errors
}

// ── Status badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  return (
    <span style={{
      background: TYPE_BG[type], color: TYPE_COLORS[type],
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {type === 'Owner Investment' ? 'Investment' : type === 'Business Income' ? 'Income' : 'Expense'}
    </span>
  )
}

// ── Connection status notice ───────────────────────────────────────────────────
function ConnectionNotice() {
  if (SUPABASE_CONFIGURED) return null
  return (
    <div style={{
      background: T.goldPale, border: `1px solid rgba(184,151,90,0.25)`,
      borderRadius: 10, padding: '11px 16px', marginBottom: 18,
      fontSize: 12, color: '#6B4E10', display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>☁</span>
      <div>
        <strong>Cloud storage is not connected.</strong> Finance transactions are saved locally in your browser.
        To enable permanent cloud storage, add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your
        environment variables. See <strong>SETUP.md</strong> for instructions.
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function FinanceCentre({ finance, setFinance }) {
  const [tab,        setTab]        = useState('overview')
  const [modal,      setModal]      = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(BLANK_TXN)
  const [formErrors, setFormErrors] = useState({})
  const [filterType, setFilterType] = useState('All')

  // ── Import workflow ──────────────────────────────────────────────────────────
  const [importOpen,   setImportOpen]   = useState(false)
  const [importStep,   setImportStep]   = useState('upload')
  // upload → processing → review_single | review_csv → done

  const [processingMsg, setProcessingMsg] = useState('')
  const [processingPct, setProcessingPct] = useState(0)
  const [importError,   setImportError]   = useState('')

  // Single document review state (PDF / image)
  const [docReview,    setDocReview]    = useState(null)  // { file, docRecord, extracted, classified, previewUrl, rawText, ocrUsed }
  const [reviewForm,   setReviewForm]   = useState(null)  // editable form state for review screen
  const [reviewErrors, setReviewErrors] = useState({})

  // CSV multi-row review
  const [csvRows,   setCsvRows]   = useState([])
  const [csvMeta,   setCsvMeta]   = useState({ fileName: '', headers: [] })

  const fileRef = useRef()

  // ── Finance aggregates ───────────────────────────────────────────────────────
  const invested  = useMemo(() => sumByType(finance, 'Owner Investment'), [finance])
  const income    = useMemo(() => sumByType(finance, 'Business Income'),  [finance])
  const expenses  = useMemo(() => sumByType(finance, 'Business Expense'), [finance])
  const remaining = invested - expenses
  const net       = income - expenses

  // ── Monthly summary ──────────────────────────────────────────────────────────
  const monthly = useMemo(() => {
    const m = {}
    if (!Array.isArray(finance)) return m
    finance.forEach(t => {
      const key = (t?.date || '').substring(0, 7) || 'Unknown'
      if (!m[key]) m[key] = { inv: 0, inc: 0, exp: 0 }
      if (t?.type === 'Owner Investment') m[key].inv += safeAmount(t.amount)
      else if (t?.type === 'Business Income') m[key].inc += safeAmount(t.amount)
      else m[key].exp += safeAmount(t.amount)
    })
    return m
  }, [finance])

  // ── Category summary ─────────────────────────────────────────────────────────
  const catSummary = useMemo(() => {
    const c = {}
    if (!Array.isArray(finance)) return c
    finance.filter(t => t?.type === 'Business Expense').forEach(t => {
      c[t.category] = (c[t.category] || 0) + safeAmount(t.amount)
    })
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [finance])

  // ── Visible transactions ─────────────────────────────────────────────────────
  const visibleTxns = useMemo(() => {
    const list = Array.isArray(finance) ? finance : []
    return (filterType === 'All' ? list : list.filter(t => t?.type === filterType))
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [finance, filterType])

  // ── Manual transaction CRUD ──────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setForm({ ...BLANK_TXN, date: today() }); setFormErrors({}); setModal(true) }
  const openEdit = t  => { setEditing(t.id); setForm({ ...t, amount: String(t.amount ?? '') }); setFormErrors({}); setModal(true) }

  const saveTxn = useCallback(async () => {
    const errs = validateTxn(form)
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    const rec = {
      ...form,
      id:     editing != null ? editing : nextId(Array.isArray(finance) ? finance : []),
      amount: parseNum(form.amount),
      vatAmount: parseNum(form.vatAmount),
      source: 'manual',
    }

    // Try Supabase first, fall back to local
    if (SUPABASE_CONFIGURED && editing == null) {
      try { await insertTransaction(rec) } catch (e) { console.warn('[Finance] Supabase insert failed, saving locally:', e.message) }
    }

    if (editing != null) {
      setFinance(ff => (Array.isArray(ff) ? ff : []).map(t => t.id === editing ? rec : t))
    } else {
      setFinance(ff => [...(Array.isArray(ff) ? ff : []), rec])
    }
    setModal(false)
  }, [form, editing, finance, setFinance])

  const delTxn = useCallback(id => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return
    setFinance(ff => (Array.isArray(ff) ? ff : []).filter(t => t.id !== id))
  }, [setFinance])

  const F = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setFormErrors(er => ({ ...er, [k]: undefined })) }

  // ── Import: file selected ────────────────────────────────────────────────────
  const handleFileSelected = useCallback(async e => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const ext = file.name.split('.').pop().toLowerCase()
    setImportError('')
    setImportStep('processing')
    setProcessingPct(5)
    setProcessingMsg('Reading file…')

    // ── CSV / TSV ──────────────────────────────────────────────────────────────
    if (ext === 'csv' || ext === 'tsv') {
      try {
        setProcessingMsg('Parsing CSV…')
        setProcessingPct(50)
        const { headers, rows } = await extractCsvRows(file)
        setProcessingPct(100)

        // Map rows to reviewable transactions
        const mapped = rows.map((cols, i) => {
          const get = (...keys) => {
            for (const k of keys) {
              const idx = headers.findIndex(h => h.toLowerCase() === k.toLowerCase())
              if (idx !== -1 && cols[idx]) return cols[idx]
            }
            return ''
          }
          const desc    = get('description','narration','details','reference') || cols[1] || ''
          const rawAmt  = get('amount','debit','credit','value') || cols[2] || '0'
          const amount  = Math.abs(parseFloat(rawAmt.replace(/[^0-9.-]/g, '')) || 0)
          const date    = get('date','transaction date','posting date') || cols[0] || today()
          const payee   = get('payee','merchant','supplier','beneficiary') || ''
          const cls     = classifyText(desc + ' ' + payee, amount)
          return { _id: i + 1, date, description: desc, amount, supplierPayee: payee, invoiceNumber: '', vatAmount: 0, ...cls, approved: amount > 0 }
        }).filter(r => r.amount > 0 || r.description)

        setCsvRows(mapped)
        setCsvMeta({ fileName: file.name, headers })
        setImportStep('review_csv')
      } catch (err) {
        setImportError(`CSV parsing failed: ${err.message}`)
        setImportStep('upload')
      }
      return
    }

    // ── PDF ────────────────────────────────────────────────────────────────────
    if (ext === 'pdf') {
      setProcessingMsg('Loading PDF reader…')
      setProcessingPct(10)

      // 1. Upload to Supabase if configured
      let docRecord = null
      if (SUPABASE_CONFIGURED) {
        try {
          setProcessingMsg('Uploading to cloud storage…')
          setProcessingPct(20)
          docRecord = await uploadDocument(file, { category: 'Invoices' })
          setProcessingPct(35)
        } catch (err) {
          console.warn('[Finance] Supabase upload failed, continuing locally:', err.message)
        }
      }

      // 2. Extract text with pdf.js (always available)
      let pdfText = ''
      let isTextBased = false
      try {
        setProcessingMsg('Extracting text from PDF…')
        setProcessingPct(45)
        const result = await extractPdfText(file)
        pdfText      = result.text
        isTextBased  = result.isTextBased
        setProcessingPct(60)
      } catch (err) {
        console.warn('[Finance] PDF text extraction failed:', err.message)
      }

      // 3. Build preview URL for display
      const previewUrl = URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: 'application/pdf' }))

      // 4. Attempt AI extraction if available
      let extracted  = null
      let ocrUsed    = false
      let ocrError   = ''

      if (isTextBased && OCR_AVAILABLE) {
        try {
          setProcessingMsg('Sending to AI for data extraction…')
          setProcessingPct(70)
          extracted = await extractViaBackend(file, pdfText)
          ocrUsed   = true
          setProcessingPct(90)
        } catch (err) {
          ocrError = err.message === 'OCR_NOT_CONFIGURED'
            ? 'AI extraction not configured on server.'
            : `AI extraction failed: ${err.message}`
        }
      } else if (!isTextBased && OCR_AVAILABLE) {
        try {
          setProcessingMsg('Running OCR on scanned PDF…')
          setProcessingPct(70)
          extracted = await extractViaBackend(file, '')
          ocrUsed   = true
          setProcessingPct(90)
        } catch (err) {
          ocrError = `OCR failed: ${err.message}`
        }
      }

      // 5. Fall back to heuristic extraction if no AI
      if (!extracted && isTextBased) {
        extracted = heuristicExtract(pdfText)
        ocrUsed   = false
      }

      // 6. Classify
      const classified = extracted
        ? classifyText((extracted.supplierName || '') + ' ' + (extracted.description || ''), extracted.totalAmount)
        : { type: 'Business Expense', category: 'Other Expense', confidence: 'Needs Review' }

      // Override confidence from extracted if present
      if (extracted?.confidence) classified.confidence = extracted.confidence

      // 7. Build review form
      const rf = {
        date:          extracted?.invoiceDate || today(),
        type:          extracted?.suggestedType    || classified.type,
        category:      extracted?.suggestedCategory || classified.category,
        description:   extracted?.description || extracted?.supplierName || '',
        amount:        String(extracted?.totalAmount || ''),
        supplierPayee: extracted?.supplierName || '',
        paymentMethod: 'EFT',
        invoiceNumber: extracted?.invoiceNumber || '',
        vatAmount:     String(extracted?.vatAmount || ''),
        notes:         ocrUsed ? `Extracted via AI · ${classified.confidence}` : isTextBased ? `Extracted from PDF text · ${classified.confidence}` : 'Manual review required',
        sourceDocumentId: docRecord?.id || null,
        sourceFile:       file.name,
        source:           ocrUsed ? 'ocr' : 'import',
      }

      setDocReview({
        file, docRecord, extracted, classified, previewUrl,
        rawText: pdfText, ocrUsed, ocrError, isTextBased,
        fileName: file.name,
      })
      setReviewForm(rf)
      setReviewErrors({})
      setProcessingPct(100)
      setImportStep('review_single')
      setImportOpen(false)  // close wizard; review modal opens separately
      return
    }

    // ── Image (JPG, PNG, WEBP, etc.) ──────────────────────────────────────────
    if (['jpg','jpeg','png','webp','gif','bmp','tiff'].includes(ext)) {
      setProcessingMsg('Preparing image…')
      setProcessingPct(20)

      let docRecord = null
      if (SUPABASE_CONFIGURED) {
        try {
          docRecord = await uploadDocument(file, { category: 'Invoices' })
        } catch (err) {
          console.warn('[Finance] Upload failed:', err.message)
        }
      }

      const previewUrl = URL.createObjectURL(file)

      let extracted = null
      let ocrUsed   = false
      let ocrError  = ''

      if (OCR_AVAILABLE) {
        try {
          setProcessingMsg('Reading image with AI…')
          setProcessingPct(60)
          extracted = await extractViaBackend(file, '')
          ocrUsed   = true
        } catch (err) {
          ocrError = err.message === 'OCR_NOT_CONFIGURED'
            ? 'AI extraction not configured. Add OCR_SECRET_KEY to Vercel.'
            : `AI reading failed: ${err.message}`
        }
      }

      const classified = extracted
        ? classifyText((extracted.supplierName || '') + ' ' + (extracted.description || ''), extracted.totalAmount)
        : { type: 'Business Expense', category: 'Other Expense', confidence: 'Needs Review' }
      if (extracted?.confidence) classified.confidence = extracted.confidence

      const rf = {
        date:          extracted?.invoiceDate || today(),
        type:          extracted?.suggestedType     || classified.type,
        category:      extracted?.suggestedCategory || classified.category,
        description:   extracted?.description || extracted?.supplierName || '',
        amount:        String(extracted?.totalAmount || ''),
        supplierPayee: extracted?.supplierName || '',
        paymentMethod: 'EFT',
        invoiceNumber: extracted?.invoiceNumber || '',
        vatAmount:     String(extracted?.vatAmount || ''),
        notes:         ocrUsed ? `AI Vision extraction · ${classified.confidence}` : 'Manual review required — AI not connected',
        sourceDocumentId: docRecord?.id || null,
        sourceFile:       file.name,
        source:           ocrUsed ? 'ocr' : 'import',
      }

      setDocReview({ file, docRecord, extracted, classified, previewUrl, rawText: '', ocrUsed, ocrError, isTextBased: false, fileName: file.name })
      setReviewForm(rf)
      setReviewErrors({})
      setProcessingPct(100)
      setImportStep('review_single')
      setImportOpen(false)
      return
    }

    setImportError(`Unsupported file type: .${ext}. Please use PDF, JPG, PNG, or CSV.`)
    setImportStep('upload')
  }, [])

  // ── Approve single-document review ───────────────────────────────────────────
  const approveSingleReview = useCallback(async () => {
    const errs = validateTxn(reviewForm)
    if (Object.keys(errs).length) { setReviewErrors(errs); return }

    const rec = {
      ...BLANK_TXN,
      ...reviewForm,
      id:        nextId(Array.isArray(finance) ? finance : []),
      amount:    parseNum(reviewForm.amount),
      vatAmount: parseNum(reviewForm.vatAmount),
    }

    // Save to Supabase if configured
    if (SUPABASE_CONFIGURED) {
      try {
        const dbRec = await insertTransaction(rec)
        if (docReview?.docRecord?.id && dbRec?.id) {
          await updateDocumentLink(docReview.docRecord.id, dbRec.id)
        }
      } catch (e) {
        console.warn('[Finance] Supabase save failed, saving locally:', e.message)
      }
    }

    setFinance(ff => [...(Array.isArray(ff) ? ff : []), rec])
    cleanup()
  }, [reviewForm, finance, setFinance, docReview])

  const cleanup = () => {
    if (docReview?.previewUrl) URL.revokeObjectURL(docReview.previewUrl)
    setDocReview(null)
    setReviewForm(null)
    setReviewErrors({})
    setImportStep('upload')
    setImportError('')
    setProcessingMsg('')
    setProcessingPct(0)
  }

  // ── Approve CSV rows ─────────────────────────────────────────────────────────
  const approveCsvRows = useCallback(() => {
    const approved = csvRows.filter(r => r.approved && r.amount > 0)
    if (!approved.length) return
    const base = nextId(Array.isArray(finance) ? finance : [])
    const records = approved.map((r, i) => ({
      id:            base + i,
      date:          r.date || today(),
      type:          r.type,
      category:      r.category,
      description:   r.description,
      amount:        r.amount,
      supplierPayee: r.supplierPayee,
      paymentMethod: 'EFT',
      invoiceNumber: '',
      vatAmount:     0,
      notes:         `CSV import · ${r.confidence} · ${csvMeta.fileName}`,
      source:        'import',
      sourceFile:    csvMeta.fileName,
    }))
    setFinance(ff => [...(Array.isArray(ff) ? ff : []), ...records])
    setCsvRows([])
    setImportStep('upload')
    setImportOpen(false)
  }, [csvRows, csvMeta, finance, setFinance])

  const RF = k => e => { setReviewForm(f => ({ ...f, [k]: e.target.value })); setReviewErrors(er => ({ ...er, [k]: undefined })) }

  // ── AI status explanation ─────────────────────────────────────────────────────
  const ocrStatusNote = () => {
    if (!OCR_AVAILABLE) return {
      color: T.textMid,
      text: 'Document uploaded and stored. Automatic reading is not connected yet. Please capture fields manually from the preview.',
    }
    return { color: T.green, text: 'AI extraction is enabled. Fields have been pre-filled — please review and correct before saving.' }
  }

  // ── Insight text ─────────────────────────────────────────────────────────────
  const topCat  = catSummary[0]?.[0] || 'no expenses yet'
  const insight = `Botanica has received ${ZAR(invested)} in owner investment and spent ${ZAR(expenses)}. ` +
    `${topCat !== 'no expenses yet' ? `Largest expense category: ${topCat}. ` : ''}` +
    `Remaining owner-funded balance: ${ZAR(remaining)}. ` +
    (income === 0 ? 'No business income recorded yet.' : `Business income to date: ${ZAR(income)}.`)

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Finance Centre</div>
          <div className="page-subtitle">Owner Investment · Income · Expenses</div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button className="btn btn-primary" onClick={openNew}>+ Add Manual Transaction</button>
          <button
            className="btn btn-outline"
            style={{ borderColor:T.gold, color:T.forest }}
            onClick={() => { setImportStep('upload'); setImportError(''); setImportOpen(true) }}
          >
            ⬆ Import from Document
          </button>
          <input
            ref={fileRef} type="file"
            accept=".csv,.tsv,.pdf,.jpg,.jpeg,.png,.webp,.bmp"
            style={{ display:'none' }}
            onChange={handleFileSelected}
          />
        </div>
      </div>

      {/* ── KPI Bar ── */}
      <div style={{ background:'rgba(255,255,255,0.55)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(210,200,184,0.5)`, padding:'16px 36px' }}>
        <div className="grid-5">
          {[
            { label:'Owner Investment', val:ZAR(invested),  color:T.teal,   cls:'border-inv' },
            { label:'Business Income',  val:ZAR(income),    color:T.green,  cls:'border-inc' },
            { label:'Total Expenses',   val:ZAR(expenses),  color:T.red,    cls:'border-exp' },
            { label:'Cash Position',    val:ZAR(remaining), color:remaining >= 0 ? T.gold : T.danger, cls:'border-rem' },
            { label:'Net Position',     val:ZAR(net),       color:net >= 0 ? T.forestLight : T.danger, cls:'border-net' },
          ].map(k => (
            <div key={k.label} className={`stat-card ${k.cls}`}>
              <div className="stat-label">{k.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:k.color, lineHeight:1, marginTop:6 }}>{k.val}</div>
              {k.cls === 'border-rem' && invested > 0 && (
                <div className="pbar" style={{ marginTop:8 }}>
                  <div className="pbar-fill pbar-gold" style={{ width:`${Math.min(100, Math.max(0,(remaining/invested)*100))}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs + content ── */}
      <div className="page-content">
        <ConnectionNotice />

        <div className="tabs">
          {['overview','transactions','monthly','categories'].map(t => (
            <div key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </div>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="grid-2 gap-20">
            <div className="insight-box">
              <div className="insight-tag">Finance Insight</div>
              <div className="insight-text">{insight}</div>
            </div>
            <div className="g-card">
              <div className="sec-label">Project-to-Date</div>
              {[
                { label:'Owner Investment', val:ZAR(invested),  color:T.teal },
                { label:'Business Income',  val:ZAR(income),    color:T.green },
                { label:'Total Expenses',   val:ZAR(expenses),  color:T.red },
                { label:'Cash Position',    val:ZAR(remaining), color:remaining >= 0 ? T.gold : T.danger },
                { label:'Net Position',     val:ZAR(net),       color:net >= 0 ? T.forestLight : T.danger },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid rgba(210,200,184,0.35)` }}>
                  <span style={{ fontSize:13, color:T.textMid }}>{r.label}</span>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Transactions ── */}
        {tab === 'transactions' && (
          <>
            <div style={{ display:'flex', gap:7, marginBottom:16, flexWrap:'wrap' }}>
              {['All','Owner Investment','Business Income','Business Expense'].map(t => (
                <button key={t} className={`bp-fbtn ${filterType===t?'active':''}`} onClick={() => setFilterType(t)}>{t}</button>
              ))}
            </div>
            {visibleTxns.length === 0 ? (
              <div className="empty-st">
                <div className="empty-ic">₩</div>
                <div>No transactions yet.</div>
                <div style={{ marginTop:12, display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={openNew}>Add Manual Transaction</button>
                  <button className="btn btn-outline btn-sm" onClick={() => { setImportStep('upload'); setImportOpen(true) }}>Import from Document</button>
                </div>
              </div>
            ) : (
              <div className="g-card" style={{ padding:0 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Supplier / Payee</th><th>Inv #</th><th>Amount</th><th>Source</th><th style={{ width:90 }}></th></tr>
                    </thead>
                    <tbody>
                      {visibleTxns.map(t => t && (
                        <tr key={t.id}>
                          <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{fmtDate(t.date)}</td>
                          <td><TypeBadge type={t.type} /></td>
                          <td style={{ fontSize:12, color:T.textMid }}>{t.category}</td>
                          <td className="td-wrap" style={{ fontSize:13, maxWidth:200 }}>{t.description}</td>
                          <td style={{ fontSize:12, color:T.textLight }}>{t.supplierPayee}</td>
                          <td style={{ fontSize:11, color:T.textLight, fontFamily:'monospace' }}>{t.invoiceNumber || '—'}</td>
                          <td style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:TYPE_COLORS[t.type], whiteSpace:'nowrap' }}>{ZAR(t.amount)}</td>
                          <td>
                            {t.source === 'ocr'    ? <span className="badge badge-teal"  style={{ fontSize:10 }}>AI</span>
                            :t.source === 'import'  ? <span className="badge badge-blue"  style={{ fontSize:10 }}>Import</span>
                            :                        <span className="badge badge-grey"  style={{ fontSize:10 }}>Manual</span>}
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:4 }}>
                              <button className="btn btn-outline btn-xs" onClick={() => openEdit(t)}>Edit</button>
                              <button className="btn btn-xs btn-ghost" style={{ color:T.textLight }} onClick={() => delTxn(t.id)}>✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Monthly ── */}
        {tab === 'monthly' && (
          <div className="g-card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Month</th><th>Investment</th><th>Income</th><th>Expenses</th><th>Cash Pos.</th><th>Net</th></tr></thead>
                <tbody>
                  {Object.entries(monthly).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,v]) => (
                    <tr key={m}>
                      <td className="td-name">{m}</td>
                      <td className="td-num" style={{ color:T.teal   }}>{ZAR(v.inv)}</td>
                      <td className="td-num" style={{ color:T.green  }}>{ZAR(v.inc)}</td>
                      <td className="td-num" style={{ color:T.red    }}>{ZAR(v.exp)}</td>
                      <td className="td-num" style={{ color:T.gold   }}>{ZAR(v.inv-v.exp)}</td>
                      <td className="td-num" style={{ color:(v.inc-v.exp)>=0?T.forestLight:T.danger }}>{ZAR(v.inc-v.exp)}</td>
                    </tr>
                  ))}
                  {Object.keys(monthly).length===0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:T.textLight }}>No transactions yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Categories ── */}
        {tab === 'categories' && (
          <div className="g-card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Category</th><th>Total Spend</th><th>% of Expenses</th><th style={{ width:180 }}>Share</th></tr></thead>
                <tbody>
                  {catSummary.map(([cat, amt]) => (
                    <tr key={cat}>
                      <td className="td-name">{cat}</td>
                      <td className="td-num" style={{ color:T.red }}>{ZAR(amt)}</td>
                      <td style={{ color:T.textMid, fontSize:13 }}>{expenses > 0 ? ((amt/expenses)*100).toFixed(1) : 0}%</td>
                      <td>
                        <div className="pbar">
                          <div className="pbar-fill pbar-gold" style={{ width:`${expenses>0?(amt/expenses)*100:0}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {catSummary.length===0 && <tr><td colSpan={4} style={{ textAlign:'center', padding:32, color:T.textLight }}>No expense categories yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1 — Manual Add / Edit Transaction
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing != null ? 'Edit Transaction' : 'Add Manual Transaction'}
        footer={<><button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveTxn}>Save Transaction</button></>}
      >
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="txn-date">Date</label>
            <input id="txn-date" type="date" value={form.date} onChange={F('date')} style={{ borderColor:formErrors.date?T.danger:undefined }} />
            {formErrors.date && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{formErrors.date}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="txn-type">Transaction Type</label>
            <select id="txn-type" value={form.type} onChange={e => { const t=e.target.value; setForm(f=>({...f,type:t,category:FINANCE_CATEGORIES[t]?.[0]||''})) }}>
              {Object.keys(FINANCE_CATEGORIES).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="txn-cat">Category</label>
            <select id="txn-cat" value={form.category} onChange={F('category')}>
              {(FINANCE_CATEGORIES[form.type]||[]).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="txn-amt">Amount (ZAR) <span style={{ color:T.danger }}>*</span></label>
            <input id="txn-amt" type="text" inputMode="decimal" placeholder="0" value={form.amount} onChange={F('amount')} style={{ borderColor:formErrors.amount?T.danger:undefined }} />
            {formErrors.amount && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{formErrors.amount}</div>}
          </div>
          <div className="form-field full">
            <label htmlFor="txn-desc">Description <span style={{ color:T.danger }}>*</span></label>
            <input id="txn-desc" value={form.description} onChange={F('description')} placeholder="e.g. Domain registration at Domains.co.za" style={{ borderColor:formErrors.description?T.danger:undefined }} />
            {formErrors.description && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{formErrors.description}</div>}
          </div>
          <div className="form-field"><label htmlFor="txn-sup">Supplier / Payee</label><input id="txn-sup" value={form.supplierPayee} onChange={F('supplierPayee')} /></div>
          <div className="form-field">
            <label htmlFor="txn-pm">Payment Method</label>
            <select id="txn-pm" value={form.paymentMethod} onChange={F('paymentMethod')}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-field"><label htmlFor="txn-inv">Invoice Number</label><input id="txn-inv" value={form.invoiceNumber||''} onChange={F('invoiceNumber')} placeholder="INV-001" /></div>
          <div className="form-field"><label htmlFor="txn-vat">VAT Amount (ZAR)</label><input id="txn-vat" type="text" inputMode="decimal" value={form.vatAmount||''} onChange={F('vatAmount')} placeholder="0" /></div>
          <div className="form-field full"><label htmlFor="txn-notes">Notes</label><textarea id="txn-notes" value={form.notes} onChange={F('notes')} /></div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2 — Import Wizard (upload + processing + CSV review)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal open={importOpen} onClose={() => { setImportOpen(false); if (importStep !== 'review_csv') cleanup() }}
        title="Import from Document" size="modal-lg"
        footer={importStep === 'review_csv' ? (
          <>
            <button className="btn btn-outline" onClick={() => { setImportOpen(false); setCsvRows([]); setImportStep('upload') }}>Cancel</button>
            <button className="btn btn-outline btn-sm" onClick={() => setCsvRows(r => r.map(x => ({...x,approved:true})))}>Approve All</button>
            <button className="btn btn-primary" onClick={approveCsvRows}>
              Save {csvRows.filter(r=>r.approved).length} Transactions
            </button>
          </>
        ) : null}
      >
        {/* Upload step */}
        {importStep === 'upload' && (
          <div>
            {!SUPABASE_CONFIGURED && (
              <div style={{ background:T.goldPale, border:`1px solid rgba(184,151,90,0.22)`, borderRadius:10, padding:'11px 15px', marginBottom:16, fontSize:12, color:'#6B4E10' }}>
                ℹ Cloud storage not connected. Files will be previewed locally without permanent storage.
              </div>
            )}
            {importError && (
              <div style={{ background:T.redPale, border:`1px solid rgba(185,28,28,0.2)`, borderRadius:10, padding:'11px 15px', marginBottom:16, fontSize:12, color:T.danger }}>
                ⚠ {importError}
              </div>
            )}
            {!OCR_AVAILABLE && (
              <div style={{ background:'rgba(161,161,170,0.1)', border:`1px solid rgba(161,161,170,0.2)`, borderRadius:10, padding:'11px 15px', marginBottom:16, fontSize:12, color:T.textMid }}>
                <strong>Manual review mode:</strong> AI extraction is not connected. You can upload any document — it will be previewed so you can capture fields manually. To enable automatic AI extraction, add <code>VITE_OCR_API_KEY</code> and <code>OCR_SECRET_KEY</code> to your environment variables.
              </div>
            )}
            <div
              style={{ border:`2px dashed rgba(210,200,184,0.7)`, borderRadius:14, padding:'44px 24px', textAlign:'center', cursor:'pointer' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){ const dt=new DataTransfer(); dt.items.add(f); fileRef.current.files=dt.files; handleFileSelected({target:fileRef.current}) } }}
            >
              <div style={{ fontSize:36, opacity:0.35, marginBottom:12 }}>📄</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, marginBottom:6 }}>Drop a file or click to browse</div>
              <div style={{ fontSize:12, color:T.textLight }}>PDF · Image · CSV</div>
              <button className="btn btn-primary" style={{ marginTop:16 }} onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>Choose File</button>
            </div>
            <div style={{ marginTop:18, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[
                { icon:'📊', label:'CSV / Bank Statement', desc:'All rows reviewed before saving' },
                { icon:'📄', label:'Text PDF / Invoice',   desc:'Fields extracted from PDF text' },
                { icon:'🖼', label:'Image / Scanned PDF',  desc: OCR_AVAILABLE ? 'AI Vision reads the document' : 'Manual field entry from preview' },
              ].map(r => (
                <div key={r.label} style={{ background:'rgba(228,221,208,0.4)', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:18, marginBottom:6 }}>{r.icon}</div>
                  <div style={{ fontWeight:600, fontSize:12, color:T.forest, marginBottom:3 }}>{r.label}</div>
                  <div style={{ fontSize:11, color:T.textMid }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing step */}
        {importStep === 'processing' && (
          <div style={{ textAlign:'center', padding:'48px 20px' }}>
            <div style={{ fontSize:44, marginBottom:14 }}>⏳</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.forest, marginBottom:12 }}>{processingMsg || 'Processing…'}</div>
            <div style={{ maxWidth:300, margin:'0 auto' }}>
              <div className="pbar" style={{ height:6 }}>
                <div className="pbar-fill pbar-gold" style={{ width:`${processingPct}%`, transition:'width 0.3s' }} />
              </div>
              <div style={{ fontSize:12, color:T.textLight, marginTop:8 }}>{processingPct}%</div>
            </div>
          </div>
        )}

        {/* CSV multi-row review */}
        {importStep === 'review_csv' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
              <div style={{ fontSize:13, color:T.textMid }}>
                <strong>{csvMeta.fileName}</strong> · {csvRows.length} rows · {csvRows.filter(r=>r.approved).length} approved
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-outline btn-xs" onClick={() => setCsvRows(r => r.map(x=>({...x,approved:true})))}>All ✓</button>
                <button className="btn btn-outline btn-xs" onClick={() => setCsvRows(r => r.map(x=>({...x,approved:false})))}>None</button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>✓</th><th>Date</th><th>Description</th><th>Amount</th><th>Payee</th><th>Type</th><th>Category</th><th>Conf.</th></tr></thead>
                <tbody>
                  {csvRows.map((row, i) => (
                    <tr key={row._id} style={{ opacity:row.approved?1:0.35 }}>
                      <td><input type="checkbox" checked={row.approved} onChange={e => setCsvRows(r => r.map((x,j)=>j===i?{...x,approved:e.target.checked}:x))} /></td>
                      <td style={{ fontSize:12 }}>
                        <input type="date" value={row.date} style={{ width:130, fontSize:11, padding:'2px 5px' }} onChange={e => setCsvRows(r => r.map((x,j)=>j===i?{...x,date:e.target.value}:x))} />
                      </td>
                      <td style={{ minWidth:160 }}>
                        <input value={row.description} style={{ fontSize:11, padding:'2px 5px', width:'100%' }} onChange={e => setCsvRows(r => r.map((x,j)=>j===i?{...x,description:e.target.value}:x))} />
                      </td>
                      <td>
                        <input type="text" inputMode="decimal" value={String(row.amount)} style={{ width:80, fontSize:12, padding:'2px 5px' }} onChange={e => setCsvRows(r => r.map((x,j)=>j===i?{...x,amount:parseFloat(e.target.value)||0}:x))} />
                      </td>
                      <td style={{ fontSize:12 }}>
                        <input value={row.supplierPayee} style={{ fontSize:11, padding:'2px 5px', width:90 }} onChange={e => setCsvRows(r => r.map((x,j)=>j===i?{...x,supplierPayee:e.target.value}:x))} />
                      </td>
                      <td>
                        <select value={row.type} style={{ fontSize:11, padding:'2px 5px' }} onChange={e => setCsvRows(r => r.map((x,j)=>j===i?{...x,type:e.target.value,category:FINANCE_CATEGORIES[e.target.value]?.[0]||''}:x))}>
                          {Object.keys(FINANCE_CATEGORIES).map(t => <option key={t}>{t}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={row.category} style={{ fontSize:11, padding:'2px 5px' }} onChange={e => setCsvRows(r => r.map((x,j)=>j===i?{...x,category:e.target.value}:x))}>
                          {(FINANCE_CATEGORIES[row.type]||[]).map(c => <option key={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        <span style={{ fontSize:10, fontWeight:600, color:CONF_COLORS[row.confidence]||T.textMid }}>
                          {row.confidence === 'High Confidence' ? '★★★' : row.confidence === 'Medium Confidence' ? '★★☆' : '★☆☆'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3 — Single Document Review (PDF / Image)
          Split: preview left, form right
      ═══════════════════════════════════════════════════════════════════════ */}
      {docReview && reviewForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && cleanup()}>
          <div
            className="modal"
            style={{ width:'min(96vw, 1100px)', maxHeight:'96vh', padding:0, display:'flex', flexDirection:'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding:'18px 24px', borderBottom:`1px solid rgba(210,200,184,0.5)`, display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                Review: {docReview.fileName}
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <span style={{ fontSize:11, color:CONF_COLORS[docReview.classified?.confidence]||T.textMid, fontWeight:700, alignSelf:'center' }}>
                  {docReview.classified?.confidence || 'Needs Review'}
                </span>
                <button className="modal-close" onClick={cleanup}>✕</button>
              </div>
            </div>

            {/* OCR / extraction status */}
            <div style={{ padding:'10px 24px', background: docReview.ocrUsed ? T.greenPale : 'rgba(228,221,208,0.5)', borderBottom:`1px solid rgba(210,200,184,0.4)`, fontSize:12, color: docReview.ocrUsed ? T.green : T.textMid, flexShrink:0 }}>
              {docReview.ocrUsed
                ? `✓ AI extracted data from this document. Review and correct the fields on the right before saving.`
                : docReview.isTextBased
                  ? `📄 Text extracted from PDF using pdf.js. Fields pre-filled using pattern matching — please verify accuracy.`
                  : ocrStatusNote().text
              }
              {docReview.ocrError && (
                <span style={{ color:T.danger, marginLeft:8 }}>⚠ {docReview.ocrError}</span>
              )}
            </div>

            {/* Body: preview + form */}
            <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

              {/* Preview panel */}
              <div style={{ flex:1, overflow:'auto', padding:16, borderRight:`1px solid rgba(210,200,184,0.4)`, display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:T.gold, fontWeight:700 }}>Document Preview</div>
                {docReview.previewUrl && (docReview.file.type === 'application/pdf' || docReview.fileName.endsWith('.pdf')) ? (
                  <iframe
                    src={docReview.previewUrl}
                    title="Document preview"
                    style={{ flex:1, width:'100%', minHeight:400, border:'none', borderRadius:8 }}
                  />
                ) : docReview.previewUrl ? (
                  <img src={docReview.previewUrl} alt="Document preview" style={{ maxWidth:'100%', borderRadius:8, boxShadow:'0 2px 12px rgba(0,0,0,0.1)' }} />
                ) : (
                  <div className="empty-st"><div className="empty-ic">📄</div><div>Preview not available</div></div>
                )}

                {/* Raw extracted text */}
                {docReview.rawText && (
                  <details>
                    <summary style={{ fontSize:11, color:T.textLight, cursor:'pointer', userSelect:'none' }}>Show extracted text</summary>
                    <pre style={{ fontSize:10, color:T.textMid, background:'rgba(228,221,208,0.4)', borderRadius:8, padding:10, maxHeight:140, overflow:'auto', fontFamily:'monospace', lineHeight:1.5, whiteSpace:'pre-wrap', marginTop:8 }}>
                      {docReview.rawText.substring(0, 1500)}{docReview.rawText.length > 1500 ? '\n…' : ''}
                    </pre>
                  </details>
                )}
              </div>

              {/* Review form */}
              <div style={{ width:340, flexShrink:0, overflow:'auto', padding:20 }}>
                <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:T.gold, fontWeight:700, marginBottom:14 }}>Transaction Details</div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div className="form-field">
                    <label htmlFor="rv-date">Date</label>
                    <input id="rv-date" type="date" value={reviewForm.date} onChange={RF('date')} style={{ borderColor:reviewErrors.date?T.danger:undefined }} />
                    {reviewErrors.date && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:2 }}>{reviewErrors.date}</div>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-type">Type</label>
                    <select id="rv-type" value={reviewForm.type} onChange={e => { const t=e.target.value; setReviewForm(f=>({...f,type:t,category:FINANCE_CATEGORIES[t]?.[0]||''})) }}>
                      {Object.keys(FINANCE_CATEGORIES).map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-cat">Category</label>
                    <select id="rv-cat" value={reviewForm.category} onChange={RF('category')}>
                      {(FINANCE_CATEGORIES[reviewForm.type]||[]).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-amt">Amount (ZAR) <span style={{ color:T.danger }}>*</span></label>
                    <input id="rv-amt" type="text" inputMode="decimal" value={reviewForm.amount} onChange={RF('amount')} style={{ borderColor:reviewErrors.amount?T.danger:undefined }} />
                    {reviewErrors.amount && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:2 }}>{reviewErrors.amount}</div>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-vat">VAT (ZAR)</label>
                    <input id="rv-vat" type="text" inputMode="decimal" value={reviewForm.vatAmount||''} onChange={RF('vatAmount')} placeholder="0" />
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-inv">Invoice Number</label>
                    <input id="rv-inv" value={reviewForm.invoiceNumber||''} onChange={RF('invoiceNumber')} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-sup">Supplier / Payee</label>
                    <input id="rv-sup" value={reviewForm.supplierPayee||''} onChange={RF('supplierPayee')} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-desc">Description <span style={{ color:T.danger }}>*</span></label>
                    <input id="rv-desc" value={reviewForm.description||''} onChange={RF('description')} style={{ borderColor:reviewErrors.description?T.danger:undefined }} />
                    {reviewErrors.description && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:2 }}>{reviewErrors.description}</div>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-pm">Payment Method</label>
                    <select id="rv-pm" value={reviewForm.paymentMethod} onChange={RF('paymentMethod')}>
                      {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-notes">Notes</label>
                    <textarea id="rv-notes" value={reviewForm.notes||''} onChange={RF('notes')} style={{ minHeight:50 }} />
                  </div>
                  <div style={{ fontSize:11, color:T.textLight }}>
                    Source: <strong style={{ color:T.forest }}>{reviewForm.sourceFile}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding:'14px 24px', borderTop:`1px solid rgba(210,200,184,0.5)`, display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0, flexWrap:'wrap' }}>
              <button className="btn btn-outline" onClick={cleanup}>Reject</button>
              <button className="btn btn-primary" onClick={approveSingleReview}>✓ Approve & Save Transaction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
