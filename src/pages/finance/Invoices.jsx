// Invoices.jsx — v2.4 with Test Mode
// Real invoices stored in bl_invoices (affect all financial reporting)
// Test invoices stored in bl_test_invoices (completely isolated)
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import useLocalStorage from '../../hooks/useLocalStorage.js'
import { T } from '../../utils/tokens.js'
import { ZAR, fmtDate, nextId, today, parseNum } from '../../utils/format.js'
import { INVOICE_STATUSES } from '../../utils/data.js'
import Modal from '../../components/Modal.jsx'

const VAT_RATE = 0.15
const BLANK_ITEM = { description:'', qty:1, unitPrice:'', total:0 }
const BLANK = {
  number:'', date:today(), dueDate:'', client:'', contactPerson:'',
  projectName:'', notes:'', status:'Draft',
  amountPaid:'', paymentDate:'', paymentNotes:'',
  discount:'', items:[{ ...BLANK_ITEM }],
  sourceQuoteId: null,
}

const STATUS_COLORS = { Draft:T.textLight, Sent:T.gold, 'Partially Paid':T.teal, Paid:T.green, Overdue:T.danger }
const STATUS_BG     = { Draft:'rgba(255,255,255,0.05)', Sent:'rgba(212,175,55,0.12)', 'Partially Paid':'rgba(78,205,196,0.12)', Paid:'rgba(110,232,160,0.12)', Overdue:'rgba(255,68,68,0.12)' }

function calcTotals(items, discountRaw) {
  const subtotal  = (items||[]).reduce((s,i) => s + parseNum(i.unitPrice) * (Number(i.qty)||1), 0)
  const discount  = parseNum(discountRaw)
  const afterDisc = subtotal - discount
  const vat       = afterDisc * VAT_RATE
  const total     = afterDisc + vat
  return { subtotal, discount, afterDisc, vat, total }
}

function daysOverdue(dueDate) {
  if (!dueDate) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(dueDate)) / 86400000))
}

function agingBucket(inv) {
  if (inv.status === 'Paid') return 'Paid'
  const d = daysOverdue(inv.dueDate)
  if (d <= 0) return 'Current'
  if (d <= 30) return '1–30 Days'
  if (d <= 60) return '31–60 Days'
  if (d <= 90) return '61–90 Days'
  return '90+ Days'
}

// ── TEST MODE BANNER ─────────────────────────────────────────────────────────
function TestModeBanner({ onToggle }) {
  return (
    <div style={{ background:'rgba(212,175,55,0.10)', border:`1.5px solid rgba(212,175,55,0.35)`, borderRadius:12, padding:'14px 20px', margin:'0 36px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:'rgba(212,175,55,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🧪</div>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:T.goldBright, letterSpacing:0.01 }}>TEST MODE ACTIVE</div>
          <div style={{ fontSize:12, color:T.textLight, marginTop:2 }}>Invoices created here will NOT affect live financial records, reports, balances or VAT.</div>
        </div>
      </div>
      <button className="btn btn-outline btn-sm" style={{ borderColor:'rgba(212,175,55,0.35)', color:T.gold }} onClick={onToggle}>
        ← Exit Test Mode
      </button>
    </div>
  )
}

// ── INVOICE FORM (shared for real + test) ────────────────────────────────────
function InvoiceForm({ form, setForm, errors, clients }) {
  const safeC = Array.isArray(clients) ? clients : []
  const { subtotal, discount, vat, total } = calcTotals(form.items||[], form.discount)
  const amountPaid = parseNum(form.amountPaid)
  const outstanding = total - amountPaid

  const setField = (k,v) => setForm(f => ({ ...f, [k]:v }))
  const setItem  = (i,k,v) => setForm(f => ({ ...f, items: (f.items||[]).map((it,idx) => idx===i ? { ...it,[k]:v } : it) }))
  const addItem    = () => setForm(f => ({ ...f, items: [...(f.items||[]), { ...BLANK_ITEM }] }))
  const removeItem = i  => setForm(f => ({ ...f, items: (f.items||[]).filter((_,idx) => idx!==i) }))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {form.sourceQuoteId && <div style={{ padding:'8px 14px', background:'rgba(110,232,160,0.10)', border:`1px solid rgba(110,232,160,0.20)`, borderRadius:8, fontSize:12, color:T.green }}>✓ Created from Quote</div>}
      {form.isTest && <div style={{ padding:'8px 14px', background:'rgba(212,175,55,0.10)', border:`1px solid rgba(212,175,55,0.25)`, borderRadius:8, fontSize:12, color:T.goldBright, fontWeight:700 }}>🧪 TEST INVOICE — will not appear in financial reports</div>}

      <div className="form-grid">
        <div className="form-field"><label htmlFor="inv-num">Invoice Number</label><input id="inv-num" value={form.number||''} onChange={e=>setField('number',e.target.value)} placeholder={form.isTest?'TEST-INV-0001':'INV-0001'} /></div>
        <div className="form-field"><label htmlFor="inv-date">Invoice Date</label><input id="inv-date" type="date" value={form.date||today()} onChange={e=>setField('date',e.target.value)} /></div>
        <div className="form-field"><label htmlFor="inv-due">Due Date</label><input id="inv-due" type="date" value={form.dueDate||''} onChange={e=>setField('dueDate',e.target.value)} /></div>
        <div className="form-field">
          <label htmlFor="inv-status">Status</label>
          <select id="inv-status" value={form.status||'Draft'} onChange={e=>setField('status',e.target.value)}>
            {INVOICE_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-field" style={{ borderColor:errors.client?T.danger:undefined }}>
          <label htmlFor="inv-client">Client {!errors.client && <span style={{color:T.danger}}>*</span>}</label>
          <input id="inv-client" value={form.client||''} onChange={e=>setField('client',e.target.value)} list="inv-clients-list" style={{ borderColor:errors.client?T.danger:undefined }} />
          <datalist id="inv-clients-list">{safeC.map(c=><option key={c.id} value={c.company}/>)}</datalist>
          {errors.client && <div style={{fontSize:11,color:T.danger,marginTop:2}}>{errors.client}</div>}
        </div>
        <div className="form-field"><label htmlFor="inv-proj">Project Name</label><input id="inv-proj" value={form.projectName||''} onChange={e=>setField('projectName',e.target.value)} /></div>
      </div>

      {/* Line items */}
      <div>
        <div className="sec-label" style={{ marginBottom:8 }}>Line Items {errors.items && <span style={{color:T.danger,fontWeight:400,textTransform:'none',letterSpacing:0}}> — {errors.items}</span>}</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th style={{minWidth:200}}>Description</th><th style={{width:70}}>Qty</th><th style={{width:130}}>Unit Price</th><th style={{width:120}}>Total</th><th style={{width:34}}></th></tr></thead>
            <tbody>
              {(form.items||[]).map((item,i) => {
                const lineTotal = parseNum(item.unitPrice) * (Number(item.qty)||1)
                return (
                  <tr key={i}>
                    <td><input value={item.description||''} onChange={e=>setItem(i,'description',e.target.value)} style={{width:'100%',fontSize:13,padding:'4px 8px'}} /></td>
                    <td><input type="text" inputMode="decimal" value={String(item.qty||1)} onChange={e=>setItem(i,'qty',e.target.value)} style={{width:60,fontSize:13,padding:'4px 8px'}} /></td>
                    <td><input type="text" inputMode="decimal" value={String(item.unitPrice||'')} onChange={e=>setItem(i,'unitPrice',e.target.value)} placeholder="0.00" style={{width:110,fontSize:13,padding:'4px 8px'}} /></td>
                    <td style={{fontFamily:"'Manrope',sans-serif",fontSize:15,color:T.text,whiteSpace:'nowrap',fontWeight:600}}>{ZAR(lineTotal)}</td>
                    <td>{(form.items||[]).length>1&&<button className="btn btn-ghost btn-xs" style={{color:T.textLight}} onClick={()=>removeItem(i)}>✕</button>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={addItem}>+ Add Line Item</button>
      </div>

      {/* Totals */}
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <div style={{width:300}}>
          {[{label:'Subtotal',val:ZAR(subtotal)}].map(r=>(
            <div key={r.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid rgba(255,255,255,0.07)`,fontSize:13}}>
              <span style={{color:T.textLight}}>{r.label}</span><span>{r.val}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid rgba(255,255,255,0.07)`,fontSize:13}}>
            <span style={{color:T.textLight}}>Discount</span>
            <input type="text" inputMode="decimal" value={form.discount||''} onChange={e=>setField('discount',e.target.value)} placeholder="0" style={{width:100,fontSize:12,padding:'2px 8px',textAlign:'right'}} />
          </div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid rgba(255,255,255,0.07)`,fontSize:13}}>
            <span style={{color:T.textLight}}>VAT (15%)</span><span>{ZAR(vat)}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontSize:16,fontWeight:700}}>
            <span style={{color:T.text}}>TOTAL</span>
            <span style={{fontFamily:"'Manrope',sans-serif",fontSize:22,color:T.goldBright}}>{ZAR(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment tracking */}
      <div style={{background:'rgba(78,205,196,0.05)',border:`1px solid rgba(78,205,196,0.12)`,borderRadius:10,padding:16}}>
        <div className="sec-label" style={{marginBottom:12}}>Payment Tracking</div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="inv-paid">Amount Paid (ZAR)</label><input id="inv-paid" type="text" inputMode="decimal" value={form.amountPaid||''} onChange={e=>setField('amountPaid',e.target.value)} placeholder="0.00" /></div>
          <div className="form-field"><label htmlFor="inv-paydate">Payment Date</label><input id="inv-paydate" type="date" value={form.paymentDate||''} onChange={e=>setField('paymentDate',e.target.value)} /></div>
          <div className="form-field full"><label htmlFor="inv-paynotes">Payment Notes</label><input id="inv-paynotes" value={form.paymentNotes||''} onChange={e=>setField('paymentNotes',e.target.value)} placeholder="Reference, bank, etc." /></div>
        </div>
        {total > 0 && (
          <div style={{display:'flex',justifyContent:'space-between',marginTop:10,padding:'10px 0',borderTop:`1px solid rgba(78,205,196,0.12)`}}>
            <span style={{fontSize:13,color:T.teal,fontWeight:600}}>Outstanding Balance</span>
            <span style={{fontFamily:"'Manrope',sans-serif",fontSize:20,color:outstanding>0?T.teal:T.green}}>{ZAR(outstanding)}</span>
          </div>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="inv-notes">Notes</label>
        <textarea id="inv-notes" value={form.notes||''} onChange={e=>setField('notes',e.target.value)} placeholder="Payment terms, banking details…" />
      </div>
    </div>
  )
}

// ── INVOICE TABLE ────────────────────────────────────────────────────────────
function InvoiceTable({ invoices, onEdit, onDelete, onPromote, isTest }) {
  const todayStr = today()
  const enriched = useMemo(() => invoices.map(inv => ({
    ...inv,
    status: inv.status !== 'Paid' && inv.status !== 'Draft' && inv.dueDate && inv.dueDate < todayStr ? 'Overdue' : inv.status
  })), [invoices, todayStr])

  if (enriched.length === 0) return null

  return (
    <div className="g-card" style={{ padding:0 }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice #</th><th>Date</th><th>Due</th><th>Client</th>
              <th>Total</th><th>Paid</th><th>Outstanding</th><th>Status</th>
              <th style={{width:isTest?160:120}}></th>
            </tr>
          </thead>
          <tbody>
            {enriched.map(inv => {
              const paid = Number(inv.amountPaid||0)
              const outs = Number(inv.total||0) - paid
              return (
                <tr key={inv.id}>
                  <td style={{fontFamily:'monospace',fontSize:12,color:isTest?T.gold:T.text,fontWeight:600}}>
                    {inv.number}
                    {isTest && <span style={{fontSize:9,background:'rgba(212,175,55,0.15)',color:T.gold,padding:'1px 5px',borderRadius:8,marginLeft:5,fontWeight:700,fontFamily:'Inter,sans-serif',letterSpacing:'0.06em'}}>TEST</span>}
                  </td>
                  <td style={{fontSize:12}}>{fmtDate(inv.date)}</td>
                  <td style={{fontSize:12,color:inv.status==='Overdue'?T.danger:T.textLight}}>{fmtDate(inv.dueDate)}</td>
                  <td className="td-name">{inv.client}</td>
                  <td style={{fontFamily:"'Manrope',sans-serif",fontSize:15,color:T.text,fontWeight:600,whiteSpace:'nowrap'}}>{ZAR(inv.total||0)}</td>
                  <td style={{fontFamily:"'Manrope',sans-serif",fontSize:14,color:T.green,whiteSpace:'nowrap'}}>{paid>0?ZAR(paid):'—'}</td>
                  <td style={{fontFamily:"'Manrope',sans-serif",fontSize:14,color:outs>0?T.teal:T.textLight,whiteSpace:'nowrap'}}>{outs>0?ZAR(outs):'—'}</td>
                  <td>
                    <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,background:STATUS_BG[inv.status]||'rgba(255,255,255,0.05)',color:STATUS_COLORS[inv.status]||T.textLight}}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                      <button className="btn btn-outline btn-xs" onClick={()=>onEdit(inv)}>Edit</button>
                      {isTest && onPromote && (
                        <button className="btn btn-xs" style={{background:'rgba(110,232,160,0.10)',border:`1px solid rgba(110,232,160,0.22)`,color:T.green,fontSize:10}} onClick={()=>onPromote(inv)} title="Convert to Live Invoice">→ Live</button>
                      )}
                      <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>onDelete(inv.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN INVOICES COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function Invoices({ invoices, setInvoices, clients }) {
  // ── Test invoices — completely separate storage ────────────────────────────
  const [testInvoices, setTestInvoices] = useLocalStorage('bl_test_invoices', [])

  const [testMode, setTestMode] = useState(false)
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(BLANK)
  const [filter,   setFilter]   = useState('All')
  const [tab,      setTab]      = useState('invoices')
  const [search,   setSearch]   = useState('')
  const [errors,   setErrors]   = useState({})
  const [promoteModal, setPromoteModal] = useState(null)  // test invoice to promote

  const safeI   = useMemo(() => Array.isArray(invoices)     ? invoices     : [], [invoices])
  const safeT   = useMemo(() => Array.isArray(testInvoices) ? testInvoices : [], [testInvoices])
  const safeC   = Array.isArray(clients) ? clients : []

  // Determine active list
  const activeList    = testMode ? safeT : safeI
  const activeSet     = testMode ? setTestInvoices : setInvoices
  const nextTestNum   = `TEST-INV-${String(safeT.length + 1).padStart(4,'0')}`
  const nextRealNum   = `INV-${String(safeI.length + 1).padStart(4,'0')}`

  // Listen for quote→invoice conversion
  useEffect(() => {
    const handler = () => {
      const stored = sessionStorage.getItem('bl_quote_to_invoice')
      if (!stored) return
      try {
        const q = JSON.parse(stored)
        sessionStorage.removeItem('bl_quote_to_invoice')
        const dueD = new Date(); dueD.setDate(dueD.getDate() + 30)
        setEditing(null)
        setForm({
          ...BLANK,
          number: testMode ? nextTestNum : nextRealNum,
          date: today(), dueDate: dueD.toISOString().split('T')[0],
          client: q.client||'', contactPerson: q.contactPerson||'',
          projectName: q.projectName||'', notes: q.notes||'',
          discount: q.discount||'', items: q.items||[{...BLANK_ITEM}],
          sourceQuoteId: q.id, status:'Draft', isTest: testMode,
        })
        setModal(true)
      } catch {}
    }
    window.addEventListener('bl-navigate', handler)
    const stored = sessionStorage.getItem('bl_quote_to_invoice')
    if (stored) handler()
    return () => window.removeEventListener('bl-navigate', handler)
  }, [testMode])

  const openNew = () => {
    const dueD = new Date(); dueD.setDate(dueD.getDate() + 30)
    setEditing(null)
    setForm({ ...BLANK, number: testMode ? nextTestNum : nextRealNum, date:today(), dueDate:dueD.toISOString().split('T')[0], items:[{...BLANK_ITEM}], isTest:testMode, status:'Draft' })
    setErrors({})
    setModal(true)
  }
  const openEdit = inv => { setEditing(inv.id); setForm({...inv}); setErrors({}); setModal(true) }
  const closeModal = () => { setModal(false); setErrors({}) }

  const validate = f => {
    const e = {}
    if (!f.client?.trim()) e.client = 'Client is required'
    if (!f.items?.length || f.items.every(i => !i.description?.trim())) e.items = 'At least one line item is required'
    return e
  }

  const save = useCallback(() => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    const { total } = calcTotals(form.items, form.discount)
    const rec = { ...form, id: editing ?? nextId(activeList), total, updatedAt: today(), isTest: testMode }
    if (editing != null) activeSet(ii => (Array.isArray(ii)?ii:[]).map(i => i.id === editing ? rec : i))
    else                 activeSet(ii => [...(Array.isArray(ii)?ii:[]), rec])
    setModal(false)
  }, [form, editing, activeList, activeSet, testMode])

  const del = id => {
    const label = testMode ? 'Delete this TEST invoice?' : 'Delete this invoice?'
    if (!window.confirm(label)) return
    activeSet(ii => (Array.isArray(ii)?ii:[]).filter(i => i.id !== id))
  }

  const clearAllTest = () => {
    if (!window.confirm(`Delete ALL ${safeT.length} test invoice${safeT.length!==1?'s':''}? This cannot be undone.`)) return
    setTestInvoices([])
  }

  // Promote test → live
  const handlePromote = inv => setPromoteModal(inv)
  const confirmPromote = () => {
    if (!promoteModal) return
    const { total } = calcTotals(promoteModal.items, promoteModal.discount)
    const newNum = `INV-${String(safeI.length + 1).padStart(4,'0')}`
    const liveInv = { ...promoteModal, id: nextId(safeI), number: newNum, isTest: false, updatedAt: today(), promotedFrom: promoteModal.id }
    setInvoices(ii => [...(Array.isArray(ii)?ii:[]), liveInv])
    setTestInvoices(tt => (Array.isArray(tt)?tt:[]).filter(t => t.id !== promoteModal.id))
    setPromoteModal(null)
  }

  const todayStr = today()
  const enrich = list => list.map(inv => ({
    ...inv,
    status: inv.status !== 'Paid' && inv.status !== 'Draft' && inv.dueDate && inv.dueDate < todayStr ? 'Overdue' : inv.status
  }))

  const enrichedReal = useMemo(() => enrich(safeI), [safeI, todayStr])
  const enrichedTest = useMemo(() => enrich(safeT), [safeT, todayStr])
  const activeEnriched = testMode ? enrichedTest : enrichedReal

  const visible = useMemo(() => activeEnriched.filter(i => {
    const matchStatus = filter === 'All' || i.status === filter
    const s = search.toLowerCase()
    const matchSearch = !s || [i.number,i.client,i.projectName].some(v => (v||'').toLowerCase().includes(s))
    return matchStatus && matchSearch
  }).sort((a,b) => (b.date||'').localeCompare(a.date||'')), [activeEnriched, filter, search])

  // Aggregates — ALWAYS from real invoices only for financial reporting
  const totalInvoiced    = enrichedReal.reduce((s,i) => s+Number(i.total||0), 0)
  const totalPaid        = enrichedReal.filter(i=>i.status==='Paid').reduce((s,i) => s+Number(i.total||0), 0)
  const totalOutstanding = enrichedReal.filter(i=>i.status!=='Paid').reduce((s,i) => s+Number(i.total||0)-Number(i.amountPaid||0), 0)
  const overdueValue     = enrichedReal.filter(i=>i.status==='Overdue').reduce((s,i) => s+Number(i.total||0)-Number(i.amountPaid||0), 0)

  const agingBuckets = useMemo(() => {
    const b = { Current:0, '1–30 Days':0, '31–60 Days':0, '61–90 Days':0, '90+ Days':0 }
    enrichedReal.filter(i => i.status !== 'Paid').forEach(i => {
      const bk = agingBucket(i); if (bk !== 'Paid') b[bk] = (b[bk]||0) + (Number(i.total||0)-Number(i.amountPaid||0))
    })
    return Object.entries(b)
  }, [enrichedReal])

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
            Invoices
            {testMode && <span style={{ fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'rgba(212,175,55,0.15)', color:T.goldBright, border:`1px solid rgba(212,175,55,0.30)`, letterSpacing:'0.06em' }}>🧪 TEST</span>}
          </div>
          <div className="page-subtitle">{testMode ? 'Test Mode — Accounts Receivable (Isolated)' : 'Accounts Receivable · Billing'}</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {/* Test mode toggle */}
          <button
            className={`btn btn-sm ${testMode ? 'btn-outline' : 'btn-ghost'}`}
            style={{ borderColor: testMode ? T.goldBright : 'rgba(255,255,255,0.12)', color: testMode ? T.goldBright : T.textLight, gap:6 }}
            onClick={() => setTestMode(t => !t)}
          >
            <span style={{ fontSize:14 }}>🧪</span> {testMode ? 'Test Mode ON' : 'Test Mode'}
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            + {testMode ? 'New Test Invoice' : 'New Invoice'}
          </button>
        </div>
      </div>

      {testMode && <TestModeBanner onToggle={() => setTestMode(false)} />}

      {/* Stats bar — always shows REAL invoice stats */}
      <div style={{ background:'rgba(11,20,16,0.70)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(255,255,255,0.07)`, padding:'14px 36px' }}>
        <div className="grid-4">
          {[
            { label:'Total Invoiced',   val:ZAR(totalInvoiced),    color:T.text,   note:'Live' },
            { label:'Received',         val:ZAR(totalPaid),        color:T.green,  note:'Live' },
            { label:'Outstanding',      val:ZAR(totalOutstanding), color:T.teal,   note:'Live' },
            { label:'Overdue',          val:ZAR(overdueValue),     color:T.danger, note:'Live' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label} <span style={{fontSize:9,color:T.textLight,fontWeight:400}}>({s.note})</span></div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:22, color:s.color, lineHeight:1, marginTop:4 }}>{s.val}</div>
            </div>
          ))}
        </div>
        {testMode && safeT.length > 0 && (
          <div style={{ marginTop:12, padding:'8px 0', borderTop:`1px solid rgba(255,255,255,0.06)`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:T.gold }}>🧪 {safeT.length} test invoice{safeT.length!==1?'s':''} · {ZAR(safeT.reduce((s,i)=>s+Number(i.total||0),0))} (not in financial reports)</span>
            <button className="btn btn-ghost btn-xs" style={{color:T.textLight}} onClick={clearAllTest}>Clear All Test Invoices</button>
          </div>
        )}
      </div>

      <div className="page-content">
        <div className="tabs">
          {[{id:'invoices',label: testMode ? '🧪 Test Invoices' : 'Invoices'},{id:'aging',label:'Aging Analysis'}].map(t => (
            <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        {tab === 'invoices' && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:220 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={testMode?'Search test invoices…':'Search invoices…'} style={{paddingLeft:36}} />
                <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:T.textLight,pointerEvents:'none'}}>⊙</span>
              </div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {['All',...INVOICE_STATUSES].map(s=>(
                  <button key={s} className={`bp-fbtn ${filter===s?'active':''}`} onClick={()=>setFilter(s)}>{s}</button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="empty-st">
                <div className="empty-ic">▣</div>
                <div style={{fontSize:18,color:T.text,marginBottom:8}}>{testMode ? 'No test invoices yet' : 'No invoices yet'}</div>
                {testMode && <div style={{fontSize:13,color:T.textLight,marginBottom:16}}>Create test invoices safely here — they won't affect any real financial data.</div>}
                <button className="btn btn-primary" onClick={openNew}>+ {testMode?'Create Test Invoice':'Create Invoice'}</button>
              </div>
            ) : (
              <InvoiceTable
                invoices={visible}
                onEdit={openEdit}
                onDelete={del}
                onPromote={testMode ? handlePromote : null}
                isTest={testMode}
              />
            )}

            {testMode && !testMode && safeI.length > 0 && (
              <div style={{marginTop:24}}>
                <div className="sec-label">Live Invoices (read only — exit test mode to manage)</div>
                <InvoiceTable invoices={enrichedReal} onEdit={()=>{}} onDelete={()=>{}} isTest={false} />
              </div>
            )}
          </>
        )}

        {tab === 'aging' && (
          <div>
            <div style={{marginBottom:8,fontSize:12,color:T.textLight}}>Aging analysis is always based on live invoices only.</div>
            <div className="sec-label">Accounts Receivable — Aging Analysis</div>
            <div className="grid-2" style={{gap:14,marginBottom:24}}>
              {agingBuckets.map(([bucket,val])=>(
                <div key={bucket} className="g-card" style={{borderTop:`2px solid ${bucket==='Current'?T.green:bucket==='1–30 Days'?T.gold:bucket==='31–60 Days'?T.teal:T.danger}`}}>
                  <div className="stat-label">{bucket}</div>
                  <div style={{fontFamily:"'Manrope',sans-serif",fontSize:26,color:bucket==='Current'?T.green:bucket==='1–30 Days'?T.gold:bucket==='31–60 Days'?T.teal:T.danger,lineHeight:1,marginTop:4}}>{ZAR(val)}</div>
                  <div style={{fontSize:11,color:T.textLight,marginTop:6}}>{enrichedReal.filter(i=>i.status!=='Paid'&&agingBucket(i)===bucket).length} invoice(s)</div>
                </div>
              ))}
            </div>
            <div className="g-card" style={{padding:0}}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th><th>Days</th><th>Total</th><th>Outstanding</th><th>Bucket</th></tr></thead>
                  <tbody>
                    {enrichedReal.filter(i=>i.status!=='Paid').map(inv=>{
                      const days=daysOverdue(inv.dueDate)
                      const outs=Number(inv.total||0)-Number(inv.amountPaid||0)
                      const b=agingBucket(inv)
                      return (
                        <tr key={inv.id}>
                          <td style={{fontFamily:'monospace',fontSize:12}}>{inv.number}</td>
                          <td className="td-name">{inv.client}</td>
                          <td style={{fontSize:12}}>{fmtDate(inv.date)}</td>
                          <td style={{fontSize:12,color:days>0?T.danger:T.textLight}}>{fmtDate(inv.dueDate)}</td>
                          <td style={{fontSize:12,color:days>0?T.danger:T.green}}>{days>0?`${days}d`:'—'}</td>
                          <td style={{fontFamily:"'Manrope',sans-serif",fontSize:14,fontWeight:600}}>{ZAR(inv.total||0)}</td>
                          <td style={{fontFamily:"'Manrope',sans-serif",fontSize:14,color:T.teal}}>{ZAR(outs)}</td>
                          <td><span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:b==='Current'?'rgba(110,232,160,0.12)':b==='1–30 Days'?'rgba(212,175,55,0.12)':'rgba(255,68,68,0.12)',color:b==='Current'?T.green:b==='1–30 Days'?T.gold:T.danger}}>{b}</span></td>
                        </tr>
                      )
                    })}
                    {enrichedReal.filter(i=>i.status!=='Paid').length===0&&<tr><td colSpan={8} style={{textAlign:'center',padding:32,color:T.textLight}}>No outstanding invoices.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice form modal */}
      <Modal open={modal} onClose={closeModal}
        title={editing!=null ? (testMode?'Edit Test Invoice':'Edit Invoice') : (testMode?'New Test Invoice':'New Invoice')}
        size="modal-xl"
        footer={<>
          <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>
            {testMode ? '💾 Save Test Invoice' : 'Save Invoice'}
          </button>
        </>}
      >
        <InvoiceForm form={form} setForm={setForm} errors={errors} clients={safeC} />
      </Modal>

      {/* Promote test → live modal */}
      <Modal open={!!promoteModal} onClose={() => setPromoteModal(null)} title="Convert Test Invoice to Live Invoice"
        footer={<>
          <button className="btn btn-outline" onClick={() => setPromoteModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={confirmPromote}>✓ Confirm — Make Live</button>
        </>}
      >
        {promoteModal && (
          <div>
            <div style={{ background:'rgba(255,107,107,0.08)', border:`1px solid rgba(255,107,107,0.20)`, borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
              <div style={{ fontWeight:700, color:T.red, marginBottom:6 }}>⚠ This action affects live financial records</div>
              <div style={{ fontSize:13, color:T.textLight, lineHeight:1.7 }}>
                This test invoice will be converted into a <strong style={{color:T.text}}>real invoice</strong> and added to your live financial database.
                It will appear in reports, financial dashboards, accounts receivable and VAT calculations.
                A new invoice number will be assigned. This cannot be undone.
              </div>
            </div>
            <div className="g-card">
              {[['Test Number', promoteModal.number], ['New Live Number', `INV-${String(safeI.length+1).padStart(4,'0')}`], ['Client', promoteModal.client], ['Amount', ZAR(promoteModal.total||0)], ['Status', promoteModal.status]].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid rgba(255,255,255,0.07)`,fontSize:13}}>
                  <span style={{color:T.textLight}}>{k}</span>
                  <span style={{color:T.text,fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
