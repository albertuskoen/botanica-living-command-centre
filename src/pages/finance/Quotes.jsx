// Quotes.jsx — v2.4
import { useState, useCallback, useMemo } from 'react'
import { T } from '../../utils/tokens.js'
import { ZAR, fmtDate, nextId, today, parseNum } from '../../utils/format.js'
import { QUOTE_STATUSES } from '../../utils/data.js'
import Modal from '../../components/Modal.jsx'

const VAT_RATE = 0.15
const BLANK_ITEM = { description:'', qty:1, unitPrice:'', total:0 }
const BLANK = {
  number:'', date: today(), client:'', contactPerson:'', projectName:'',
  notes:'', currency:'ZAR', exchangeRate:'18.60', status:'Draft',
  discount:'', items:[ { ...BLANK_ITEM } ],
}

const STATUS_COLORS = { Draft:T.textMid, Sent:T.gold, Accepted:T.green, Rejected:T.danger, Expired:T.textLight }
const STATUS_BG     = { Draft:'rgba(161,161,170,0.1)', Sent:T.goldPale, Accepted:T.greenPale, Rejected:T.redPale, Expired:'rgba(161,161,170,0.08)' }

function calcTotals(items, discountRaw) {
  const subtotal  = items.reduce((s,i) => s + (parseNum(i.unitPrice) * (Number(i.qty)||1)), 0)
  const discount  = parseNum(discountRaw)
  const afterDisc = subtotal - discount
  const vat       = afterDisc * VAT_RATE
  const total     = afterDisc + vat
  return { subtotal, discount, afterDisc, vat, total }
}

export default function Quotes({ quotes, setQuotes, clients }) {
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(BLANK)
  const [filter,  setFilter]  = useState('All')
  const [search,  setSearch]  = useState('')
  const [errors,  setErrors]  = useState({})

  const safe    = useMemo(() => Array.isArray(quotes) ? quotes : [], [quotes])
  const safeC   = Array.isArray(clients) ? clients : []

  const openNew = () => {
    const n = safe.length + 1
    setEditing(null)
    setForm({ ...BLANK, number:`QT-${String(n).padStart(4,'0')}`, date:today(), items:[{ ...BLANK_ITEM }] })
    setErrors({})
    setModal(true)
  }
  const openEdit = q => { setEditing(q.id); setForm({ ...q }); setErrors({}); setModal(true) }
  const closeModal = () => { setModal(false); setErrors({}) }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setItem  = (i, k, v) => setForm(f => {
    const items = f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it)
    return { ...f, items }
  })
  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { ...BLANK_ITEM }] }))
  const removeItem = i  => setForm(f => ({ ...f, items: f.items.filter((_,idx) => idx !== i) }))

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
    if (editing != null) setQuotes(qq => (Array.isArray(qq)?qq:[]).map(q => q.id === editing ? rec : q))
    else                 setQuotes(qq => [...(Array.isArray(qq)?qq:[]), rec])
    setModal(false)
  }, [form, editing, safe, setQuotes])

  const del = id => {
    if (!window.confirm('Delete this quote?')) return
    setQuotes(qq => (Array.isArray(qq)?qq:[]).filter(q => q.id !== id))
  }

  const duplicate = q => {
    const n = safe.length + 1
    const dup = { ...q, id: nextId(safe), number:`QT-${String(n).padStart(4,'0')}`, status:'Draft', date:today() }
    setQuotes(qq => [...(Array.isArray(qq)?qq:[]), dup])
  }

  const convertToInvoice = q => {
    // Navigate to invoices with pre-filled data stored in sessionStorage
    sessionStorage.setItem('bl_quote_to_invoice', JSON.stringify(q))
    // Signal parent to navigate — dispatch custom event
    window.dispatchEvent(new CustomEvent('bl-navigate', { detail: 'invoices' }))
  }

  const visible = useMemo(() => safe.filter(q => {
    const matchStatus = filter === 'All' || q.status === filter
    const s = search.toLowerCase()
    const matchSearch = !s || [q.number, q.client, q.projectName, q.contactPerson].some(v => (v||'').toLowerCase().includes(s))
    return matchStatus && matchSearch
  }).sort((a,b) => (b.date||'').localeCompare(a.date||'')), [safe, filter, search])

  const { subtotal, discount, vat, total } = calcTotals(form.items||[], form.discount)

  // Summary stats
  const totalValue    = safe.reduce((s,q) => s + Number(q.total||0), 0)
  const acceptedValue = safe.filter(q => q.status === 'Accepted').reduce((s,q) => s + Number(q.total||0), 0)
  const pendingValue  = safe.filter(q => q.status === 'Sent').reduce((s,q) => s + Number(q.total||0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Quotes</div>
          <div className="page-subtitle">Client Proposals & Pricing</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Quote</button>
      </div>

      {/* Stats bar */}
      <div style={{ background:'rgba(15,26,20,0.70)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(255,255,255,0.07)`, padding:'14px 36px' }}>
        <div className="grid-4">
          {[
            { label:'Total Quotes',     val:safe.length,         sub: ZAR(totalValue) },
            { label:'Sent / Pending',   val:safe.filter(q=>q.status==='Sent').length, sub: ZAR(pendingValue), color: T.gold },
            { label:'Accepted',         val:safe.filter(q=>q.status==='Accepted').length, sub: ZAR(acceptedValue), color: T.green },
            { label:'Conversion Rate',  val: safe.length > 0 ? `${((safe.filter(q=>q.status==='Accepted').length/safe.length)*100).toFixed(0)}%` : '—', sub:'accepted vs total', color: T.forestLight },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:24, color: s.color || T.forest, lineHeight:1, marginTop:4 }}>{s.val}</div>
              <div style={{ fontSize:11, color: T.textLight, marginTop:4 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content">
        {/* Filter + search */}
        <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, minWidth:220 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quotes…" style={{ paddingLeft:36 }} />
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textLight, pointerEvents:'none' }}>⊙</span>
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {['All',...QUOTE_STATUSES].map(s => (
              <button key={s} className={`bp-fbtn ${filter===s?'active':''}`} onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="empty-st">
            <div className="empty-ic">◻</div>
            <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:20, color:T.forest, marginBottom:8 }}>No quotes yet</div>
            <div style={{ fontSize:13, color:T.textMid, marginBottom:16 }}>Create your first quote to start tracking proposals.</div>
            <button className="btn btn-primary" onClick={openNew}>+ Create Quote</button>
          </div>
        ) : (
          <div className="g-card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Quote #</th><th>Date</th><th>Client</th><th>Project</th><th>Total</th><th>Status</th><th style={{ width:160 }}></th></tr>
                </thead>
                <tbody>
                  {visible.map(q => (
                    <tr key={q.id}>
                      <td style={{ fontFamily:'monospace', fontSize:12, color:T.forest, fontWeight:600 }}>{q.number}</td>
                      <td style={{ fontSize:12 }}>{fmtDate(q.date)}</td>
                      <td className="td-name">{q.client}</td>
                      <td style={{ fontSize:12, color:T.textMid }}>{q.projectName || '—'}</td>
                      <td style={{ fontFamily:"'Manrope',sans-serif", fontSize:17, color:T.forest, whiteSpace:'nowrap' }}>{ZAR(q.total||0)}</td>
                      <td>
                        <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:STATUS_BG[q.status], color:STATUS_COLORS[q.status] }}>
                          {q.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                          <button className="btn btn-outline btn-xs" onClick={() => openEdit(q)}>Edit</button>
                          <button className="btn btn-outline btn-xs" onClick={() => duplicate(q)} title="Duplicate">⧉</button>
                          {(q.status === 'Accepted') && <button className="btn btn-outline btn-xs" style={{ background:T.greenPale, borderColor:T.green, color:T.green }} onClick={() => convertToInvoice(q)} title="Convert to Invoice">→ Invoice</button>}
                          <button className="btn btn-xs btn-ghost" style={{ color:T.textLight }} onClick={() => del(q.id)}>✕</button>
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

      {/* Modal */}
      <Modal open={modal} onClose={closeModal} title={editing != null ? 'Edit Quote' : 'New Quote'} size="modal-xl"
        footer={<>
          <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Quote</button>
        </>}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Header fields */}
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="qt-num">Quote Number</label>
              <input id="qt-num" value={form.number||''} onChange={e => setField('number', e.target.value)} placeholder="QT-0001" />
            </div>
            <div className="form-field">
              <label htmlFor="qt-date">Date</label>
              <input id="qt-date" type="date" value={form.date||today()} onChange={e => setField('date', e.target.value)} />
            </div>
            <div className="form-field" style={{ borderColor: errors.client ? T.danger : undefined }}>
              <label htmlFor="qt-client">Client <span style={{ color:T.danger }}>*</span></label>
              <input id="qt-client" value={form.client||''} onChange={e => setField('client', e.target.value)} list="qt-clients-list" placeholder="Client name" style={{ borderColor: errors.client ? T.danger : undefined }} />
              <datalist id="qt-clients-list">{safeC.map(c => <option key={c.id} value={c.company} />)}</datalist>
              {errors.client && <div style={{ fontSize:11, color:T.danger, marginTop:2 }}>{errors.client}</div>}
            </div>
            <div className="form-field">
              <label htmlFor="qt-contact">Contact Person</label>
              <input id="qt-contact" value={form.contactPerson||''} onChange={e => setField('contactPerson', e.target.value)} placeholder="Contact name" />
            </div>
            <div className="form-field full">
              <label htmlFor="qt-proj">Project Name</label>
              <input id="qt-proj" value={form.projectName||''} onChange={e => setField('projectName', e.target.value)} placeholder="e.g. Growthpoint Office Greenery" />
            </div>
            <div className="form-field">
              <label htmlFor="qt-status">Status</label>
              <select id="qt-status" value={form.status||'Draft'} onChange={e => setField('status', e.target.value)}>
                {QUOTE_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="qt-xr">Exchange Rate (ZAR/USD)</label>
              <input id="qt-xr" type="text" inputMode="decimal" value={form.exchangeRate||''} onChange={e => setField('exchangeRate', e.target.value)} placeholder="18.60" />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="sec-label">Line Items {errors.items && <span style={{ color:T.danger, fontWeight:400, textTransform:'none', letterSpacing:0 }}> — {errors.items}</span>}</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th style={{ minWidth:200 }}>Description</th><th style={{ width:80 }}>Qty</th><th style={{ width:130 }}>Unit Price (ZAR)</th><th style={{ width:130 }}>Total</th><th style={{ width:36 }}></th></tr>
                </thead>
                <tbody>
                  {(form.items||[]).map((item, i) => {
                    const lineTotal = parseNum(item.unitPrice) * (Number(item.qty)||1)
                    return (
                      <tr key={i}>
                        <td><input value={item.description||''} onChange={e => setItem(i,'description',e.target.value)} placeholder="Product or service description" style={{ width:'100%', minHeight:36, fontSize:13, padding:'4px 8px' }} /></td>
                        <td><input type="text" inputMode="decimal" value={String(item.qty||1)} onChange={e => setItem(i,'qty',e.target.value)} style={{ width:70, fontSize:13, padding:'4px 8px' }} /></td>
                        <td><input type="text" inputMode="decimal" value={String(item.unitPrice||'')} onChange={e => setItem(i,'unitPrice',e.target.value)} placeholder="0.00" style={{ width:110, fontSize:13, padding:'4px 8px' }} /></td>
                        <td style={{ fontFamily:"'Manrope',sans-serif", fontSize:16, color:T.forest, whiteSpace:'nowrap' }}>{ZAR(lineTotal)}</td>
                        <td>
                          {(form.items||[]).length > 1 && <button className="btn btn-ghost btn-xs" style={{ color:T.textLight }} onClick={() => removeItem(i)}>✕</button>}
                        </td>
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
                { label:'Subtotal', val: ZAR(subtotal) },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid rgba(255,255,255,0.07)`, fontSize:13 }}>
                  <span style={{ color:T.textMid }}>{r.label}</span>
                  <span>{r.val}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid rgba(255,255,255,0.07)`, fontSize:13 }}>
                <span style={{ color:T.textMid }}>Discount</span>
                <input type="text" inputMode="decimal" value={form.discount||''} onChange={e => setField('discount', e.target.value)} placeholder="0" style={{ width:100, fontSize:12, padding:'2px 8px', textAlign:'right' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid rgba(255,255,255,0.07)`, fontSize:13 }}>
                <span style={{ color:T.textMid }}>VAT (15%)</span>
                <span>{ZAR(vat)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', fontSize:16, fontWeight:700 }}>
                <span style={{ color:T.forest }}>TOTAL</span>
                <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:22, color:T.forest }}>{ZAR(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-field">
            <label htmlFor="qt-notes">Notes</label>
            <textarea id="qt-notes" value={form.notes||''} onChange={e => setField('notes', e.target.value)} placeholder="Terms, validity period, special conditions…" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
