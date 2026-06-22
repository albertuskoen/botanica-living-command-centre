// Invoices.jsx — v2.4
import { useState, useCallback, useMemo, useEffect } from 'react'
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
  discount:'', items:[ { ...BLANK_ITEM } ],
  sourceQuoteId: null,
}

const STATUS_COLORS = { Draft:T.textMid, Sent:T.gold, 'Partially Paid':T.teal, Paid:T.green, Overdue:T.danger }
const STATUS_BG     = { Draft:'rgba(161,161,170,0.1)', Sent:T.goldPale, 'Partially Paid':T.tealPale, Paid:T.greenPale, Overdue:T.redPale }

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
  const diff = Math.floor((Date.now() - new Date(dueDate)) / 86400000)
  return Math.max(0, diff)
}

function agingBucket(inv) {
  if (inv.status === 'Paid') return 'Paid'
  const days = daysOverdue(inv.dueDate)
  if (days <= 0)  return 'Current'
  if (days <= 30) return '1–30 Days'
  if (days <= 60) return '31–60 Days'
  if (days <= 90) return '61–90 Days'
  return '90+ Days'
}

export default function Invoices({ invoices, setInvoices, clients }) {
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(BLANK)
  const [filter,  setFilter]  = useState('All')
  const [tab,     setTab]     = useState('invoices') // invoices | aging
  const [search,  setSearch]  = useState('')
  const [errors,  setErrors]  = useState({})

  const safe  = useMemo(() => Array.isArray(invoices) ? invoices : [], [invoices])
  const safeC = Array.isArray(clients) ? clients : []

  // Listen for quote-to-invoice conversion
  useEffect(() => {
    const handler = () => {
      const stored = sessionStorage.getItem('bl_quote_to_invoice')
      if (!stored) return
      try {
        const q = JSON.parse(stored)
        sessionStorage.removeItem('bl_quote_to_invoice')
        const n = safe.length + 1
        const dueD = new Date()
        dueD.setDate(dueD.getDate() + 30)
        setEditing(null)
        setForm({
          ...BLANK,
          number: `INV-${String(n).padStart(4,'0')}`,
          date: today(),
          dueDate: dueD.toISOString().split('T')[0],
          client: q.client || '',
          contactPerson: q.contactPerson || '',
          projectName: q.projectName || '',
          notes: q.notes || '',
          discount: q.discount || '',
          items: q.items || [{ ...BLANK_ITEM }],
          sourceQuoteId: q.id,
          status: 'Draft',
        })
        setModal(true)
      } catch {}
    }
    window.addEventListener('bl-navigate', handler)
    // Also check on mount
    const stored = sessionStorage.getItem('bl_quote_to_invoice')
    if (stored) handler()
    return () => window.removeEventListener('bl-navigate', handler)
  }, [safe.length])

  const openNew = () => {
    const n = safe.length + 1
    const dueD = new Date(); dueD.setDate(dueD.getDate() + 30)
    setEditing(null)
    setForm({ ...BLANK, number:`INV-${String(n).padStart(4,'0')}`, date:today(), dueDate:dueD.toISOString().split('T')[0], items:[{ ...BLANK_ITEM }] })
    setErrors({})
    setModal(true)
  }
  const openEdit = inv => { setEditing(inv.id); setForm({ ...inv }); setErrors({}); setModal(true) }
  const closeModal = () => { setModal(false); setErrors({}) }

  const setField = (k,v) => setForm(f => ({ ...f, [k]:v }))
  const setItem  = (i,k,v) => setForm(f => ({ ...f, items: (f.items||[]).map((it,idx) => idx===i ? { ...it,[k]:v } : it) }))
  const addItem    = () => setForm(f => ({ ...f, items: [...(f.items||[]), { ...BLANK_ITEM }] }))
  const removeItem = i  => setForm(f => ({ ...f, items: (f.items||[]).filter((_,idx) => idx!==i) }))

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
    const rec = { ...form, id: editing ?? nextId(safe), total, updatedAt: today() }
    if (editing != null) setInvoices(ii => (Array.isArray(ii)?ii:[]).map(i => i.id === editing ? rec : i))
    else                 setInvoices(ii => [...(Array.isArray(ii)?ii:[]), rec])
    setModal(false)
  }, [form, editing, safe, setInvoices])

  const del = id => {
    if (!window.confirm('Delete this invoice?')) return
    setInvoices(ii => (Array.isArray(ii)?ii:[]).filter(i => i.id !== id))
  }

  // Auto-flag overdue
  const enriched = useMemo(() => safe.map(inv => ({
    ...inv,
    status: inv.status !== 'Paid' && inv.status !== 'Draft' && inv.dueDate && inv.dueDate < today() ? 'Overdue' : inv.status
  })), [safe])

  const visible = useMemo(() => enriched.filter(i => {
    const matchStatus = filter === 'All' || i.status === filter
    const s = search.toLowerCase()
    const matchSearch = !s || [i.number,i.client,i.projectName].some(v => (v||'').toLowerCase().includes(s))
    return matchStatus && matchSearch
  }).sort((a,b) => (b.date||'').localeCompare(a.date||'')), [enriched, filter, search])

  const { subtotal, discount, vat, total } = calcTotals(form.items||[], form.discount)
  const amountPaid = parseNum(form.amountPaid)
  const outstanding = total - amountPaid

  // Aggregates
  const totalInvoiced    = enriched.reduce((s,i) => s + Number(i.total||0), 0)
  const totalPaid        = enriched.filter(i=>i.status==='Paid').reduce((s,i) => s + Number(i.total||0), 0)
  const totalOutstanding = enriched.filter(i=>i.status!=='Paid').reduce((s,i) => s + Number(i.total||0) - Number(i.amountPaid||0), 0)
  const overdueValue     = enriched.filter(i=>i.status==='Overdue').reduce((s,i) => s + Number(i.total||0) - Number(i.amountPaid||0), 0)

  // Aging
  const agingBuckets = useMemo(() => {
    const buckets = { Current:0, '1–30 Days':0, '31–60 Days':0, '61–90 Days':0, '90+ Days':0 }
    enriched.filter(i => i.status !== 'Paid').forEach(i => {
      const b = agingBucket(i)
      if (b !== 'Paid') buckets[b] = (buckets[b]||0) + (Number(i.total||0) - Number(i.amountPaid||0))
    })
    return Object.entries(buckets)
  }, [enriched])

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Invoices</div>
          <div className="page-subtitle">Accounts Receivable · Billing</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Invoice</button>
      </div>

      {/* Stats bar */}
      <div style={{ background:'rgba(15,26,20,0.70)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(255,255,255,0.07)`, padding:'14px 36px' }}>
        <div className="grid-4">
          {[
            { label:'Total Invoiced',   val:ZAR(totalInvoiced),    color:T.forest },
            { label:'Received',         val:ZAR(totalPaid),        color:T.green },
            { label:'Outstanding',      val:ZAR(totalOutstanding), color:T.teal },
            { label:'Overdue',          val:ZAR(overdueValue),     color:T.danger },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:22, color:s.color, lineHeight:1, marginTop:4 }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div className="tabs">
          {[{id:'invoices',label:'Invoices'},{id:'aging',label:'Aging Analysis'}].map(t => (
            <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        {tab === 'invoices' && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:220 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoices…" style={{ paddingLeft:36 }} />
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textLight, pointerEvents:'none' }}>⊙</span>
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {['All',...INVOICE_STATUSES].map(s => (
                  <button key={s} className={`bp-fbtn ${filter===s?'active':''}`} onClick={() => setFilter(s)}>{s}</button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="empty-st">
                <div className="empty-ic">▣</div>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:20, color:T.forest, marginBottom:8 }}>No invoices yet</div>
                <button className="btn btn-primary" onClick={openNew}>+ Create Invoice</button>
              </div>
            ) : (
              <div className="g-card" style={{ padding:0 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Invoice #</th><th>Date</th><th>Due</th><th>Client</th><th>Project</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Status</th><th style={{ width:100 }}></th></tr>
                    </thead>
                    <tbody>
                      {visible.map(inv => {
                        const paid = Number(inv.amountPaid||0)
                        const outs = Number(inv.total||0) - paid
                        return (
                          <tr key={inv.id}>
                            <td style={{ fontFamily:'monospace', fontSize:12, color:T.forest, fontWeight:600 }}>{inv.number}</td>
                            <td style={{ fontSize:12 }}>{fmtDate(inv.date)}</td>
                            <td style={{ fontSize:12, color: inv.status==='Overdue'?T.danger:T.textMid }}>{fmtDate(inv.dueDate)}</td>
                            <td className="td-name">{inv.client}</td>
                            <td style={{ fontSize:12, color:T.textMid }}>{inv.projectName||'—'}</td>
                            <td style={{ fontFamily:"'Manrope',sans-serif", fontSize:16, color:T.forest, whiteSpace:'nowrap' }}>{ZAR(inv.total||0)}</td>
                            <td style={{ fontFamily:"'Manrope',sans-serif", fontSize:15, color:T.green, whiteSpace:'nowrap' }}>{paid>0?ZAR(paid):'—'}</td>
                            <td style={{ fontFamily:"'Manrope',sans-serif", fontSize:15, color:outs>0?T.teal:T.textLight, whiteSpace:'nowrap' }}>{outs>0?ZAR(outs):'—'}</td>
                            <td>
                              <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:STATUS_BG[inv.status]||'rgba(161,161,170,0.1)', color:STATUS_COLORS[inv.status]||T.textMid }}>
                                {inv.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ display:'flex', gap:3 }}>
                                <button className="btn btn-outline btn-xs" onClick={() => openEdit(inv)}>Edit</button>
                                <button className="btn btn-xs btn-ghost" style={{ color:T.textLight }} onClick={() => del(inv.id)}>✕</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'aging' && (
          <div>
            <div className="sec-label">Accounts Receivable — Aging Analysis</div>
            <div className="grid-2" style={{ gap:16, marginBottom:24 }}>
              {agingBuckets.map(([bucket, val]) => (
                <div key={bucket} className="g-card" style={{ borderTop:`2px solid ${bucket==='Current'?T.green:bucket==='1–30 Days'?T.gold:bucket==='31–60 Days'?T.teal:T.danger}` }}>
                  <div className="stat-label">{bucket}</div>
                  <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:28, color:bucket==='Current'?T.green:bucket==='1–30 Days'?T.gold:bucket==='31–60 Days'?T.teal:T.danger, lineHeight:1, marginTop:4 }}>{ZAR(val)}</div>
                  <div style={{ fontSize:11, color:T.textLight, marginTop:6 }}>
                    {enriched.filter(i => i.status !== 'Paid' && agingBucket(i) === bucket).length} invoice(s)
                  </div>
                </div>
              ))}
            </div>
            <div className="g-card" style={{ padding:0 }}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Invoice #</th><th>Client</th><th>Invoice Date</th><th>Due Date</th><th>Days</th><th>Total</th><th>Outstanding</th><th>Bucket</th></tr></thead>
                  <tbody>
                    {enriched.filter(i => i.status !== 'Paid').map(inv => {
                      const days = daysOverdue(inv.dueDate)
                      const outs = Number(inv.total||0) - Number(inv.amountPaid||0)
                      const bucket = agingBucket(inv)
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontFamily:'monospace', fontSize:12 }}>{inv.number}</td>
                          <td className="td-name">{inv.client}</td>
                          <td style={{ fontSize:12 }}>{fmtDate(inv.date)}</td>
                          <td style={{ fontSize:12, color:days>0?T.danger:T.textMid }}>{fmtDate(inv.dueDate)}</td>
                          <td style={{ fontSize:12, color:days>0?T.danger:T.green }}>{days > 0 ? `${days}d` : 'Not due'}</td>
                          <td style={{ fontFamily:"'Manrope',sans-serif", fontSize:15 }}>{ZAR(inv.total||0)}</td>
                          <td style={{ fontFamily:"'Manrope',sans-serif", fontSize:15, color:T.teal }}>{ZAR(outs)}</td>
                          <td><span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:bucket==='Current'?T.greenPale:bucket==='1–30 Days'?T.goldPale:T.redPale, color:bucket==='Current'?T.green:bucket==='1–30 Days'?T.gold:T.danger }}>{bucket}</span></td>
                        </tr>
                      )
                    })}
                    {enriched.filter(i=>i.status!=='Paid').length === 0 && <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:T.textLight }}>No outstanding invoices.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={closeModal} title={editing != null ? 'Edit Invoice' : 'New Invoice'} size="modal-xl"
        footer={<>
          <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Invoice</button>
        </>}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {form.sourceQuoteId && <div style={{ padding:'8px 14px', background:T.greenPale, border:`1px solid rgba(21,128,61,0.2)`, borderRadius:8, fontSize:12, color:T.green }}>✓ Created from Quote</div>}

          <div className="form-grid">
            <div className="form-field"><label htmlFor="inv-num">Invoice Number</label><input id="inv-num" value={form.number||''} onChange={e=>setField('number',e.target.value)} placeholder="INV-0001" /></div>
            <div className="form-field"><label htmlFor="inv-date">Invoice Date</label><input id="inv-date" type="date" value={form.date||today()} onChange={e=>setField('date',e.target.value)} /></div>
            <div className="form-field"><label htmlFor="inv-due">Due Date</label><input id="inv-due" type="date" value={form.dueDate||''} onChange={e=>setField('dueDate',e.target.value)} /></div>
            <div className="form-field"><label htmlFor="inv-status">Status</label>
              <select id="inv-status" value={form.status||'Draft'} onChange={e=>setField('status',e.target.value)}>
                {INVOICE_STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field" style={{ borderColor:errors.client?T.danger:undefined }}>
              <label htmlFor="inv-client">Client <span style={{ color:T.danger }}>*</span></label>
              <input id="inv-client" value={form.client||''} onChange={e=>setField('client',e.target.value)} list="inv-clients-list" style={{ borderColor:errors.client?T.danger:undefined }} />
              <datalist id="inv-clients-list">{safeC.map(c=><option key={c.id} value={c.company}/>)}</datalist>
              {errors.client && <div style={{ fontSize:11, color:T.danger, marginTop:2 }}>{errors.client}</div>}
            </div>
            <div className="form-field"><label htmlFor="inv-proj">Project Name</label><input id="inv-proj" value={form.projectName||''} onChange={e=>setField('projectName',e.target.value)} /></div>
          </div>

          {/* Line items */}
          <div>
            <div className="sec-label">Line Items {errors.items && <span style={{ color:T.danger, fontWeight:400, textTransform:'none', letterSpacing:0 }}> — {errors.items}</span>}</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th style={{ minWidth:200 }}>Description</th><th style={{ width:80 }}>Qty</th><th style={{ width:130 }}>Unit Price</th><th style={{ width:130 }}>Total</th><th style={{ width:36 }}></th></tr></thead>
                <tbody>
                  {(form.items||[]).map((item,i) => {
                    const lineTotal = parseNum(item.unitPrice) * (Number(item.qty)||1)
                    return (
                      <tr key={i}>
                        <td><input value={item.description||''} onChange={e=>setItem(i,'description',e.target.value)} style={{ width:'100%', minHeight:36, fontSize:13, padding:'4px 8px' }} /></td>
                        <td><input type="text" inputMode="decimal" value={String(item.qty||1)} onChange={e=>setItem(i,'qty',e.target.value)} style={{ width:70, fontSize:13, padding:'4px 8px' }} /></td>
                        <td><input type="text" inputMode="decimal" value={String(item.unitPrice||'')} onChange={e=>setItem(i,'unitPrice',e.target.value)} placeholder="0.00" style={{ width:110, fontSize:13, padding:'4px 8px' }} /></td>
                        <td style={{ fontFamily:"'Manrope',sans-serif", fontSize:16, color:T.forest }}>{ZAR(lineTotal)}</td>
                        <td>{(form.items||[]).length > 1 && <button className="btn btn-ghost btn-xs" style={{ color:T.textLight }} onClick={()=>removeItem(i)}>✕</button>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <button className="btn btn-outline btn-sm" style={{ marginTop:8 }} onClick={addItem}>+ Add Line Item</button>
          </div>

          {/* Totals */}
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <div style={{ width:300 }}>
              {[
                { label:'Subtotal', val:ZAR(subtotal) },
                { label:'Discount', val:<input type="text" inputMode="decimal" value={form.discount||''} onChange={e=>setField('discount',e.target.value)} placeholder="0" style={{ width:100, fontSize:12, padding:'2px 8px', textAlign:'right' }} /> },
                { label:'VAT (15%)', val:ZAR(vat) },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:`1px solid rgba(255,255,255,0.07)`, fontSize:13 }}>
                  <span style={{ color:T.textMid }}>{r.label}</span><span>{r.val}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', fontSize:16, fontWeight:700 }}>
                <span style={{ color:T.forest }}>TOTAL</span>
                <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:22, color:T.forest }}>{ZAR(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment tracking */}
          <div style={{ background:'rgba(14,116,144,0.05)', border:`1px solid rgba(14,116,144,0.15)`, borderRadius:10, padding:16 }}>
            <div className="sec-label" style={{ marginBottom:12 }}>Payment Tracking</div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="inv-paid">Amount Paid (ZAR)</label>
                <input id="inv-paid" type="text" inputMode="decimal" value={form.amountPaid||''} onChange={e=>setField('amountPaid',e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-field">
                <label htmlFor="inv-paydate">Payment Date</label>
                <input id="inv-paydate" type="date" value={form.paymentDate||''} onChange={e=>setField('paymentDate',e.target.value)} />
              </div>
              <div className="form-field full">
                <label htmlFor="inv-paynotes">Payment Notes</label>
                <input id="inv-paynotes" value={form.paymentNotes||''} onChange={e=>setField('paymentNotes',e.target.value)} placeholder="Reference number, bank, etc." />
              </div>
            </div>
            {total > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, padding:'10px 0', borderTop:`1px solid rgba(14,116,144,0.15)` }}>
                <span style={{ fontSize:13, color:T.teal, fontWeight:600 }}>Outstanding Balance</span>
                <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:20, color:outstanding>0?T.teal:T.green }}>{ZAR(outstanding)}</span>
              </div>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="inv-notes">Notes</label>
            <textarea id="inv-notes" value={form.notes||''} onChange={e=>setField('notes',e.target.value)} placeholder="Payment terms, banking details, notes…" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
