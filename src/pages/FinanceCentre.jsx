// FinanceCentre.jsx — v1.8
// Fixed: document preview in review screen uses identical logic to BusinessDocuments.
// Key changes from v1.7:
//   • useEffect added to imports
//   • ReviewPreviewPanel uses local `loading`/`err` state (not deleted parent state)
//   • reviewPreview carries { url, ext, idbKey, storagePath, publicUrl }
//   • resolvePreviewUrl: IDB first → Supabase public_url → signed URL (same as BD)
//   • viewSourceDoc / downloadSourceDoc: IDB first → Supabase fallback
//   • sourceStoragePath + sourcePublicUrl stored on approved transactions
//   • Source doc buttons shown whenever any source info exists on transaction

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, fmtDate, nextId, today, parseNum, safeAmount } from '../utils/format.js'
import { FINANCE_CATEGORIES, PAYMENT_METHODS } from '../utils/data.js'
import Modal from '../components/Modal.jsx'
import {
  storeFile, createObjectURL, downloadFileById, formatBytes as fbytes,
} from '../lib/fileStore.js'
import {
  OCR_AVAILABLE, extractPdfText, pdfPageToImageBlob, ocrImage,
  extractCsvRows, heuristicExtract, classifyText, extractViaBackend,
} from '../lib/ocr.js'
import {
  SUPABASE_CONFIGURED,
  uploadDocument, insertTransactionCloud, linkDocumentToTransaction,
  saveExtractionToCloud, getDocumentUrl,
} from '../lib/supabase.js'

// ── Constants ──────────────────────────────────────────────────────────────────
const IMG_EXT     = new Set(['jpg','jpeg','png','webp','gif','bmp','svg'])
const TYPE_COLORS = { 'Owner Investment':T.teal, 'Business Income':T.green, 'Business Expense':T.red }
const TYPE_BG     = { 'Owner Investment':T.tealPale, 'Business Income':T.greenPale, 'Business Expense':T.redPale }
const CONF_COLORS = { 'High Confidence':T.green, 'Medium Confidence':T.gold, 'Needs Review':T.danger }
const BLANK_TXN   = {
  date:today(), type:'Business Expense', category:'Other Expense',
  description:'', amount:'', supplierPayee:'', paymentMethod:'EFT',
  notes:'', invoiceNumber:'', vatAmount:'',
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const sumType = (fin, type) =>
  (Array.isArray(fin)?fin:[]).filter(t=>t?.type===type).reduce((s,t)=>s+safeAmount(t?.amount),0)

function validateTxn(f) {
  const e = {}
  if (!f.description?.trim()) e.description = 'Description is required'
  if (!f.amount || parseNum(f.amount) <= 0) e.amount = 'Amount must be greater than zero'
  if (!f.date || isNaN(new Date(f.date).getTime())) e.date = 'Valid date required'
  return e
}

// ── Small reusable components ──────────────────────────────────────────────────
function TypeBadge({ type }) {
  return (
    <span style={{ background:TYPE_BG[type], color:TYPE_COLORS[type], padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
      {type==='Owner Investment'?'Investment':type==='Business Income'?'Income':'Expense'}
    </span>
  )
}
function SourceBadge({ source }) {
  if (source==='ocr')       return <span className="badge badge-teal" style={{fontSize:10}}>AI OCR</span>
  if (source==='tesseract') return <span className="badge badge-teal" style={{fontSize:10}}>OCR</span>
  if (source==='import')    return <span className="badge badge-blue" style={{fontSize:10}}>Import</span>
  return                           <span className="badge badge-grey" style={{fontSize:10}}>Manual</span>
}

// ── CSV row editor (multi-row import) ─────────────────────────────────────────
function CSVRow({ row, i, onChange }) {
  const set = (k,v) => onChange(i,k,v)
  return (
    <tr style={{opacity:row.approved?1:0.38}}>
      <td><input type="checkbox" checked={row.approved} onChange={e=>set('approved',e.target.checked)}/></td>
      <td><input type="date" value={row.date} style={{width:130,fontSize:11,padding:'2px 5px'}} onChange={e=>set('date',e.target.value)}/></td>
      <td><input value={row.description} style={{fontSize:11,padding:'2px 5px',width:'100%',minWidth:140}} onChange={e=>set('description',e.target.value)}/></td>
      <td><input type="text" inputMode="decimal" value={String(row.amount)} style={{width:80,fontSize:12,padding:'2px 5px'}} onChange={e=>set('amount',parseFloat(e.target.value)||0)}/></td>
      <td><input value={row.supplierPayee||''} style={{fontSize:11,padding:'2px 5px',width:90}} onChange={e=>set('supplierPayee',e.target.value)}/></td>
      <td>
        <select value={row.type} style={{fontSize:11,padding:'2px 5px'}} onChange={e=>{set('type',e.target.value);set('category',FINANCE_CATEGORIES[e.target.value]?.[0]||'')}}>
          {Object.keys(FINANCE_CATEGORIES).map(t=><option key={t}>{t}</option>)}
        </select>
      </td>
      <td>
        <select value={row.category} style={{fontSize:11,padding:'2px 5px'}} onChange={e=>set('category',e.target.value)}>
          {(FINANCE_CATEGORIES[row.type]||[]).map(c=><option key={c}>{c}</option>)}
        </select>
      </td>
      <td><span style={{fontSize:10,fontWeight:600,color:CONF_COLORS[row.confidence]||T.textMid}}>{row.confidence==='High Confidence'?'★★★':row.confidence==='Medium Confidence'?'★★☆':'★☆☆'}</span></td>
    </tr>
  )
}

// ── CSV table preview ──────────────────────────────────────────────────────────
function CSVTablePreview({ text }) {
  const lines = (text||'').trim().split('\n').filter(Boolean)
  if (lines.length < 2) return <div style={{fontSize:12,color:T.textLight}}>No rows found.</div>
  const d = (lines[0].match(/\t/g)?.length||0) > (lines[0].match(/,/g)?.length||0) ? '\t' : ','
  const headers = lines[0].split(d).map(c=>c.replace(/"/g,'').trim())
  const rows    = lines.slice(1,26).map(l=>l.split(d).map(c=>c.replace(/"/g,'').trim()))
  return (
    <div>
      <div style={{fontSize:11,color:T.textLight,marginBottom:8}}>
        First {Math.min(rows.length,25)} of {lines.length-1} rows · {headers.length} columns
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{headers.map((h,i)=><th key={i}>{h||`Col ${i+1}`}</th>)}</tr></thead>
          <tbody>{rows.map((r,ri)=><tr key={ri}>{headers.map((_,ci)=><td key={ci} style={{fontSize:12}}>{r[ci]||''}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

// ── ReviewPreviewPanel ─────────────────────────────────────────────────────────
// Identical preview logic to BusinessDocuments.
// props.preview = { url, ext, idbKey, storagePath, publicUrl, csvText }
//   url: initial blob URL set immediately on upload (works instantly, may expire)
//   idbKey, storagePath, publicUrl: used to re-fetch if blob URL is gone
function ReviewPreviewPanel({ preview, fileName, rawText, resolvePreviewUrl }) {
  const blobUrlRef               = useRef(null)
  const [activeUrl, setActiveUrl] = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [err,       setErr]       = useState('')

  useEffect(() => {
    if (!preview) return
    setErr('')

    // If there's a fresh URL in state (set right after upload), use it immediately
    if (preview.url) {
      setActiveUrl(preview.url)
      return
    }

    // No url — resolve from IDB then Supabase (same as BusinessDocuments)
    setLoading(true)
    resolvePreviewUrl({
      idbKey:      preview.idbKey      || null,
      storagePath: preview.storagePath || null,
      publicUrl:   preview.publicUrl   || null,
    }).then(({ url, revoke }) => {
      if (revoke) blobUrlRef.current = url
      setActiveUrl(url)
    }).catch(e => {
      setErr(e.message)
    }).finally(() => setLoading(false))

    return () => {
      // Cleanup blob URL when effect re-runs
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [preview?.url, preview?.idbKey, preview?.storagePath, preview?.publicUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
  }, [])

  const ext   = (preview?.ext || '').toLowerCase()
  const isPdf = ext === 'pdf' || fileName?.toLowerCase().endsWith('.pdf')
  const isImg = IMG_EXT.has(ext)

  return (
    <div style={{flex:'0 0 55%',overflow:'auto',padding:16,borderRight:`1px solid rgba(210,200,184,0.4)`,display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontSize:10,letterSpacing:'0.16em',textTransform:'uppercase',color:T.gold,fontWeight:700}}>
        Document Preview
      </div>

      {loading && (
        <div className="empty-st"><div style={{fontSize:24}}>⏳</div><div>Loading preview…</div></div>
      )}

      {err && !loading && (
        <div style={{padding:'10px 14px',background:T.redPale,border:`1px solid rgba(185,28,28,0.2)`,borderRadius:8,fontSize:12,color:T.danger}}>
          ⚠ {err}
        </div>
      )}

      {/* PDF */}
      {!loading && !err && activeUrl && isPdf && (
        <iframe
          src={activeUrl}
          title={fileName||'Document'}
          style={{flex:1,width:'100%',minHeight:440,border:'none',borderRadius:8}}
        />
      )}

      {/* Image */}
      {!loading && !err && activeUrl && isImg && (
        <img
          src={activeUrl}
          alt={fileName||'Document'}
          style={{maxWidth:'100%',borderRadius:8,boxShadow:'0 2px 12px rgba(0,0,0,0.1)'}}
        />
      )}

      {/* CSV */}
      {!loading && !err && preview?.csvText && (
        <CSVTablePreview text={preview.csvText} />
      )}

      {/* Other type with URL — show download */}
      {!loading && !err && activeUrl && !isPdf && !isImg && !preview?.csvText && (
        <div style={{textAlign:'center',padding:'32px 16px'}}>
          <div style={{fontSize:36,marginBottom:12,opacity:0.4}}>📎</div>
          <div style={{fontSize:13,color:T.textMid,marginBottom:16}}>
            Preview not available for <strong>.{ext}</strong> files.
          </div>
          <a href={activeUrl} download={fileName||'document'} className="btn btn-primary btn-sm">
            ⬇ Download to Open
          </a>
        </div>
      )}

      {/* No URL, no csv, not loading */}
      {!loading && !err && !activeUrl && !preview?.csvText && (
        <div className="empty-st">
          <div className="empty-ic">📄</div>
          <div>No preview available</div>
        </div>
      )}

      {/* Raw text toggle */}
      {rawText && (
        <details>
          <summary style={{fontSize:11,color:T.textLight,cursor:'pointer',userSelect:'none',marginTop:8}}>
            Show extracted text
          </summary>
          <pre style={{fontSize:10,color:T.textMid,background:'rgba(228,221,208,0.4)',borderRadius:8,padding:10,maxHeight:160,overflow:'auto',fontFamily:'monospace',lineHeight:1.5,whiteSpace:'pre-wrap',marginTop:6}}>
            {rawText.substring(0,1800)}{rawText.length>1800?'\n…':''}
          </pre>
        </details>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function FinanceCentre({ finance, setFinance }) {
  const [tab,        setTab]        = useState('overview')
  const [modal,      setModal]      = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(BLANK_TXN)
  const [formErrors, setFormErrors] = useState({})
  const [filterType, setFilterType] = useState('All')

  // ── Import wizard state ──────────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState('upload')
  const [processMsg, setProcessMsg] = useState('')
  const [processPct, setProcessPct] = useState(0)
  const [importErr,  setImportErr]  = useState('')
  const [csvRows,    setCsvRows]    = useState([])
  const [csvMeta,    setCsvMeta]    = useState({ fileName:'' })

  // ── Review screen state ──────────────────────────────────────────────────────
  const [reviewOpen,   setReviewOpen]   = useState(false)
  const [reviewInfo,   setReviewInfo]   = useState(null)
  // reviewPreview = { url, ext, idbKey, storagePath, publicUrl, csvText }
  // url = blob URL set immediately after file is picked; may be null after page reload
  // idbKey / storagePath / publicUrl = used to re-fetch if url is gone
  const [reviewPreview, setReviewPreview] = useState(null)
  const [reviewForm,    setReviewForm]    = useState(null)
  const [reviewErrors,  setReviewErrors]  = useState({})
  const fileRef = useRef()

  // ── Finance aggregates ───────────────────────────────────────────────────────
  const invested  = useMemo(() => sumType(finance,'Owner Investment'), [finance])
  const income    = useMemo(() => sumType(finance,'Business Income'),  [finance])
  const expenses  = useMemo(() => sumType(finance,'Business Expense'), [finance])
  const remaining = invested - expenses
  const net       = income - expenses

  const monthly = useMemo(() => {
    const m = {}
    ;(Array.isArray(finance)?finance:[]).forEach(t => {
      const key = (t?.date||'').substring(0,7)||'Unknown'
      if (!m[key]) m[key] = {inv:0,inc:0,exp:0}
      if (t?.type==='Owner Investment')   m[key].inv += safeAmount(t.amount)
      else if (t?.type==='Business Income') m[key].inc += safeAmount(t.amount)
      else m[key].exp += safeAmount(t.amount)
    })
    return m
  }, [finance])

  const catSummary = useMemo(() => {
    const c = {}
    ;(Array.isArray(finance)?finance:[]).filter(t=>t?.type==='Business Expense').forEach(t => {
      c[t.category] = (c[t.category]||0) + safeAmount(t.amount)
    })
    return Object.entries(c).sort((a,b)=>b[1]-a[1])
  }, [finance])

  const visibleTxns = useMemo(() => {
    const list = Array.isArray(finance) ? finance : []
    return (filterType==='All' ? list : list.filter(t=>t?.type===filterType))
      .slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''))
  }, [finance, filterType])

  // ── Manual CRUD ──────────────────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setForm({...BLANK_TXN,date:today()}); setFormErrors({}); setModal(true) }
  const openEdit = t  => { setEditing(t.id); setForm({...t,amount:String(t.amount??'')}); setFormErrors({}); setModal(true) }
  const F        = k  => e => { setForm(f=>({...f,[k]:e.target.value})); setFormErrors(er=>({...er,[k]:undefined})) }
  const RF       = k  => e => { setReviewForm(f=>({...f,[k]:e.target.value})); setReviewErrors(er=>({...er,[k]:undefined})) }

  const saveTxn = useCallback(async () => {
    const errs = validateTxn(form)
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    const rec = {
      ...form,
      id:        editing!=null ? editing : nextId(Array.isArray(finance)?finance:[]),
      amount:    parseNum(form.amount),
      vatAmount: parseNum(form.vatAmount),
      source:    'manual',
    }
    if (editing!=null) { setFinance(ff=>(Array.isArray(ff)?ff:[]).map(t=>t.id===editing?rec:t)) }
    else               { setFinance(ff=>[...(Array.isArray(ff)?ff:[]),rec]) }
    if (SUPABASE_CONFIGURED && editing==null) {
      insertTransactionCloud(rec).catch(e=>console.warn('[Finance] save:', e.message))
    }
    setModal(false)
  }, [form, editing, finance, setFinance])

  const delTxn = useCallback(id => {
    if (!window.confirm('Delete this transaction?')) return
    setFinance(ff=>(Array.isArray(ff)?ff:[]).filter(t=>t.id!==id))
    if (SUPABASE_CONFIGURED) {
      import('../lib/supabase.js').then(m=>m.deleteTransactionCloud(id)).catch(e=>console.warn('[Finance] delete:', e.message))
    }
  }, [setFinance])

  // ── Review cleanup ────────────────────────────────────────────────────────────
  const cleanupReview = useCallback(() => {
    setReviewOpen(false)
    setReviewInfo(null)
    setReviewPreview(null)
    setReviewForm(null)
    setReviewErrors({})
    setImportStep('upload')
    setImportErr('')
    setProcessMsg('')
    setProcessPct(0)
  }, [])

  // ── Approve review — save transaction, link document ─────────────────────────
  const approveReview = useCallback(async () => {
    const errs = validateTxn(reviewForm)
    if (Object.keys(errs).length) { setReviewErrors(errs); return }
    const rec = {
      ...BLANK_TXN,
      ...reviewForm,
      id:                nextId(Array.isArray(finance)?finance:[]),
      amount:            parseNum(reviewForm.amount),
      vatAmount:         parseNum(reviewForm.vatAmount),
      // Carry Supabase storage info so viewSourceDoc works after page refresh
      sourceStoragePath: reviewForm.sourceStoragePath || null,
      sourcePublicUrl:   reviewForm.sourcePublicUrl   || null,
    }
    setFinance(ff=>[...(Array.isArray(ff)?ff:[]),rec])
    if (SUPABASE_CONFIGURED) {
      insertTransactionCloud(rec)
        .then(dbRec => {
          if (dbRec?.id && reviewInfo?.supabaseDocId) {
            linkDocumentToTransaction(reviewInfo.supabaseDocId, dbRec.id)
              .catch(e=>console.warn('[Finance] link doc:', e.message))
          }
        })
        .catch(e=>console.warn('[Finance] Supabase save:', e.message))
    }
    cleanupReview()
  }, [reviewForm, finance, setFinance, cleanupReview, reviewInfo])

  // ── Approve CSV ───────────────────────────────────────────────────────────────
  const approveCsv = useCallback(() => {
    const approved = csvRows.filter(r=>r.approved && r.amount>0)
    if (!approved.length) return
    const base = nextId(Array.isArray(finance)?finance:[])
    const recs  = approved.map((r,i) => ({
      id:base+i, date:r.date||today(), type:r.type, category:r.category,
      description:r.description, amount:r.amount, supplierPayee:r.supplierPayee,
      paymentMethod:'EFT', invoiceNumber:'', vatAmount:0,
      notes:`CSV · ${r.confidence} · ${csvMeta.fileName}`,
      source:'import', sourceFile:csvMeta.fileName,
    }))
    setFinance(ff=>[...(Array.isArray(ff)?ff:[]),...recs])
    if (SUPABASE_CONFIGURED) {
      recs.forEach(r=>insertTransactionCloud(r).catch(e=>console.warn('[Finance] CSV row:', e.message)))
    }
    setCsvRows([]); setImportStep('upload'); setImportOpen(false)
  }, [csvRows, csvMeta, finance, setFinance])

  const updateCsvRow = (i,k,v) => setCsvRows(rows=>rows.map((r,j)=>j===i?{...r,[k]:v}:r))

  // ── resolvePreviewUrl — IDENTICAL to BusinessDocuments ────────────────────────
  // IDB first (fast, offline) → Supabase public URL → Supabase signed URL
  const resolvePreviewUrl = useCallback(async ({ idbKey, storagePath, publicUrl }) => {
    // 1. IndexedDB
    if (idbKey) {
      try {
        const url = await createObjectURL(idbKey)
        if (url) return { url, source:'indexeddb', revoke:true }
      } catch { /* fall through */ }
    }
    // 2. Supabase
    if (SUPABASE_CONFIGURED && (storagePath || publicUrl)) {
      const result = await getDocumentUrl({
        id:           idbKey || null,
        storage_path: storagePath || null,
        public_url:   publicUrl   || null,
      })
      return result
    }
    throw new Error('Document not available — not in local cache and Supabase not configured.')
  }, [])

  // ── View source document from transaction row ─────────────────────────────────
  const viewSourceDoc = useCallback(async t => {
    const hasSource = t.sourceDocId || t.sourceStoragePath || t.sourcePublicUrl
    if (!hasSource) { alert('No source document linked to this transaction.'); return }
    try {
      const { url, revoke } = await resolvePreviewUrl({
        idbKey:      t.sourceDocId         || null,
        storagePath: t.sourceStoragePath   || null,
        publicUrl:   t.sourcePublicUrl     || null,
      })
      window.open(url, '_blank')
      if (revoke) setTimeout(()=>URL.revokeObjectURL(url), 30000)
    } catch (e) {
      alert(`Cannot open source document: ${e.message}`)
    }
  }, [resolvePreviewUrl])

  // ── Download source document from transaction row ─────────────────────────────
  const downloadSourceDoc = useCallback(async t => {
    // Try IDB first
    if (t.sourceDocId) {
      const ok = await downloadFileById(t.sourceDocId, t.sourceFile || 'document')
      if (ok) return
    }
    // Fall back to Supabase
    if (SUPABASE_CONFIGURED && (t.sourceStoragePath || t.sourcePublicUrl)) {
      try {
        const { url } = await resolvePreviewUrl({
          idbKey:      t.sourceDocId       || null,
          storagePath: t.sourceStoragePath || null,
          publicUrl:   t.sourcePublicUrl   || null,
        })
        const a = document.createElement('a')
        a.href = url; a.download = t.sourceFile || 'document'; a.click()
        return
      } catch (e) { alert(`Download failed: ${e.message}`); return }
    }
    alert('Source document not available.')
  }, [resolvePreviewUrl])

  // ── File import handler ───────────────────────────────────────────────────────
  const handleFileSelected = useCallback(async e => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const ext = file.name.split('.').pop().toLowerCase()
    setImportErr(''); setImportStep('processing'); setProcessPct(5); setProcessMsg('Reading file…')

    // ── CSV / TSV ──────────────────────────────────────────────────────────────
    if (ext==='csv' || ext==='tsv') {
      try {
        setProcessMsg('Parsing CSV…'); setProcessPct(50)
        const { headers, rows } = await extractCsvRows(file)
        setProcessPct(100)
        const mapped = rows.map((cols,i) => {
          const get = (...keys) => {
            for (const k of keys) {
              const idx = headers.findIndex(h=>h.toLowerCase()===k.toLowerCase())
              if (idx!==-1 && cols[idx]) return cols[idx]
            }
            return ''
          }
          const desc   = get('description','narration','details','reference') || cols[1] || ''
          const rawAmt = get('amount','debit','credit','value') || cols[2] || '0'
          const amount = Math.abs(parseFloat(rawAmt.replace(/[^0-9.-]/g,''))||0)
          const date   = get('date','transaction date','posting date') || cols[0] || today()
          const payee  = get('payee','merchant','supplier','beneficiary') || ''
          const cls    = classifyText(desc+' '+payee)
          return { _id:i+1, date, description:desc, amount, supplierPayee:payee,
                   invoiceNumber:'', vatAmount:0, ...cls, approved:amount>0 }
        }).filter(r=>r.amount>0||r.description)
        setCsvRows(mapped); setCsvMeta({ fileName:file.name }); setImportStep('review_csv')
      } catch (err) {
        setImportErr(`CSV parsing failed: ${err.message}`); setImportStep('upload')
      }
      return
    }

    // ── PDF / Image shared flow ────────────────────────────────────────────────

    // 1. Store in IndexedDB immediately
    setProcessMsg('Storing file locally…'); setProcessPct(12)
    const docId = `fin-${Date.now()}`
    let fileStored = false
    try {
      await storeFile(docId, file)
      fileStored = true
      setProcessPct(20)
    } catch (err) { console.warn('[Finance] IDB store failed:', err.message) }

    // 2. Upload to Supabase — BEFORE building preview URL so we have storage info
    let sbDoc = null
    if (SUPABASE_CONFIGURED) {
      try {
        setProcessMsg('Uploading to Supabase Storage…'); setProcessPct(28)
        sbDoc = await uploadDocument(file, { category:'Invoices', localDocId:docId })
        setProcessPct(38)
      } catch (err) {
        console.warn('[Finance] Supabase upload failed, continuing locally:', err.message)
      }
    }

    // 3. Build a fresh blob URL for immediate preview (works right now in this session)
    const blobUrl = URL.createObjectURL(file)

    // 4. OCR / text extraction
    let rawText     = ''
    let isTextBased = false
    let ocrMethod   = 'none'

    if (ext==='pdf') {
      try {
        setProcessMsg('Extracting text from PDF…'); setProcessPct(42)
        const result = await extractPdfText(file)
        rawText      = result.text
        isTextBased  = result.isTextBased
        setProcessPct(58)
      } catch (err) { console.warn('[Finance] pdf.js failed:', err.message) }

      if (!isTextBased) {
        // Scanned PDF — run Tesseract on first page
        try {
          setProcessMsg('Rendering PDF page for OCR…'); setProcessPct(62)
          const pageBlob = await pdfPageToImageBlob(file, 1, 2)
          setProcessMsg('Running Tesseract OCR… (10–30s)'); setProcessPct(66)
          rawText   = await ocrImage(pageBlob, p=>setProcessPct(66+Math.round(p*0.24)))
          ocrMethod = 'tesseract'
        } catch (err) { console.warn('[Finance] Tesseract failed:', err.message) }
      } else {
        ocrMethod = 'pdfjs'
      }

      if (OCR_AVAILABLE && rawText) {
        try {
          setProcessMsg('AI structured extraction…'); setProcessPct(93)
          const aiResult = await extractViaBackend(file, rawText)
          openReviewScreen(file, docId, fileStored, blobUrl, 'pdf', ext, aiResult, 'ai', rawText, null, sbDoc)
          setImportOpen(false); return
        } catch (err) { console.warn('[Finance] AI extraction failed:', err.message) }
      }
      const extracted  = heuristicExtract(rawText)
      const classified = classifyText((extracted.supplierName||'')+(extracted.description||''))
      openReviewScreen(file, docId, fileStored, blobUrl, 'pdf', ext, extracted, ocrMethod, rawText, classified, sbDoc)
      setImportOpen(false); return
    }

    const imgExts = ['jpg','jpeg','png','webp','gif','bmp','tiff','heic']
    if (imgExts.includes(ext)) {
      setProcessMsg('Running Tesseract OCR on image… (10–30s)'); setProcessPct(32)
      try {
        rawText   = await ocrImage(file, p=>{ setProcessPct(32+Math.round(p*0.54)); setProcessMsg(`OCR: ${p}%`) })
        ocrMethod = 'tesseract'
        setProcessPct(88)
      } catch (err) { console.warn('[Finance] Tesseract failed:', err.message) }

      if (OCR_AVAILABLE && rawText) {
        try {
          setProcessMsg('AI structured extraction…'); setProcessPct(92)
          const aiResult = await extractViaBackend(file, rawText)
          openReviewScreen(file, docId, fileStored, blobUrl, 'image', ext, aiResult, 'ai', rawText, null, sbDoc)
          setImportOpen(false); return
        } catch {}
      }
      const extracted  = heuristicExtract(rawText)
      const classified = classifyText((extracted.supplierName||'')+(extracted.description||''))
      openReviewScreen(file, docId, fileStored, blobUrl, 'image', ext, extracted, ocrMethod, rawText, classified, sbDoc)
      setImportOpen(false); return
    }

    setImportErr(`Unsupported file type: .${ext}. Use PDF, JPG, PNG, or CSV.`)
    setImportStep('upload')
    URL.revokeObjectURL(blobUrl)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── openReviewScreen ──────────────────────────────────────────────────────────
  // Sets all review state. blobUrl is the immediate preview; sbDoc carries Supabase info.
  function openReviewScreen(
    file, docId, fileStored, blobUrl, mediaType, ext,
    extracted, ocrMethod, rawText='', classified=null, sbDoc=null
  ) {
    const cls  = classified || classifyText((extracted?.supplierName||'')+(extracted?.description||''))
    const conf = extracted?.confidence || cls.confidence

    // Save extraction to Supabase document_extractions table
    if (sbDoc?.id && extracted) {
      saveExtractionToCloud(sbDoc.id, {
        ...extracted,
        suggestedType:     cls?.type,
        suggestedCategory: cls?.category,
        confidence:        conf,
        rawText,
      }, ocrMethod).catch(e=>console.warn('[Finance] save extraction:', e.message))
    }

    setReviewInfo({
      fileName:     file.name,
      docId,
      fileStored,
      ocrMethod,
      confidence:   conf,
      rawText,
      mediaType,
      supabaseDocId: sbDoc?.id || null,
    })

    // Preview descriptor — blobUrl is the fast immediate URL
    // idbKey / storagePath / publicUrl are fallbacks that survive page refresh
    setReviewPreview({
      url:         blobUrl,                      // fresh blob URL (works right now)
      ext,
      idbKey:      sbDoc?.id || docId,           // prefer Supabase UUID, fall back to local key
      storagePath: sbDoc?.storage_path || null,  // Supabase Storage path
      publicUrl:   sbDoc?.public_url   || null,  // Supabase public URL
    })

    setReviewForm({
      date:              extracted?.invoiceDate       || today(),
      type:              extracted?.suggestedType     || cls.type,
      category:          extracted?.suggestedCategory || cls.category,
      description:       extracted?.description       || extracted?.supplierName || '',
      amount:            String(extracted?.totalAmount || ''),
      supplierPayee:     extracted?.supplierName      || '',
      paymentMethod:     'EFT',
      invoiceNumber:     extracted?.invoiceNumber     || '',
      vatAmount:         String(extracted?.vatAmount  || ''),
      notes:             `${ocrMethod==='ai'?'AI extraction':ocrMethod==='tesseract'?'Tesseract OCR':ocrMethod==='pdfjs'?'PDF text extraction':'Manual entry'} · ${conf} · ${file.name}`,
      source:            ocrMethod==='ai' ? 'ocr' : ocrMethod==='tesseract' ? 'tesseract' : 'import',
      // sourceDocId: Supabase UUID when available; falls back to local IDB key
      sourceDocId:       sbDoc?.id || (fileStored ? docId : null),
      sourceFile:        file.name,
      // Supabase storage info carried on the transaction for post-refresh viewSourceDoc
      sourceStoragePath: sbDoc?.storage_path || null,
      sourcePublicUrl:   sbDoc?.public_url   || null,
    })
    setReviewErrors({})
    setReviewOpen(true)
    setProcessPct(100); setProcessMsg('')
  }

  // ── Insight text ─────────────────────────────────────────────────────────────
  const topCat  = catSummary[0]?.[0] || 'no expenses yet'
  const insight = `Botanica has received ${ZAR(invested)} in owner investment and spent ${ZAR(expenses)}.`
    + (topCat!=='no expenses yet' ? ` Largest category: ${topCat}.` : '')
    + ` Cash position: ${ZAR(remaining)}.`
    + (income===0 ? ' No business income yet.' : ` Business income: ${ZAR(income)}.`)

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Finance Centre</div>
          <div className="page-subtitle">Owner Investment · Income · Expenses</div>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button className="btn btn-primary" onClick={openNew}>+ Add Manual Transaction</button>
          <button className="btn btn-outline" style={{borderColor:T.gold,color:T.forest}}
            onClick={()=>{ setImportStep('upload'); setImportErr(''); setImportOpen(true) }}>
            ⬆ Import from Document
          </button>
          <input ref={fileRef} type="file"
            accept=".csv,.tsv,.pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
            style={{display:'none'}} onChange={handleFileSelected}/>
        </div>
      </div>

      {/* KPI bar */}
      <div style={{background:'rgba(255,255,255,0.55)',backdropFilter:'blur(16px)',borderBottom:`1px solid rgba(210,200,184,0.5)`,padding:'16px 36px'}}>
        <div className="grid-5">
          {[
            { label:'Owner Investment', val:ZAR(invested),  color:T.teal },
            { label:'Business Income',  val:ZAR(income),    color:T.green },
            { label:'Total Expenses',   val:ZAR(expenses),  color:T.red },
            { label:'Cash Position',    val:ZAR(remaining), color:remaining>=0?T.gold:T.danger },
            { label:'Net Position',     val:ZAR(net),       color:net>=0?T.forestLight:T.danger },
          ].map((k,i) => (
            <div key={i} className="stat-card">
              <div className="stat-label">{k.label}</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:k.color,lineHeight:1,marginTop:6}}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="page-content">
        <div style={{display:'flex',gap:16,marginBottom:16,flexWrap:'wrap',fontSize:12}}>
          <span style={{color:T.green,fontWeight:600}}>✅ PDF text extraction (pdf.js)</span>
          <span style={{color:T.green,fontWeight:600}}>✅ Image OCR (Tesseract.js)</span>
          <span style={{color:OCR_AVAILABLE?T.green:T.textLight,fontWeight:600}}>
            {OCR_AVAILABLE?'✅':'🔑'} AI extraction {OCR_AVAILABLE?'active':'— add VITE_OCR_API_KEY'}
          </span>
          <span style={{color:SUPABASE_CONFIGURED?T.green:T.textLight,fontWeight:600}}>
            {SUPABASE_CONFIGURED?'✅':'🔑'} Supabase {SUPABASE_CONFIGURED?'active':'— not connected'}
          </span>
        </div>

        <div className="tabs">
          {['overview','transactions','monthly','categories'].map(t=>(
            <div key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </div>
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
                <div key={r.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:`1px solid rgba(210,200,184,0.35)`}}>
                  <span style={{fontSize:13,color:T.textMid}}>{r.label}</span>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:r.color}}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        {tab==='transactions' && (
          <>
            <div style={{display:'flex',gap:7,marginBottom:16,flexWrap:'wrap'}}>
              {['All','Owner Investment','Business Income','Business Expense'].map(t=>(
                <button key={t} className={`bp-fbtn ${filterType===t?'active':''}`} onClick={()=>setFilterType(t)}>{t}</button>
              ))}
            </div>
            {visibleTxns.length===0 ? (
              <div className="empty-st">
                <div className="empty-ic">₩</div>
                <div>No transactions yet.</div>
                <div style={{marginTop:12,display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                  <button className="btn btn-primary btn-sm" onClick={openNew}>Add Manual Transaction</button>
                  <button className="btn btn-outline btn-sm" onClick={()=>{ setImportStep('upload'); setImportOpen(true) }}>Import from Document</button>
                </div>
              </div>
            ) : (
              <div className="g-card" style={{padding:0}}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Payee</th><th>Inv #</th><th>Amount</th><th>Source</th><th style={{width:120}}></th></tr>
                    </thead>
                    <tbody>
                      {visibleTxns.map(t=>t&&(
                        <tr key={t.id}>
                          <td style={{fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(t.date)}</td>
                          <td><TypeBadge type={t.type}/></td>
                          <td style={{fontSize:12,color:T.textMid}}>{t.category}</td>
                          <td className="td-wrap" style={{fontSize:13,maxWidth:200}}>{t.description}</td>
                          <td style={{fontSize:12,color:T.textLight}}>{t.supplierPayee}</td>
                          <td style={{fontSize:11,color:T.textLight,fontFamily:'monospace'}}>{t.invoiceNumber||'—'}</td>
                          <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:TYPE_COLORS[t.type],whiteSpace:'nowrap'}}>{ZAR(t.amount)}</td>
                          <td><SourceBadge source={t.source}/></td>
                          <td>
                            <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                              <button className="btn btn-outline btn-xs" onClick={()=>openEdit(t)}>Edit</button>
                              {(t.sourceDocId || t.sourceStoragePath || t.sourcePublicUrl) && <>
                                <button className="btn btn-outline btn-xs" title="View source document" onClick={()=>viewSourceDoc(t)}>📄</button>
                                <button className="btn btn-outline btn-xs" title="Download source document" onClick={()=>downloadSourceDoc(t)}>⬇</button>
                              </>}
                              <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>delTxn(t.id)}>✕</button>
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
          <div className="g-card" style={{padding:0}}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Month</th><th>Investment</th><th>Income</th><th>Expenses</th><th>Cash Pos.</th><th>Net</th></tr></thead>
                <tbody>
                  {Object.entries(monthly).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,v])=>(
                    <tr key={m}>
                      <td className="td-name">{m}</td>
                      <td className="td-num" style={{color:T.teal}}>{ZAR(v.inv)}</td>
                      <td className="td-num" style={{color:T.green}}>{ZAR(v.inc)}</td>
                      <td className="td-num" style={{color:T.red}}>{ZAR(v.exp)}</td>
                      <td className="td-num" style={{color:T.gold}}>{ZAR(v.inv-v.exp)}</td>
                      <td className="td-num" style={{color:(v.inc-v.exp)>=0?T.forestLight:T.danger}}>{ZAR(v.inc-v.exp)}</td>
                    </tr>
                  ))}
                  {Object.keys(monthly).length===0 && <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:T.textLight}}>No transactions yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categories */}
        {tab==='categories' && (
          <div className="g-card" style={{padding:0}}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Category</th><th>Total Spend</th><th>% of Expenses</th><th style={{width:180}}>Share</th></tr></thead>
                <tbody>
                  {catSummary.map(([cat,amt])=>(
                    <tr key={cat}>
                      <td className="td-name">{cat}</td>
                      <td className="td-num" style={{color:T.red}}>{ZAR(amt)}</td>
                      <td style={{color:T.textMid,fontSize:13}}>{expenses>0?((amt/expenses)*100).toFixed(1):0}%</td>
                      <td><div className="pbar"><div className="pbar-fill pbar-gold" style={{width:`${expenses>0?(amt/expenses)*100:0}%`}}/></div></td>
                    </tr>
                  ))}
                  {catSummary.length===0 && <tr><td colSpan={4} style={{textAlign:'center',padding:32,color:T.textLight}}>No expense categories yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══ MANUAL TRANSACTION MODAL ══════════════════════════════════════════ */}
      <Modal open={modal} onClose={()=>setModal(false)}
        title={editing!=null?'Edit Transaction':'Add Manual Transaction'}
        footer={<><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveTxn}>Save Transaction</button></>}
      >
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="txn-date">Date</label>
            <input id="txn-date" type="date" value={form.date} onChange={F('date')} style={{borderColor:formErrors.date?T.danger:undefined}}/>
            {formErrors.date && <div role="alert" style={{fontSize:11,color:T.danger,marginTop:3}}>{formErrors.date}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="txn-type">Type</label>
            <select id="txn-type" value={form.type} onChange={e=>{const t=e.target.value;setForm(f=>({...f,type:t,category:FINANCE_CATEGORIES[t]?.[0]||''}))}}>
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
            <label htmlFor="txn-amt">Amount (ZAR) <span style={{color:T.danger}}>*</span></label>
            <input id="txn-amt" type="text" inputMode="decimal" placeholder="0" value={form.amount} onChange={F('amount')} style={{borderColor:formErrors.amount?T.danger:undefined}}/>
            {formErrors.amount && <div role="alert" style={{fontSize:11,color:T.danger,marginTop:3}}>{formErrors.amount}</div>}
          </div>
          <div className="form-field full">
            <label htmlFor="txn-desc">Description <span style={{color:T.danger}}>*</span></label>
            <input id="txn-desc" value={form.description} onChange={F('description')} placeholder="e.g. Domain registration" style={{borderColor:formErrors.description?T.danger:undefined}}/>
            {formErrors.description && <div role="alert" style={{fontSize:11,color:T.danger,marginTop:3}}>{formErrors.description}</div>}
          </div>
          <div className="form-field"><label htmlFor="txn-sup">Supplier / Payee</label><input id="txn-sup" value={form.supplierPayee} onChange={F('supplierPayee')}/></div>
          <div className="form-field">
            <label htmlFor="txn-pm">Payment Method</label>
            <select id="txn-pm" value={form.paymentMethod} onChange={F('paymentMethod')}>
              {PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-field"><label htmlFor="txn-inv">Invoice Number</label><input id="txn-inv" value={form.invoiceNumber||''} onChange={F('invoiceNumber')} placeholder="INV-001"/></div>
          <div className="form-field"><label htmlFor="txn-vat">VAT Amount (ZAR)</label><input id="txn-vat" type="text" inputMode="decimal" value={form.vatAmount||''} onChange={F('vatAmount')} placeholder="0"/></div>
          <div className="form-field full"><label htmlFor="txn-notes">Notes</label><textarea id="txn-notes" value={form.notes} onChange={F('notes')}/></div>
        </div>
      </Modal>

      {/* ══ IMPORT WIZARD MODAL ═══════════════════════════════════════════════ */}
      <Modal open={importOpen}
        onClose={()=>{ setImportOpen(false); if(importStep!=='review_csv') setImportStep('upload') }}
        title="Import from Document" size="modal-lg"
        footer={importStep==='review_csv'?(
          <>
            <button className="btn btn-outline" onClick={()=>{ setImportOpen(false); setCsvRows([]); setImportStep('upload') }}>Cancel</button>
            <button className="btn btn-outline btn-sm" onClick={()=>setCsvRows(r=>r.map(x=>({...x,approved:true})))}>All ✓</button>
            <button className="btn btn-primary" onClick={approveCsv}>Save {csvRows.filter(r=>r.approved).length} Transactions</button>
          </>
        ):null}
      >
        {importStep==='upload' && (
          <div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:T.greenPale,border:`1px solid rgba(21,128,61,0.2)`,borderRadius:10,fontSize:12,color:T.green}}>
                ✅ <strong>PDF text extraction</strong> · <strong>Tesseract.js image OCR</strong> — no API key needed
              </div>
              {!OCR_AVAILABLE && (
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(184,151,90,0.1)',border:`1px solid rgba(184,151,90,0.22)`,borderRadius:10,fontSize:12,color:'#6B4E10'}}>
                  🔑 <strong>AI extraction</strong> — add <code>VITE_OCR_API_KEY</code> + <code>OCR_SECRET_KEY</code> to Vercel for higher accuracy
                </div>
              )}
              {importErr && (
                <div style={{padding:'10px 14px',background:T.redPale,border:`1px solid rgba(185,28,28,0.2)`,borderRadius:10,fontSize:12,color:T.danger}}>⚠ {importErr}</div>
              )}
            </div>
            <div
              style={{border:`2px dashed rgba(210,200,184,0.7)`,borderRadius:14,padding:'44px 24px',textAlign:'center',cursor:'pointer'}}
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);fileRef.current.files=dt.files;handleFileSelected({target:fileRef.current})}}}
            >
              <div style={{fontSize:36,opacity:0.32,marginBottom:12}}>📄</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:T.forest,marginBottom:6}}>Drop a file or click to browse</div>
              <div style={{fontSize:12,color:T.textLight}}>PDF · Image (JPG/PNG/WEBP) · CSV</div>
              <button className="btn btn-primary" style={{marginTop:16}} onClick={e=>{e.stopPropagation();fileRef.current?.click()}}>Choose File</button>
            </div>
          </div>
        )}

        {importStep==='processing' && (
          <div style={{textAlign:'center',padding:'48px 20px'}}>
            <div style={{fontSize:44,marginBottom:14}}>⏳</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:T.forest,marginBottom:12}}>{processMsg||'Processing…'}</div>
            <div style={{maxWidth:300,margin:'0 auto'}}>
              <div className="pbar" style={{height:6}}>
                <div className="pbar-fill pbar-gold" style={{width:`${processPct}%`,transition:'width 0.3s'}}/>
              </div>
              <div style={{fontSize:12,color:T.textLight,marginTop:8}}>{processPct}%</div>
            </div>
          </div>
        )}

        {importStep==='review_csv' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <div style={{fontSize:13,color:T.textMid}}><strong>{csvMeta.fileName}</strong> · {csvRows.length} rows · {csvRows.filter(r=>r.approved).length} approved</div>
              <div style={{display:'flex',gap:6}}>
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

      {/* ══ REVIEW SCREEN — full-screen split: preview left, form right ════════ */}
      {reviewOpen && reviewForm && reviewInfo && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&cleanupReview()}>
          <div
            style={{
              width:'min(98vw,1180px)', height:'min(96vh,860px)',
              background:'rgba(247,243,237,0.97)',
              backdropFilter:'blur(40px) saturate(200%)',
              WebkitBackdropFilter:'blur(40px) saturate(200%)',
              border:'1px solid rgba(255,255,255,0.55)',
              borderRadius:'var(--r24)',
              boxShadow:'0 32px 80px rgba(10,28,20,0.28)',
              display:'flex', flexDirection:'column', overflow:'hidden',
            }}
            onClick={e=>e.stopPropagation()}
          >
            {/* Header */}
            <div style={{padding:'16px 22px',borderBottom:`1px solid rgba(210,200,184,0.5)`,display:'flex',alignItems:'center',gap:14,flexShrink:0}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:T.forest,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                Review: {reviewInfo.fileName}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                <span style={{fontSize:11,fontWeight:700,color:CONF_COLORS[reviewInfo.confidence]||T.textMid}}>
                  {reviewInfo.confidence}
                </span>
                <span style={{fontSize:11,color:T.textMid}}>
                  {reviewInfo.ocrMethod==='ai'?'AI':reviewInfo.ocrMethod==='tesseract'?'Tesseract OCR':reviewInfo.ocrMethod==='pdfjs'?'PDF text':'Manual'}
                </span>
                {reviewInfo.supabaseDocId && <span className="badge badge-teal" style={{fontSize:10}}>☁ Cloud</span>}
                {reviewInfo.fileStored    && <span className="badge badge-green" style={{fontSize:10}}>💻 Local</span>}
                <button className="modal-close" onClick={cleanupReview}>✕</button>
              </div>
            </div>

            {/* OCR status bar */}
            <div style={{
              padding:'9px 22px', flexShrink:0, fontSize:12,
              background: reviewInfo.ocrMethod==='ai'||reviewInfo.ocrMethod==='tesseract'
                ? T.greenPale : reviewInfo.ocrMethod==='pdfjs'
                ? 'rgba(14,116,144,0.06)' : 'rgba(228,221,208,0.5)',
              borderBottom:`1px solid rgba(210,200,184,0.4)`,
              color: reviewInfo.ocrMethod==='none' ? T.textMid : T.green,
            }}>
              {reviewInfo.ocrMethod==='ai'        && '✅ AI extracted data. Review all fields before saving.'}
              {reviewInfo.ocrMethod==='tesseract'  && '✅ Tesseract OCR read this document. Verify accuracy before saving.'}
              {reviewInfo.ocrMethod==='pdfjs'      && '✅ PDF text extracted. Fields pre-filled — verify before saving.'}
              {reviewInfo.ocrMethod==='none'       && '⚠ Could not read document automatically. Fill in fields manually from the preview.'}
            </div>

            {/* Split panel */}
            <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>

              {/* LEFT — preview panel (identical logic to BusinessDocuments) */}
              <ReviewPreviewPanel
                preview={reviewPreview}
                fileName={reviewInfo.fileName}
                rawText={reviewInfo.rawText}
                resolvePreviewUrl={resolvePreviewUrl}
              />

              {/* RIGHT — transaction form */}
              <div style={{flex:1,overflow:'auto',padding:'16px 20px'}}>
                <div style={{fontSize:10,letterSpacing:'0.16em',textTransform:'uppercase',color:T.gold,fontWeight:700,marginBottom:14}}>
                  Transaction Details — edit before saving
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div className="form-field">
                    <label htmlFor="rv-date">Date</label>
                    <input id="rv-date" type="date" value={reviewForm.date} onChange={RF('date')} style={{borderColor:reviewErrors.date?T.danger:undefined}}/>
                    {reviewErrors.date && <div role="alert" style={{fontSize:11,color:T.danger,marginTop:2}}>{reviewErrors.date}</div>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-type">Type</label>
                    <select id="rv-type" value={reviewForm.type} onChange={e=>{const t=e.target.value;setReviewForm(f=>({...f,type:t,category:FINANCE_CATEGORIES[t]?.[0]||''}))}}>
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
                    <label htmlFor="rv-amt">Amount (ZAR) <span style={{color:T.danger}}>*</span></label>
                    <input id="rv-amt" type="text" inputMode="decimal" value={reviewForm.amount} onChange={RF('amount')} style={{borderColor:reviewErrors.amount?T.danger:undefined}}/>
                    {reviewErrors.amount && <div role="alert" style={{fontSize:11,color:T.danger,marginTop:2}}>{reviewErrors.amount}</div>}
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
                    <label htmlFor="rv-desc">Description <span style={{color:T.danger}}>*</span></label>
                    <input id="rv-desc" value={reviewForm.description||''} onChange={RF('description')} style={{borderColor:reviewErrors.description?T.danger:undefined}}/>
                    {reviewErrors.description && <div role="alert" style={{fontSize:11,color:T.danger,marginTop:2}}>{reviewErrors.description}</div>}
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-pm">Payment Method</label>
                    <select id="rv-pm" value={reviewForm.paymentMethod} onChange={RF('paymentMethod')}>
                      {PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="rv-notes">Notes</label>
                    <textarea id="rv-notes" value={reviewForm.notes||''} onChange={RF('notes')} style={{minHeight:50}}/>
                  </div>
                  {(reviewInfo.supabaseDocId || reviewInfo.fileStored) && (
                    <div style={{fontSize:11,color:T.green,padding:'6px 0'}}>
                      {reviewInfo.supabaseDocId ? '☁ Document stored in Supabase — linked to this transaction.' : '💻 Document stored locally — linked to this transaction.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{padding:'14px 22px',borderTop:`1px solid rgba(210,200,184,0.5)`,display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0,flexWrap:'wrap'}}>
              <button className="btn btn-outline" onClick={cleanupReview}>Reject — Don't Save</button>
              <button className="btn btn-primary" onClick={approveReview}>✓ Approve & Save Transaction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
