// SupplierZone.jsx — v2.0
// Tabs: Suppliers · Catalogs & AI Extraction · Product Database · Import Calculator
import { useState, useRef, useCallback, useMemo } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, USD, parseNum, nextId, today, fmtDate, safeStr, truncate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'
import { OCR_AVAILABLE, extractPdfText, extractCsvRows } from '../lib/ocr.js'

const DEFAULT_RATE = 18.60
const CURRENCIES   = ['USD', 'EUR', 'CNY', 'GBP']
const EXTRACT_STATUS = { pending:'Pending', extracting:'Extracting…', done:'Extracted', error:'Error', reviewing:'Reviewing' }

// ── Helpers ──────────────────────────────────────────────────────────────────
function pct(n) { return `${Number(n).toFixed(1)}%` }
function useField(init) {
  const [raw, set] = useState(String(init === 0 ? '' : init))
  return [raw, set, parseNum(raw)]
}
function NumField({ label, value, onChange, prefix = 'USD', hint, disabled }) {
  return (
    <div className="form-field">
      <label style={{ opacity:disabled?0.4:1 }}>{label}</label>
      <div style={{ position:'relative' }}>
        {prefix && <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:11,color:T.textMid,pointerEvents:'none',zIndex:1 }}>{prefix}</span>}
        <input type="text" inputMode="decimal" value={value} onChange={e=>onChange(e.target.value)}
          disabled={disabled} placeholder="0" style={{ paddingLeft:prefix?36:undefined, opacity:disabled?0.35:1 }} />
      </div>
      {hint && <div style={{ fontSize:10,color:T.gold,marginTop:2 }}>{hint}</div>}
    </div>
  )
}

// ── Blank product template ────────────────────────────────────────────────────
const BLANK_PROD = {
  id:'', supplierId:'', supplierName:'', catalogId:'', catalogVersion:'',
  status:'approved',  // approved | pending | rejected
  confidence:100,
  productName:'', productCode:'', category:'', subcategory:'',
  height:'', width:'', length:'', potSize:'', colour:'', material:'',
  moq:'', unitPrice:'', currency:'USD',
  exwPrice:'', fobPrice:'', cifPrice:'', samplePrice:'',
  leadTime:'', packagingNotes:'', notes:'',
  _source:'manual', _extractedAt:'',
}

// ═════════════════════════════════════════════════════════════════════════════
// AI CATALOG EXTRACTION
// Sends catalog text to /api/extract with a catalog-specific prompt.
// Returns array of structured product objects.
// ═════════════════════════════════════════════════════════════════════════════
async function extractCatalogProducts(file, supplier) {
  const ext = file.name.split('.').pop().toLowerCase()
  let rawText = ''

  // Step 1 — Extract raw text
  if (ext === 'pdf') {
    try {
      const result = await extractPdfText(file)
      rawText = result.text || ''
    } catch {}
  } else if (['csv','tsv'].includes(ext)) {
    try {
      const result = await extractCsvRows(file)
      rawText = [result.headers.join('\t'), ...result.rows.map(r=>r.join('\t'))].join('\n')
    } catch {}
  } else if (['xlsx','xls'].includes(ext)) {
    rawText = '[Excel file — AI will read via file attachment]'
  }

  // Step 2 — AI extraction via /api/extract
  if (!OCR_AVAILABLE) {
    // Graceful fallback: parse what we can from raw text
    return parseCatalogTextHeuristic(rawText, supplier)
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('rawText', rawText)
  formData.append('extractionType', 'supplier_catalog')
  formData.append('supplierName', supplier?.name || '')
  formData.append('prompt', buildCatalogPrompt(supplier?.name || '', rawText))

  try {
    const res  = await fetch('/api/extract', { method:'POST', body:formData })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()

    // Parse structured response
    if (data.products && Array.isArray(data.products)) {
      return data.products.map(p => sanitiseExtractedProduct(p, supplier))
    }
    // Try parsing JSON from text response
    if (data.text || data.content) {
      const text = data.text || (Array.isArray(data.content) ? data.content.map(c=>c.text||'').join('') : '')
      try {
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        const arr = Array.isArray(parsed) ? parsed : (parsed.products || [])
        return arr.map(p => sanitiseExtractedProduct(p, supplier))
      } catch {}
    }
    // Fall through to heuristic
    return parseCatalogTextHeuristic(rawText, supplier)
  } catch (err) {
    console.warn('[CatalogExtract] AI failed:', err.message, '— falling back to heuristic')
    return parseCatalogTextHeuristic(rawText, supplier)
  }
}

function buildCatalogPrompt(supplierName, rawText) {
  return (
    'You are extracting product data from a supplier catalog for a premium artificial greenery importer.\n' +
    'Supplier: ' + supplierName + '\n\n' +
    'Extract ALL products from the following catalog text. Return ONLY a JSON array of objects.\n' +
    'Each object must have these fields (use empty string if not found):\n' +
    'productName, productCode, category, subcategory, height, width, length, potSize,\n' +
    'colour, material, moq, unitPrice, currency, exwPrice, fobPrice, cifPrice, samplePrice,\n' +
    'leadTime, packagingNotes, notes, confidence (0-100 integer)\n\n' +
    'CATALOG TEXT:\n' +
    rawText.slice(0, 8000)
  )
}

function sanitiseExtractedProduct(p, supplier) {
  return {
    ...BLANK_PROD,
    productName:    String(p.productName    || p.name        || p.product_name || '').trim(),
    productCode:    String(p.productCode    || p.code        || p.sku          || p.product_code || '').trim(),
    category:       String(p.category       || '').trim(),
    subcategory:    String(p.subcategory    || '').trim(),
    height:         String(p.height         || p.size        || '').trim(),
    width:          String(p.width          || '').trim(),
    length:         String(p.length         || '').trim(),
    potSize:        String(p.potSize        || p.pot_size    || '').trim(),
    colour:         String(p.colour         || p.color       || '').trim(),
    material:       String(p.material       || '').trim(),
    moq:            String(p.moq            || p.MOQ         || '').trim(),
    unitPrice:      String(p.unitPrice      || p.unit_price  || p.price || '').trim(),
    currency:       String(p.currency       || 'USD').trim(),
    exwPrice:       String(p.exwPrice       || p.exw_price   || p.exw   || '').trim(),
    fobPrice:       String(p.fobPrice       || p.fob_price   || p.fob   || '').trim(),
    cifPrice:       String(p.cifPrice       || p.cif_price   || p.cif   || '').trim(),
    samplePrice:    String(p.samplePrice    || p.sample_price|| p.sample|| '').trim(),
    leadTime:       String(p.leadTime       || p.lead_time   || '').trim(),
    packagingNotes: String(p.packagingNotes || p.packaging   || '').trim(),
    notes:          String(p.notes          || p.description || '').trim(),
    confidence:     Number(p.confidence     || 80),
    status:         'pending',
    supplierId:     supplier?.id   || '',
    supplierName:   supplier?.name || '',
    _source:        'ai',
    _extractedAt:   new Date().toISOString(),
  }
}

// Heuristic fallback — parses plain text when AI is not configured
function parseCatalogTextHeuristic(text, supplier) {
  if (!text || text.length < 10) return []
  const products = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3)

  // Look for patterns like "Product Name | 180cm | MOQ 50 | USD 31"
  const priceRe  = /USD\s*[\d.]+|CNY\s*[\d.]+|EUR\s*[\d.]+|\$[\d.]+/i
  const moqRe    = /MOQ\s*:?\s*(\d+)/i
  const sizeRe   = /(\d+(?:\.\d+)?)\s*cm/i
  const codeRe   = /[A-Z]{2,4}[-_][A-Z0-9]{2,10}/

  lines.forEach((line, i) => {
    if (line.length < 5 || line.length > 200) return
    // Skip obvious header lines
    if (/^(no\.|#|item|product\s*name|code|sku|price|moq)/i.test(line)) return

    const priceM = line.match(priceRe)
    const moqM   = line.match(moqRe)
    const sizeM  = line.match(sizeRe)
    const codeM  = line.match(codeRe)

    if (priceM || moqM || sizeM || codeM) {
      // Likely a product line
      const cleanName = line.replace(priceRe,'').replace(moqRe,'').replace(codeRe,'').replace(/[|\t]+/g,' ').trim()
      if (cleanName.length > 3) {
        products.push({
          ...BLANK_PROD,
          productName:  cleanName.slice(0,80),
          productCode:  codeM?.[0] || '',
          height:       sizeM ? sizeM[1] + 'cm' : '',
          moq:          moqM  ? moqM[1] : '',
          exwPrice:     priceM ? priceM[0].replace(/[A-Z$]/g,'').trim() : '',
          currency:     'USD',
          confidence:   50,
          status:       'pending',
          supplierId:   supplier?.id   || '',
          supplierName: supplier?.name || '',
          _source:      'heuristic',
          _extractedAt: new Date().toISOString(),
        })
      }
    }
  })
  return products.slice(0, 200)  // cap at 200 products per catalog
}

// ═════════════════════════════════════════════════════════════════════════════
// SUPPLIER DATABASE TAB
// ═════════════════════════════════════════════════════════════════════════════
const BLANK_SUPPLIER = {
  name:'', country:'China', contact:'', email:'', whatsapp:'', website:'',
  terms:'FOB', currency:'USD', status:'Active', notes:'',
  sampleLeadTime:'', productionLeadTime:'', paymentTerms:'T/T 30%',
}

function SupplierDatabase({ suppliers, setSuppliers }) {
  const [modal,    setModal]    = useState(false)
  const [editing,  setEdit]     = useState(null)
  const [form,     setForm]     = useState(BLANK_SUPPLIER)
  const [selected, setSelected] = useState(null)
  const F = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const safe = Array.isArray(suppliers) ? suppliers : []

  const openNew  = () => { setEdit(null); setForm({...BLANK_SUPPLIER}); setModal(true) }
  const openEdit = s  => { setEdit(s.id); setForm({...s}); setModal(true) }
  const save = () => {
    if (!form.name?.trim()) return
    const rec = { ...BLANK_SUPPLIER, ...form, id: editing!=null?editing:nextId(safe) }
    if (editing!=null) setSuppliers(ss=>ss.map(s=>s.id===editing?rec:s))
    else               setSuppliers(ss=>[...ss,rec])
    setModal(false)
  }
  const del = id => {
    if (!window.confirm('Remove this supplier? Their catalogs and extracted products will also be removed.')) return
    setSuppliers(ss=>ss.filter(s=>s.id!==id))
    if (selected===id) setSelected(null)
  }
  const sel = selected ? safe.find(s=>s.id===selected) : null

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10 }}>
        <div style={{ fontSize:13,color:T.textMid }}>{safe.length} supplier{safe.length!==1?'s':''}</div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Supplier</button>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:sel?'1fr 300px':'1fr',gap:16,alignItems:'start' }}>
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {safe.length===0 && <div className="empty-st"><div className="empty-ic">◎</div><div>No suppliers yet. Add your first supplier.</div></div>}
          {safe.map(s=>(
            <div key={s.id} className="doc-card" style={{ border:selected===s.id?`1.5px solid ${T.gold}`:undefined,cursor:'pointer' }} onClick={()=>setSelected(selected===s.id?null:s.id)}>
              <div style={{ width:40,height:40,borderRadius:10,background:T.greenPale,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>◎</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.forest,marginBottom:2 }}>{s.name}</div>
                <div style={{ fontSize:12,color:T.textMid }}>{s.country} · {s.terms} · {s.contact||'No contact set'}</div>
                {s.email && <div style={{ fontSize:11,color:T.textLight }}>{s.email}</div>}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:4,flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                <span style={{ fontSize:11,fontWeight:600,color:s.status==='Active'?T.green:T.textMid,padding:'2px 8px',background:s.status==='Active'?T.greenPale:'rgba(161,161,170,0.1)',borderRadius:20 }}>{s.status}</span>
                <button className="btn btn-outline btn-xs" onClick={()=>openEdit(s)}>Edit</button>
                <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>del(s.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        {sel && (
          <div className="g-card" style={{ position:'sticky',top:80 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12,paddingBottom:10,borderBottom:`1px solid rgba(210,200,184,0.4)` }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.forest }}>{sel.name}</div>
                <div style={{ fontSize:11,color:T.gold,letterSpacing:'0.1em',textTransform:'uppercase',marginTop:3 }}>{sel.country} · {sel.terms}</div>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={()=>setSelected(null)}>✕</button>
            </div>
            {[['Contact',sel.contact||'—'],['Email',sel.email||'—'],['WhatsApp',sel.whatsapp||'—'],['Payment',sel.paymentTerms||'—'],['Sample Lead',sel.sampleLeadTime||'—'],['Production Lead',sel.productionLeadTime||'—'],['Status',sel.status]].map(([k,v])=>(
              <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid rgba(210,200,184,0.25)`,fontSize:12,gap:8 }}>
                <span style={{ color:T.textMid,fontWeight:500,flexShrink:0 }}>{k}</span>
                <span style={{ color:T.forest,textAlign:'right',wordBreak:'break-all' }}>{v}</span>
              </div>
            ))}
            {sel.notes && <div style={{ marginTop:10,padding:10,background:'rgba(228,221,208,0.4)',borderRadius:8,fontSize:12,color:T.textMid,lineHeight:1.6 }}>{sel.notes}</div>}
            <button className="btn btn-primary btn-sm" style={{ marginTop:12,width:'100%' }} onClick={()=>openEdit(sel)}>Edit Supplier</button>
          </div>
        )}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title={editing!=null?'Edit Supplier':'Add Supplier'}
        footer={<><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}>
        <div className="form-grid">
          <div className="form-field full"><label>Supplier / Factory Name *</label><input value={form.name||''} onChange={F('name')} placeholder="e.g. Frank / Dongyi" /></div>
          <div className="form-field"><label>Country</label><input value={form.country||''} onChange={F('country')} /></div>
          <div className="form-field"><label>Default Terms</label><select value={form.terms} onChange={F('terms')}><option>EXW</option><option>FOB</option><option>CIF</option></select></div>
          <div className="form-field"><label>Contact Person</label><input value={form.contact||''} onChange={F('contact')} /></div>
          <div className="form-field"><label>Email</label><input type="email" value={form.email||''} onChange={F('email')} /></div>
          <div className="form-field"><label>WhatsApp</label><input value={form.whatsapp||''} onChange={F('whatsapp')} /></div>
          <div className="form-field"><label>Website</label><input value={form.website||''} onChange={F('website')} /></div>
          <div className="form-field"><label>Payment Terms</label><input value={form.paymentTerms||''} onChange={F('paymentTerms')} placeholder="T/T 30% deposit" /></div>
          <div className="form-field"><label>Sample Lead Time</label><input value={form.sampleLeadTime||''} onChange={F('sampleLeadTime')} placeholder="14 days" /></div>
          <div className="form-field"><label>Production Lead Time</label><input value={form.productionLeadTime||''} onChange={F('productionLeadTime')} placeholder="45 days" /></div>
          <div className="form-field"><label>Status</label><select value={form.status} onChange={F('status')}><option>Active</option><option>Prospect</option><option>On Hold</option><option>Inactive</option></select></div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')} /></div>
        </div>
      </Modal>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// CATALOGS & AI EXTRACTION TAB
// ═════════════════════════════════════════════════════════════════════════════
function CatalogTab({ suppliers, catalogs, setCatalogs, catalogProds, setCatalogProds }) {
  const [filterSup,   setFilterSup]   = useState('All')
  const [extracting,  setExtracting]  = useState(null)  // catalogId being extracted
  const [progress,    setProgress]    = useState('')
  const [reviewing,   setReviewing]   = useState(null)  // catalogId whose products to show
  const [editProd,    setEditProd]    = useState(null)  // product being edited
  const fileRef = useRef()
  const safe = Array.isArray(suppliers) ? suppliers : []
  const safeCat = Array.isArray(catalogs) ? catalogs : []
  const safeProds = Array.isArray(catalogProds) ? catalogProds : []

  const visible = filterSup === 'All' ? safeCat : safeCat.filter(c=>String(c.supplierId)===String(filterSup))

  // ── Upload catalog ────────────────────────────────────────────────────────
  const handleUpload = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || filterSup === 'All') { alert('Select a supplier first.'); return }
    const supplier = safe.find(s => String(s.id) === String(filterSup))
    const ext      = file.name.split('.').pop().toLowerCase()
    const catId    = Date.now()
    const newCat   = {
      id:             catId,
      supplierId:     filterSup,
      supplierName:   supplier?.name || filterSup,
      fileName:       file.name,
      fileType:       ext,
      fileSize:       `${(file.size/1024/1024).toFixed(1)} MB`,
      uploadDate:     today(),
      version:        `v${new Date().getFullYear()}.${String(new Date().getMonth()+1).padStart(2,'0')}`,
      status:         'pending',
      extractedCount: 0,
      active:         true,
      note:           '',
    }
    // Mark other catalogs from same supplier as inactive
    setCatalogs(cc => [
      ...cc.map(c => String(c.supplierId)===String(filterSup) ? {...c, active:false} : c),
      newCat,
    ])
    // Auto-trigger extraction
    await runExtraction(newCat, file, supplier)
  }

  // ── Run AI extraction ──────────────────────────────────────────────────────
  const runExtraction = async (cat, file, supplier) => {
    setExtracting(cat.id)
    setProgress('Reading catalog…')
    try {
      const products = await extractCatalogProducts(file, supplier || safe.find(s=>String(s.id)===String(cat.supplierId)))
      setProgress(`Extracted ${products.length} products. Preparing review…`)
      // Stamp with catalog id
      const stamped = products.map((p,i) => ({
        ...p, id: `${cat.id}_${i}`, catalogId: cat.id, catalogVersion: cat.version,
      }))
      // Remove old extracted products for this catalog, add new ones
      setCatalogProds(pp => [
        ...pp.filter(p => p.catalogId !== cat.id),
        ...stamped,
      ])
      setCatalogs(cc => cc.map(c => c.id===cat.id
        ? { ...c, status:'reviewing', extractedCount:stamped.length }
        : c
      ))
      setReviewing(cat.id)
    } catch (err) {
      setCatalogs(cc => cc.map(c => c.id===cat.id ? { ...c, status:'error', errorMsg:err.message } : c))
    }
    setExtracting(null)
    setProgress('')
  }

  // ── Re-run extraction ──────────────────────────────────────────────────────
  const rerunExtraction = cat => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.pdf,.xlsx,.xls,.csv'
    input.onchange = async e => {
      const file = e.target.files?.[0]
      if (!file) return
      const supplier = safe.find(s=>String(s.id)===String(cat.supplierId))
      await runExtraction(cat, file, supplier)
    }
    input.click()
  }

  // ── Delete catalog + its products ─────────────────────────────────────────
  const delCatalog = id => {
    if (!window.confirm('Remove this catalog and all its extracted products?')) return
    setCatalogs(cc => cc.filter(c => c.id !== id))
    setCatalogProds(pp => pp.filter(p => p.catalogId !== id))
    if (reviewing === id) setReviewing(null)
  }

  // ── Product approval ──────────────────────────────────────────────────────
  const setProductStatus = (prodId, status) => {
    setCatalogProds(pp => pp.map(p => p.id===prodId ? {...p, status} : p))
  }
  const approveAll = catId => {
    setCatalogProds(pp => pp.map(p => p.catalogId===catId && p.status!=='rejected' ? {...p, status:'approved'} : p))
    setCatalogs(cc => cc.map(c => c.id===catId ? {...c, status:'done'} : c))
  }

  // Review products for a catalog
  const reviewProds = reviewing ? safeProds.filter(p => p.catalogId === reviewing) : []
  const reviewCat   = reviewing ? safeCat.find(c => c.id === reviewing) : null

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11, color:T.textMid, letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:4 }}>Supplier</label>
          <select value={filterSup} onChange={e=>setFilterSup(e.target.value)} style={{ minWidth:220 }}>
            <option value="All">All Suppliers</option>
            {safe.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>{ if(filterSup==='All'){alert('Select a supplier first.');return} fileRef.current?.click() }}>
          + Upload Catalog
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" style={{display:'none'}} onChange={handleUpload}/>
        {!OCR_AVAILABLE && (
          <div style={{ fontSize:11, color:T.gold, padding:'6px 10px', background:T.goldPale, borderRadius:8 }}>
            AI extraction requires OCR_SECRET_KEY + VITE_OCR_API_KEY in Vercel env. Text-based PDFs and CSV/Excel still extract automatically.
          </div>
        )}
      </div>

      {/* Extraction progress */}
      {extracting && (
        <div style={{ padding:'12px 16px', background:T.tealPale, border:`1px solid ${T.tealGlow}`, borderRadius:10, marginBottom:16, fontSize:13, color:T.teal }}>
          ⟳ {progress || 'Extracting catalog products…'}
        </div>
      )}

      {/* Catalog list */}
      {visible.length === 0 ? (
        <div className="empty-st">
          <div className="empty-ic">📋</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.forest,marginBottom:6}}>No catalogs yet</div>
          <div style={{fontSize:13,color:T.textMid}}>Select a supplier and upload their PDF or Excel catalog. AI will extract products automatically.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:reviewing?16:0 }}>
          {visible.map(cat => {
            const catProds = safeProds.filter(p=>p.catalogId===cat.id)
            const approved = catProds.filter(p=>p.status==='approved').length
            const pending  = catProds.filter(p=>p.status==='pending').length
            return (
              <div key={cat.id} className="g-card" style={{ border:reviewing===cat.id?`1.5px solid ${T.gold}`:undefined }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontSize:20 }}>{cat.fileType==='pdf'?'📄':cat.fileType==='xlsx'||cat.fileType==='xls'?'📊':'📋'}</span>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:T.forest }}>{cat.supplierName}</div>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:T.tealPale, color:T.teal }}>{cat.version}</span>
                      {cat.active && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:T.greenPale, color:T.green }}>Active</span>}
                    </div>
                    <div style={{ fontSize:12, color:T.textMid }}>{cat.fileName} · {cat.fileSize} · {fmtDate(cat.uploadDate)}</div>
                    {cat.extractedCount > 0 && (
                      <div style={{ fontSize:11, color:T.textMid, marginTop:3 }}>
                        {cat.extractedCount} products extracted · {approved} approved · {pending} pending review
                      </div>
                    )}
                    {cat.status==='error' && <div style={{ fontSize:11, color:T.danger, marginTop:3 }}>Extraction error: {cat.errorMsg}</div>}
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
                    {cat.extractedCount > 0 && (
                      <button className="btn btn-outline btn-xs" style={{ color:T.teal }} onClick={()=>setReviewing(reviewing===cat.id?null:cat.id)}>
                        {reviewing===cat.id ? '▲ Hide Products' : `▼ Review ${cat.extractedCount} Products`}
                      </button>
                    )}
                    <button className="btn btn-outline btn-xs" onClick={()=>rerunExtraction(cat)}>↺ Re-extract</button>
                    <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>delCatalog(cat.id)}>✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Product Review Panel */}
      {reviewing && reviewCat && (
        <div style={{ border:`1.5px solid ${T.gold}`, borderRadius:14, overflow:'hidden', marginTop:8 }}>
          <div style={{ padding:'12px 18px', background:'rgba(184,151,90,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:T.forest }}>
                {reviewCat.supplierName} — {reviewCat.fileName}
              </div>
              <div style={{ fontSize:11, color:T.textMid }}>
                {reviewProds.length} products · {reviewProds.filter(p=>p.status==='approved').length} approved · {reviewProds.filter(p=>p.status==='pending').length} pending
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary btn-sm" onClick={()=>approveAll(reviewing)}>✓ Approve All</button>
              <button className="btn btn-outline btn-sm" onClick={()=>setReviewing(null)}>Close</button>
            </div>
          </div>

          <div style={{ maxHeight:460, overflow:'auto', padding:'0 4px' }}>
            {reviewProds.length === 0 ? (
              <div className="empty-st"><div>No products extracted yet.</div></div>
            ) : reviewProds.map(p => (
              <div key={p.id} style={{
                padding:'10px 14px', borderBottom:`1px solid rgba(210,200,184,0.3)`,
                display:'flex', gap:12, alignItems:'flex-start',
                background: p.status==='rejected' ? 'rgba(185,28,28,0.04)' : p.status==='approved' ? 'rgba(21,128,61,0.04)' : 'transparent',
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:3 }}>
                    <span style={{ fontWeight:600, fontSize:13, color:T.forest }}>{p.productName || '(unnamed)'}</span>
                    {p.productCode && <span style={{ fontSize:10, color:T.textMid, fontFamily:'monospace' }}>{p.productCode}</span>}
                    {p.confidence < 70 && <span style={{ fontSize:10, color:T.gold }}>⚠ {p.confidence}% confidence</span>}
                  </div>
                  <div style={{ fontSize:11, color:T.textMid, display:'flex', gap:10, flexWrap:'wrap' }}>
                    {p.category    && <span>📂 {p.category}</span>}
                    {p.height      && <span>↕ {p.height}</span>}
                    {p.moq         && <span>MOQ {p.moq}</span>}
                    {(p.exwPrice||p.unitPrice) && <span>EXW {p.currency} {p.exwPrice||p.unitPrice}</span>}
                    {p.leadTime    && <span>⏱ {p.leadTime}</span>}
                  </div>
                  {p.notes && <div style={{ fontSize:10, color:T.textLight, marginTop:2 }}>{truncate(p.notes,80)}</div>}
                </div>
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  <button
                    onClick={()=>setProductStatus(p.id,'approved')}
                    className="btn btn-xs"
                    style={{ background:p.status==='approved'?T.green:'transparent', color:p.status==='approved'?'#fff':T.green, border:`1px solid ${T.green}` }}
                  >✓</button>
                  <button
                    onClick={()=>setProductStatus(p.id,'rejected')}
                    className="btn btn-xs"
                    style={{ background:p.status==='rejected'?T.danger:'transparent', color:p.status==='rejected'?'#fff':T.danger, border:`1px solid ${T.danger}` }}
                  >✕</button>
                  <button className="btn btn-outline btn-xs" onClick={()=>setEditProd(p)}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product edit modal */}
      {editProd && (
        <Modal open={true} onClose={()=>setEditProd(null)} title="Edit Extracted Product"
          footer={<><button className="btn btn-outline" onClick={()=>setEditProd(null)}>Cancel</button><button className="btn btn-primary" onClick={()=>{ setCatalogProds(pp=>pp.map(p=>p.id===editProd.id?editProd:p)); setEditProd(null) }}>Save</button></>}>
          <div className="form-grid">
            <div className="form-field full"><label>Product Name</label><input value={editProd.productName||''} onChange={e=>setEditProd(p=>({...p,productName:e.target.value}))}/></div>
            <div className="form-field"><label>Product Code / SKU</label><input value={editProd.productCode||''} onChange={e=>setEditProd(p=>({...p,productCode:e.target.value}))}/></div>
            <div className="form-field"><label>Category</label><input value={editProd.category||''} onChange={e=>setEditProd(p=>({...p,category:e.target.value}))}/></div>
            <div className="form-field"><label>Height</label><input value={editProd.height||''} onChange={e=>setEditProd(p=>({...p,height:e.target.value}))}/></div>
            <div className="form-field"><label>MOQ</label><input value={editProd.moq||''} onChange={e=>setEditProd(p=>({...p,moq:e.target.value}))}/></div>
            <div className="form-field"><label>EXW Price</label><input value={editProd.exwPrice||''} onChange={e=>setEditProd(p=>({...p,exwPrice:e.target.value}))}/></div>
            <div className="form-field"><label>FOB Price</label><input value={editProd.fobPrice||''} onChange={e=>setEditProd(p=>({...p,fobPrice:e.target.value}))}/></div>
            <div className="form-field"><label>Currency</label><select value={editProd.currency||'USD'} onChange={e=>setEditProd(p=>({...p,currency:e.target.value}))}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="form-field"><label>Lead Time</label><input value={editProd.leadTime||''} onChange={e=>setEditProd(p=>({...p,leadTime:e.target.value}))}/></div>
            <div className="form-field"><label>Sample Price</label><input value={editProd.samplePrice||''} onChange={e=>setEditProd(p=>({...p,samplePrice:e.target.value}))}/></div>
            <div className="form-field full"><label>Notes</label><textarea value={editProd.notes||''} onChange={e=>setEditProd(p=>({...p,notes:e.target.value}))}/></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PRODUCT DATABASE TAB (extracted + approved products, searchable)
// ═════════════════════════════════════════════════════════════════════════════
function ProductDatabase({ suppliers, catalogProds, setCatalogProds }) {
  const [filterSup, setFilterSup] = useState('All')
  const [filterCat, setFilterCat] = useState('All')
  const [search,    setSearch]    = useState('')
  const [calcProd,  setCalcProd]  = useState(null)  // product to load into calculator
  const safe      = Array.isArray(suppliers)    ? suppliers    : []
  const safeProds = Array.isArray(catalogProds) ? catalogProds : []

  const approvedProds = safeProds.filter(p => p.status === 'approved')
  const categories    = [...new Set(approvedProds.map(p=>p.category).filter(Boolean))]

  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return approvedProds.filter(p =>
      (filterSup === 'All' || String(p.supplierId) === String(filterSup)) &&
      (filterCat === 'All' || p.category === filterCat) &&
      (!q || [p.productName, p.productCode, p.category, p.supplierName, p.notes].some(v=>(v||'').toLowerCase().includes(q)))
    )
  }, [approvedProds, filterSup, filterCat, search])

  if (safeProds.length === 0) return (
    <div className="empty-st">
      <div className="empty-ic">❧</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.forest,marginBottom:6}}>No products yet</div>
      <div style={{fontSize:13,color:T.textMid}}>Upload a supplier catalog in the Catalogs tab. Products will appear here after extraction and approval.</div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" style={{paddingLeft:32}}/>
          <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.textLight,fontSize:14,pointerEvents:'none' }}>⊙</span>
        </div>
        <select value={filterSup} onChange={e=>setFilterSup(e.target.value)} style={{fontSize:12,padding:'8px 10px'}}>
          <option value="All">All Suppliers</option>
          {safe.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{fontSize:12,padding:'8px 10px'}}>
          <option value="All">All Categories</option>
          {categories.map(c=><option key={c}>{c}</option>)}
        </select>
        <div style={{ fontSize:12, color:T.textMid }}>{visible.length} of {approvedProds.length} products</div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-st"><div>No products match that filter.</div></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {visible.map(p => (
            <div key={p.id} className="doc-card">
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:3, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:T.forest }}>{p.productName}</span>
                  {p.productCode && <code style={{ fontSize:10, color:T.textMid, background:'rgba(228,221,208,0.5)', padding:'1px 5px', borderRadius:4 }}>{p.productCode}</code>}
                  <span style={{ fontSize:10, color:T.teal, fontWeight:600 }}>{p.supplierName}</span>
                </div>
                <div style={{ fontSize:11, color:T.textMid, display:'flex', gap:10, flexWrap:'wrap' }}>
                  {p.category   && <span>📂 {p.category}</span>}
                  {p.height     && <span>↕ {p.height}</span>}
                  {p.moq        && <span>MOQ {p.moq}</span>}
                  {(p.exwPrice||p.unitPrice) && <span style={{ color:T.green, fontWeight:600 }}>EXW {p.currency} {p.exwPrice||p.unitPrice}</span>}
                  {p.fobPrice   && <span>FOB {p.currency} {p.fobPrice}</span>}
                  {p.leadTime   && <span>⏱ {p.leadTime}</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                <button className="btn btn-outline btn-xs" style={{ color:T.teal }} onClick={()=>setCalcProd(p)}>
                  ⊞ Calculate
                </button>
                <button className="btn btn-xs btn-ghost" style={{color:T.danger}} onClick={()=>{ if(window.confirm('Remove this product?')) setCatalogProds(pp=>pp.map(x=>x.id===p.id?{...x,status:'rejected'}:x)) }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick calculator from product */}
      {calcProd && (
        <div style={{ marginTop:16, padding:'16px 18px', background:T.tealPale, border:`1.5px solid ${T.tealGlow}`, borderRadius:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontWeight:600, fontSize:13, color:T.teal }}>
              ⊞ Quick Landed Cost — {calcProd.productName}
            </div>
            <button className="btn btn-ghost btn-xs" onClick={()=>setCalcProd(null)}>✕</button>
          </div>
          <MiniCalculator product={calcProd} />
        </div>
      )}
    </div>
  )
}

// ── Mini calculator pre-filled from a product ────────────────────────────────
function MiniCalculator({ product }) {
  const [term,       setTerm]       = useState('FOB')
  const [rateRaw,    setRateRaw,    rate]    = useField(DEFAULT_RATE)
  const [baseRaw,    setBaseRaw,    base]    = useField(parseFloat(product?.fobPrice||product?.exwPrice||product?.unitPrice||31)||31)
  const [qtyRaw,     setQtyRaw,     qty]     = useField(parseFloat(product?.moq)||50)
  const [dutyRaw,    setDutyRaw,    duty]    = useField(20)
  const [clearRaw,   setClearRaw,   clear]   = useField(8500)
  const [localRaw,   setLocalRaw,   local]   = useField(3500)
  const [targetRaw,  setTargetRaw,  target]  = useField(0)
  const it = INCOTERMS[term]

  const freightUSD    = term==='CIF' ? 0 : 1200
  const orderUSD      = base * qty
  const cifUSD        = orderUSD + freightUSD + orderUSD * 0.003
  const cifZAR        = cifUSD * rate
  const dutyZAR       = cifZAR * (duty/100)
  const landedZAR     = cifZAR + dutyZAR + clear + local
  const unitLanded    = qty > 0 ? landedZAR / qty : 0
  const margin        = target > 0 ? ((target - unitLanded) / unitLanded * 100) : 0

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        {['EXW','FOB','CIF'].map(t=>(
          <button key={t} className={`bp-fbtn ${term===t?'active':''}`} onClick={()=>setTerm(t)}>{t}</button>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
        <NumField label="Unit Price (USD)" value={baseRaw} onChange={setBaseRaw} />
        <NumField label="Qty"              value={qtyRaw}  onChange={setQtyRaw}  prefix="" />
        <NumField label="Rate (ZAR/USD)"   value={rateRaw} onChange={setRateRaw} prefix="ZAR" />
        <NumField label="Duty %"           value={dutyRaw} onChange={setDutyRaw} prefix="%" />
        <NumField label="Clearing (ZAR)"   value={clearRaw} onChange={setClearRaw} prefix="ZAR" />
        <NumField label="Target Sell"      value={targetRaw} onChange={setTargetRaw} prefix="ZAR" hint="Optional" />
      </div>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {[['Unit Landed', ZAR(unitLanded), true], ['Total Order', ZAR(landedZAR), false], ...(target>0?[['Margin', pct(margin), false, margin>=40?T.green:T.red]]:[])]
          .map(([k,v,b,col])=>(
            <div key={k} style={{ padding:'8px 12px', background:'rgba(255,255,255,0.6)', borderRadius:8, flex:1, minWidth:100 }}>
              <div style={{ fontSize:10, color:T.textLight, letterSpacing:'0.1em', textTransform:'uppercase' }}>{k}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:b?20:16, color:col||(b?T.gold:T.forest), fontWeight:b?700:400 }}>{v}</div>
            </div>
          ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FULL IMPORT / LOGISTICS CALCULATOR TAB (unchanged)
// ═════════════════════════════════════════════════════════════════════════════
const INCOTERMS = {
  EXW: { label:'EXW — Ex Works', included:'Factory gate price only.', showLocalChina:true, showFreight:true, showInsurance:true },
  FOB: { label:'FOB — Free On Board', included:'Product + export handling, loaded on vessel.', showLocalChina:false, showFreight:true, showInsurance:true },
  CIF: { label:'CIF — Cost, Insurance & Freight', included:'Product + freight + insurance to destination port.', showLocalChina:false, showFreight:false, showInsurance:false },
}

function ImportCalculator({ suppliers = [], products = [] }) {
  const [term, setTerm]   = useState('FOB')
  const [supplierId, setSupplierId] = useState('')
  const [rateRaw, setRateRaw, rate] = useField(DEFAULT_RATE)
  const [baseRaw, setBaseRaw, base] = useField(31)
  const [qtyRaw,  setQtyRaw,  qty]  = useField(50)
  const [localCNRaw,setLocalCNRaw,localCN]   = useField(1.5)
  const [freightRaw,setFreightRaw,freight]   = useField(1200)
  const [insuranceRaw,setInsRaw,insurance]   = useField(0.3)
  const [dutyRaw, setDutyRaw, duty]          = useField(20)
  const [clearingRaw,setClearRaw,clearing]   = useField(8500)
  const [localSARaw,setLocalSARaw,localSA]   = useField(3500)
  const [assemblyRaw,setAsmRaw,assembly]     = useField(25)
  const [finishingRaw,setFinRaw,finishing]   = useField(15)
  const [qcRaw,   setQcRaw,   qc]            = useField(5)
  const [targetRaw,setTargetRaw,target]      = useField(0)
  const it = INCOTERMS[term]

  const unitUSD = base + (it.showLocalChina ? localCN : 0)
  const orderUSD = unitUSD * qty
  const freightUSD = it.showFreight ? freight : 0
  const insurancePct = it.showInsurance ? insurance / 100 : 0
  const insuranceUSD = orderUSD * insurancePct
  const cifUSD = orderUSD + freightUSD + insuranceUSD
  const cifZAR = cifUSD * rate
  const dutyZAR = cifZAR * (duty / 100)
  const totalLandedZAR = cifZAR + dutyZAR + clearing + localSA
  const unitLandedZAR  = qty > 0 ? (totalLandedZAR + (assembly + finishing + qc) * qty) / qty : 0
  const targetMark = target > 0 ? ((target - unitLandedZAR) / unitLandedZAR * 100) : 0

  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
        <div className="sec-label" style={{ margin:0 }}>Incoterm</div>
        {Object.keys(INCOTERMS).map(t => (
          <button key={t} className={`bp-fbtn ${term===t?'active':''}`} onClick={()=>setTerm(t)}>{t}</button>
        ))}
        {suppliers.length > 0 && (
          <select value={supplierId} onChange={e=>setSupplierId(e.target.value)} style={{ fontSize:12, padding:'6px 10px', marginLeft:'auto' }}>
            <option value="">No supplier selected</option>
            {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>
      <div style={{ background:T.goldPale, border:`1px solid rgba(184,151,90,0.2)`, borderRadius:10, padding:'10px 14px', marginBottom:18, fontSize:12, color:'#6B4E10' }}>
        <strong>{it.label}</strong> — {it.included}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <NumField label="Exchange Rate (ZAR/USD)" value={rateRaw} onChange={setRateRaw} prefix="ZAR" hint="Current planning rate: 18.60" />
        <NumField label="Units (Qty)" value={qtyRaw} onChange={setQtyRaw} prefix="" />
        <NumField label="EXW/Base Unit Price" value={baseRaw} onChange={setBaseRaw} hint={`USD ${base.toFixed(2)} = ZAR ${(base*rate).toFixed(2)}`} />
        {it.showLocalChina && <NumField label="China Local Transport (per unit)" value={localCNRaw} onChange={setLocalCNRaw} />}
        {it.showFreight    && <NumField label="Freight (full order)" value={freightRaw} onChange={setFreightRaw} hint={`Per unit: USD ${qty>0?(freight/qty).toFixed(2):'—'}`} />}
        {it.showInsurance  && <NumField label="Marine Insurance %" value={insuranceRaw} onChange={setInsRaw} prefix="%" hint={`USD ${insuranceUSD.toFixed(2)}`} />}
        <NumField label="Import Duty %" value={dutyRaw} onChange={setDutyRaw} prefix="%" hint={`ZAR ${dutyZAR.toFixed(0)}`} />
        <NumField label="SA Customs Clearing" value={clearingRaw} onChange={setClearRaw} prefix="ZAR" hint="Clearing agent fee" />
        <NumField label="Local Transport (SA)" value={localSARaw} onChange={setLocalSARaw} prefix="ZAR" />
        <NumField label="Assembly (per unit)" value={assemblyRaw} onChange={setAsmRaw} prefix="ZAR" />
        <NumField label="Finishing / Pot (per unit)" value={finishingRaw} onChange={setFinRaw} prefix="ZAR" />
        <NumField label="QC (per unit)" value={qcRaw} onChange={setQcRaw} prefix="ZAR" />
        <NumField label="Target Sell Price (ZAR)" value={targetRaw} onChange={setTargetRaw} prefix="ZAR" hint="Optional" />
      </div>
      <div className="g-card">
        <div className="sec-label">Landed Cost Breakdown</div>
        {[
          ['Order Value (USD)',        USD(orderUSD)],
          ['Freight + Insurance',      USD(freightUSD + insuranceUSD)],
          ['CIF Value (USD)',          USD(cifUSD)],
          ['CIF Value (ZAR)',          ZAR(cifZAR)],
          ['Import Duty',              ZAR(dutyZAR)],
          ['Clearing + Local SA',      ZAR(clearing + localSA)],
          ['Total Landed (ZAR)',       ZAR(totalLandedZAR), true],
          ['Unit Landed Cost',         ZAR(unitLandedZAR), true],
          ...(target > 0 ? [['Gross Margin at Target', pct(targetMark), false, targetMark >= 40 ? T.green : T.red]] : []),
        ].map(([k,v,bold,col])=>(
          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid rgba(210,200,184,0.3)`, fontWeight:bold?700:400 }}>
            <span style={{ fontSize:13, color:T.textMid }}>{k}</span>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:bold?20:16, color:col||(bold?T.gold:T.forest) }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SUPPLIER ZONE
// ═════════════════════════════════════════════════════════════════════════════
export default function SupplierZone({ suppliers, setSuppliers, products, catalogs, setCatalogs, catalogProds, setCatalogProds }) {
  const [tab, setTab] = useState('suppliers')
  const safe       = Array.isArray(suppliers)    ? suppliers    : []
  const safeP      = Array.isArray(products)     ? products     : []
  const safeCat    = Array.isArray(catalogs)     ? catalogs     : []
  const safeCProds = Array.isArray(catalogProds) ? catalogProds : []

  const approvedCount  = safeCProds.filter(p=>p.status==='approved').length
  const pendingCount   = safeCProds.filter(p=>p.status==='pending').length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Supplier Zone</div>
          <div className="page-subtitle">Suppliers · Catalogs · AI Extraction · Import Calculator</div>
        </div>
        {pendingCount > 0 && (
          <div style={{ fontSize:12, color:T.gold, fontWeight:600, padding:'6px 12px', background:T.goldPale, borderRadius:8 }}>
            {pendingCount} products awaiting review
          </div>
        )}
      </div>

      {/* KPI bar */}
      <div style={{ background:'rgba(255,255,255,0.55)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(210,200,184,0.5)`, padding:'14px 36px' }}>
        <div className="grid-4">
          {[
            { label:'Active Suppliers',      val:safe.filter(s=>s.status==='Active').length, color:T.green },
            { label:'Catalogs Uploaded',     val:safeCat.length,                              color:T.teal },
            { label:'Products Extracted',    val:approvedCount,                               color:T.gold },
            { label:'Planning Rate',         val:`R${DEFAULT_RATE}/USD`,                      color:T.forestLight },
          ].map(k=>(
            <div key={k.label} className="stat-card">
              <div className="stat-label">{k.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:k.color, lineHeight:1, marginTop:4 }}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div className="tabs">
          {[
            { id:'suppliers',   label:'Suppliers' },
            { id:'catalogs',    label:`Catalogs${pendingCount>0?' ('+pendingCount+' pending)':''}` },
            { id:'products',    label:`Extracted Products${approvedCount>0?' ('+approvedCount+')':''}` },
            { id:'calculator',  label:'Import / Logistics Calculator' },
          ].map(t=>(
            <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        {tab==='suppliers'  && <SupplierDatabase suppliers={safe} setSuppliers={setSuppliers} />}
        {tab==='catalogs'   && <CatalogTab suppliers={safe} catalogs={safeCat} setCatalogs={setCatalogs} catalogProds={safeCProds} setCatalogProds={setCatalogProds} />}
        {tab==='products'   && <ProductDatabase suppliers={safe} catalogProds={safeCProds} setCatalogProds={setCatalogProds} />}
        {tab==='calculator' && <ImportCalculator suppliers={safe} products={safeP} />}
      </div>
    </div>
  )
}
