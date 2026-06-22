// SupplierZone.jsx — v1.0
// Central hub for all supplier, pricing, import and catalog management.
// Tabs: Suppliers · Catalogs · Import Calculator · Comparison
import { useState, useRef, useCallback, useMemo } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, USD, parseNum, nextId, today, fmtDate, safeStr } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

// ── Exchange rate constant (updatable) ──────────────────────────────────────
const DEFAULT_RATE = 18.60

// ── helpers ──────────────────────────────────────────────────────────────────
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
          disabled={disabled} placeholder="0"
          style={{ paddingLeft:prefix?36:undefined, opacity:disabled?0.35:1 }}
        />
      </div>
      {hint && <div style={{ fontSize:10,color:T.gold,marginTop:2 }}>{hint}</div>}
    </div>
  )
}

// ── Incoterm definitions ──────────────────────────────────────────────────────
const INCOTERMS = {
  EXW: { label:'EXW — Ex Works', included:'Factory gate price only.', showLocalChina:true, showFreight:true, showInsurance:true },
  FOB: { label:'FOB — Free On Board', included:'Product + export handling, loaded on vessel.', showLocalChina:false, showFreight:true, showInsurance:true },
  CIF: { label:'CIF — Cost, Insurance & Freight', included:'Product + freight + insurance to destination port.', showLocalChina:false, showFreight:false, showInsurance:false },
}

// ═════════════════════════════════════════════════════════════════════════════
// IMPORT CALCULATOR (preserved from Calculator.jsx, supplier-aware)
// ═════════════════════════════════════════════════════════════════════════════
function ImportCalculator({ suppliers = [], products = [] }) {
  const [term, setTerm]   = useState('FOB')
  const [supplierId, setSupplierId] = useState('')
  const [rateRaw, setRateRaw, rate] = useField(DEFAULT_RATE)
  const [baseRaw, setBaseRaw, base] = useField(31)
  const [qtyRaw,  setQtyRaw,  qty]  = useField(50)
  const [localCNRaw,setLocalCNRaw,localCN]   = useField(term==='EXW'?1.5:0)
  const [freightRaw,setFreightRaw,freight]   = useField(term==='CIF'?0:1200)
  const [insuranceRaw,setInsRaw,insurance]   = useField(term==='CIF'?0:0.3)
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
        {it.showFreight    && <NumField label="Freight (full order)" value={freightRaw} onChange={setFreightRaw} hint={`÷ ${qty} = USD ${qty>0?(freight/qty).toFixed(2):'—'}/unit`} />}
        {it.showInsurance  && <NumField label="Marine Insurance %" value={insuranceRaw} onChange={setInsRaw} prefix="%" hint={`USD ${insuranceUSD.toFixed(2)}`} />}
        <NumField label="Import Duty %" value={dutyRaw} onChange={setDutyRaw} prefix="%" hint={`ZAR ${dutyZAR.toFixed(0)}`} />
        <NumField label="SA Customs Clearing" value={clearingRaw} onChange={setClearRaw} prefix="ZAR" hint="Clearing agent fee" />
        <NumField label="Local Transport (SA)" value={localSARaw} onChange={setLocalSARaw} prefix="ZAR" />
        <NumField label="Assembly (per unit)" value={assemblyRaw} onChange={setAsmRaw} prefix="ZAR" />
        <NumField label="Finishing / Pot (per unit)" value={finishingRaw} onChange={setFinRaw} prefix="ZAR" />
        <NumField label="QC (per unit)" value={qcRaw} onChange={setQcRaw} prefix="ZAR" />
        <NumField label="Target Sell Price (ZAR)" value={targetRaw} onChange={setTargetRaw} prefix="ZAR" hint="Optional — calculates margin" />
      </div>
      {/* Results */}
      <div className="g-card">
        <div className="sec-label">Landed Cost Breakdown</div>
        {[
          ['Order Value (USD)', USD(orderUSD)],
          ['Freight + Insurance (USD)', USD(freightUSD + insuranceUSD)],
          ['CIF Value (USD)', USD(cifUSD)],
          ['CIF Value (ZAR)', ZAR(cifZAR)],
          ['Import Duty', ZAR(dutyZAR)],
          ['Clearing + Local SA', ZAR(clearing + localSA)],
          ['Total Landed (ZAR)', ZAR(totalLandedZAR), true],
          ['Unit Landed Cost', ZAR(unitLandedZAR), true],
          ...(target > 0 ? [['Gross Margin at Target', pct(targetMark), false, targetMark >= 40 ? T.green : T.red]] : []),
        ].map(([k,v,bold,col])=>(
          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid rgba(255,255,255,0.07)`, fontWeight:bold?700:400 }}>
            <span style={{ fontSize:13, color:T.textMid }}>{k}</span>
            <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:bold?20:16, color:col||(bold?T.gold:T.forest) }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SUPPLIER DATABASE TAB
// ═════════════════════════════════════════════════════════════════════════════
const BLANK_SUPPLIER = {
  name:'', country:'China', contact:'', email:'', whatsapp:'', website:'',
  terms:'FOB', currency:'USD', status:'Active', notes:'',
  sampleLeadTime:'', productionLeadTime:'', paymentTerms:'T/T 30%',
  catalogVersion:'', catalogDate:'',
}

function SupplierDatabase({ suppliers, setSuppliers }) {
  const [modal, setModal]   = useState(false)
  const [editing, setEdit]  = useState(null)
  const [form, setForm]     = useState(BLANK_SUPPLIER)
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
  const del = id => { if (!window.confirm('Remove this supplier?')) return; setSuppliers(ss=>ss.filter(s=>s.id!==id)); if(selected===id)setSelected(null) }

  const sel = selected ? safe.find(s=>s.id===selected) : null

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ fontSize:13, color:T.textMid }}>{safe.length} supplier{safe.length!==1?'s':''} in database</div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Supplier</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:sel?'1fr 320px':'1fr', gap:16, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {safe.length===0 && <div className="empty-st"><div className="empty-ic">◎</div><div>No suppliers yet. Add your first supplier.</div></div>}
          {safe.map(s => (
            <div key={s.id} className="doc-card" style={{ border:selected===s.id?`1.5px solid ${T.gold}`:undefined }} onClick={()=>setSelected(selected===s.id?null:s.id)}>
              <div style={{ width:40,height:40,borderRadius:10,background:T.greenPale,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>◎</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:17, color:T.forest, marginBottom:3 }}>{s.name}</div>
                <div style={{ fontSize:12, color:T.textMid }}>{s.country} · {s.terms} · {s.contact || 'No contact set'}</div>
                {s.email && <div style={{ fontSize:11, color:T.textLight }}>{s.email}</div>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                <span style={{ fontSize:11,fontWeight:600,color:s.status==='Active'?T.green:T.textMid,padding:'2px 8px',background:s.status==='Active'?T.greenPale:'rgba(161,161,170,0.1)',borderRadius:20 }}>{s.status}</span>
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
                <div style={{fontFamily:"'Manrope',sans-serif",fontSize:18,color:T.forest,lineHeight:1.2}}>{sel.name}</div>
                <div style={{fontSize:11,color:T.gold,letterSpacing:'0.1em',textTransform:'uppercase',marginTop:3}}>{sel.country} · {sel.terms}</div>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={()=>setSelected(null)}>✕</button>
            </div>
            {[
              ['Contact', sel.contact||'—'],
              ['Email',   sel.email||'—'],
              ['WhatsApp',sel.whatsapp||'—'],
              ['Website', sel.website||'—'],
              ['Terms',   sel.terms],
              ['Payment', sel.paymentTerms||'—'],
              ['Sample Lead Time', sel.sampleLeadTime||'—'],
              ['Production Lead Time', sel.productionLeadTime||'—'],
              ['Catalog Version', sel.catalogVersion||'—'],
              ['Status',  sel.status],
            ].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid rgba(255,255,255,0.07)`,fontSize:12,gap:8}}>
                <span style={{color:T.textMid,fontWeight:500,flexShrink:0}}>{k}</span>
                <span style={{color:T.forest,textAlign:'right',wordBreak:'break-all',fontSize:13}}>{v}</span>
              </div>
            ))}
            {sel.notes && <div style={{marginTop:10,padding:10,background:'rgba(255,255,255,0.04)',borderRadius:8,fontSize:12,color:T.textMid,lineHeight:1.6}}>{sel.notes}</div>}
            <button className="btn btn-primary btn-sm" style={{marginTop:14,width:'100%'}} onClick={()=>openEdit(sel)}>Edit Supplier</button>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editing!=null?'Edit Supplier':'Add Supplier'}
        footer={<><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
      >
        <div className="form-grid">
          <div className="form-field full"><label>Supplier / Factory Name *</label><input value={form.name||''} onChange={F('name')} placeholder="e.g. Frank / Dongyi" /></div>
          <div className="form-field"><label>Country</label><input value={form.country||''} onChange={F('country')} /></div>
          <div className="form-field"><label>Default Terms</label>
            <select value={form.terms} onChange={F('terms')}><option>EXW</option><option>FOB</option><option>CIF</option></select>
          </div>
          <div className="form-field"><label>Contact Person</label><input value={form.contact||''} onChange={F('contact')} /></div>
          <div className="form-field"><label>Email</label><input type="email" value={form.email||''} onChange={F('email')} /></div>
          <div className="form-field"><label>WhatsApp</label><input value={form.whatsapp||''} onChange={F('whatsapp')} placeholder="+86 138..." /></div>
          <div className="form-field"><label>Website</label><input value={form.website||''} onChange={F('website')} /></div>
          <div className="form-field"><label>Payment Terms</label><input value={form.paymentTerms||''} onChange={F('paymentTerms')} placeholder="T/T 30% deposit" /></div>
          <div className="form-field"><label>Sample Lead Time</label><input value={form.sampleLeadTime||''} onChange={F('sampleLeadTime')} placeholder="e.g. 14 days" /></div>
          <div className="form-field"><label>Production Lead Time</label><input value={form.productionLeadTime||''} onChange={F('productionLeadTime')} placeholder="e.g. 45 days" /></div>
          <div className="form-field"><label>Catalog Version</label><input value={form.catalogVersion||''} onChange={F('catalogVersion')} placeholder="e.g. 2026 Q1" /></div>
          <div className="form-field"><label>Status</label>
            <select value={form.status} onChange={F('status')}><option>Active</option><option>Prospect</option><option>On Hold</option><option>Inactive</option></select>
          </div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')} /></div>
        </div>
      </Modal>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SUPPLIER CATALOG TAB
// ═════════════════════════════════════════════════════════════════════════════
function SupplierCatalogs({ suppliers }) {
  const [catalogs, setCatalogs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [filterSup, setFilterSup] = useState('All')
  const fileRef = useRef()
  const safe = Array.isArray(suppliers) ? suppliers : []

  const handleUpload = async e => {
    const file = e.target.files?.[0]
    if (!file || !filterSup || filterSup === 'All') { alert('Select a supplier before uploading a catalog.'); e.target.value=''; return }
    e.target.value = ''
    setUploading(true)
    const ext  = file.name.split('.').pop().toLowerCase()
    const rec = {
      id:          Date.now(),
      supplierId:  filterSup,
      supplierName:safe.find(s=>String(s.id)===String(filterSup))?.name || filterSup,
      fileName:    file.name,
      fileType:    ext,
      fileSize:    `${(file.size/1024/1024).toFixed(1)} MB`,
      uploadDate:  today(),
      version:     `v${new Date().getFullYear()}.${String(new Date().getMonth()+1).padStart(2,'0')}`,
      note:        '',
    }
    setCatalogs(cc=>[...cc,rec])
    setUploading(false)
  }

  const del = id => { if (!window.confirm('Remove this catalog?')) return; setCatalogs(cc=>cc.filter(c=>c.id!==id)) }

  const visible = filterSup==='All' ? catalogs : catalogs.filter(c=>String(c.supplierId)===String(filterSup))

  return (
    <div>
      <div style={{ background:T.goldPale, border:`1px solid rgba(184,151,90,0.2)`, borderRadius:10, padding:'11px 15px', marginBottom:18, fontSize:12, color:'#6B4E10' }}>
        Supplier catalogs are stored separately from Business Documents. Select a supplier, then upload their catalog (PDF or Excel).
        Version history is tracked automatically.
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
        <div>
          <label style={{ fontSize:11, color:T.textMid, letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:4 }}>Supplier</label>
          <select value={filterSup} onChange={e=>setFilterSup(e.target.value)} style={{ minWidth:220 }}>
            <option value="All">All Suppliers</option>
            {safe.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ marginTop:22 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={()=>{ if(filterSup==='All'){alert('Select a supplier first.');return} fileRef.current?.click() }}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : '+ Upload Catalog'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" style={{display:'none'}} onChange={handleUpload}/>
        </div>
      </div>

      {visible.length===0 ? (
        <div className="empty-st">
          <div className="empty-ic">📋</div>
          <div style={{fontFamily:"'Manrope',sans-serif",fontSize:18,color:T.forest,marginBottom:6}}>No catalogs yet</div>
          <div style={{fontSize:13,color:T.textMid}}>Select a supplier above and upload their PDF or Excel catalog.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
          {visible.map(cat => (
            <div key={cat.id} className="doc-card">
              <div style={{ width:40,height:40,borderRadius:10,background:T.goldPale,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
                {cat.fileType==='pdf'?'📄':cat.fileType==='xlsx'||cat.fileType==='xls'?'📊':'📋'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14, color:T.forest, marginBottom:2 }}>{cat.supplierName} — Catalog</div>
                <div style={{ fontSize:12, color:T.textMid }}>{cat.fileName} · {cat.fileSize} · {cat.version}</div>
                <div style={{ fontSize:11, color:T.textLight }}>Uploaded {fmtDate(cat.uploadDate)}</div>
              </div>
              <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background:T.tealPale, color:T.teal }}>{cat.version}</span>
                <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>del(cat.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SUPPLIER ZONE
// ═════════════════════════════════════════════════════════════════════════════
export default function SupplierZone({ suppliers, setSuppliers, products }) {
  const [tab, setTab] = useState('suppliers')
  const safe = Array.isArray(suppliers) ? suppliers : []
  const safeP = Array.isArray(products) ? products : []

  const activeCount   = safe.filter(s=>s.status==='Active').length
  const productCount  = safeP.length
  const skuCount      = safeP.filter(p=>p.sku).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Supplier Zone</div>
          <div className="page-subtitle">Suppliers · Catalogs · Import Calculations</div>
        </div>
      </div>

      {/* KPI bar */}
      <div style={{ background:'rgba(15,26,20,0.70)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(255,255,255,0.07)`, padding:'14px 36px' }}>
        <div className="grid-4">
          {[
            { label:'Active Suppliers',   val:activeCount,  color:T.green },
            { label:'Products on File',   val:productCount, color:T.teal },
            { label:'SKUs Assigned',      val:skuCount,     color:T.gold },
            { label:'Planning Rate',      val:`R${DEFAULT_RATE}/USD`, color:T.forestLight },
          ].map(k=>(
            <div key={k.label} className="stat-card">
              <div className="stat-label">{k.label}</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:24, color:k.color, lineHeight:1, marginTop:4 }}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div className="tabs">
          {[
            { id:'suppliers', label:'Supplier Database' },
            { id:'catalogs',  label:'Catalogs' },
            { id:'calculator',label:'Import Calculator' },
          ].map(t=>(
            <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        {tab==='suppliers'  && <SupplierDatabase suppliers={safe} setSuppliers={setSuppliers} />}
        {tab==='catalogs'   && <SupplierCatalogs suppliers={safe} />}
        {tab==='calculator' && <ImportCalculator suppliers={safe} products={safeP} />}
      </div>
    </div>
  )
}
