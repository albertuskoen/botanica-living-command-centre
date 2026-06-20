// FinanceCentre.jsx — v1.6
// ✅ REAL IMPLEMENTATIONS:
//   • Manual transaction entry — always works
//   • IndexedDB file storage (via fileStore.js) — works now, no setup
//   • PDF text extraction via pdf.js — works now (text-based PDFs)
//   • In-browser OCR via Tesseract.js — works now (images & scanned PDFs)
//   • Side-by-side review screen (preview left, form right)
//   • CSV bulk import with editable review table
//   • Transaction → document linking
// 🔑 SETUP REQUIRED:
//   • AI-enhanced extraction via /api/extract — requires OCR_SECRET_KEY in Vercel
//   • Supabase sync — requires VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

import { useState, useRef, useCallback, useMemo } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, fmtDate, nextId, today, parseNum, safeAmount } from '../utils/format.js'
import { FINANCE_CATEGORIES, PAYMENT_METHODS } from '../utils/data.js'
import Modal from '../components/Modal.jsx'
import { storeFile, createObjectURL, downloadFileById, formatBytes as fbytes } from '../lib/fileStore.js'
import { OCR_AVAILABLE, extractPdfText, pdfPageToImageBlob, ocrImage, extractCsvRows, heuristicExtract, classifyText, extractViaBackend } from '../lib/ocr.js'
import { SUPABASE_CONFIGURED } from '../lib/supabase.js'

// ── Constants ──────────────────────────────────────────────────────────────────
const TYPE_COLORS = { 'Owner Investment':T.teal, 'Business Income':T.green, 'Business Expense':T.red }
const TYPE_BG     = { 'Owner Investment':T.tealPale, 'Business Income':T.greenPale, 'Business Expense':T.redPale }
const CONF_COLORS = { 'High Confidence':T.green, 'Medium Confidence':T.gold, 'Needs Review':T.danger }
const BLANK_TXN   = { date:today(), type:'Business Expense', category:'Other Expense', description:'', amount:'', supplierPayee:'', paymentMethod:'EFT', notes:'', invoiceNumber:'', vatAmount:'' }

// ── Safe aggregation ───────────────────────────────────────────────────────────
const sumType = (fin, type) => (Array.isArray(fin)?fin:[]).filter(t=>t?.type===type).reduce((s,t)=>s+safeAmount(t?.amount),0)

// ── Validation ─────────────────────────────────────────────────────────────────
function validateTxn(form) {
  const e = {}
  if (!form.description?.trim()) e.description = 'Description is required'
  if (!form.amount || parseNum(form.amount) <= 0) e.amount = 'Amount must be greater than zero'
  if (!form.date || isNaN(new Date(form.date).getTime())) e.date = 'Valid date required'
  return e
}

// ── Type badge ─────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  return (
    <span style={{ background:TYPE_BG[type], color:TYPE_COLORS[type], padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
      {type==='Owner Investment'?'Investment':type==='Business Income'?'Income':'Expense'}
    </span>
  )
}

// ── Source badge ───────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  if (source==='ocr')    return <span className="badge badge-teal"  style={{ fontSize:10 }}>AI OCR</span>
  if (source==='tesseract') return <span className="badge badge-teal" style={{ fontSize:10 }}>OCR</span>
  if (source==='import') return <span className="badge badge-blue"  style={{ fontSize:10 }}>Import</span>
  return                        <span className="badge badge-grey"  style={{ fontSize:10 }}>Manual</span>
}

// ── CSV row component (inline-editable) ────────────────────────────────────────
function CSVRow({ row, i, onChange }) {
  const set = (k,v) => onChange(i, k, v)
  return (
    <tr style={{ opacity:row.approved?1:0.38 }}>
      <td><input type="checkbox" checked={row.approved} onChange={e=>set('approved',e.target.checked)} /></td>
      <td><input type="date"   value={row.date}          style={{ width:130, fontSize:11, padding:'2px 5px' }} onChange={e=>set('date',e.target.value)} /></td>
      <td><input value={row.description} style={{ fontSize:11, padding:'2px 5px', width:'100%', minWidth:140 }} onChange={e=>set('description',e.target.value)} /></td>
      <td><input type="text" inputMode="decimal" value={String(row.amount)} style={{ width:80, fontSize:12, padding:'2px 5px' }} onChange={e=>set('amount',parseFloat(e.target.value)||0)} /></td>
      <td><input value={row.supplierPayee||''} style={{ fontSize:11, padding:'2px 5px', width:90 }} onChange={e=>set('supplierPayee',e.target.value)} /></td>
      <td>
        <select value={row.type} style={{ fontSize:11, padding:'2px 5px' }} onChange={e=>{ set('type',e.target.value); set('category',FINANCE_CATEGORIES[e.target.value]?.[0]||'') }}>
          {Object.keys(FINANCE_CATEGORIES).map(t=><option key={t}>{t}</option>)}
        </select>
      </td>
      <td>
        <select value={row.category} style={{ fontSize:11, padding:'2px 5px' }} onChange={e=>set('category',e.target.value)}>
          {(FINANCE_CATEGORIES[row.type]||[]).map(c=><option key={c}>{c}</option>)}
        </select>
      </td>
      <td><span style={{ fontSize:10, fontWeight:600, color:CONF_COLORS[row.confidence]||T.textMid }}>{row.confidence==='High Confidence'?'★★★':row.confidence==='Medium Confidence'?'★★☆':'★☆☆'}</span></td>
    </tr>
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

  // ── Import wizard ────────────────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState('upload')  // upload | processing | review_csv
  const [processMsg, setProcessMsg] = useState('')
  const [processPct, setProcessPct] = useState(0)
  const [importErr,  setImportErr]  = useState('')
  const [csvRows,    setCsvRows]    = useState([])
  const [csvMeta,    setCsvMeta]    = useState({ fileName:'' })

  // ── Document review (single PDF/image) ──────────────────────────────────────
  // Opens as full-screen split: preview left, form right
  const [reviewOpen,    setReviewOpen]    = useState(false)
  const [reviewInfo,    setReviewInfo]    = useState(null)   // { fileName, docId, ocrMethod, confidence, rawText }
  const [reviewPreview, setReviewPreview] = useState(null)   // { url, type } blob URL
  const [reviewForm,    setReviewForm]    = useState(null)
  const [reviewErrors,  setReviewErrors]  = useState({})
  const previewUrlRef = useRef(null)

  const fileRef = useRef()

  // ── Aggregates ───────────────────────────────────────────────────────────────
  const invested  = useMemo(() => sumType(finance,'Owner Investment'), [finance])
  const income    = useMemo(() => sumType(finance,'Business Income'),  [finance])
  const expenses  = useMemo(() => sumType(finance,'Business Expense'), [finance])
  const remaining = invested - expenses
  const net       = income - expenses

  const monthly = useMemo(() => {
    const m = {}
    ;(Array.isArray(finance)?finance:[]).forEach(t => {
      const key = (t?.date||'').substring(0,7)||'Unknown'
      if (!m[key]) m[key]={inv:0,inc:0,exp:0}
      if (t?.type==='Owner Investment') m[key].inv += safeAmount(t.amount)
      else if (t?.type==='Business Income') m[key].inc += safeAmount(t.amount)
      else m[key].exp += safeAmount(t.amount)
    })
    return m
  }, [finance])

  const catSummary = useMemo(() => {
    const c = {}
    ;(Array.isArray(finance)?finance:[]).filter(t=>t?.type==='Business Expense').forEach(t => { c[t.category]=(c[t.category]||0)+safeAmount(t.amount) })
    return Object.entries(c).sort((a,b)=>b[1]-a[1])
  }, [finance])

  const visibleTxns = useMemo(() => {
    const list = Array.isArray(finance)?finance:[]
    return (filterType==='All'?list:list.filter(t=>t?.type===filterType)).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''))
  }, [finance, filterType])

  // ── Manual CRUD ───────────────────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setForm({...BLANK_TXN,date:today()}); setFormErrors({}); setModal(true) }
  const openEdit = t  => { setEditing(t.id); setForm({...t,amount:String(t.amount??'')}); setFormErrors({}); setModal(true) }

  const saveTxn = useCallback(async () => {
    const errs = validateTxn(form)
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    const rec = { ...form, id:editing!=null?editing:nextId(Array.isArray(finance)?finance:[]), amount:parseNum(form.amount), vatAmount:parseNum(form.vatAmount), source:'manual' }
    if (editing!=null) { setFinance(ff=>(Array.isArray(ff)?ff:[]).map(t=>t.id===editing?rec:t)) }
    else               { setFinance(ff=>[...(Array.isArray(ff)?ff:[]),rec]) }
    setModal(false)
  }, [form, editing, finance, setFinance])

  const delTxn = id => { if (!window.confirm('Delete this transaction?')) return; setFinance(ff=>(Array.isArray(ff)?ff:[]).filter(t=>t.id!==id)) }
  const F = k => e => { setForm(f=>({...f,[k]:e.target.value})); setFormErrors(er=>({...er,[k]:undefined})) }
  const RF= k => e => { setReviewForm(f=>({...f,[k]:e.target.value})); setReviewErrors(er=>({...er,[k]:undefined})) }

  // ── Cleanup review blob URL ────────────────────────────────────────────────
  const cleanupReview = useCallback(() => {
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null }
    setReviewOpen(false); setReviewInfo(null); setReviewPreview(null); setReviewForm(null); setReviewErrors({})
    setImportStep('upload'); setImportErr(''); setProcessMsg(''); setProcessPct(0)
  }, [])

  // ── Approve review ─────────────────────────────────────────────────────────
  const approveReview = useCallback(async () => {
    const errs = validateTxn(reviewForm)
    if (Object.keys(errs).length) { setReviewErrors(errs); return }
    const rec = {
      ...BLANK_TXN, ...reviewForm,
      id:        nextId(Array.isArray(finance)?finance:[]),
      amount:    parseNum(reviewForm.amount),
      vatAmount: parseNum(reviewForm.vatAmount),
    }
    setFinance(ff=>[...(Array.isArray(ff)?ff:[]),rec])
    cleanupReview()
  }, [reviewForm, finance, setFinance, cleanupReview])

  // ── Approve CSV ────────────────────────────────────────────────────────────
  const approveCsv = useCallback(() => {
    const approved = csvRows.filter(r=>r.approved && r.amount>0)
    if (!approved.length) return
    const base = nextId(Array.isArray(finance)?finance:[])
    const recs  = approved.map((r,i)=>({ id:base+i, date:r.date||today(), type:r.type, category:r.category, description:r.description, amount:r.amount, supplierPayee:r.supplierPayee, paymentMethod:'EFT', invoiceNumber:'', vatAmount:0, notes:`CSV · ${r.confidence} · ${csvMeta.fileName}`, source:'import', sourceFile:csvMeta.fileName }))
    setFinance(ff=>[...(Array.isArray(ff)?ff:[]),...recs])
    setCsvRows([]); setImportStep('upload'); setImportOpen(false)
  }, [csvRows, csvMeta, finance, setFinance])

  const updateCsvRow = (i,k,v) => setCsvRows(rows=>rows.map((r,j)=>j===i?{...r,[k]:v}:r))

  // ── View source document ───────────────────────────────────────────────────
  const viewSourceDoc = useCallback(async t => {
    if (!t.sourceDocId) return
    const url = await createObjectURL(t.sourceDocId)
    if (!url) { alert('Source document not found in storage.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }, [])

  // ── Download source doc ────────────────────────────────────────────────────
  const downloadSourceDoc = useCallback(async t => {
    if (!t.sourceDocId) return
    await downloadFileById(t.sourceDocId, t.sourceFile || 'document')
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE IMPORT HANDLER
  // ═══════════════════════════════════════════════════════════════════════════
  const handleFileSelected = useCallback(async e => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const ext = file.name.split('.').pop().toLowerCase()
    setImportErr(''); setImportStep('processing'); setProcessPct(5); setProcessMsg('Reading file…')

    // ── CSV / TSV ─────────────────────────────────────────────────────────────
    if (ext==='csv'||ext==='tsv') {
      try {
        setProcessMsg('Parsing CSV…'); setProcessPct(50)
        const { headers, rows } = await extractCsvRows(file)
        setProcessPct(100)
        const mapped = rows.map((cols,i) => {
          const get = (...keys) => { for (const k of keys) { const idx=headers.findIndex(h=>h.toLowerCase()===k.toLowerCase()); if (idx!==-1&&cols[idx]) return cols[idx] } return '' }
          const desc   = get('description','narration','details','reference')||cols[1]||''
          const rawAmt = get('amount','debit','credit','value')||cols[2]||'0'
          const amount = Math.abs(parseFloat(rawAmt.replace(/[^0-9.-]/g,''))||0)
          const date   = get('date','transaction date','posting date')||cols[0]||today()
          const payee  = get('payee','merchant','supplier','beneficiary')||''
          const cls    = classifyText(desc+' '+payee)
          return { _id:i+1, date, description:desc, amount, supplierPayee:payee, invoiceNumber:'', vatAmount:0, ...cls, approved:amount>0 }
        }).filter(r=>r.amount>0||r.description)
        setCsvRows(mapped); setCsvMeta({ fileName:file.name }); setImportStep('review_csv')
      } catch (err) { setImportErr(`CSV parsing failed: ${err.message}`); setImportStep('upload') }
      return
    }

    // ── Shared processing: store file + extract text ──────────────────────────
    // 1. Store file in IndexedDB
    setProcessMsg('Storing file…'); setProcessPct(15)
    const docId = `fin-${Date.now()}`
    let fileStored = false
    try {
      await storeFile(docId, file)
      fileStored = true
      setProcessPct(30)
    } catch (err) { console.warn('[Finance] IndexedDB store failed:', err.message) }

    // 2. Build preview URL
    const previewUrl = URL.createObjectURL(file)
    previewUrlRef.current = previewUrl

    // 3. Detect file type and extract text
    let rawText      = ''
    let isTextBased  = false
    let ocrMethod    = 'none'

    // ── PDF ───────────────────────────────────────────────────────────────────
    if (ext==='pdf') {
      try {
        setProcessMsg('Extracting text from PDF…'); setProcessPct(35)
        const result = await extractPdfText(file)
        rawText      = result.text
        isTextBased  = result.isTextBased
        setProcessPct(55)
      } catch (err) { console.warn('[Finance] pdf.js failed:', err.message) }

      // If scanned PDF, run Tesseract on first page
      if (!isTextBased) {
        try {
          setProcessMsg('Rendering PDF page for OCR…'); setProcessPct(60)
          const pageBlob = await pdfPageToImageBlob(file, 1, 2)
          setProcessMsg('Running Tesseract OCR on scanned PDF… (this may take 10–30s)'); setProcessPct(65)
          rawText   = await ocrImage(pageBlob, p => setProcessPct(65 + Math.round(p*0.25)))
          ocrMethod = 'tesseract'
          setProcessPct(90)
        } catch (err) { console.warn('[Finance] Tesseract failed:', err.message) }
      } else {
        ocrMethod = 'pdfjs'
      }

      // Try AI extraction if configured
      if (OCR_AVAILABLE && rawText) {
        try {
          setProcessMsg('Sending to AI for structured extraction…'); setProcessPct(92)
          const aiResult = await extractViaBackend(file, rawText)
          openReviewScreen(file, docId, fileStored, previewUrl, 'pdf', aiResult, 'ai', rawText)
          setImportOpen(false)
          return
        } catch (err) {
          console.warn('[Finance] AI extraction failed, using heuristic:', err.message)
        }
      }

      const extracted  = heuristicExtract(rawText)
      const classified = classifyText((extracted.supplierName||'')+(extracted.description||''))
      openReviewScreen(file, docId, fileStored, previewUrl, 'pdf', extracted, ocrMethod, rawText, classified)
      setImportOpen(false)
      return
    }

    // ── Image (JPG, PNG, WEBP, etc.) ──────────────────────────────────────────
    const imgExts = ['jpg','jpeg','png','webp','gif','bmp','tiff','heic']
    if (imgExts.includes(ext)) {
      setProcessMsg('Running Tesseract OCR on image… (this may take 10–30s)'); setProcessPct(30)
      try {
        rawText   = await ocrImage(file, p => { setProcessPct(30+Math.round(p*0.55)); setProcessMsg(`OCR progress: ${p}%`) })
        ocrMethod = 'tesseract'
        setProcessPct(88)
      } catch (err) { console.warn('[Finance] Tesseract failed:', err.message) }

      // Try AI if configured
      if (OCR_AVAILABLE && rawText) {
        try {
          setProcessMsg('Sending to AI for structured extraction…'); setProcessPct(90)
          const aiResult = await extractViaBackend(file, rawText)
          openReviewScreen(file, docId, fileStored, previewUrl, 'image', aiResult, 'ai', rawText)
          setImportOpen(false)
          return
        } catch {}
      }

      const extracted  = heuristicExtract(rawText)
      const classified = classifyText((extracted.supplierName||'')+(extracted.description||''))
      openReviewScreen(file, docId, fileStored, previewUrl, 'image', extracted, ocrMethod, rawText, classified)
      setImportOpen(false)
      return
    }

    setImportErr(`Unsupported file type: .${ext}. Use PDF, image, or CSV.`)
    setImportStep('upload')
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current=null }
  }, [])

  // ── Open review screen ─────────────────────────────────────────────────────
  function openReviewScreen(file, docId, fileStored, previewUrl, mediaType, extracted, ocrMethod, rawText='', classified=null) {
    const ext     = file.name.split('.').pop().toLowerCase()
    const cls     = classified || classifyText((extracted?.supplierName||'')+(extracted?.description||''))
    const conf    = extracted?.confidence || cls.confidence

    setReviewInfo({ fileName:file.name, docId, fileStored, ocrMethod, confidence:conf, rawText, mediaType })
    setReviewPreview({ url:previewUrl, type:mediaType, ext })
    setReviewForm({
      date:          extracted?.invoiceDate || today(),
      type:          extracted?.suggestedType    || cls.type,
      category:      extracted?.suggestedCategory || cls.category,
      description:   extracted?.description || extracted?.supplierName || '',
      amount:        String(extracted?.totalAmount || ''),
      supplierPayee: extracted?.supplierName || '',
      paymentMethod: 'EFT',
      invoiceNumber: extracted?.invoiceNumber || '',
      vatAmount:     String(extracted?.vatAmount || ''),
      notes:         buildNotes(ocrMethod, conf, file.name),
      source:        ocrMethod==='ai' ? 'ocr' : ocrMethod==='tesseract' ? 'tesseract' : 'import',
      sourceDocId:   fileStored ? docId : null,
      sourceFile:    file.name,
    })
    setReviewErrors({})
    setReviewOpen(true)
    setProcessPct(100); setProcessMsg('')
  }

  function buildNotes(method, conf, fileName) {
    const mLabel = method==='ai'?'AI extraction':method==='tesseract'?'Tesseract OCR':method==='pdfjs'?'PDF text extraction':'Manual entry'
    return `${mLabel} · ${conf} · ${fileName}`
  }

  // ── Insight text ──────────────────────────────────────────────────────────
  const topCat  = catSummary[0]?.[0] || 'no expenses yet'
  const insight = `Botanica has received ${ZAR(invested)} in owner investment and spent ${ZAR(expenses)}.` +
    (topCat!=='no expenses yet'?` Largest category: ${topCat}.`:'')+
    ` Cash position: ${ZAR(remaining)}.`+
    (income===0?' No business income yet.':`Business income: ${ZAR(income)}.`)

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Finance Centre</div>
          <div className="page-subtitle">Owner Investment · Income · Expenses</div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button className="btn btn-primary" onClick={openNew}>+ Add Manual Transaction</button>
          <button className="btn btn-outline" style={{ borderColor:T.gold, color:T.forest }} onClick={()=>{ setImportStep('upload'); setImportErr(''); setImportOpen(true) }}>
            ⬆ Import from Document
          </button>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff" style={{ display:'none' }} onChange={handleFileSelected} />
        </div>
      </div>

      {/* ── KPI bar ── */}
      <div style={{ background:'rgba(255,255,255,0.55)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(210,200,184,0.5)`, padding:'16px 36px' }}>
        <div className="grid-5">
          {[
            { label:'Owner Investment', val:ZAR(invested),  color:T.teal,   cls:'border-inv' },
            { label:'Business Income',  val:ZAR(income),    color:T.green,  cls:'border-inc' },
            { label:'Total Expenses',   val:ZAR(expenses),  color:T.red,    cls:'border-exp' },
            { label:'Cash Position',    val:ZAR(remaining), color:remaining>=0?T.gold:T.danger, cls:'border-rem' },
            { label:'Net Position',     val:ZAR(net),       color:net>=0?T.forestLight:T.danger, cls:'border-net' },
          ].map(k=>(
            <div key={k.label} className={`stat-card ${k.cls}`}>
              <div className="stat-label">{k.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:k.color, lineHeight:1, marginTop:6 }}>{k.val}</div>
              {k.cls==='border-rem' && invested>0 && <div className="pbar" style={{ marginTop:8 }}><div className="pbar-fill pbar-gold" style={{ width:`${Math.min(100,Math.max(0,(remaining/invested)*100))}%` }}/></div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="page-content">
        {/* OCR status notice */}
        <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap', fontSize:12 }}>
          <span style={{ color:T.green, fontWeight:600 }}>✅ PDF text extraction (pdf.js)</span>
          <span style={{ color:T.green, fontWeight:600 }}>✅ Image OCR (Tesseract.js)</span>
          <span style={{ color:OCR_AVAILABLE?T.green:T.textLight, fontWeight:600 }}>
            {OCR_AVAILABLE?'✅':'🔑'} AI extraction {OCR_AVAILABLE?'active':'— add VITE_OCR_API_KEY'}
          </span>
          <span style={{ color:SUPABASE_CONFIGURED?T.green:T.textLight, fontWeight:600 }}>
            {SUPABASE_CONFIGURED?'✅':'🔑'} Supabase sync {SUPABASE_CONFIGURED?'active':'— Setup required'}
          </span>
        </div>

        <div className="tabs">
          {['overview','transactions','monthly','categories'].map(t=>(
            <div key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</div>
          ))}
        </div>

        {/* Overview */}
        {tab==='overview' && (
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
                { label:'Cash Position',    val:ZAR(remaining), color:remaining>=0?T.gold:T.danger },
                { label:'Net Position',     val:ZAR(net),       color:net>=0?T.forestLight:T.danger },
              ].map(r=>(
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid rgba(210,200,184,0.35)` }}>
                  <span style={{ fontSize:13, color:T.textMid }}>{r.label}</span>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        {tab==='transactions' && (
          <>
            <div style={{ display:'flex', gap:7, marginBottom:16, flexWrap:'wrap' }}>
              {['All','Owner Investment','Business Income','Business Expense'].map(t=>(
                <button key={t} className={`bp-fbtn ${filterType===t?'active':''}`} onClick={()=>setFilterType(t)}>{t}</button>
              ))}
            </div>
            {visibleTxns.length===0 ? (
              <div className="empty-st">
                <div className="empty-ic">₩</div>
                <div>No transactions yet.</div>
                <div style={{ marginTop:12, display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={openNew}>Add Manual Transaction</button>
                  <button className="btn btn-outline btn-sm" onClick={()=>{ setImportStep('upload'); setImportOpen(true) }}>Import from Document</button>
                </div>
              </div>
            ) : (
              <div className="g-card" style={{ padding:0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Payee</th><th>Inv #</th><th>Amount</th><th>Source</th><th style={{ width:110 }}></th></tr></thead>
                    <tbody>
                      {visibleTxns.map(t=>t&&(
                        <tr key={t.id}>
                          <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{fmtDate(t.date)}</td>
                          <td><TypeBadge type={t.type}/></td>
                          <td style={{ fontSize:12, color:T.textMid }}>{t.category}</td>
                          <td className="td-wrap" style={{ fontSize:13, maxWidth:200 }}>{t.description}</td>
                          <td style={{ fontSize:12, color:T.textLight }}>{t.supplierPayee}</td>
                          <td style={{ fontSize:11, color:T.textLight, fontFamily:'monospace' }}>{t.invoiceNumber||'—'}</td>
                          <td style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:TYPE_COLORS[t.type], whiteSpace:'nowrap' }}>{ZAR(t.amount)}</td>
                          <td><SourceBadge source={t.source}/></td>
                          <td>
                            <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                              <button className="btn btn-outline btn-xs" onClick={()=>openEdit(t)}>Edit</button>
                              {t.sourceDocId && <>
                                <button className="btn btn-outline btn-xs" onClick={()=>viewSourceDoc(t)} title="View source document">📄</button>
                                <button className="btn btn-outline btn-xs" onClick={()=>downloadSourceDoc(t)} title="Download source document">⬇</button>
                              </>}
                              <button className="btn btn-xs btn-ghost" style={{ color:T.textLight }} onClick={()=>delTxn(t.id)}>✕</button>
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

        {/* Monthly */}
        {tab==='monthly' && (
          <div className="g-card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Month</th><th>Investment</th><th>Income</th><th>Expenses</th><th>Cash Pos.</th><th>Net</th></tr></thead>
                <tbody>
                  {Object.entries(monthly).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,v])=>(
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

        {/* Categories */}
        {tab==='categories' && (
          <div className="g-card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Category</th><th>Total Spend</th><th>% of Expenses</th><th style={{ width:180 }}>Share</th></tr></thead>
                <tbody>
                  {catSummary.map(([cat,amt])=>(
                    <tr key={cat}>
                      <td className="td-name">{cat}</td>
                      <td className="td-num" style={{ color:T.red }}>{ZAR(amt)}</td>
                      <td style={{ color:T.textMid, fontSize:13 }}>{expenses>0?((amt/expenses)*100).toFixed(1):0}%</td>
                      <td><div className="pbar"><div className="pbar-fill pbar-gold" style={{ width:`${expenses>0?(amt/expenses)*100:0}%` }}/></div></td>
                    </tr>
                  ))}
                  {catSummary.length===0 && <tr><td colSpan={4} style={{ textAlign:'center', padding:32, color:T.textLight }}>No expense categories yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ MANUAL TXN MODAL ══════════════════════════════════ */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing!=null?'Edit Transaction':'Add Manual Transaction'}
        footer={<><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveTxn}>Save Transaction</button></>}
      >
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="txn-date">Date</label>
            <input id="txn-date" type="date" value={form.date} onChange={F('date')} style={{ borderColor:formErrors.date?T.danger:undefined }}/>
            {formErrors.date && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{formErrors.date}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="txn-type">Type</label>
            <select id="txn-type" value={form.type} onChange={e=>{ const t=e.target.value; setForm(f=>({...f,type:t,category:FINANCE_CATEGORIES[t]?.[0]||''})) }}>
              {Object.keys(FINANCE_CATEGORIES).map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="txn-cat">Category</label>
            <select id="txn-cat" value={form.category} onChange={F('category')}>
              {(FINANCE_CATEGORIES[form.type]||[]).map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="txn-amt">Amount (ZAR) <span style={{ color:T.danger }}>*</span></label>
            <input id="txn-amt" type="text" inputMode="decimal" placeholder="0" value={form.amount} onChange={F('amount')} style={{ borderColor:formErrors.amount?T.danger:undefined }}/>
            {formErrors.amount && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{formErrors.amount}</div>}
          </div>
          <div className="form-field full">
            <label htmlFor="txn-desc">Description <span style={{ color:T.danger }}>*</span></label>
            <input id="txn-desc" value={form.description} onChange={F('description')} placeholder="e.g. Domain registration" style={{ borderColor:formErrors.description?T.danger:undefined }}/>
            {formErrors.description && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{formErrors.description}</div>}
          </div>
          <div className="form-field"><label htmlFor="txn-sup">Supplier / Payee</label><input id="txn-sup" value={form.supplierPayee} onChange={F('supplierPayee')}/></div>
          <div className="form-field"><label htmlFor="txn-pm">Payment Method</label><select id="txn-pm" value={form.paymentMethod} onChange={F('paymentMethod')}>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
          <div className="form-field"><label htmlFor="txn-inv">Invoice Number</label><input id="txn-inv" value={form.invoiceNumber||''} onChange={F('invoiceNumber')} placeholder="INV-001"/></div>
          <div className="form-field"><label htmlFor="txn-vat">VAT Amount (ZAR)</label><input id="txn-vat" type="text" inputMode="decimal" value={form.vatAmount||''} onChange={F('vatAmount')} placeholder="0"/></div>
          <div className="form-field full"><label htmlFor="txn-notes">Notes</label><textarea id="txn-notes" value={form.notes} onChange={F('notes')}/></div>
        </div>
      </Modal>

      {/* ═══════════════ IMPORT WIZARD ══════════════════════════════════════ */}
      <Modal open={importOpen} onClose={()=>{ setImportOpen(false); if(importStep!=='review_csv') setImportStep('upload') }}
        title="Import from Document" size="modal-lg"
        footer={importStep==='review_csv'?(<>
          <button className="btn btn-outline" onClick={()=>{ setImportOpen(false); setCsvRows([]); setImportStep('upload') }}>Cancel</button>
          <button className="btn btn-outline btn-sm" onClick={()=>setCsvRows(r=>r.map(x=>({...x,approved:true})))}>All ✓</button>
          <button className="btn btn-primary" onClick={approveCsv}>Save {csvRows.filter(r=>r.approved).length} Transactions</button>
        </>):null}
      >
        {/* Upload step */}
        {importStep==='upload' && (
          <div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:T.greenPale, border:`1px solid rgba(21,128,61,0.2)`, borderRadius:10, fontSize:12, color:T.green }}>
                ✅ <strong>PDF text extraction (pdf.js)</strong> — digital invoices, quotes
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:T.greenPale, border:`1px solid rgba(21,128,61,0.2)`, borderRadius:10, fontSize:12, color:T.green }}>
                ✅ <strong>Image OCR (Tesseract.js)</strong> — photos of receipts, invoices, scanned PDFs. Downloads ~30MB model on first use. Works offline after.
              </div>
              {!OCR_AVAILABLE && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(184,151,90,0.1)', border:`1px solid rgba(184,151,90,0.22)`, borderRadius:10, fontSize:12, color:'#6B4E10' }}>
                  🔑 <strong>AI extraction (Anthropic Claude)</strong> — more accurate. Requires <code>OCR_SECRET_KEY</code> + <code>VITE_OCR_API_KEY</code> in Vercel.
                </div>
              )}
              {importErr && <div style={{ padding:'10px 14px', background:T.redPale, border:`1px solid rgba(185,28,28,0.2)`, borderRadius:10, fontSize:12, color:T.danger }}>⚠ {importErr}</div>}
            </div>

            <div
              style={{ border:`2px dashed rgba(210,200,184,0.7)`, borderRadius:14, padding:'44px 24px', textAlign:'center', cursor:'pointer' }}
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){ const dt=new DataTransfer(); dt.items.add(f); fileRef.current.files=dt.files; handleFileSelected({target:fileRef.current}) } }}
            >
              <div style={{ fontSize:36, opacity:0.32, marginBottom:12 }}>📄</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, marginBottom:6 }}>Drop a file or click to browse</div>
              <div style={{ fontSize:12, color:T.textLight }}>PDF · Image (JPG/PNG/WEBP) · CSV</div>
              <button className="btn btn-primary" style={{ marginTop:16 }} onClick={e=>{ e.stopPropagation(); fileRef.current?.click() }}>Choose File</button>
            </div>
          </div>
        )}

        {/* Processing step */}
        {importStep==='processing' && (
          <div style={{ textAlign:'center', padding:'48px 20px' }}>
            <div style={{ fontSize:44, marginBottom:14 }}>⏳</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.forest, marginBottom:12 }}>{processMsg||'Processing…'}</div>
            <div style={{ maxWidth:300, margin:'0 auto' }}>
              <div className="pbar" style={{ height:6 }}>
                <div className="pbar-fill pbar-gold" style={{ width:`${processPct}%`, transition:'width 0.3s' }}/>
              </div>
              <div style={{ fontSize:12, color:T.textLight, marginTop:8 }}>{processPct}%</div>
            </div>
            {processPct>60 && processPct<90 && processMsg.includes('Tesseract') && (
              <div style={{ marginTop:16, fontSize:11, color:T.textMid }}>
                Tesseract.js is reading the document in your browser. First run downloads language data (~30MB). Please wait…
              </div>
            )}
          </div>
        )}

        {/* CSV review */}
        {importStep==='review_csv' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
              <div style={{ fontSize:13, color:T.textMid }}><strong>{csvMeta.fileName}</strong> · {csvRows.length} rows · {csvRows.filter(r=>r.approved).length} approved</div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-outline btn-xs" onClick={()=>setCsvRows(r=>r.map(x=>({...x,approved:true})))}>All ✓</button>
                <button className="btn btn-outline btn-xs" onClick={()=>setCsvRows(r=>r.map(x=>({...x,approved:false})))}>None</button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>✓</th><th>Date</th><th>Description</th><th>Amount</th><th>Payee</th><th>Type</th><th>Category</th><th>Conf.</th></tr></thead>
                <tbody>{csvRows.map((row,i)=><CSVRow key={row._id} row={row} i={i} onChange={updateCsvRow}/>)}</tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════ REVIEW SCREEN (full-screen split view) ══════════════ */}
      {reviewOpen && reviewForm && reviewInfo && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&cleanupReview()}>
          <div
            style={{ width:'min(98vw,1180px)', height:'min(96vh,860px)', background:'rgba(247,243,237,0.96)', backdropFilter:'blur(40px) saturate(200%)', WebkitBackdropFilter:'blur(40px) saturate(200%)', border:'1px solid rgba(255,255,255,0.55)', borderRadius:'var(--r24)', boxShadow:'0 32px 80px rgba(10,28,20,0.28)', display:'flex', flexDirection:'column', overflow:'hidden' }}
            onClick={e=>e.stopPropagation()}
          >
            {/* Review header */}
            <div style={{ padding:'16px 22px', borderBottom:`1px solid rgba(210,200,184,0.5)`, display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                Review: {reviewInfo.fileName}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <span style={{ fontSize:11, fontWeight:700, color:CONF_COLORS[reviewInfo.confidence]||T.textMid }}>
                  {reviewInfo.confidence}
                </span>
                <span style={{ fontSize:11, color:T.textMid }}>
                  {reviewInfo.ocrMethod==='ai'?'AI extraction':reviewInfo.ocrMethod==='tesseract'?'Tesseract OCR':reviewInfo.ocrMethod==='pdfjs'?'PDF text':'Manual'}
                </span>
                {reviewInfo.fileStored && <span className="badge badge-green" style={{ fontSize:10 }}>✅ File stored</span>}
                <button className="modal-close" onClick={cleanupReview}>✕</button>
              </div>
            </div>

            {/* OCR status */}
            <div style={{ padding:'9px 22px', flexShrink:0, fontSize:12, background:
              reviewInfo.ocrMethod==='ai'?T.greenPale:
              reviewInfo.ocrMethod==='tesseract'?T.greenPale:
              reviewInfo.ocrMethod==='pdfjs'?'rgba(14,116,144,0.06)':
              'rgba(228,221,208,0.5)',
              borderBottom:`1px solid rgba(210,200,184,0.4)`,
              color:reviewInfo.ocrMethod==='none'?T.textMid:T.green,
            }}>
              {reviewInfo.ocrMethod==='ai'       && '✅ AI extracted data from this document. Review and correct all fields before saving.'}
              {reviewInfo.ocrMethod==='tesseract' && '✅ Tesseract.js OCR read this document in your browser. Fields pre-filled — verify accuracy before saving.'}
              {reviewInfo.ocrMethod==='pdfjs'     && '✅ PDF text extracted. Fields pre-filled using pattern matching — verify accuracy before saving.'}
              {reviewInfo.ocrMethod==='none'      && '⚠ Could not read this document automatically. Please fill in all fields manually from the preview.'}
            </div>

            {/* Split panel */}
            <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
              {/* Left: preview */}
              <div style={{ flex:'0 0 55%', overflow:'auto', padding:16, borderRight:`1px solid rgba(210,200,184,0.4)`, display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:T.gold, fontWeight:700 }}>Document Preview</div>
                {reviewPreview?.url && reviewPreview.type==='image' && (
                  <img src={reviewPreview.url} alt="Document" style={{ maxWidth:'100%', borderRadius:8, boxShadow:'0 2px 12px rgba(0,0,0,0.1)' }}/>
                )}
                {reviewPreview?.url && (reviewPreview.type==='pdf'||reviewPreview.ext==='pdf') && (
                  <iframe src={reviewPreview.url} title="PDF" style={{ flex:1, width:'100%', minHeight:440, border:'none', borderRadius:8 }}/>
                )}
                {!reviewPreview?.url && (
                  <div className="empty-st"><div className="empty-ic">📄</div><div>No preview available</div></div>
                )}
                {/* Raw text toggle */}
                {reviewInfo.rawText && (
                  <details>
                    <summary style={{ fontSize:11, color:T.textLight, cursor:'pointer', userSelect:'none', marginTop:8 }}>Show extracted text</summary>
                    <pre style={{ fontSize:10, color:T.textMid, background:'rgba(228,221,208,0.4)', borderRadius:8, padding:10, maxHeight:160, overflow:'auto', fontFamily:'monospace', lineHeight:1.5, whiteSpace:'pre-wrap', marginTop:6 }}>
                      {reviewInfo.rawText.substring(0,1800)}{reviewInfo.rawText.length>1800?'\n…':''}
                    </pre>
                  </details>
                )}
              </div>

              {/* Right: form */}
              <div style={{ flex:1, overflow:'auto', padding:'16px 20px' }}>
                <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:T.gold, fontWeight:700, marginBottom:14 }}>Transaction Details — edit before saving</div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div className="form-field">
                    <label htmlFor="rv-date">Date</label>
                    <input id="rv-date" type="date" value={reviewForm.date} onChange={RF('date')} style={{ borderColor:reviewErrors.date?T.danger:undefined }}/>
                    {reviewErrors.date && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:2 }}>{reviewErrors.date}</div>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-type">Type</label>
                    <select id="rv-type" value={reviewForm.type} onChange={e=>{ const t=e.target.value; setReviewForm(f=>({...f,type:t,category:FINANCE_CATEGORIES[t]?.[0]||''})) }}>
                      {Object.keys(FINANCE_CATEGORIES).map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-cat">Category</label>
                    <select id="rv-cat" value={reviewForm.category} onChange={RF('category')}>
                      {(FINANCE_CATEGORIES[reviewForm.type]||[]).map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-amt">Amount (ZAR) <span style={{ color:T.danger }}>*</span></label>
                    <input id="rv-amt" type="text" inputMode="decimal" value={reviewForm.amount} onChange={RF('amount')} style={{ borderColor:reviewErrors.amount?T.danger:undefined }}/>
                    {reviewErrors.amount && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:2 }}>{reviewErrors.amount}</div>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-vat">VAT (ZAR)</label>
                    <input id="rv-vat" type="text" inputMode="decimal" value={reviewForm.vatAmount||''} onChange={RF('vatAmount')} placeholder="0"/>
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-inv">Invoice Number</label>
                    <input id="rv-inv" value={reviewForm.invoiceNumber||''} onChange={RF('invoiceNumber')}/>
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-sup">Supplier / Payee</label>
                    <input id="rv-sup" value={reviewForm.supplierPayee||''} onChange={RF('supplierPayee')}/>
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-desc">Description <span style={{ color:T.danger }}>*</span></label>
                    <input id="rv-desc" value={reviewForm.description||''} onChange={RF('description')} style={{ borderColor:reviewErrors.description?T.danger:undefined }}/>
                    {reviewErrors.description && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:2 }}>{reviewErrors.description}</div>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-pm">Payment Method</label>
                    <select id="rv-pm" value={reviewForm.paymentMethod} onChange={RF('paymentMethod')}>
                      {PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-notes">Notes</label>
                    <textarea id="rv-notes" value={reviewForm.notes||''} onChange={RF('notes')} style={{ minHeight:50 }}/>
                  </div>
                  {reviewInfo.fileStored && (
                    <div style={{ fontSize:11, color:T.green, padding:'8px 0' }}>
                      ✅ Source document stored in IndexedDB — will be linked to this transaction.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding:'14px 22px', borderTop:`1px solid rgba(210,200,184,0.5)`, display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0, flexWrap:'wrap' }}>
              <button className="btn btn-outline" onClick={cleanupReview}>Reject — Don't Save</button>
              <button className="btn btn-primary" onClick={approveReview}>✓ Approve & Save Transaction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
