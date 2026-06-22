// SupplierZone.jsx — v2.4
// Tabs: Supplier Database · Catalogs (with AI extraction) · Import Calculator
import { useState, useRef, useCallback, useMemo } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, USD, parseNum, nextId, today, fmtDate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

const DEFAULT_RATE = 18.60

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
          disabled={disabled} placeholder="0"
          style={{ paddingLeft:prefix?36:undefined, opacity:disabled?0.35:1 }}
        />
      </div>
      {hint && <div style={{ fontSize:10,color:T.gold,marginTop:2 }}>{hint}</div>}
    </div>
  )
}

// ── AI Catalog Extraction via /api/extract ───────────────────────────────────
async function extractCatalogWithAI(file) {
  const CATALOG_PROMPT = `You are a product catalog extraction assistant for Botanica Living Group, a South African artificial greenery importer.

Extract ALL products from this supplier catalog. For each product, extract:
- name: product name/description
- code: product code or SKU (if present)
- height: height or size (e.g. "180cm", "60x60cm", "Large")
- moq: minimum order quantity (number only)
- exwPrice: EXW unit price in USD (number only, 0 if not listed)
- fobPrice: FOB unit price in USD (number only, 0 if not listed)
- cifPrice: CIF unit price in USD (number only, 0 if not listed)
- sampleCost: sample/proto cost in USD (number only, 0 if not listed)
- leadTime: production lead time (e.g. "45 days")
- category: product category (Trees, Pot Plants, Hanging, Panels, Grass, Flowers, Other)
- notes: any important notes about the product

Return ONLY a JSON object with this exact structure:
{
  "products": [
    {
      "name": "",
      "code": "",
      "height": "",
      "moq": 0,
      "exwPrice": 0,
      "fobPrice": 0,
      "cifPrice": 0,
      "sampleCost": 0,
      "leadTime": "",
      "category": "Other",
      "notes": ""
    }
  ],
  "totalFound": 0,
  "confidence": "High",
  "supplierNotes": ""
}

If you cannot extract products, return {"products":[],"totalFound":0,"confidence":"Low","supplierNotes":"Could not parse catalog format"}.
Return ONLY the JSON, no other text.`

  // Try /api/extract endpoint first (server-side AI with OCR_SECRET_KEY)
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('catalogMode', 'true')
    formData.append('catalogPrompt', CATALOG_PROMPT)

    const res = await fetch('/api/extract-catalog', { method:'POST', body:formData })
    if (res.ok) {
      const data = await res.json()
      if (data.products) return data
    }
  } catch {}

  // Fallback: extract text from PDF/Excel with pdf.js / SheetJS, then send to AI
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'pdf') {
    return await extractFromPDF(file, CATALOG_PROMPT)
  } else if (['xlsx','xls','csv'].includes(ext)) {
    return await extractFromSpreadsheet(file)
  }

  return { products:[], totalFound:0, confidence:'Low', supplierNotes:'Unsupported file format' }
}

async function extractFromPDF(file, prompt) {
  try {
    // Load pdf.js from CDN
    if (!window.pdfjsLib) {
      await new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        s.onload = res; s.onerror = rej
        document.head.appendChild(s)
      })
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }

    const ab   = await file.arrayBuffer()
    const pdf  = await window.pdfjsLib.getDocument({ data: ab }).promise
    let text = ''
    for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
      const page = await pdf.getPage(i)
      const tc   = await page.getTextContent()
      text += tc.items.map(x => x.str).join(' ') + '\n'
    }

    if (text.trim().length < 50) {
      // Scanned PDF — fall back to heuristic
      return heuristicExtract(text)
    }

    // Send to AI via /api/extract with rawText
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('rawText', text.substring(0, 8000))
      formData.append('catalogMode', 'true')

      const res = await fetch('/api/extract', { method:'POST', body:formData })
      if (res.ok) {
        const data = await res.json()
        // If we get a catalog-structured response
        if (data.products) return data
        // If we get the standard invoice response, convert
        return heuristicExtract(text)
      }
    } catch {}

    return heuristicExtract(text)
  } catch (e) {
    return { products:[], totalFound:0, confidence:'Low', supplierNotes:`PDF error: ${e.message}` }
  }
}

async function extractFromSpreadsheet(file) {
  try {
    if (!window.XLSX) {
      await new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
        s.onload = res; s.onerror = rej
        document.head.appendChild(s)
      })
    }

    const ab   = await file.arrayBuffer()
    const wb   = window.XLSX.read(ab, { type:'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const rows = window.XLSX.utils.sheet_to_json(ws, { defval:'' })

    if (!rows.length) return { products:[], totalFound:0, confidence:'Low', supplierNotes:'Empty spreadsheet' }

    // Map columns flexibly
    const FIELD_MAP = {
      name:       ['name','product','description','item','product name','article'],
      code:       ['code','sku','item code','product code','model','reference','ref'],
      height:     ['height','size','dimension','dimensions','h','cm'],
      moq:        ['moq','minimum','min order','min qty','minimum order','minimum quantity'],
      exwPrice:   ['exw','ex works','exw price','factory price','unit price','price','usd'],
      fobPrice:   ['fob','fob price'],
      cifPrice:   ['cif','cif price'],
      sampleCost: ['sample','sample cost','sample price','proto'],
      leadTime:   ['lead time','leadtime','production time','delivery','days'],
      category:   ['category','type','product type','group'],
      notes:      ['notes','note','remarks','remark','comment'],
    }

    const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
    const colMap  = {}
    for (const [field, aliases] of Object.entries(FIELD_MAP)) {
      for (const alias of aliases) {
        const idx = headers.findIndex(h => h.includes(alias))
        if (idx !== -1) { colMap[field] = Object.keys(rows[0])[idx]; break }
      }
    }

    const CATEGORIES = ['Trees','Pot Plants','Hanging','Panels','Grass','Flowers','Other']
    const products = rows
      .filter(r => r[colMap.name || 'name'])
      .map(r => ({
        name:       String(r[colMap.name] || '').trim(),
        code:       String(r[colMap.code] || '').trim(),
        height:     String(r[colMap.height] || '').trim(),
        moq:        parseNum(r[colMap.moq]) || 0,
        exwPrice:   parseNum(r[colMap.exwPrice]) || 0,
        fobPrice:   parseNum(r[colMap.fobPrice]) || 0,
        cifPrice:   parseNum(r[colMap.cifPrice]) || 0,
        sampleCost: parseNum(r[colMap.sampleCost]) || 0,
        leadTime:   String(r[colMap.leadTime] || '').trim(),
        category:   CATEGORIES.includes(r[colMap.category]) ? r[colMap.category] : 'Other',
        notes:      String(r[colMap.notes] || '').trim(),
      }))
      .filter(p => p.name)

    return {
      products,
      totalFound: products.length,
      confidence: products.length > 0 ? 'High' : 'Low',
      supplierNotes: `Extracted from ${file.name} (${rows.length} rows, ${products.length} products found)`,
    }
  } catch (e) {
    return { products:[], totalFound:0, confidence:'Low', supplierNotes:`Spreadsheet error: ${e.message}` }
  }
}

function heuristicExtract(text) {
  // Simple regex patterns to find product-like lines
  const lines  = text.split('\n').filter(l => l.trim().length > 5)
  const priceRx = /(?:USD?|usd|\$)\s*(\d+\.?\d*)/gi
  const moqRx   = /(?:MOQ|min|minimum)[^\d]*(\d+)/gi

  const products = []
  for (const line of lines.slice(0, 200)) {
    const priceMatch = priceRx.exec(line)
    if (priceMatch) {
      products.push({
        name:       line.substring(0, 80).trim(),
        code:       '',
        height:     '',
        moq:        0,
        exwPrice:   parseFloat(priceMatch[1]) || 0,
        fobPrice:   0, cifPrice:0, sampleCost:0,
        leadTime:   '',
        category:   'Other',
        notes:      'Heuristic extraction — please review',
      })
    }
    priceRx.lastIndex = 0
  }
  return { products: products.slice(0,50), totalFound:products.length, confidence:'Low', supplierNotes:'Heuristic extraction — AI not available. Please review and edit products.' }
}

// ═════════════════════════════════════════════════════════════════════════════
// SUPPLIER CATALOG TAB — with AI extraction + product DB creation
// ═════════════════════════════════════════════════════════════════════════════
function CatalogExtractedProducts({ supplierId, supplierName, extractedProducts, onAccept, onDiscard }) {
  const [items, setItems] = useState(extractedProducts.map((p,i) => ({ ...p, _id:i, _include:true })))
  const toggleAll = inc => setItems(pp => pp.map(p => ({ ...p, _include:inc })))
  const toggleOne = i   => setItems(pp => pp.map((p,idx) => idx===i ? { ...p, _include:!p._include } : p))
  const edit      = (i, k, v) => setItems(pp => pp.map((p,idx) => idx===i ? { ...p, [k]:v } : p))

  const included = items.filter(p => p._include)

  return (
    <div>
      <div style={{ background:'rgba(110,232,160,0.08)', border:`1px solid rgba(110,232,160,0.20)`, borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:22 }}>✓</span>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:T.green }}>Extraction Complete — {extractedProducts.length} products found</div>
          <div style={{ fontSize:12, color:T.textLight }}>Review, edit and select which products to add to the database.</div>
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div style={{ fontSize:13, color:T.textMid }}>{included.length} of {items.length} selected</div>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-outline btn-xs" onClick={() => toggleAll(true)}>Select All</button>
          <button className="btn btn-outline btn-xs" onClick={() => toggleAll(false)}>Deselect All</button>
        </div>
      </div>

      <div style={{ maxHeight:460, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
        {items.map((p,i) => (
          <div key={p._id} style={{ background: p._include ? 'rgba(23,28,24,0.90)' : 'rgba(15,26,20,0.40)', border:`1px solid ${p._include ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.05)'}`, borderRadius:10, padding:'12px 14px', transition:'all 0.15s', opacity:p._include?1:0.5 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <input type="checkbox" checked={p._include} onChange={() => toggleOne(i)} style={{ marginTop:3, width:16, height:16, accentColor:T.gold, flexShrink:0 }} />
              <div style={{ flex:1, display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr', gap:8, minWidth:0 }}>
                <input value={p.name||''} onChange={e=>edit(i,'name',e.target.value)} placeholder="Product name" style={{ fontSize:13, padding:'4px 8px' }} />
                <input value={p.code||''} onChange={e=>edit(i,'code',e.target.value)} placeholder="Code/SKU" style={{ fontSize:12, padding:'4px 8px' }} />
                <input value={p.height||''} onChange={e=>edit(i,'height',e.target.value)} placeholder="Size/Height" style={{ fontSize:12, padding:'4px 8px' }} />
                <input type="text" inputMode="decimal" value={String(p.moq||'')} onChange={e=>edit(i,'moq',e.target.value)} placeholder="MOQ" style={{ fontSize:12, padding:'4px 8px' }} />
                <input type="text" inputMode="decimal" value={String(p.exwPrice||'')} onChange={e=>edit(i,'exwPrice',e.target.value)} placeholder="EXW $" style={{ fontSize:12, padding:'4px 8px' }} />
                <select value={p.category||'Other'} onChange={e=>edit(i,'category',e.target.value)} style={{ fontSize:11, padding:'4px 6px' }}>
                  {['Trees','Pot Plants','Hanging','Panels','Grass','Flowers','Other'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button className="btn btn-outline" onClick={onDiscard}>Discard</button>
        <button className="btn btn-primary" disabled={!included.length} onClick={() => onAccept(included.map(({_id,_include,...p})=>p), supplierName, supplierId)}>
          + Add {included.length} Product{included.length!==1?'s':''} to Database
        </button>
      </div>
    </div>
  )
}

function SupplierCatalogs({ suppliers, products, setProducts }) {
  const [catalogs,   setCatalogs]   = useState([])
  const [filterSup,  setFilterSup]  = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractResult, setExtractResult] = useState(null)  // { supplierId, supplierName, result }
  const [progress,   setProgress]   = useState('')
  const [error,      setError]      = useState('')
  const fileRef = useRef()
  const safe    = Array.isArray(suppliers) ? suppliers : []
  const safeP   = Array.isArray(products)  ? products  : []

  const handleUpload = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!filterSup) { setError('Select a supplier before uploading.'); return }
    setError('')

    const sup = safe.find(s => String(s.id) === String(filterSup))
    const supName = sup?.name || filterSup
    const ext  = file.name.split('.').pop().toLowerCase()

    // Store catalog record
    const rec = {
      id:           Date.now(),
      supplierId:   filterSup,
      supplierName: supName,
      fileName:     file.name,
      fileType:     ext,
      fileSize:     `${(file.size/1024/1024).toFixed(1)} MB`,
      uploadDate:   today(),
      status:       'Extracting…',
      productCount: 0,
    }
    setCatalogs(cc => [...cc, rec])
    setUploading(true)
    setExtracting(true)
    setProgress('Reading file…')

    try {
      setProgress('Extracting product data…')
      const result = await extractCatalogWithAI(file)

      setCatalogs(cc => cc.map(c => c.id === rec.id
        ? { ...c, status: result.totalFound > 0 ? `${result.totalFound} products` : 'No products found', productCount: result.totalFound, confidence: result.confidence }
        : c
      ))

      if (result.products.length > 0) {
        setExtractResult({ supplierId: filterSup, supplierName: supName, result })
      } else {
        setError(`No products extracted. ${result.supplierNotes || ''}`)
      }
    } catch (err) {
      setError(`Extraction failed: ${err.message}`)
      setCatalogs(cc => cc.map(c => c.id === rec.id ? { ...c, status:'Error' } : c))
    } finally {
      setUploading(false)
      setExtracting(false)
      setProgress('')
    }
  }

  const handleAccept = useCallback((extracted, supplierName, supplierId) => {
    const nextI = nextId(safeP)
    const now   = today()
    const newProds = extracted.map((p, i) => ({
      id:                nextI + i,
      name:              p.name || 'Unnamed Product',
      category:          p.category || 'Other',
      supplier:          supplierName,
      supplierId:        supplierId,
      sku:               p.code || '',
      height:            p.height || '',
      moq:               parseNum(p.moq) || 0,
      exwPrice:          parseNum(p.exwPrice) || 0,
      fobPrice:          parseNum(p.fobPrice) || 0,
      cifPrice:          parseNum(p.cifPrice) || 0,
      sampleCost:        parseNum(p.sampleCost) || 0,
      leadTime:          p.leadTime || '',
      notes:             p.notes || '',
      assembly:          false,
      foundersCollection:false,
      sampleStatus:      'Pending',
      dateAdded:         now,
      source:            'catalog-import',
    }))
    setProducts(pp => [...(Array.isArray(pp)?pp:[]), ...newProds])
    setExtractResult(null)
  }, [safeP, setProducts])

  const del = id => { if (!window.confirm('Remove this catalog record?')) return; setCatalogs(cc => cc.filter(c => c.id !== id)) }

  const visible = filterSup ? catalogs.filter(c => String(c.supplierId) === String(filterSup)) : catalogs

  return (
    <div>
      {/* Info banner */}
      <div style={{ background:'rgba(212,175,55,0.08)', border:`1px solid rgba(212,175,55,0.18)`, borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:T.textMid }}>
        <div style={{ fontWeight:700, color:T.gold, marginBottom:3 }}>AI Catalog Import</div>
        Upload a supplier PDF or Excel catalog. The system will read the file, extract product data and build a structured product database automatically.
        Supported: PDF · XLSX · XLS · CSV
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div className="form-field" style={{ minWidth:240 }}>
          <label>Supplier</label>
          <select value={filterSup} onChange={e=>{ setFilterSup(e.target.value); setError('') }} style={{ minWidth:220 }}>
            <option value="">Select a supplier…</option>
            {safe.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <button className="btn btn-primary btn-sm" disabled={!filterSup || uploading}
            onClick={() => { setError(''); fileRef.current?.click() }}>
            {uploading ? '⟳ Processing…' : '↑ Upload & Extract Catalog'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" style={{display:'none'}} onChange={handleUpload} />
        </div>
        {safe.length === 0 && <div style={{ fontSize:12, color:T.red }}>Add a supplier first in the Supplier Database tab.</div>}
      </div>

      {/* Progress */}
      {extracting && (
        <div style={{ background:'rgba(212,175,55,0.08)', border:`1px solid rgba(212,175,55,0.15)`, borderRadius:10, padding:'14px 18px', marginBottom:18, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:18, height:18, border:`2px solid ${T.gold}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <span style={{ fontSize:13, color:T.gold }}>{progress || 'Extracting product data…'}</span>
        </div>
      )}

      {error && (
        <div style={{ background:'rgba(255,107,107,0.08)', border:`1px solid rgba(255,107,107,0.20)`, borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:13, color:T.red }}>
          ⚠ {error}
        </div>
      )}

      {/* Review extracted products */}
      {extractResult && (
        <div className="g-card" style={{ marginBottom:20, border:`1px solid rgba(110,232,160,0.20)` }}>
          <div className="sec-label">Review Extracted Products — {extractResult.supplierName}</div>
          <CatalogExtractedProducts
            supplierId={extractResult.supplierId}
            supplierName={extractResult.supplierName}
            extractedProducts={extractResult.result.products}
            onAccept={handleAccept}
            onDiscard={() => setExtractResult(null)}
          />
        </div>
      )}

      {/* Catalog history */}
      {visible.length === 0 && !extractResult ? (
        <div className="empty-st">
          <div className="empty-ic" style={{ fontSize:34 }}>📋</div>
          <div style={{ fontSize:18, color:T.text, marginBottom:6 }}>No catalogs uploaded yet</div>
          <div style={{ fontSize:13, color:T.textLight }}>Select a supplier and upload their catalog to extract products automatically.</div>
        </div>
      ) : (
        visible.length > 0 && (
          <div>
            <div className="sec-label">Catalog History</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {visible.map(cat => (
                <div key={cat.id} className="doc-card">
                  <div style={{ width:40,height:40,borderRadius:10,background:T.goldPale,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
                    {cat.fileType==='pdf'?'📄':['xlsx','xls'].includes(cat.fileType)?'📊':'📋'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:T.text, marginBottom:2 }}>{cat.supplierName}</div>
                    <div style={{ fontSize:12, color:T.textMid }}>{cat.fileName} · {cat.fileSize}</div>
                    <div style={{ fontSize:11, color:T.textLight }}>Uploaded {fmtDate(cat.uploadDate)}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20,
                      background: cat.status==='Error'?'rgba(255,107,107,0.12)':cat.productCount>0?'rgba(110,232,160,0.12)':'rgba(212,175,55,0.12)',
                      color: cat.status==='Error'?T.red:cat.productCount>0?T.green:T.gold
                    }}>{cat.status}</span>
                    <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>del(cat.id)}>✕ Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SUPPLIER DATABASE TAB
// ═════════════════════════════════════════════════════════════════════════════
const BLANK_SUP = {
  name:'', country:'China', contact:'', email:'', whatsapp:'', website:'',
  terms:'FOB', currency:'USD', status:'Active', notes:'',
  sampleLeadTime:'', productionLeadTime:'', paymentTerms:'T/T 30%',
  catalogVersion:'', catalogDate:'',
}

function SupplierDatabase({ suppliers, setSuppliers }) {
  const [modal,    setModal]   = useState(false)
  const [editing,  setEdit]    = useState(null)
  const [form,     setForm]    = useState(BLANK_SUP)
  const [selected, setSelected]= useState(null)
  const F    = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const safe = Array.isArray(suppliers) ? suppliers : []

  const openNew  = () => { setEdit(null); setForm({...BLANK_SUP}); setModal(true) }
  const openEdit = s  => { setEdit(s.id); setForm({...s}); setModal(true) }
  const save = () => {
    if (!form.name?.trim()) return
    const rec = { ...BLANK_SUP, ...form, id: editing!=null?editing:nextId(safe) }
    if (editing!=null) setSuppliers(ss=>ss.map(s=>s.id===editing?rec:s))
    else               setSuppliers(ss=>[...ss,rec])
    setModal(false)
  }
  const del = id => { if (!window.confirm('Remove supplier?')) return; setSuppliers(ss=>ss.filter(s=>s.id!==id)); if(selected===id)setSelected(null) }
  const sel = selected ? safe.find(s=>s.id===selected) : null

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ fontSize:13, color:T.textMid }}>{safe.length} supplier{safe.length!==1?'s':''} in database</div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Supplier</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:sel?'1fr 320px':'1fr', gap:16, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {safe.length===0 && <div className="empty-st"><div className="empty-ic">◎</div><div>No suppliers yet.</div></div>}
          {safe.map(s => (
            <div key={s.id} className="doc-card" style={{ border:selected===s.id?`1.5px solid ${T.gold}`:undefined }} onClick={()=>setSelected(selected===s.id?null:s.id)}>
              <div style={{ width:40,height:40,borderRadius:10,background:'rgba(110,232,160,0.10)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>◎</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:16, fontWeight:600, color:T.text, marginBottom:3 }}>{s.name}</div>
                <div style={{ fontSize:12, color:T.textMid }}>{s.country} · {s.terms} · {s.contact||'No contact'}</div>
                {s.email && <div style={{ fontSize:11, color:T.textLight }}>{s.email}</div>}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:5,flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                <span style={{ fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:20,background:s.status==='Active'?'rgba(110,232,160,0.12)':'rgba(255,255,255,0.05)',color:s.status==='Active'?T.green:T.textLight }}>{s.status}</span>
                <button className="btn btn-outline btn-xs" onClick={()=>openEdit(s)}>Edit</button>
                <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>del(s.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        {sel && (
          <div className="g-card" style={{position:'sticky',top:80}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,paddingBottom:12,borderBottom:`1px solid rgba(255,255,255,0.07)`}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:T.text}}>{sel.name}</div>
                <div style={{fontSize:11,color:T.gold,letterSpacing:'0.1em',textTransform:'uppercase',marginTop:2}}>{sel.country} · {sel.terms}</div>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={()=>setSelected(null)}>✕</button>
            </div>
            {[['Contact',sel.contact||'—'],['Email',sel.email||'—'],['WhatsApp',sel.whatsapp||'—'],['Website',sel.website||'—'],['Payment',sel.paymentTerms||'—'],['Sample Lead',sel.sampleLeadTime||'—'],['Production Lead',sel.productionLeadTime||'—'],['Catalog Version',sel.catalogVersion||'—'],['Status',sel.status]].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid rgba(255,255,255,0.06)`,fontSize:12,gap:8}}>
                <span style={{color:T.textLight,flexShrink:0}}>{k}</span>
                <span style={{color:T.text,textAlign:'right',wordBreak:'break-all',fontSize:12,fontWeight:500}}>{v}</span>
              </div>
            ))}
            {sel.notes && <div style={{marginTop:10,padding:10,background:'rgba(255,255,255,0.03)',borderRadius:8,fontSize:12,color:T.textLight,lineHeight:1.6}}>{sel.notes}</div>}
            <button className="btn btn-primary btn-sm" style={{marginTop:14,width:'100%'}} onClick={()=>openEdit(sel)}>Edit Supplier</button>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editing!=null?'Edit Supplier':'Add Supplier'}
        footer={<><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
      >
        <div className="form-grid">
          <div className="form-field full"><label>Supplier / Factory Name *</label><input value={form.name||''} onChange={F('name')} /></div>
          <div className="form-field"><label>Country</label><input value={form.country||''} onChange={F('country')} /></div>
          <div className="form-field"><label>Default Terms</label><select value={form.terms} onChange={F('terms')}><option>EXW</option><option>FOB</option><option>CIF</option></select></div>
          <div className="form-field"><label>Contact Person</label><input value={form.contact||''} onChange={F('contact')} /></div>
          <div className="form-field"><label>Email</label><input type="email" value={form.email||''} onChange={F('email')} /></div>
          <div className="form-field"><label>WhatsApp</label><input value={form.whatsapp||''} onChange={F('whatsapp')} /></div>
          <div className="form-field"><label>Website</label><input value={form.website||''} onChange={F('website')} /></div>
          <div className="form-field"><label>Payment Terms</label><input value={form.paymentTerms||''} onChange={F('paymentTerms')} placeholder="T/T 30% deposit" /></div>
          <div className="form-field"><label>Sample Lead Time</label><input value={form.sampleLeadTime||''} onChange={F('sampleLeadTime')} placeholder="e.g. 14 days" /></div>
          <div className="form-field"><label>Production Lead Time</label><input value={form.productionLeadTime||''} onChange={F('productionLeadTime')} placeholder="e.g. 45 days" /></div>
          <div className="form-field"><label>Catalog Version</label><input value={form.catalogVersion||''} onChange={F('catalogVersion')} /></div>
          <div className="form-field"><label>Status</label><select value={form.status} onChange={F('status')}><option>Active</option><option>Prospect</option><option>On Hold</option><option>Inactive</option></select></div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')} /></div>
        </div>
      </Modal>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// IMPORT CALCULATOR (preserved)
// ═════════════════════════════════════════════════════════════════════════════
const INCOTERMS = {
  EXW: { label:'EXW — Ex Works', included:'Factory gate price only.', showLocalChina:true, showFreight:true, showInsurance:true },
  FOB: { label:'FOB — Free On Board', included:'Product + export handling, loaded on vessel.', showLocalChina:false, showFreight:true, showInsurance:true },
  CIF: { label:'CIF — Cost, Insurance & Freight', included:'Product + freight + insurance to destination port.', showLocalChina:false, showFreight:false, showInsurance:false },
}

function ImportCalculator({ suppliers = [], products = [] }) {
  const [term, setTerm] = useState('FOB')
  const [rateRaw, setRateRaw, rate]           = useField(DEFAULT_RATE)
  const [baseRaw, setBaseRaw, base]           = useField(31)
  const [qtyRaw,  setQtyRaw,  qty]            = useField(50)
  const [localCNRaw,setLocalCNRaw,localCN]    = useField(1.5)
  const [freightRaw,setFreightRaw,freight]    = useField(1200)
  const [insuranceRaw,setInsRaw,insurance]    = useField(0.3)
  const [dutyRaw, setDutyRaw, duty]           = useField(20)
  const [clearingRaw,setClearRaw,clearing]    = useField(8500)
  const [localSARaw,setLocalSARaw,localSA]    = useField(3500)
  const [assemblyRaw,setAsmRaw,assembly]      = useField(25)
  const [finishingRaw,setFinRaw,finishing]    = useField(15)
  const [qcRaw,  setQcRaw,  qc]              = useField(5)
  const [targetRaw,setTargetRaw,target]       = useField(0)
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
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div className="sec-label" style={{ margin:0, marginRight:4 }}>Incoterm</div>
        {Object.keys(INCOTERMS).map(t => (
          <button key={t} className={`bp-fbtn ${term===t?'active':''}`} onClick={()=>setTerm(t)}>{t}</button>
        ))}
      </div>
      <div style={{ background:'rgba(212,175,55,0.06)', border:`1px solid rgba(212,175,55,0.15)`, borderRadius:10, padding:'10px 14px', marginBottom:18, fontSize:12, color:T.textMid }}>
        <strong style={{color:T.gold}}>{it.label}</strong> — {it.included}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
        <NumField label="Exchange Rate (ZAR/USD)" value={rateRaw} onChange={setRateRaw} prefix="ZAR" hint="Current planning rate: 18.60" />
        <NumField label="Units (Qty)" value={qtyRaw} onChange={setQtyRaw} prefix="" />
        <NumField label="EXW/Base Unit Price" value={baseRaw} onChange={setBaseRaw} hint={`= ZAR ${(base*rate).toFixed(2)}`} />
        {it.showLocalChina && <NumField label="China Local Transport / unit" value={localCNRaw} onChange={setLocalCNRaw} />}
        {it.showFreight    && <NumField label="Freight (full order)" value={freightRaw} onChange={setFreightRaw} hint={`÷ ${qty} = $${qty>0?(freight/qty).toFixed(2):'—'}/unit`} />}
        {it.showInsurance  && <NumField label="Marine Insurance %" value={insuranceRaw} onChange={setInsRaw} prefix="%" hint={`$${insuranceUSD.toFixed(2)}`} />}
        <NumField label="Import Duty %" value={dutyRaw} onChange={setDutyRaw} prefix="%" hint={`ZAR ${dutyZAR.toFixed(0)}`} />
        <NumField label="SA Customs Clearing" value={clearingRaw} onChange={setClearRaw} prefix="ZAR" />
        <NumField label="Local Transport SA" value={localSARaw} onChange={setLocalSARaw} prefix="ZAR" />
        <NumField label="Assembly / unit" value={assemblyRaw} onChange={setAsmRaw} prefix="ZAR" />
        <NumField label="Finishing / Pot / unit" value={finishingRaw} onChange={setFinRaw} prefix="ZAR" />
        <NumField label="QC / unit" value={qcRaw} onChange={setQcRaw} prefix="ZAR" />
        <NumField label="Target Sell Price (ZAR)" value={targetRaw} onChange={setTargetRaw} prefix="ZAR" hint="Optional — calculates margin" />
      </div>
      <div className="g-card">
        <div className="sec-label">Landed Cost Results</div>
        {[
          ['Order Value (USD)', USD(orderUSD)],
          ['Freight + Insurance (USD)', USD(freightUSD + insuranceUSD)],
          ['CIF Value (USD)', USD(cifUSD)],
          ['CIF Value (ZAR)', ZAR(cifZAR)],
          ['Import Duty', ZAR(dutyZAR)],
          ['Clearing + Local SA', ZAR(clearing + localSA)],
          ['Total Landed (ZAR)', ZAR(totalLandedZAR), true],
          ['Unit Landed Cost', ZAR(unitLandedZAR), true],
          ...(target > 0 ? [['Gross Margin at Target', `${targetMark.toFixed(1)}%`, false, targetMark >= 40 ? T.green : T.red]] : []),
        ].map(([k,v,bold,col]) => (
          <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid rgba(255,255,255,0.07)`,fontWeight:bold?700:400 }}>
            <span style={{ fontSize:13,color:T.textMid }}>{k}</span>
            <span style={{ fontFamily:"'Manrope',sans-serif",fontSize:bold?20:16,color:col||(bold?T.gold:T.text) }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SUPPLIER ZONE
// ═════════════════════════════════════════════════════════════════════════════
export default function SupplierZone({ suppliers, setSuppliers, products, setProducts }) {
  const [tab, setTab] = useState('suppliers')
  const safe  = Array.isArray(suppliers) ? suppliers : []
  const safeP = Array.isArray(products)  ? products  : []

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Supplier Zone</div>
          <div className="page-subtitle">Suppliers · AI Catalog Extraction · Import Calculations</div>
        </div>
      </div>

      <div style={{ background:'rgba(11,20,16,0.70)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(255,255,255,0.07)`, padding:'14px 36px' }}>
        <div className="grid-4">
          {[
            { label:'Active Suppliers', val:safe.filter(s=>s.status==='Active').length, color:T.green },
            { label:'Products on File', val:safeP.length, color:T.teal },
            { label:'From Catalog Import', val:safeP.filter(p=>p.source==='catalog-import').length, color:T.gold },
            { label:'Planning Rate', val:`R${DEFAULT_RATE}/USD`, color:T.sage },
          ].map(k => (
            <div key={k.label} className="stat-card">
              <div className="stat-label">{k.label}</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:24, color:k.color, lineHeight:1, marginTop:4 }}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div className="tabs">
          {[{id:'suppliers',label:'Supplier Database'},{id:'catalogs',label:'Catalog Import'},{id:'calculator',label:'Import Calculator'}].map(t => (
            <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        {tab === 'suppliers'   && <SupplierDatabase suppliers={safe} setSuppliers={setSuppliers} />}
        {tab === 'catalogs'    && <SupplierCatalogs suppliers={safe} products={safeP} setProducts={setProducts} />}
        {tab === 'calculator'  && <ImportCalculator suppliers={safe} products={safeP} />}
      </div>
    </div>
  )
}
