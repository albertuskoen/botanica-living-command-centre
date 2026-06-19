import { useState, useRef, useEffect } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, fmtDate, nextId, today } from '../utils/format.js'
import { FINANCE_CATEGORIES, PAYMENT_METHODS } from '../utils/data.js'
import Modal from '../components/Modal.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
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
const BLANK_TXN = {
  date: today(), type: 'Business Expense', category: 'Other Expense',
  description: '', amount: '', supplierPayee: '', paymentMethod: 'EFT', notes: '',
  sourceFile: '', invoiceNumber: '', vatAmount: '',
}
const CONF_COLOR = { 'High Confidence': T.forestLight, 'Medium Confidence': T.gold, 'Needs Review': T.danger }

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-CLASSIFY  – rules applied to any text blob
// ─────────────────────────────────────────────────────────────────────────────
function autoClassify(text, amount) {
  const d   = (text || '').toLowerCase()
  const amt = parseFloat(String(amount || 0).replace(/[^0-9.-]/g, '')) || 0

  // Type override first
  if (d.match(/capital|investment|owner deposit|transfer from owner/)) {
    return { type: 'Owner Investment', category: 'Owner Capital', confidence: 'High Confidence' }
  }
  if (d.match(/payment received|deposit from customer|sales invoice paid/)) {
    return { type: 'Business Income', category: 'Product Sales', confidence: 'Medium Confidence' }
  }

  // Expense categories
  let category   = 'Other Expense'
  let confidence = 'Needs Review'

  const rules = [
    [/cipc/,                                     'CIPC / Compliance',    'High Confidence'],
    [/sars|south african revenue|income tax/,    'SARS / Tax',           'High Confidence'],
    [/domain|email|domains\.co\.za|web hosting/, 'Domain & Email',       'High Confidence'],
    [/vercel|github|netlify|hosting|website/,    'Website & Digital',    'High Confidence'],
    [/dhl|fedex|courier|shipping|freight/,       'Freight & Courier',    'High Confidence'],
    [/customs|clearing|duty|import|excise/,      'Customs & Clearing',   'High Confidence'],
    [/sample|supplier sample|product sample/,    'Supplier Samples',     'High Confidence'],
    [/marketing|facebook|google ads|instagram/,  'Marketing',            'High Confidence'],
    [/packaging|assembly|pot |packing/,          'Assembly & Packaging', 'High Confidence'],
    [/bank fee|service fee|monthly fee|account fee/, 'Banking Fees',     'High Confidence'],
    [/travel|uber|petrol|fuel|accommodation/,    'Travel',               'Medium Confidence'],
    [/invoice|receipt|payment/,                  'Other Expense',        'Medium Confidence'],
  ]

  for (const [re, cat, conf] of rules) {
    if (re.test(d)) { category = cat; confidence = conf; break }
  }

  return { type: 'Business Expense', category, confidence }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT from raw OCR / CSV text  →  structured fields
// ─────────────────────────────────────────────────────────────────────────────
function extractFields(text) {
  const out = {
    supplierName:   '',
    invoiceNumber:  '',
    invoiceDate:    today(),
    totalAmount:    0,
    vatAmount:      0,
    description:    '',
    rawLines:       [],
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  out.rawLines = lines

  // Supplier name – first non-empty line that doesn't look like a header
  const skip = /invoice|receipt|tax invoice|statement|date|vat|reg|pty/i
  for (const l of lines.slice(0, 8)) {
    if (!skip.test(l) && l.length > 3 && l.length < 60) { out.supplierName = l; break }
  }

  // Invoice number
  const invMatch = text.match(/inv(?:oice)?\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9\-/]+)/i)
  if (invMatch) out.invoiceNumber = invMatch[1].trim()

  // Date – look for common formats
  const dateMatch = text.match(/\b(\d{1,2}[\s/-]\w+[\s/-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/)
  if (dateMatch) {
    try {
      const d = new Date(dateMatch[1])
      if (!isNaN(d)) out.invoiceDate = d.toISOString().split('T')[0]
    } catch {}
  }

  // Total amount – prefer lines with "total" label
  const totalMatch = text.match(/(?:total|amount due|grand total|balance due)[^\d]*R?\s*([\d\s,]+\.?\d*)/i)
  if (totalMatch) {
    out.totalAmount = parseFloat(totalMatch[1].replace(/[\s,]/g, '')) || 0
  } else {
    // Fallback: largest R amount in document
    const amounts = [...text.matchAll(/R\s?([\d,]+\.?\d*)/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => !isNaN(n) && n > 0)
    if (amounts.length) out.totalAmount = Math.max(...amounts)
  }

  // VAT
  const vatMatch = text.match(/(?:vat|tax)[^\d]*R?\s*([\d,]+\.?\d*)/i)
  if (vatMatch) out.vatAmount = parseFloat(vatMatch[1].replace(/,/g, '')) || 0

  // Description – concatenate meaningful lines
  out.description = lines
    .filter(l => l.length > 5 && l.length < 120 && !/^\d+$/.test(l))
    .slice(0, 4)
    .join(' · ')
    .substring(0, 200)

  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV PARSE  →  array of row objects
// ─────────────────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  // Auto-detect delimiter
  const delim = (lines[0].match(/\t/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? '\t' : ','
  const headers = lines[0].split(delim).map(h => h.replace(/"/g, '').trim().toLowerCase())

  return lines.slice(1).map((line, i) => {
    const cols   = line.split(delim).map(c => c.replace(/"/g, '').trim())
    const get    = (...keys) => { for (const k of keys) { const idx = headers.indexOf(k); if (idx !== -1 && cols[idx]) return cols[idx] } return '' }

    const desc   = get('description', 'narration', 'details', 'transaction description', 'reference') || cols[1] || cols[0] || ''
    const rawAmt = get('amount', 'debit', 'credit', 'value') || cols[2] || cols[3] || '0'
    const amount = Math.abs(parseFloat(rawAmt.replace(/[^0-9.-]/g, '')) || 0)
    const date   = get('date', 'transaction date', 'posting date') || cols[0] || today()
    const payee  = get('payee', 'merchant', 'supplier', 'beneficiary') || cols[4] || ''

    const classified = autoClassify(desc + ' ' + payee, amount)

    return {
      _id:          i + 1,
      date,
      description:  desc,
      amount,
      supplierPayee: payee,
      invoiceNumber: '',
      vatAmount:    0,
      sourceFile:   '',
      rawText:      desc,
      ...classified,
      approved:     amount > 0,
    }
  }).filter(r => r.amount > 0 || r.description)
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD pdf.js / Tesseract dynamically (CDN, no npm install needed)
// ─────────────────────────────────────────────────────────────────────────────
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
    s.onerror = reject
    document.head.appendChild(s)
  })
}

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js'
    s.onload = () => resolve(window.Tesseract)
    s.onerror = reject
    document.head.appendChild(s)
  })
}

async function extractTextFromPDF(file) {
  const pdfjsLib = await loadPdfJs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map(item => item.str).join(' ') + '\n'
  }
  return fullText.trim()
}

async function extractTextFromImage(file, onProgress) {
  const Tesseract = await loadTesseract()
  const result = await Tesseract.recognize(file, 'eng', {
    logger: m => { if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100)) },
  })
  return result.data.text
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FinanceCentre({ finance, setFinance }) {
  const [tab, setTab]               = useState('overview')
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(BLANK_TXN)
  const [filterType, setFilterType] = useState('All')

  // Import workflow state
  const [importWizard, setImportWizard] = useState(false)  // wizard open
  const [importStep,   setImportStep]   = useState('upload') // 'upload' | 'processing' | 'review'
  const [importRows,   setImportRows]   = useState([])
  const [importMeta,   setImportMeta]   = useState({ fileName:'', type:'csv', ocrNote:'' })
  const [processingPct, setProcessingPct] = useState(0)
  const [processingMsg, setProcessingMsg] = useState('')

  // Single-doc review (PDF/image → one transaction)
  const [singleReview, setSingleReview] = useState(null)   // null | { extracted, classified, fileName }

  const fileRef = useRef()

  // ── Aggregates (shared by manual + auto) ────────────────────────────────────
  const invested  = finance.filter(t => t.type === 'Owner Investment').reduce((s, t) => s + Number(t.amount), 0)
  const income    = finance.filter(t => t.type === 'Business Income').reduce((s, t)  => s + Number(t.amount), 0)
  const expenses  = finance.filter(t => t.type === 'Business Expense').reduce((s, t) => s + Number(t.amount), 0)
  const remaining = invested - expenses
  const net       = income - expenses

  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Manual add/edit/delete ──────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null)
    setForm({ ...BLANK_TXN, date: today() })
    setModal(true)
  }
  const openEdit = t => { setEditing(t.id); setForm(t); setModal(true) }

  const save = () => {
    if (!form.description || !form.amount) return
    const rec = {
      ...form,
      id:     editing || nextId(finance),
      amount: parseFloat(form.amount) || 0,
      source: editing ? form.source || 'manual' : 'manual',
    }
    editing
      ? setFinance(ff => ff.map(t => t.id === editing ? rec : t))
      : setFinance(ff => [...ff, rec])
    setModal(false)
  }

  const del = id => window.confirm('Delete transaction?') && setFinance(ff => ff.filter(t => t.id !== id))

  // ── File import entry point ─────────────────────────────────────────────────
  const handleFileSelected = async e => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    const ext  = file.name.split('.').pop().toLowerCase()
    const name = file.name

    // ── CSV ──
    if (ext === 'csv' || ext === 'tsv') {
      setImportMeta({ fileName: name, type: 'csv', ocrNote: '' })
      setImportStep('processing')
      setImportWizard(true)
      setProcessingMsg('Reading CSV…')
      setProcessingPct(30)
      const reader = new FileReader()
      reader.onload = ev => {
        const rows = parseCSV(ev.target.result)
        setImportRows(rows)
        setProcessingPct(100)
        setImportStep('review')
        setProcessingMsg('')
      }
      reader.readAsText(file)
      return
    }

    // ── Excel (xlsx) – read as CSV-like via text ──
    if (ext === 'xlsx' || ext === 'xls') {
      setImportMeta({ fileName: name, type: 'excel', ocrNote: 'Excel files are read as text. For best results use CSV export from your bank.' })
      setImportStep('processing')
      setImportWizard(true)
      setProcessingMsg('Reading Excel file…')
      setProcessingPct(40)
      const reader = new FileReader()
      reader.onload = ev => {
        // Basic text extraction from xlsx – works for simple sheets
        const raw = ev.target.result
        // Extract printable ASCII rows
        const textRows = raw.match(/[A-Za-z0-9 .,/\-:]{5,}/g) || []
        const fakeCSV  = textRows.join('\n')
        const rows     = parseCSV(fakeCSV).slice(0, 50)
        setImportRows(rows.length ? rows : [])
        setProcessingPct(100)
        setImportStep(rows.length ? 'review' : 'upload')
        if (!rows.length) {
          setImportMeta(m => ({ ...m, ocrNote: 'Could not extract rows from Excel. Please export as CSV from your bank and try again.' }))
        }
        setProcessingMsg('')
      }
      reader.readAsBinaryString(file)
      return
    }

    // ── PDF ──
    if (ext === 'pdf') {
      setImportMeta({ fileName: name, type: 'pdf', ocrNote: '' })
      setImportStep('processing')
      setImportWizard(true)
      setProcessingMsg('Loading PDF reader…')
      setProcessingPct(10)
      try {
        const text = await extractTextFromPDF(file)
        setProcessingPct(80)
        if (text.trim().length > 20) {
          // Text-based PDF
          const extracted   = extractFields(text)
          const classified  = autoClassify(text, extracted.totalAmount)
          setProcessingPct(100)
          setImportStep('single')
          setSingleReview({ extracted, classified, fileName: name, rawText: text })
          setImportWizard(false)
        } else {
          // Scanned PDF – try OCR on first page as image
          setProcessingMsg('No text found. Attempting OCR…')
          setProcessingPct(50)
          try {
            await loadTesseract()
            const arrayBuffer = await file.arrayBuffer()
            const pdfjsLib    = await loadPdfJs()
            const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
            const page        = await pdf.getPage(1)
            const viewport    = page.getViewport({ scale: 2 })
            const canvas      = document.createElement('canvas')
            canvas.width      = viewport.width
            canvas.height     = viewport.height
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
            const blob        = await new Promise(res => canvas.toBlob(res, 'image/png'))
            const ocrText     = await extractTextFromImage(blob, pct => setProcessingPct(50 + Math.round(pct / 2)))
            const extracted   = extractFields(ocrText)
            const classified  = autoClassify(ocrText, extracted.totalAmount)
            setSingleReview({ extracted, classified, fileName: name, rawText: ocrText, ocrUsed: true })
            setImportStep('single')
            setImportWizard(false)
          } catch {
            setImportMeta(m => ({ ...m, ocrNote: 'Scanned document reading may need future cloud AI support. Please add the transaction manually.' }))
            setImportStep('upload')
          }
        }
      } catch (err) {
        setImportMeta(m => ({ ...m, ocrNote: `PDF reading failed: ${err.message}. Try CSV or add manually.` }))
        setImportStep('upload')
      }
      setProcessingMsg('')
      return
    }

    // ── Image (JPG, PNG, WEBP) ──
    if (['jpg','jpeg','png','webp','gif','bmp','tiff'].includes(ext)) {
      setImportMeta({ fileName: name, type: 'image', ocrNote: '' })
      setImportStep('processing')
      setImportWizard(true)
      setProcessingMsg('Loading OCR engine…')
      setProcessingPct(5)
      try {
        const ocrText   = await extractTextFromImage(file, pct => {
          setProcessingPct(5 + Math.round(pct * 0.9))
          setProcessingMsg(`Reading document… ${pct}%`)
        })
        const extracted  = extractFields(ocrText)
        const classified = autoClassify(ocrText, extracted.totalAmount)
        setProcessingPct(100)
        setImportStep('single')
        setSingleReview({ extracted, classified, fileName: name, rawText: ocrText, ocrUsed: true })
        setImportWizard(false)
      } catch (err) {
        setImportMeta(m => ({ ...m, ocrNote: `OCR failed: ${err.message}. Please add manually.` }))
        setImportStep('upload')
      }
      setProcessingMsg('')
      return
    }

    alert(`Unsupported file type: .${ext}\nPlease upload CSV, Excel, PDF, JPG, or PNG.`)
  }

  // ── Approve CSV/Excel multi-row import ──────────────────────────────────────
  const approveMultiImport = () => {
    const base = nextId(finance)
    const records = importRows
      .filter(r => r.approved && r.amount > 0)
      .map((r, i) => ({
        id:            base + i,
        date:          r.date || today(),
        type:          r.type,
        category:      r.category,
        description:   r.description,
        amount:        r.amount,
        supplierPayee: r.supplierPayee,
        paymentMethod: 'EFT',
        invoiceNumber: r.invoiceNumber || '',
        vatAmount:     r.vatAmount || 0,
        sourceFile:    importMeta.fileName,
        source:        'import',
        notes:         `Auto-imported · ${r.confidence}`,
      }))
    setFinance(ff => [...ff, ...records])
    setImportWizard(false)
    setImportRows([])
    setImportStep('upload')
  }

  // ── Approve single-doc review ────────────────────────────────────────────────
  const [singleForm, setSingleForm] = useState(null)

  useEffect(() => {
    if (singleReview) {
      const { extracted, classified, fileName } = singleReview
      setSingleForm({
        date:          extracted.invoiceDate || today(),
        type:          classified.type,
        category:      classified.category,
        description:   extracted.description || extracted.supplierName,
        amount:        extracted.totalAmount || '',
        supplierPayee: extracted.supplierName,
        paymentMethod: 'EFT',
        invoiceNumber: extracted.invoiceNumber,
        vatAmount:     extracted.vatAmount || 0,
        sourceFile:    fileName,
        notes:         `${classified.confidence} · OCR: ${singleReview.ocrUsed ? 'Yes' : 'No'}`,
        source:        'import',
      })
    }
  }, [singleReview])

  const approveSingle = () => {
    if (!singleForm) return
    const rec = {
      ...singleForm,
      id:     nextId(finance),
      amount: parseFloat(singleForm.amount) || 0,
    }
    setFinance(ff => [...ff, rec])
    setSingleReview(null)
    setSingleForm(null)
  }

  // ── Computed summaries ──────────────────────────────────────────────────────
  const monthly = {}
  finance.forEach(t => {
    const key = t.date ? t.date.substring(0, 7) : 'Unknown'
    if (!monthly[key]) monthly[key] = { inv: 0, inc: 0, exp: 0 }
    if (t.type === 'Owner Investment') monthly[key].inv += Number(t.amount)
    else if (t.type === 'Business Income') monthly[key].inc += Number(t.amount)
    else monthly[key].exp += Number(t.amount)
  })

  const catSummary = {}
  finance.filter(t => t.type === 'Business Expense').forEach(t => {
    catSummary[t.category] = (catSummary[t.category] || 0) + Number(t.amount)
  })
  const catRows = Object.entries(catSummary).sort((a, b) => b[1] - a[1])

  const topCat = catRows[0]?.[0] || 'No expenses yet'
  const insight = `Botanica Living Group has received ${ZAR(invested)} in owner investment to date and spent ${ZAR(expenses)}. ${topCat !== 'No expenses yet' ? `The largest expense category is ${topCat}.` : ''} Remaining owner-funded balance is ${ZAR(remaining)}. ${income === 0 ? 'No business income has been recorded yet.' : `Business income to date: ${ZAR(income)}.`} Net business position: ${ZAR(net)}.`

  const visibleTxns = filterType === 'All' ? finance : finance.filter(t => t.type === filterType)
  const sorted      = [...visibleTxns].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const SF = k => e => setSingleForm(f => ({ ...f, [k]: e.target.value }))

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Finance Centre</div>
          <div className="page-subtitle">Owner Investment · Income · Expenses</div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button className="btn btn-primary" onClick={openNew}>+ Add Manual Transaction</button>
          <button
            className="btn btn-outline"
            style={{ borderColor: T.gold, color: T.forest }}
            onClick={() => { setImportStep('upload'); setImportWizard(true) }}
          >
            ⬆ Auto Import from Document
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp" style={{ display:'none' }} onChange={handleFileSelected} />
        </div>
      </div>

      {/* ── KPI Bar ─────────────────────────────────────────────────────────── */}
      <div style={{ padding:'18px 36px 0', background: T.white, borderBottom:`1px solid ${T.beigeDeep}` }}>
        <div className="grid-5" style={{ paddingBottom: 18 }}>
          {[
            { label:'Owner Investment', val: ZAR(invested),  color: T.teal,   cls:'fin-kpi-inv' },
            { label:'Business Income',  val: ZAR(income),    color: T.green,  cls:'fin-kpi-inc' },
            { label:'Total Expenses',   val: ZAR(expenses),  color: T.red,    cls:'fin-kpi-exp' },
            { label:'Remaining Funds',  val: ZAR(remaining), color: T.gold,   cls:'fin-kpi-rem' },
            { label:'Net Position',     val: ZAR(net),       color: net >= 0 ? T.forest : T.danger, cls:'fin-kpi-net' },
          ].map(k => (
            <div key={k.label} className={`stat-card ${k.cls}`}>
              <div className="card-label">{k.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:k.color, lineHeight:1, marginTop:6 }}>{k.val}</div>
              {k.label === 'Remaining Funds' && invested > 0 && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width:`${Math.min(100, Math.max(0, (remaining/invested)*100))}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="page-content">
        <div className="tabs">
          {['overview','transactions','monthly','categories'].map(t => (
            <div key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </div>
          ))}
        </div>

        {/* ── Overview ──────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="grid-2 gap-16">
            <div className="insight-box">
              <div className="insight-label">AI-Style Finance Insight</div>
              <div className="insight-text">{insight}</div>
            </div>
            <div className="card">
              <div className="section-label">Project-to-Date Summary</div>
              {[
                { label:'Total Owner Investment', val:ZAR(invested),  color:T.teal },
                { label:'Total Business Income',  val:ZAR(income),    color:T.green },
                { label:'Total Expenses',         val:ZAR(expenses),  color:T.red },
                { label:'Remaining Owner Funds',  val:ZAR(remaining), color:T.gold },
                { label:'Net Business Position',  val:ZAR(net),       color:net >= 0 ? T.forest : T.danger },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid ${T.beige}` }}>
                  <span style={{ fontSize:13, color:T.textMid }}>{r.label}</span>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Transactions ──────────────────────────────────────────────────── */}
        {tab === 'transactions' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              {['All','Owner Investment','Business Income','Business Expense'].map(t => (
                <button key={t} className={`btn btn-sm ${filterType===t?'btn-primary':'btn-outline'}`} onClick={() => setFilterType(t)}>{t}</button>
              ))}
            </div>
            {sorted.length === 0
              ? (
                <div className="empty-state">
                  <div className="empty-icon">₩</div>
                  <div>No transactions yet.</div>
                  <div style={{ marginTop:12, display:'flex', gap:10, justifyContent:'center' }}>
                    <button className="btn btn-primary btn-sm" onClick={openNew}>Add Manual Transaction</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setImportStep('upload'); setImportWizard(true) }}>Import from Document</button>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding:0 }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Payee</th><th>Inv #</th><th>Amount</th><th>Source</th><th></th></tr>
                      </thead>
                      <tbody>
                        {sorted.map(t => (
                          <tr key={t.id}>
                            <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{fmtDate(t.date)}</td>
                            <td>
                              <span style={{ background:TYPE_BG[t.type], color:TYPE_COLORS[t.type], padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:500, whiteSpace:'nowrap' }}>
                                {t.type === 'Owner Investment' ? 'Investment' : t.type === 'Business Income' ? 'Income' : 'Expense'}
                              </span>
                            </td>
                            <td style={{ fontSize:12, color:T.textMid }}>{t.category}</td>
                            <td className="td-name" style={{ fontSize:13, maxWidth:200 }}>{t.description}</td>
                            <td style={{ fontSize:12, color:T.textLight }}>{t.supplierPayee}</td>
                            <td style={{ fontSize:11, color:T.textLight, fontFamily:'monospace' }}>{t.invoiceNumber || '—'}</td>
                            <td style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:TYPE_COLORS[t.type], whiteSpace:'nowrap' }}>{ZAR(t.amount)}</td>
                            <td>
                              {t.source === 'import'
                                ? <span className="badge badge-blue" style={{ fontSize:10 }}>Imported</span>
                                : <span className="badge badge-grey" style={{ fontSize:10 }}>Manual</span>
                              }
                            </td>
                            <td>
                              <div style={{ display:'flex', gap:4 }}>
                                <button className="btn btn-outline btn-xs" onClick={() => openEdit(t)}>Edit</button>
                                <button className="btn btn-xs" style={{ background:'transparent', border:'none', cursor:'pointer', color:T.textLight }} onClick={() => del(t.id)}>✕</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          </>
        )}

        {/* ── Monthly ───────────────────────────────────────────────────────── */}
        {tab === 'monthly' && (
          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Month</th><th>Owner Investment</th><th>Business Income</th><th>Expenses</th><th>Remaining</th><th>Net</th></tr>
                </thead>
                <tbody>
                  {Object.entries(monthly).sort((a, b) => b[0].localeCompare(a[0])).map(([month, m]) => (
                    <tr key={month}>
                      <td className="td-name">{month}</td>
                      <td style={{ color:T.teal,   fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(m.inv)}</td>
                      <td style={{ color:T.green,  fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(m.inc)}</td>
                      <td style={{ color:T.red,    fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(m.exp)}</td>
                      <td style={{ color:T.gold,   fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(m.inv - m.exp)}</td>
                      <td style={{ color:(m.inc - m.exp) >= 0 ? T.forest : T.danger, fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(m.inc - m.exp)}</td>
                    </tr>
                  ))}
                  {Object.keys(monthly).length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:T.textLight }}>No transactions recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Categories ────────────────────────────────────────────────────── */}
        {tab === 'categories' && (
          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Category</th><th>Total Spend</th><th>% of Expenses</th><th>Bar</th></tr></thead>
                <tbody>
                  {catRows.map(([cat, amt]) => (
                    <tr key={cat}>
                      <td className="td-name">{cat}</td>
                      <td style={{ color:T.red, fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(amt)}</td>
                      <td style={{ color:T.textMid, fontSize:13 }}>{expenses > 0 ? ((amt/expenses)*100).toFixed(1) : 0}%</td>
                      <td style={{ width:180 }}>
                        <div style={{ height:6, background:T.beige, borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${expenses > 0 ? (amt/expenses)*100 : 0}%`, background:T.gold, borderRadius:3 }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {catRows.length === 0 && <tr><td colSpan={4} style={{ textAlign:'center', padding:32, color:T.textLight }}>No expense categories yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1 — Manual Add / Edit Transaction
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Transaction' : 'Add Manual Transaction'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save Transaction</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-field"><label>Date</label><input type="date" value={form.date} onChange={F('date')} /></div>
          <div className="form-field">
            <label>Transaction Type</label>
            <select value={form.type} onChange={e => {
              const type = e.target.value
              const firstCat = FINANCE_CATEGORIES[type]?.[0] || ''
              setForm(f => ({ ...f, type, category: firstCat }))
            }}>
              {Object.keys(FINANCE_CATEGORIES).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Category</label>
            <select value={form.category} onChange={F('category')}>
              {(FINANCE_CATEGORIES[form.type] || []).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Amount (ZAR)</label>
            <input type="text" inputMode="decimal" placeholder="0" value={form.amount} onChange={F('amount')} />
          </div>
          <div className="form-field full">
            <label>Description</label>
            <input value={form.description} onChange={F('description')} placeholder="e.g. Domain registration at Domains.co.za" />
          </div>
          <div className="form-field"><label>Supplier / Payee</label><input value={form.supplierPayee} onChange={F('supplierPayee')} /></div>
          <div className="form-field">
            <label>Payment Method</label>
            <select value={form.paymentMethod} onChange={F('paymentMethod')}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Invoice Number (optional)</label><input value={form.invoiceNumber || ''} onChange={F('invoiceNumber')} placeholder="INV-001" /></div>
          <div className="form-field"><label>VAT Amount (optional)</label><input type="text" inputMode="decimal" value={form.vatAmount || ''} onChange={F('vatAmount')} placeholder="0.00" /></div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes} onChange={F('notes')} /></div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2 — Import Wizard  (upload / processing / CSV review)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        open={importWizard}
        onClose={() => { setImportWizard(false); setImportStep('upload'); setImportRows([]) }}
        title="Auto Import from Document"
        size="modal-lg"
        footer={
          importStep === 'review' ? (
            <>
              <button className="btn btn-outline" onClick={() => { setImportWizard(false); setImportRows([]) }}>Cancel</button>
              <button className="btn btn-outline btn-sm" onClick={() => setImportRows(rows => rows.map(r => ({ ...r, approved: true })))}>Approve All</button>
              <button className="btn btn-primary" onClick={approveMultiImport}>
                Save Approved ({importRows.filter(r => r.approved).length})
              </button>
            </>
          ) : null
        }
      >
        {/* ── Step: Upload ── */}
        {importStep === 'upload' && (
          <div>
            <div style={{ background: T.goldPale, borderRadius:10, padding:'14px 18px', marginBottom:20, fontSize:13, color:'#5a4010' }}>
              <strong>Supported formats:</strong> CSV bank statement · Excel (.xlsx) · PDF invoice · JPG / PNG receipt
            </div>

            {importMeta.ocrNote && (
              <div style={{ background:'rgba(139,58,58,0.08)', border:`1px solid rgba(139,58,58,0.2)`, borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:T.danger }}>
                ⚠ {importMeta.ocrNote}
              </div>
            )}

            {/* Drop zone */}
            <div
              style={{ border:`2px dashed ${T.beigeDeep}`, borderRadius:12, padding:'48px 24px', textAlign:'center', cursor:'pointer', transition:'border-color 0.15s' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const dt = new DataTransfer(); dt.items.add(f); fileRef.current.files = dt.files; handleFileSelected({ target: fileRef.current }) } }}
            >
              <div style={{ fontSize:40, marginBottom:12, color:T.beigeDeep }}>📄</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.forest, marginBottom:8 }}>Drop file here or click to browse</div>
              <div style={{ fontSize:12, color:T.textLight }}>PDF · Image · CSV · Excel</div>
              <button className="btn btn-primary" style={{ marginTop:16 }} onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>Choose File</button>
            </div>

            <div style={{ marginTop:20, background:T.beige, borderRadius:10, padding:'14px 18px' }}>
              <div style={{ fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:T.gold, fontWeight:600, marginBottom:10 }}>What happens after upload</div>
              {[
                { icon:'📊', label:'CSV / Excel', desc:'All rows extracted and auto-classified. Review and approve each line.' },
                { icon:'📄', label:'Text PDF (invoice/quote)', desc:'Supplier, date, amount and VAT extracted. Single transaction review.' },
                { icon:'🖼', label:'Scanned PDF / Image receipt', desc:'OCR reads the document. Review extracted data before saving.' },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:`1px solid ${T.beigeDeep}` }}>
                  <span style={{ fontSize:18 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight:500, fontSize:13 }}>{r.label}</div>
                    <div style={{ fontSize:12, color:T.textMid }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Processing ── */}
        {importStep === 'processing' && (
          <div style={{ textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>⏳</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:T.forest, marginBottom:8 }}>
              {processingMsg || 'Processing document…'}
            </div>
            <div style={{ maxWidth:320, margin:'0 auto' }}>
              <div style={{ height:6, background:T.beige, borderRadius:3, overflow:'hidden', marginTop:16 }}>
                <div style={{ height:'100%', width:`${processingPct}%`, background:`linear-gradient(90deg,${T.gold},${T.goldLight})`, borderRadius:3, transition:'width 0.3s' }} />
              </div>
              <div style={{ fontSize:12, color:T.textLight, marginTop:8 }}>{processingPct}%</div>
            </div>
          </div>
        )}

        {/* ── Step: CSV/Excel Multi-row Review ── */}
        {importStep === 'review' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <div style={{ fontSize:13, color:T.textMid }}>
                <strong>{importMeta.fileName}</strong> · {importRows.length} rows found · {importRows.filter(r => r.approved).length} approved
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-outline btn-xs" onClick={() => setImportRows(rows => rows.map(r => ({ ...r, approved: true })))}>All ✓</button>
                <button className="btn btn-outline btn-xs" onClick={() => setImportRows(rows => rows.map(r => ({ ...r, approved: false })))}>None</button>
              </div>
            </div>
            {importMeta.ocrNote && (
              <div style={{ background:T.goldPale, borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#5a4010' }}>ℹ {importMeta.ocrNote}</div>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>✓</th><th>Date</th><th>Description</th><th>Amount</th><th>Payee</th><th>Type</th><th>Category</th><th>Conf.</th></tr>
                </thead>
                <tbody>
                  {importRows.map((row, i) => (
                    <tr key={row._id} style={{ opacity: row.approved ? 1 : 0.35 }}>
                      <td>
                        <input type="checkbox" checked={row.approved} onChange={e => setImportRows(rows => rows.map((r, j) => j === i ? { ...r, approved: e.target.checked } : r))} />
                      </td>
                      <td style={{ fontSize:12 }}>
                        <input type="date" value={row.date} style={{ width:130, fontSize:11, padding:'2px 4px' }}
                          onChange={e => setImportRows(rows => rows.map((r, j) => j === i ? { ...r, date: e.target.value } : r))} />
                      </td>
                      <td style={{ fontSize:12, maxWidth:180 }}>
                        <input value={row.description} style={{ fontSize:11, padding:'2px 4px', width:'100%' }}
                          onChange={e => setImportRows(rows => rows.map((r, j) => j === i ? { ...r, description: e.target.value } : r))} />
                      </td>
                      <td style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, whiteSpace:'nowrap' }}>
                        <input type="number" value={row.amount} style={{ width:90, fontSize:12, padding:'2px 4px', fontFamily:'inherit' }}
                          onChange={e => setImportRows(rows => rows.map((r, j) => j === i ? { ...r, amount: parseFloat(e.target.value)||0 } : r))} />
                      </td>
                      <td style={{ fontSize:12 }}>
                        <input value={row.supplierPayee} style={{ fontSize:11, padding:'2px 4px', width:100 }}
                          onChange={e => setImportRows(rows => rows.map((r, j) => j === i ? { ...r, supplierPayee: e.target.value } : r))} />
                      </td>
                      <td>
                        <select value={row.type} style={{ fontSize:11, padding:'2px 4px' }}
                          onChange={e => setImportRows(rows => rows.map((r, j) => j === i ? { ...r, type: e.target.value, category: FINANCE_CATEGORIES[e.target.value]?.[0] || '' } : r))}>
                          {Object.keys(FINANCE_CATEGORIES).map(t => <option key={t}>{t}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={row.category} style={{ fontSize:11, padding:'2px 4px' }}
                          onChange={e => setImportRows(rows => rows.map((r, j) => j === i ? { ...r, category: e.target.value } : r))}>
                          {(FINANCE_CATEGORIES[row.type] || []).map(c => <option key={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        <span style={{ fontSize:10, fontWeight:500, color: CONF_COLOR[row.confidence] || T.textMid }}>
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
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        open={!!singleReview && !!singleForm}
        onClose={() => { setSingleReview(null); setSingleForm(null) }}
        title="Review Extracted Transaction"
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setSingleReview(null); setSingleForm(null) }}>Reject</button>
            <button className="btn btn-primary" onClick={approveSingle}>Approve & Save Transaction</button>
          </>
        }
      >
        {singleReview && singleForm && (
          <div>
            {/* File info + OCR note */}
            <div style={{ background:T.beige, borderRadius:10, padding:'12px 16px', marginBottom:18, display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:24 }}>{singleReview.ocrUsed ? '🖼' : '📄'}</span>
              <div>
                <div style={{ fontWeight:500, fontSize:13 }}>{singleReview.fileName}</div>
                <div style={{ fontSize:11, color:T.textMid }}>
                  {singleReview.ocrUsed ? 'Read via OCR — please verify all fields carefully.' : 'Text extracted from PDF — verify before saving.'}
                  {' '}Confidence: <span style={{ color: CONF_COLOR[singleReview.classified?.confidence] || T.textMid, fontWeight:600 }}>{singleReview.classified?.confidence}</span>
                </div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="form-field">
                <label>Invoice / Document Date</label>
                <input type="date" value={singleForm.date} onChange={SF('date')} />
              </div>
              <div className="form-field">
                <label>Transaction Type</label>
                <select value={singleForm.type} onChange={e => {
                  const type = e.target.value
                  setSingleForm(f => ({ ...f, type, category: FINANCE_CATEGORIES[type]?.[0] || '' }))
                }}>
                  {Object.keys(FINANCE_CATEGORIES).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Category</label>
                <select value={singleForm.category} onChange={SF('category')}>
                  {(FINANCE_CATEGORIES[singleForm.type] || []).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Amount (ZAR)</label>
                <input type="text" inputMode="decimal" value={singleForm.amount} onChange={SF('amount')} />
              </div>
              <div className="form-field">
                <label>VAT Amount (ZAR)</label>
                <input type="text" inputMode="decimal" value={singleForm.vatAmount || ''} onChange={SF('vatAmount')} placeholder="0.00" />
              </div>
              <div className="form-field">
                <label>Invoice Number</label>
                <input value={singleForm.invoiceNumber || ''} onChange={SF('invoiceNumber')} />
              </div>
              <div className="form-field" style={{ gridColumn:'1/-1' }}>
                <label>Supplier / Payee</label>
                <input value={singleForm.supplierPayee || ''} onChange={SF('supplierPayee')} />
              </div>
              <div className="form-field" style={{ gridColumn:'1/-1' }}>
                <label>Description</label>
                <input value={singleForm.description || ''} onChange={SF('description')} />
              </div>
              <div className="form-field">
                <label>Payment Method</label>
                <select value={singleForm.paymentMethod} onChange={SF('paymentMethod')}>
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Source File</label>
                <input value={singleForm.sourceFile || ''} readOnly style={{ color:T.textLight, background:T.beige }} />
              </div>
              <div className="form-field" style={{ gridColumn:'1/-1' }}>
                <label>Notes</label>
                <textarea value={singleForm.notes || ''} onChange={SF('notes')} style={{ minHeight:60 }} />
              </div>
            </div>

            {/* Raw extracted text */}
            {singleReview.rawText && (
              <details style={{ marginTop:16 }}>
                <summary style={{ fontSize:11, color:T.textLight, cursor:'pointer', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  Show raw extracted text
                </summary>
                <div style={{ background:T.beige, borderRadius:8, padding:'10px 14px', marginTop:8, fontSize:11, color:T.textMid, whiteSpace:'pre-wrap', maxHeight:160, overflow:'auto', fontFamily:'monospace', lineHeight:1.6 }}>
                  {singleReview.rawText.substring(0, 1200)}
                  {singleReview.rawText.length > 1200 ? '\n…' : ''}
                </div>
              </details>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
