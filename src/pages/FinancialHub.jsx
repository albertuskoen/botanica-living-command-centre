// FinancialHub.jsx — v1.0
// Single source of truth for all financial activity.
// Data flows: Quotes → Invoices → AR → Cash Flow
//             Expenses → Project Profitability
// Tabs: Overview · Quotes · Invoices · Expenses · Profitability · AR Aging
import React, { useState, useMemo, useCallback, useRef } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, fmtDate, nextId, today, parseNum, safeAmount } from '../utils/format.js'
import Modal from '../components/Modal.jsx'
import { QUOTE_STATUSES, INVOICE_STATUSES, EXPENSE_CATEGORIES, VAT_RATE } from '../utils/data.js'
import DocPreview from '../components/DocPreview.jsx'
import { storeFile, createObjectURL, downloadFileById, formatBytes as fbytes } from '../lib/fileStore.js'
import { SUPABASE_CONFIGURED, uploadDocument, getDocumentUrl } from '../lib/supabase.js'

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  Draft: T.textLight, Sent: T.teal, Accepted: T.green, Rejected: T.danger, Expired: T.textMid,
  'Partially Paid': T.gold, Paid: T.green, Overdue: T.danger,
}

function Badge({ label }) {
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:20,
    background:'rgba(161,161,170,0.12)', color:STATUS_COLORS[label]||T.textMid, whiteSpace:'nowrap' }}>{label}</span>
}

// ── Quote number generator ─────────────────────────────────────────────────────
function nextQNum(quotes) {
  const year = new Date().getFullYear()
  const nums = (quotes||[]).map(q => parseInt((q.quoteNumber||'').split('-').pop())||0)
  return `BL-Q-${year}-${String(Math.max(0,...nums)+1).padStart(3,'0')}`
}
function nextInvNum(invoices) {
  const year = new Date().getFullYear()
  const nums = (invoices||[]).map(i => parseInt((i.invoiceNumber||'').split('-').pop())||0)
  return `BL-INV-${year}-${String(Math.max(0,...nums)+1).padStart(3,'0')}`
}

// ── Line item component ────────────────────────────────────────────────────────
function LineItems({ items, onChange }) {
  const set = (i, k, v) => onChange(items.map((r, j) => j===i ? {...r, [k]:v} : r))
  const add  = () => onChange([...items, { description:'', qty:1, unitPrice:0, total:0 }])
  const del  = i  => onChange(items.filter((_,j) => j!==i))

  return (
    <div style={{ marginTop:4 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 90px 90px 28px', gap:6, marginBottom:5 }}>
        {['Description','Qty','Unit Price','Total',''].map(h => (
          <div key={h} style={{ fontSize:10, color:T.textMid, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>{h}</div>
        ))}
      </div>
      {items.map((row, i) => {
        const total = parseNum(row.qty) * parseNum(row.unitPrice)
        if (row.total !== total) setTimeout(() => set(i, 'total', total), 0)
        return (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 60px 90px 90px 28px', gap:6, marginBottom:5 }}>
            <input value={row.description||''} onChange={e=>set(i,'description',e.target.value)} placeholder="Item description" style={{ fontSize:12, padding:'7px 9px' }} />
            <input type="text" inputMode="decimal" value={String(row.qty||'')} onChange={e=>set(i,'qty',e.target.value)} style={{ fontSize:12, padding:'7px 9px', textAlign:'center' }} />
            <input type="text" inputMode="decimal" value={String(row.unitPrice||'')} onChange={e=>set(i,'unitPrice',e.target.value)} style={{ fontSize:12, padding:'7px 9px', textAlign:'right' }} placeholder="0" />
            <div style={{ padding:'7px 9px', fontSize:12, background:'rgba(228,221,208,0.4)', borderRadius:8, textAlign:'right', color:T.forest }}>
              {ZAR(total)}
            </div>
            <button onClick={()=>del(i)} style={{ background:'none', border:'none', color:T.textLight, cursor:'pointer', fontSize:14, padding:0 }}>✕</button>
          </div>
        )
      })}
      <button className="btn btn-outline btn-sm" onClick={add} style={{ marginTop:4 }}>+ Add Line</button>
    </div>
  )
}

// ── Totals calculator ──────────────────────────────────────────────────────────
function calcTotals(items, discountPct, applyVat) {
  const subtotal = (items||[]).reduce((s, r) => s + parseNum(r.qty) * parseNum(r.unitPrice), 0)
  const discount = subtotal * (parseNum(discountPct) / 100)
  const afterDiscount = subtotal - discount
  const vat = applyVat ? afterDiscount * VAT_RATE : 0
  const total = afterDiscount + vat
  return { subtotal, discount, afterDiscount, vat, total }
}

// ═════════════════════════════════════════════════════════════════════════════
// FINANCE CENTRE → FINANCIAL HUB MIGRATION UTILITY
// Safe copy-based migration — Finance Centre data never deleted
// ═════════════════════════════════════════════════════════════════════════════
function mapFinanceTxnToExpense(txn) {
  const CAT_MAP = {
    'Freight & Shipping':'Freight','Customs & Clearing':'Customs & Clearing',
    'Local Transport':'Transport (SA)','Transport (SA)':'Transport (SA)',
    'Samples':'Samples','Marketing':'Marketing',
    'Website':'Website & Digital','Website & Digital':'Website & Digital',
    'Travel':'Travel','Office & Admin':'Office & Admin',
    'Banking Fees':'Banking Fees','Compliance':'Compliance',
  }
  return {
    id:              txn.id,
    _migratedFrom:   'bl_finance',
    _migrationId:    'fc_' + txn.id,
    _originalType:   txn.type,
    _originalSource: txn.source || 'manual',
    supplier:        txn.supplierPayee   || '',
    category:        CAT_MAP[txn.category] || txn.category || 'Other',
    project:         '',
    date:            txn.date            || '',
    amount:          String(txn.amount   || 0),
    vat:             String(txn.vatAmount || 0),
    reference:       txn.invoiceNumber   || '',
    notes:           [txn.notes, txn.description].filter(Boolean).join(' · ') || '',
    receipt:         '',
    docId:           txn.sourceDocId        || null,
    docName:         txn.sourceFile         || '',
    docStoragePath:  txn.sourceStoragePath  || '',
    docPublicUrl:    txn.sourcePublicUrl    || '',
  }
}

function MigrationPanel({ finance, expenses, setExpenses }) {
  const [report,    setReport]    = useState(null)
  const [migrating, setMigrating] = useState(false)
  const [result,    setResult]    = useState(null)
  const [expanded,  setExpanded]  = useState(false)

  const finExpenses = useMemo(() =>
    (finance || []).filter(t => t?.type === 'Business Expense'), [finance])
  const alreadyDone = useMemo(() =>
    (expenses || []).filter(e => e._migrationId).length, [expenses])
  const pending = useMemo(() =>
    finExpenses.filter(t => !(expenses||[]).some(e => e._migrationId === 'fc_' + t.id)),
    [finExpenses, expenses])

  if (finExpenses.length === 0 || alreadyDone === finExpenses.length) return null

  const analyse = () => {
    const withDocs = pending.filter(t => t.sourceDocId || t.sourceStoragePath)
    const ocrRecs  = pending.filter(t => t.source==='ocr'||t.source==='tesseract'||t.source==='pdfjs')
    const total    = pending.reduce((s,t) => s+(parseFloat(t.amount)||0), 0)
    setReport({ count:pending.length, withDocs:withDocs.length, ocrRecs:ocrRecs.length, total })
    setExpanded(true)
  }

  const runMigration = () => {
    if (!report || pending.length === 0) return
    if (!window.confirm(
      'Migrate ' + pending.length + ' expense records from Finance Centre to Financial Hub?\n\n' +
      'Finance Centre data is NOT deleted.\nThis is a safe copy operation.\n\nProceed?'
    )) return
    setMigrating(true)
    const mapped = pending.map(mapFinanceTxnToExpense)
    const currentIds = new Set((expenses||[]).map(e=>e._migrationId).filter(Boolean))
    const newRecs    = mapped.filter(e => !currentIds.has(e._migrationId))
    const totalBefore = (expenses||[]).reduce((s,e)=>s+(parseFloat(e.amount)||0), 0)
    const merged      = [...(expenses||[]), ...newRecs]
    const totalAfter  = merged.reduce((s,e)=>s+(parseFloat(e.amount)||0), 0)
    if (newRecs.length !== pending.length) {
      setResult({ ok:false, msg:'Deduplication mismatch — migration aborted. No data changed.' })
      setMigrating(false); return
    }
    setExpenses(merged)
    setResult({
      ok:true, migrated:newRecs.length,
      recordsBefore:(expenses||[]).length, recordsAfter:merged.length,
      totalBefore, totalAfter,
      docsPreserved:newRecs.filter(e=>e.docId).length,
      ocrMigrated:newRecs.filter(e=>e._originalSource==='ocr'||e._originalSource==='tesseract').length,
    })
    setReport(null); setMigrating(false)
  }

  return (
    <div style={{ marginBottom:16, border:'1.5px solid rgba(184,151,90,0.35)', borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', background:'rgba(184,151,90,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}
        onClick={()=>setExpanded(e=>!e)}>
        <div>
          <span style={{ fontWeight:700, fontSize:13, color:T.gold }}>Finance Centre records available to migrate</span>
          <span style={{ fontSize:11, color:T.textMid, marginLeft:10 }}>{finExpenses.length - alreadyDone} not yet migrated</span>
        </div>
        <span style={{ fontSize:12, color:T.textMid }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ padding:14 }}>
          <div style={{ fontSize:12, color:T.textMid, marginBottom:12, lineHeight:1.7 }}>
            Finance Centre has <strong>{finExpenses.length}</strong> Business Expense records
            ({alreadyDone} already migrated, {pending.length} pending).
            Finance Centre data is never deleted.
          </div>
          {!result && !report && (
            <button className="btn btn-outline btn-sm" onClick={analyse}>📋 Analyse Before Migrating</button>
          )}
          {report && !result && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                {[
                  ['Records to migrate', report.count],
                  ['With documents',     report.withDocs],
                  ['OCR records',        report.ocrRecs],
                  ['Expense total',      'R ' + report.total.toFixed(2)],
                ].map(([k,v])=>(
                  <div key={k} style={{ padding:'6px 10px', background:'rgba(228,221,208,0.4)', borderRadius:8 }}>
                    <div style={{ fontSize:10, color:T.textLight, textTransform:'uppercase', letterSpacing:'0.1em' }}>{k}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:T.forest, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:T.green, padding:'8px 12px', background:T.greenPale, borderRadius:8, marginBottom:12 }}>
                All document links and OCR records will be preserved. Finance Centre unchanged.
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-primary btn-sm" onClick={runMigration} disabled={migrating}>
                  {migrating ? 'Migrating…' : 'Migrate ' + report.count + ' Records'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={()=>{setReport(null);setExpanded(false)}}>Cancel</button>
              </div>
            </div>
          )}
          {result && (
            <div style={{ padding:'12px 14px', background:result.ok?T.greenPale:T.redPale, border:'1px solid ' + (result.ok?'rgba(21,128,61,0.25)':'rgba(185,28,28,0.25)'), borderRadius:10, fontSize:12 }}>
              {result.ok ? (
                <>
                  <div style={{ fontWeight:700, color:T.green, marginBottom:8 }}>Migration verified and complete</div>
                  {[
                    ['Records before', result.recordsBefore],
                    ['Records after',  result.recordsAfter],
                    ['Migrated',       result.migrated],
                    ['Documents',      result.docsPreserved + ' preserved'],
                    ['OCR records',    result.ocrMigrated + ' preserved'],
                    ['Total before',   'R ' + result.totalBefore.toFixed(2)],
                    ['Total after',    'R ' + result.totalAfter.toFixed(2)],
                  ].map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid rgba(21,128,61,0.12)' }}>
                      <span style={{ color:T.textMid }}>{k}</span>
                      <span style={{ fontWeight:600, color:T.forest }}>{v}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ color:T.danger, fontWeight:600 }}>{result.msg}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═════════════════════════════════════════════════════════════════════════════
function Overview({ quotes, invoices, expenses, finance }) {
  const safeQ = Array.isArray(quotes)   ? quotes   : []
  const safeI = Array.isArray(invoices) ? invoices : []
  const safeE = Array.isArray(expenses) ? expenses : []
  const safeF = Array.isArray(finance)  ? finance  : []

  const outstandingQuotes  = safeQ.filter(q=>q.status==='Sent'||q.status==='Draft').reduce((s,q)=>s+safeAmount(q.total),0)
  const invoiceOutstanding = safeI.filter(i=>i.status==='Sent'||i.status==='Partially Paid'||i.status==='Overdue').reduce((s,i)=>s+safeAmount(i.outstanding),0)
  const totalRevenue       = safeI.filter(i=>i.status==='Paid'||i.status==='Partially Paid').reduce((s,i)=>s+safeAmount(i.amountPaid),0)
  const totalExpenses      = safeE.reduce((s,e)=>s+safeAmount(e.amount),0)
  const legacyExpenses     = safeF.filter(t=>t.type==='Business Expense').reduce((s,t)=>s+safeAmount(t.amount),0)
  const grossProfit        = totalRevenue - totalExpenses - legacyExpenses
  const grossMargin        = totalRevenue > 0 ? (grossProfit/totalRevenue)*100 : 0
  const cashIn             = safeF.filter(t=>t.type==='Owner Investment').reduce((s,t)=>s+safeAmount(t.amount),0)
  const cashPosition       = cashIn + totalRevenue - totalExpenses - legacyExpenses

  const KPI = ({ label, val, color, sub }) => (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:color||T.forest, lineHeight:1, marginTop:6 }}>{val}</div>
      {sub && <div style={{ fontSize:10, color:T.textLight, marginTop:4 }}>{sub}</div>}
    </div>
  )

  // Monthly revenue/expense split (last 6 months)
  const now = new Date()
  const monthlyData = Array.from({length:6}, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const rev = safeI.filter(inv => inv.status==='Paid' && (inv.paymentDate||'').startsWith(key)).reduce((s,inv)=>s+safeAmount(inv.amountPaid),0)
    const exp = safeE.filter(e => (e.date||'').startsWith(key)).reduce((s,e)=>s+safeAmount(e.amount),0)
    return { key: key.slice(5), rev, exp }
  })
  const maxBar = Math.max(...monthlyData.flatMap(m=>[m.rev,m.exp]), 1)

  // AR aging buckets
  const today_d = new Date()
  const aging = { current:0, d30:0, d60:0, d90:0, d120:0 }
  safeI.filter(i=>['Sent','Partially Paid','Overdue'].includes(i.status)).forEach(inv => {
    const due = new Date(inv.dueDate||today())
    const days = Math.floor((today_d - due) / 86400000)
    const amt = safeAmount(inv.outstanding)
    if (days <= 0) aging.current += amt
    else if (days <= 30) aging.d30 += amt
    else if (days <= 60) aging.d60 += amt
    else if (days <= 90) aging.d90 += amt
    else aging.d120 += amt
  })

  return (
    <div>
      {/* KPI grid */}
      <div className="grid-5" style={{ marginBottom:20 }}>
        <KPI label="Cash Position"          val={ZAR(cashPosition)}       color={cashPosition>=0?T.green:T.danger} />
        <KPI label="Outstanding Invoices"   val={ZAR(invoiceOutstanding)} color={T.gold}   sub={`${safeI.filter(i=>['Sent','Partially Paid','Overdue'].includes(i.status)).length} invoice${safeI.filter(i=>['Sent','Partially Paid','Overdue'].includes(i.status)).length!==1?'s':''}`} />
        <KPI label="Quote Pipeline"         val={ZAR(outstandingQuotes)}  color={T.teal}   sub={`${safeQ.filter(q=>q.status==='Sent').length} sent`} />
        <KPI label="Gross Profit"           val={ZAR(grossProfit)}        color={grossProfit>=0?T.forestLight:T.danger} />
        <KPI label="Gross Margin"           val={`${grossMargin.toFixed(1)}%`} color={grossMargin>=40?T.green:grossMargin>=20?T.gold:T.danger} />
      </div>

      <div className="grid-2 gap-20">
        {/* Revenue vs Expense chart (simple bar) */}
        <div className="g-card">
          <div className="sec-label">Revenue vs Expenses — Last 6 Months</div>
          <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:120, marginTop:12 }}>
            {monthlyData.map(m => (
              <div key={m.key} style={{ flex:1, display:'flex', gap:3, alignItems:'flex-end' }}>
                <div style={{ flex:1, background:T.greenPale, borderRadius:'4px 4px 0 0', height:`${(m.rev/maxBar)*100}%`, minHeight:2, border:`1px solid rgba(21,128,61,0.25)`, transition:'height 0.3s' }} title={`Revenue: ${ZAR(m.rev)}`} />
                <div style={{ flex:1, background:T.redPale,   borderRadius:'4px 4px 0 0', height:`${(m.exp/maxBar)*100}%`, minHeight:2, border:`1px solid rgba(185,28,28,0.2)`,  transition:'height 0.3s' }} title={`Expenses: ${ZAR(m.exp)}`} />
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6, marginTop:4 }}>
            {monthlyData.map(m => <div key={m.key} style={{ flex:1, textAlign:'center', fontSize:9, color:T.textLight }}>{m.key}</div>)}
          </div>
          <div style={{ display:'flex', gap:12, marginTop:10, fontSize:11, color:T.textMid }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:T.greenPale, border:`1px solid rgba(21,128,61,0.25)`, display:'inline-block' }}/>Revenue</span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:T.redPale, border:`1px solid rgba(185,28,28,0.2)`, display:'inline-block' }}/>Expenses</span>
          </div>
        </div>

        {/* AR Aging */}
        <div className="g-card">
          <div className="sec-label">Accounts Receivable Aging</div>
          {[
            { label:'Current', val:aging.current,  color:T.green },
            { label:'1–30 days', val:aging.d30,    color:T.gold },
            { label:'31–60 days',val:aging.d60,    color:T.gold },
            { label:'61–90 days',val:aging.d90,    color:T.danger },
            { label:'90+ days',  val:aging.d120,   color:T.red },
          ].map(b => (
            <div key={b.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid rgba(210,200,184,0.3)` }}>
              <span style={{ fontSize:13, color:T.textMid }}>{b.label}</span>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:b.val>0?b.color:T.textMuted }}>{ZAR(b.val)}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', fontWeight:700 }}>
            <span style={{ fontSize:13, color:T.forest }}>Total Outstanding</span>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:T.gold }}>{ZAR(Object.values(aging).reduce((s,v)=>s+v,0))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// QUOTES TAB
// ═════════════════════════════════════════════════════════════════════════════
const BLANK_QUOTE = {
  quoteNumber:'', date:today(), expiryDate:'', client:'', contactPerson:'',
  projectName:'', currency:'ZAR', exchangeRate:'18.60', notes:'',
  status:'Draft', items:[{ description:'', qty:1, unitPrice:0, total:0 }],
  discountPct:'0', applyVat:true, subtotal:0, discount:0, vat:0, total:0,
}

function Quotes({ quotes, setQuotes, clients, setInvoices, invoices }) {
  const [modal, setModal] = useState(false)
  const [editing, setEdit] = useState(null)
  const [form, setForm] = useState(BLANK_QUOTE)
  const [filter, setFilter] = useState('All')
  const F = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const safe = Array.isArray(quotes) ? quotes : []
  const safeC = Array.isArray(clients) ? clients : []

  const totals = useMemo(() => calcTotals(form.items, form.discountPct, form.applyVat), [form.items, form.discountPct, form.applyVat])

  const openNew = () => {
    setEdit(null)
    setForm({ ...BLANK_QUOTE, quoteNumber: nextQNum(safe), date: today() })
    setModal(true)
  }
  const openEdit = q => { setEdit(q.id); setForm({...q}); setModal(true) }
  const save = () => {
    const rec = { ...form, ...totals, id: editing!=null?editing:nextId(safe) }
    if (editing!=null) setQuotes(qq=>qq.map(q=>q.id===editing?rec:q))
    else               setQuotes(qq=>[...qq,rec])
    setModal(false)
  }
  const del = id => { if (!window.confirm('Delete this quote?')) return; setQuotes(qq=>qq.filter(q=>q.id!==id)) }

  const convertToInvoice = useCallback(q => {
    if (!window.confirm(`Convert quote ${q.quoteNumber} to invoice?`)) return
    const inv = {
      ...q,
      id:            nextId(Array.isArray(invoices)?invoices:[]),
      invoiceNumber: nextInvNum(Array.isArray(invoices)?invoices:[]),
      quoteRef:      q.quoteNumber,
      status:        'Draft',
      issueDate:     today(),
      dueDate:       '',
      amountPaid:    0,
      outstanding:   q.total,
      paymentDate:   '',
      paymentNotes:  '',
    }
    delete inv.quoteNumber; delete inv.expiryDate
    setInvoices(ii=>[...(Array.isArray(ii)?ii:[]),inv])
    setQuotes(qq=>qq.map(q2=>q2.id===q.id?{...q2,status:'Accepted'}:q2))
    window.alert(`Invoice ${inv.invoiceNumber} created from quote ${q.quoteNumber}.`)
  }, [invoices, setInvoices, setQuotes])

  const visible = filter==='All' ? safe : safe.filter(q=>q.status===filter)
  const pipeline = safe.filter(q=>q.status==='Sent'||q.status==='Draft').reduce((s,q)=>s+safeAmount(q.total),0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:13, color:T.textMid }}>{safe.length} quotes · Pipeline: <strong style={{color:T.teal}}>{ZAR(pipeline)}</strong></div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ New Quote</button>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {['All',...QUOTE_STATUSES].map(s => (
          <button key={s} className={`bp-fbtn ${filter===s?'active':''}`} onClick={()=>setFilter(s)}>{s}</button>
        ))}
      </div>

      {visible.length===0 ? (
        <div className="empty-st"><div className="empty-ic">◻</div><div>No quotes yet. Create your first quote.</div></div>
      ) : (
        <div className="g-card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Quote #</th><th>Date</th><th>Client</th><th>Project</th><th>Total</th><th>Status</th><th style={{width:130}}></th></tr></thead>
              <tbody>
                {visible.map(q => (
                  <tr key={q.id}>
                    <td style={{fontFamily:'monospace',fontSize:12,color:T.teal}}>{q.quoteNumber}</td>
                    <td style={{fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(q.date)}</td>
                    <td style={{fontSize:13}}>{q.client||'—'}</td>
                    <td style={{fontSize:12,color:T.textMid}}>{q.projectName||'—'}</td>
                    <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:T.forest,whiteSpace:'nowrap'}}>{ZAR(q.total)}</td>
                    <td><Badge label={q.status}/></td>
                    <td>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        <button className="btn btn-outline btn-xs" onClick={()=>openEdit(q)}>Edit</button>
                        <button className="btn btn-outline btn-xs" style={{color:T.teal,borderColor:T.teal}} onClick={()=>convertToInvoice(q)} title="Convert to Invoice">→ Inv</button>
                        <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>del(q.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title={editing!=null?`Edit ${form.quoteNumber}`:'New Quote'} size="modal-xl"
        footer={<><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Quote</button></>}
      >
        <div className="form-grid" style={{marginBottom:16}}>
          <div className="form-field"><label>Quote Number</label><input value={form.quoteNumber} onChange={F('quoteNumber')} /></div>
          <div className="form-field"><label>Date</label><input type="date" value={form.date} onChange={F('date')} /></div>
          <div className="form-field"><label>Expiry Date</label><input type="date" value={form.expiryDate||''} onChange={F('expiryDate')} /></div>
          <div className="form-field">
            <label>Status</label>
            <select value={form.status} onChange={F('status')}>{QUOTE_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
          </div>
          <div className="form-field">
            <label>Client</label>
            <select value={form.client||''} onChange={F('client')}>
              <option value="">— Select client —</option>
              {safeC.map(c=><option key={c.id} value={c.company}>{c.company}</option>)}
              <option value="__custom">Other (type below)</option>
            </select>
          </div>
          <div className="form-field"><label>Contact Person</label><input value={form.contactPerson||''} onChange={F('contactPerson')} /></div>
          <div className="form-field full"><label>Project Name</label><input value={form.projectName||''} onChange={F('projectName')} placeholder="e.g. Mediclinic Stellenbosch — Lobby Greenery" /></div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')} style={{minHeight:50}} /></div>
        </div>

        <div className="sec-label" style={{marginBottom:8}}>Line Items</div>
        <LineItems items={form.items||[]} onChange={items=>setForm(f=>({...f,items}))} />

        <div style={{display:'flex',gap:16,marginTop:16,flexWrap:'wrap',alignItems:'flex-start'}}>
          <div style={{flex:1,minWidth:180}}>
            <div className="form-field">
              <label>Discount %</label>
              <input type="text" inputMode="decimal" value={form.discountPct||'0'} onChange={F('discountPct')} />
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
              <input type="checkbox" id="vat-q" checked={!!form.applyVat} onChange={e=>setForm(f=>({...f,applyVat:e.target.checked}))} />
              <label htmlFor="vat-q" style={{fontSize:12,color:T.textMid,cursor:'pointer'}}>Apply 15% VAT</label>
            </div>
          </div>
          <div style={{minWidth:200}}>
            {[
              ['Subtotal',   ZAR(totals.subtotal)],
              ...(totals.discount>0?[['Discount',  `-${ZAR(totals.discount)}`]]:[]),
              ...(form.applyVat?[['VAT (15%)',   ZAR(totals.vat)]]:[]),
              ['TOTAL',     ZAR(totals.total)],
            ].map(([k,v],i,arr)=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid rgba(210,200,184,0.35)`,fontWeight:i===arr.length-1?700:400}}>
                <span style={{fontSize:13,color:T.textMid}}>{k}</span>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:i===arr.length-1?18:15,color:i===arr.length-1?T.gold:T.forest}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// INVOICES TAB
// ═════════════════════════════════════════════════════════════════════════════
const BLANK_INV = {
  invoiceNumber:'', issueDate:today(), dueDate:'', client:'', contactPerson:'',
  projectName:'', quoteRef:'', notes:'', status:'Draft',
  items:[{ description:'', qty:1, unitPrice:0, total:0 }],
  discountPct:'0', applyVat:true, subtotal:0, discount:0, vat:0, total:0,
  amountPaid:0, outstanding:0, paymentDate:'', paymentNotes:'',
}

function Invoices({ invoices, setInvoices, clients }) {
  const [modal, setModal] = useState(false)
  const [editing, setEdit] = useState(null)
  const [form, setForm] = useState(BLANK_INV)
  const [filter, setFilter] = useState('All')
  const F = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const safe  = Array.isArray(invoices) ? invoices : []
  const safeC = Array.isArray(clients)  ? clients  : []

  const totals = useMemo(() => calcTotals(form.items, form.discountPct, form.applyVat), [form.items, form.discountPct, form.applyVat])

  const openNew = () => {
    setEdit(null)
    setForm({ ...BLANK_INV, invoiceNumber: nextInvNum(safe), issueDate: today() })
    setModal(true)
  }
  const openEdit = inv => { setEdit(inv.id); setForm({...inv}); setModal(true) }
  const save = () => {
    const outstanding = totals.total - parseNum(form.amountPaid)
    const status = parseNum(form.amountPaid) >= totals.total ? 'Paid' : parseNum(form.amountPaid) > 0 ? 'Partially Paid' : form.status
    const rec = { ...form, ...totals, outstanding, status, id: editing!=null?editing:nextId(safe) }
    if (editing!=null) setInvoices(ii=>ii.map(i=>i.id===editing?rec:i))
    else               setInvoices(ii=>[...ii,rec])
    setModal(false)
  }
  const del = id => { if (!window.confirm('Delete this invoice?')) return; setInvoices(ii=>ii.filter(i=>i.id!==id)) }
  const markPaid = inv => setInvoices(ii=>ii.map(i=>i.id===inv.id?{...i,status:'Paid',amountPaid:i.total,outstanding:0,paymentDate:today()}:i))

  const visible = filter==='All' ? safe : safe.filter(i=>i.status===filter)
  const totalOutstanding = safe.filter(i=>['Sent','Partially Paid','Overdue'].includes(i.status)).reduce((s,i)=>s+safeAmount(i.outstanding),0)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <div style={{fontSize:13,color:T.textMid}}>{safe.length} invoices · Outstanding: <strong style={{color:T.gold}}>{ZAR(totalOutstanding)}</strong></div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ New Invoice</button>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {['All',...INVOICE_STATUSES].map(s=>(
          <button key={s} className={`bp-fbtn ${filter===s?'active':''}`} onClick={()=>setFilter(s)}>{s}</button>
        ))}
      </div>

      {visible.length===0 ? (
        <div className="empty-st"><div className="empty-ic">◻</div><div>No invoices yet.</div></div>
      ) : (
        <div className="g-card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice #</th><th>Date</th><th>Due</th><th>Client</th><th>Total</th><th>Outstanding</th><th>Status</th><th style={{width:120}}></th></tr></thead>
              <tbody>
                {visible.map(inv => (
                  <tr key={inv.id}>
                    <td style={{fontFamily:'monospace',fontSize:12,color:T.teal}}>{inv.invoiceNumber}</td>
                    <td style={{fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(inv.issueDate)}</td>
                    <td style={{fontSize:12,whiteSpace:'nowrap',color:inv.status==='Overdue'?T.danger:undefined}}>{fmtDate(inv.dueDate)||'—'}</td>
                    <td style={{fontSize:13}}>{inv.client||'—'}</td>
                    <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,whiteSpace:'nowrap'}}>{ZAR(inv.total)}</td>
                    <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:safeAmount(inv.outstanding)>0?T.gold:T.green,whiteSpace:'nowrap'}}>{ZAR(safeAmount(inv.outstanding))}</td>
                    <td><Badge label={inv.status}/></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-outline btn-xs" onClick={()=>openEdit(inv)}>Edit</button>
                        {inv.status!=='Paid' && <button className="btn btn-outline btn-xs" style={{color:T.green,borderColor:T.green}} onClick={()=>markPaid(inv)}>✓ Paid</button>}
                        <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>del(inv.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title={editing!=null?`Edit ${form.invoiceNumber}`:'New Invoice'} size="modal-xl"
        footer={<><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Invoice</button></>}
      >
        <div className="form-grid" style={{marginBottom:16}}>
          <div className="form-field"><label>Invoice Number</label><input value={form.invoiceNumber} onChange={F('invoiceNumber')} /></div>
          <div className="form-field"><label>Issue Date</label><input type="date" value={form.issueDate} onChange={F('issueDate')} /></div>
          <div className="form-field"><label>Due Date</label><input type="date" value={form.dueDate||''} onChange={F('dueDate')} /></div>
          <div className="form-field">
            <label>Status</label>
            <select value={form.status} onChange={F('status')}>{INVOICE_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
          </div>
          <div className="form-field">
            <label>Client</label>
            <select value={form.client||''} onChange={F('client')}>
              <option value="">— Select client —</option>
              {safeC.map(c=><option key={c.id} value={c.company}>{c.company}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Contact Person</label><input value={form.contactPerson||''} onChange={F('contactPerson')} /></div>
          <div className="form-field full"><label>Project Name</label><input value={form.projectName||''} onChange={F('projectName')} /></div>
          <div className="form-field"><label>Quote Reference</label><input value={form.quoteRef||''} onChange={F('quoteRef')} placeholder="e.g. BL-Q-2026-001" /></div>
          <div className="form-field"><label>Amount Paid (ZAR)</label><input type="text" inputMode="decimal" value={String(form.amountPaid||'')} onChange={F('amountPaid')} placeholder="0" /></div>
          <div className="form-field"><label>Payment Date</label><input type="date" value={form.paymentDate||''} onChange={F('paymentDate')} /></div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')} style={{minHeight:44}} /></div>
        </div>
        <div className="sec-label" style={{marginBottom:8}}>Line Items</div>
        <LineItems items={form.items||[]} onChange={items=>setForm(f=>({...f,items}))} />
        <div style={{display:'flex',gap:16,marginTop:16,flexWrap:'wrap',alignItems:'flex-start'}}>
          <div style={{flex:1,minWidth:180}}>
            <div className="form-field">
              <label>Discount %</label>
              <input type="text" inputMode="decimal" value={form.discountPct||'0'} onChange={F('discountPct')} />
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
              <input type="checkbox" id="vat-i" checked={!!form.applyVat} onChange={e=>setForm(f=>({...f,applyVat:e.target.checked}))} />
              <label htmlFor="vat-i" style={{fontSize:12,color:T.textMid,cursor:'pointer'}}>Apply 15% VAT</label>
            </div>
          </div>
          <div style={{minWidth:200}}>
            {[
              ['Subtotal', ZAR(totals.subtotal)],
              ...(totals.discount>0?[['Discount',`-${ZAR(totals.discount)}`]]:[]),
              ...(form.applyVat?[['VAT (15%)', ZAR(totals.vat)]]:[]),
              ['Invoice Total', ZAR(totals.total)],
              ['Amount Paid', ZAR(parseNum(form.amountPaid))],
              ['Outstanding', ZAR(totals.total - parseNum(form.amountPaid))],
            ].map(([k,v],i,arr)=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid rgba(210,200,184,0.35)`,fontWeight:i>=arr.length-2?700:400}}>
                <span style={{fontSize:13,color:T.textMid}}>{k}</span>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:i>=arr.length-2?17:15,color:i===arr.length-1?T.gold:T.forest}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPENSES TAB  — with document upload, preview and download
// ═════════════════════════════════════════════════════════════════════════════
const BLANK_EXP = {
  supplier:'', category:'Samples', project:'', date:today(),
  amount:'', vat:'', reference:'', notes:'', receipt:'',
  // document fields — stored on the expense record
  docId:null, docName:'', docStoragePath:'', docPublicUrl:'',
}

function Expenses({ expenses, setExpenses, suppliers, documents, finance }) {
  const [modal,     setModal]     = useState(false)
  const [editing,   setEdit]      = useState(null)
  const [form,      setForm]      = useState(BLANK_EXP)
  const [filterCat, setFilterCat] = useState('All')
  const [preview,      setPreview]      = useState(null)   // expense record to preview doc for
  const [docBrowser,   setDocBrowser]   = useState(null)   // expense id to link existing doc to
  const [uploading,    setUploading]    = useState(false)
  const safeDocs = Array.isArray(documents) ? documents : []
  // Documents that are likely expense invoices (category=Invoices or uploaded via Finance Centre)
  const linkableDocs = safeDocs.filter(d =>
    d.category === 'Invoices' || d.category === 'Business Expense' ||
    d.fileType === 'pdf' || d.fileType === 'jpg' || d.fileType === 'jpeg' || d.fileType === 'png'
  )
  const fileRef = useRef()
  const F = k => e => setForm(f=>({...f,[k]:e.target.value}))
  const safe  = Array.isArray(expenses)  ? expenses  : []
  const safeS = Array.isArray(suppliers) ? suppliers : []

  const openNew  = () => { setEdit(null); setForm({...BLANK_EXP,date:today()}); setModal(true) }
  const openEdit = e  => { setEdit(e.id); setForm({...e, amount:String(e.amount||''), vat:String(e.vat||'')}); setModal(true) }
  const save = () => {
    if (!form.date || parseNum(form.amount) <= 0) return
    const rec = { ...BLANK_EXP, ...form, id: editing!=null?editing:nextId(safe), amount:parseNum(form.amount), vat:parseNum(form.vat||0) }
    if (editing!=null) setExpenses(ee=>ee.map(e=>e.id===editing?rec:e))
    else               setExpenses(ee=>[...ee,rec])
    setModal(false)
  }
  const del = id => {
    if (!window.confirm('Delete this expense?')) return
    setExpenses(ee=>ee.filter(e=>e.id!==id))
  }

  // ── Document upload for an expense ─────────────────────────────────────────
  const handleDocUpload = async (expId, file) => {
    if (!file) return
    setUploading(true)
    const docKey = `exp-${expId}-${Date.now()}`
    try {
      await storeFile(docKey, file)
      let storagePath = '', publicUrl = ''
      if (SUPABASE_CONFIGURED) {
        try {
          const sbDoc = await uploadDocument(file, { category:'Invoices', localDocId:docKey })
          storagePath = sbDoc.storage_path || ''
          publicUrl   = sbDoc.public_url   || ''
          // Re-store under Supabase ID too
          if (sbDoc.id) await storeFile(sbDoc.id, file)
        } catch (e) { console.warn('[Expenses] Supabase upload failed, keeping local:', e.message) }
      }
      setExpenses(ee => ee.map(e => e.id===expId ? {
        ...e,
        docId:          storagePath || docKey,
        docName:        file.name,
        docStoragePath: storagePath,
        docPublicUrl:   publicUrl,
      } : e))
    } catch (e) { alert(`Upload failed: ${e.message}`) }
    setUploading(false)
  }

  // ── Inline file picker per row ──────────────────────────────────────────────
  const triggerUpload = (expId) => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx'
    input.onchange = e => { if (e.target.files[0]) handleDocUpload(expId, e.target.files[0]) }
    input.click()
  }

  // Link an existing document from Documents module to an expense (no duplication)
  const linkExistingDoc = (expId, doc) => {
    setExpenses(ee => ee.map(e => e.id === expId ? {
      ...e,
      docId:          doc.supabaseId || doc.id || doc.storagePath || '',
      docName:        doc.fileName || doc.name || '',
      docStoragePath: doc.storagePath || '',
      docPublicUrl:   doc.publicUrl  || '',
    } : e))
    setDocBrowser(null)
  }

  const visible = filterCat==='All' ? safe : safe.filter(e=>e.category===filterCat)
  const totalSpend = safe.reduce((s,e)=>s+safeAmount(e.amount),0)
  const byCat = EXPENSE_CATEGORIES.reduce((m,cat)=>({...m,[cat]:safe.filter(e=>e.category===cat).reduce((s,e)=>s+safeAmount(e.amount),0)}),{})

  // Diagnostic: expenses with totals but no linked docs
  const missingDocs = safe.filter(e => safeAmount(e.amount) > 0 && !e.docId && !e.docName)
  if (missingDocs.length > 0) {
    console.log(`[Expenses diagnostic] ${missingDocs.length} expense(s) have no linked document:`,
      missingDocs.map(e => `${e.date} ${e.supplier} ${e.amount}`))
  }

  return (
    <div>
      {/* Migration panel — shows Finance Centre records available to import */}
      <MigrationPanel finance={finance} expenses={expenses} setExpenses={setExpenses} />

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <div style={{fontSize:13,color:T.textMid}}>
          {safe.length} expense{safe.length!==1?'s':''} · Total: <strong style={{color:T.red}}>{ZAR(totalSpend)}</strong>
          {missingDocs.length > 0 && (
            <span style={{marginLeft:10,fontSize:11,color:T.gold}}>
              ⚠ {missingDocs.length} without attached document
            </span>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Expense</button>
      </div>

      {/* Category filter pills */}
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        <button className={`bp-fbtn ${filterCat==='All'?'active':''}`} onClick={()=>setFilterCat('All')}>All</button>
        {EXPENSE_CATEGORIES.filter(c=>byCat[c]>0).map(c=>(
          <button key={c} className={`bp-fbtn ${filterCat===c?'active':''}`} onClick={()=>setFilterCat(filterCat===c?'All':c)}>
            {c} ({ZAR(byCat[c])})
          </button>
        ))}
      </div>

      {visible.length===0 ? (
        <div className="empty-st"><div className="empty-ic">◈</div><div>No expenses yet. Add an expense to get started.</div></div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {visible.map(e => (
            <div key={e.id} className="doc-card" style={{flexWrap:'wrap',gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:3,flexWrap:'wrap'}}>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:T.red,whiteSpace:'nowrap'}}>{ZAR(safeAmount(e.amount))}</span>
                  <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:T.goldPale,color:T.gold}}>{e.category}</span>
                  {e.project && <span style={{fontSize:11,color:T.teal}}>📋 {e.project}</span>}
                </div>
                <div style={{fontSize:12,color:T.textMid}}>
                  {e.date} {e.supplier && `· ${e.supplier}`} {e.reference && `· Ref: ${e.reference}`}
                </div>
                {e.notes && <div style={{fontSize:11,color:T.textLight,marginTop:2}}>{e.notes}</div>}

                {/* Document row */}
                <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap',alignItems:'center'}}>
                  {e.docId || e.docName ? (
                    <>
                      <span style={{fontSize:10,color:T.green,fontWeight:600}}>📎 {e.docName||'Document attached'}</span>
                      <button className="btn btn-outline btn-xs" onClick={()=>setPreview(e)}>👁 Preview</button>
                      <button className="btn btn-outline btn-xs" onClick={async()=>{
                        const idbKey = e.docId || e.docName
                        const ok = await downloadFileById(idbKey, e.docName||'expense-doc')
                        if (!ok && (e.docStoragePath || e.docPublicUrl)) {
                          try {
                            const {url} = await getDocumentUrl({id:e.docId,storage_path:e.docStoragePath,public_url:e.docPublicUrl})
                            const a=document.createElement('a'); a.href=url; a.download=e.docName||'expense-doc'; a.click()
                          } catch(err){ alert('Download failed: '+err.message) }
                        } else if (!ok) { alert('Document not available locally. It may need to be re-uploaded.') }
                      }}>⬇</button>
                    </>
                  ) : (
                    <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                      <button className="btn btn-outline btn-xs" style={{color:T.textLight,borderStyle:'dashed'}}
                        onClick={()=>triggerUpload(e.id)} disabled={uploading}>
                        {uploading?'Uploading…':'📎 Upload invoice'}
                      </button>
                      {linkableDocs.length > 0 && (
                        <button className="btn btn-outline btn-xs" style={{color:T.teal,borderStyle:'dashed'}}
                          onClick={()=>setDocBrowser(e.id)}>
                          🔗 Link from Documents
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{display:'flex',gap:4,flexShrink:0}}>
                <button className="btn btn-outline btn-xs" onClick={()=>openEdit(e)}>Edit</button>
                <button className="btn btn-xs btn-ghost" style={{color:T.textLight}} onClick={()=>del(e.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document browser — link existing document to expense */}
      {docBrowser && (
        <div className="modal-overlay" onClick={()=>setDocBrowser(null)}>
          <div className="modal" style={{width:'min(96vw,640px)',maxHeight:'80vh',display:'flex',flexDirection:'column',padding:0}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'16px 22px',borderBottom:`1px solid rgba(210,200,184,0.5)`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.forest}}>Link Document to Expense</div>
                <div style={{fontSize:12,color:T.textMid,marginTop:2}}>Select a document already stored in the system. No duplication — one file, linked here.</div>
              </div>
              <button className="modal-close" onClick={()=>setDocBrowser(null)}>✕</button>
            </div>
            <div style={{flex:1,overflow:'auto',padding:14}}>
              {linkableDocs.length === 0 ? (
                <div className="empty-st"><div>No documents found in the system yet.</div></div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {linkableDocs.map(doc => (
                    <div key={doc.id||doc.supabaseId} className="doc-card" style={{cursor:'pointer'}}
                      onClick={()=>linkExistingDoc(docBrowser, doc)}>
                      <div style={{fontSize:22,flexShrink:0}}>
                        {(doc.fileType||'').toLowerCase()==='pdf'?'📄':'🖼'}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:600,color:T.forest,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {doc.fileName||doc.name||'Unnamed document'}
                        </div>
                        <div style={{fontSize:11,color:T.textMid}}>
                          {doc.category} · {doc.dateUploaded||doc.date||''} · {doc.fileSize||''}
                          {doc.storageBackend==='supabase' && <span style={{color:T.green,marginLeft:6,fontWeight:600}}>☁ Cloud</span>}
                        </div>
                        {doc.supplier && <div style={{fontSize:11,color:T.textLight}}>Supplier: {doc.supplier}</div>}
                      </div>
                      <button className="btn btn-primary btn-xs">Link →</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expense form modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing!=null?'Edit Expense':'Add Expense'}
        footer={<><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
      >
        <div className="form-grid">
          <div className="form-field"><label>Date</label><input type="date" value={form.date} onChange={F('date')} /></div>
          <div className="form-field">
            <label>Category</label>
            <select value={form.category} onChange={F('category')}>{EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
          </div>
          <div className="form-field">
            <label>Supplier</label>
            <select value={form.supplier||''} onChange={F('supplier')}>
              <option value="">— Select or type —</option>
              {safeS.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-field"><label>Project</label><input value={form.project||''} onChange={F('project')} placeholder="Optional" /></div>
          <div className="form-field"><label>Amount (ZAR) *</label><input type="text" inputMode="decimal" value={form.amount||''} onChange={F('amount')} placeholder="0" /></div>
          <div className="form-field"><label>VAT (ZAR)</label><input type="text" inputMode="decimal" value={form.vat||''} onChange={F('vat')} placeholder="0" /></div>
          <div className="form-field"><label>Reference / Invoice #</label><input value={form.reference||''} onChange={F('reference')} /></div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')} /></div>
        </div>
      </Modal>

      {/* Expense document preview modal */}
      {preview && (
        <div className="modal-overlay" onClick={()=>setPreview(null)}>
          <div className="modal modal-xl" style={{maxHeight:'92vh',display:'flex',flexDirection:'column',padding:0,width:'min(96vw,900px)'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'16px 22px',borderBottom:`1px solid rgba(210,200,184,0.5)`,display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.forest}}>
                  {preview.docName || 'Expense Document'}
                </div>
                <div style={{fontSize:12,color:T.textMid,marginTop:2}}>
                  {preview.category} · {preview.date} · {ZAR(safeAmount(preview.amount))}
                </div>
              </div>
              <button className="modal-close" onClick={()=>setPreview(null)}>✕</button>
            </div>
            <div style={{flex:1,overflow:'auto',padding:16,minHeight:0}}>
              <DocPreview
                doc={{
                  id:           preview.docId,
                  supabaseId:   preview.docId,
                  storage_path: preview.docStoragePath||null,
                  public_url:   preview.docPublicUrl||null,
                  file_name:    preview.docName||'document',
                  file_type:    (preview.docName||'').split('.').pop().toLowerCase(),
                }}
                showDebug={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PROFITABILITY TAB
// ═════════════════════════════════════════════════════════════════════════════
function Profitability({ invoices, expenses }) {
  const safeI = Array.isArray(invoices) ? invoices : []
  const safeE = Array.isArray(expenses) ? expenses : []

  // Group by project
  const projects = useMemo(() => {
    const projectNames = new Set([
      ...safeI.map(i=>i.projectName).filter(Boolean),
      ...safeE.map(e=>e.project).filter(Boolean),
    ])
    return Array.from(projectNames).map(name => {
      const revenue = safeI.filter(i=>i.projectName===name&&(i.status==='Paid'||i.status==='Partially Paid')).reduce((s,i)=>s+safeAmount(i.amountPaid),0)
      const invoiced = safeI.filter(i=>i.projectName===name).reduce((s,i)=>s+safeAmount(i.total),0)
      const costs    = safeE.filter(e=>e.project===name).reduce((s,e)=>s+safeAmount(e.amount),0)
      const gross    = revenue - costs
      const margin   = revenue > 0 ? (gross/revenue)*100 : 0
      return { name, revenue, invoiced, costs, gross, margin }
    }).sort((a,b)=>b.gross-a.gross)
  }, [safeI, safeE])

  const totalRevenue = projects.reduce((s,p)=>s+p.revenue,0)
  const totalCosts   = projects.reduce((s,p)=>s+p.costs,0)
  const totalGross   = totalRevenue - totalCosts
  const totalMargin  = totalRevenue > 0 ? (totalGross/totalRevenue)*100 : 0

  return (
    <div>
      <div className="grid-4" style={{marginBottom:20}}>
        {[
          { label:'Total Revenue',    val:ZAR(totalRevenue), color:T.green },
          { label:'Total Costs',      val:ZAR(totalCosts),   color:T.red },
          { label:'Gross Profit',     val:ZAR(totalGross),   color:totalGross>=0?T.forestLight:T.danger },
          { label:'Average Margin',   val:`${totalMargin.toFixed(1)}%`, color:totalMargin>=40?T.green:totalMargin>=20?T.gold:T.danger },
        ].map(k=>(
          <div key={k.label} className="stat-card">
            <div className="stat-label">{k.label}</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:k.color,lineHeight:1,marginTop:6}}>{k.val}</div>
          </div>
        ))}
      </div>

      {projects.length===0 ? (
        <div className="empty-st"><div className="empty-ic">◈</div><div>Add project names to invoices and expenses to see profitability by project.</div></div>
      ) : (
        <div className="g-card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Project</th><th>Invoiced</th><th>Revenue Received</th><th>Costs</th><th>Gross Profit</th><th>Margin %</th><th style={{width:120}}>Margin</th></tr></thead>
              <tbody>
                {projects.map(p=>(
                  <tr key={p.name}>
                    <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:T.forest}}>{p.name}</td>
                    <td style={{fontSize:13,color:T.textMid,whiteSpace:'nowrap'}}>{ZAR(p.invoiced)}</td>
                    <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:T.green,whiteSpace:'nowrap'}}>{ZAR(p.revenue)}</td>
                    <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:T.red,whiteSpace:'nowrap'}}>{ZAR(p.costs)}</td>
                    <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:p.gross>=0?T.forestLight:T.danger,whiteSpace:'nowrap'}}>{ZAR(p.gross)}</td>
                    <td style={{fontSize:13,fontWeight:700,color:p.margin>=40?T.green:p.margin>=20?T.gold:T.danger,whiteSpace:'nowrap'}}>{p.margin.toFixed(1)}%</td>
                    <td>
                      <div className="pbar">
                        <div className="pbar-fill pbar-gold" style={{width:`${Math.min(100,Math.max(0,p.margin))}%`,background:p.margin>=40?`linear-gradient(90deg,${T.green},${T.forestLight})`:undefined}}/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN FINANCIAL HUB
// ═════════════════════════════════════════════════════════════════════════════
export default function FinancialHub({ quotes, setQuotes, invoices, setInvoices, expenses, setExpenses, finance, clients, suppliers, documents }) {
  const [tab, setTab] = useState('overview')

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Financial Hub</div>
          <div className="page-subtitle">Quotes · Invoices · Expenses · Profitability</div>
        </div>
      </div>

      <div className="page-content">
        <div className="tabs">
          {[
            { id:'overview',       label:'Overview' },
            { id:'quotes',         label:'Quotes' },
            { id:'invoices',       label:'Invoices' },
            { id:'expenses',       label:'Expenses' },
            { id:'profitability',  label:'Profitability' },
          ].map(t=>(
            <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        {tab==='overview'      && <Overview quotes={quotes} invoices={invoices} expenses={expenses} finance={finance} />}
        {tab==='quotes'        && <Quotes quotes={quotes} setQuotes={setQuotes} clients={clients} invoices={invoices} setInvoices={setInvoices} />}
        {tab==='invoices'      && <Invoices invoices={invoices} setInvoices={setInvoices} clients={clients} />}
        {tab==='expenses'      && <Expenses expenses={expenses} setExpenses={setExpenses} suppliers={suppliers} documents={documents} finance={finance} />}
        {tab==='profitability' && <Profitability invoices={invoices} expenses={expenses} />}
      </div>
    </div>
  )
}
