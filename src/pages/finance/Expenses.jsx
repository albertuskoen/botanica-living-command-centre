// Expenses.jsx — v2.4
import { useState, useCallback, useMemo } from 'react'
import { T } from '../../utils/tokens.js'
import { ZAR, fmtDate, nextId, today, parseNum } from '../../utils/format.js'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../utils/data.js'
import Modal from '../../components/Modal.jsx'

const BLANK = {
  date: today(), supplier:'', category:'Other', projectId:'', projectName:'',
  description:'', amount:'', vat:'', paymentMethod:'EFT', notes:'', hasDocument:false,
}

export default function Expenses({ expenses, setExpenses, projects }) {
  const [modal,    setModal]   = useState(false)
  const [editing,  setEditing] = useState(null)
  const [form,     setForm]    = useState(BLANK)
  const [filter,   setFilter]  = useState('All')
  const [search,   setSearch]  = useState('')
  const [errors,   setErrors]  = useState({})
  const [tab,      setTab]     = useState('list')

  const safe     = useMemo(() => Array.isArray(expenses) ? expenses : [], [expenses])
  const safeProj = Array.isArray(projects) ? projects : []

  const openNew  = () => { setEditing(null); setForm({ ...BLANK, date:today() }); setErrors({}); setModal(true) }
  const openEdit = e  => { setEditing(e.id); setForm({ ...e }); setErrors({}); setModal(true) }
  const closeModal = () => { setModal(false); setErrors({}) }

  const F = k => e => { setForm(f => ({ ...f, [k]:e.target.value })); setErrors(er => ({ ...er, [k]:undefined })) }

  const validate = f => {
    const e = {}
    if (!f.description?.trim()) e.description = 'Description is required'
    if (!f.amount || parseNum(f.amount) <= 0) e.amount = 'Amount must be greater than zero'
    if (!f.date) e.date = 'Date is required'
    return e
  }

  const save = useCallback(() => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    const rec = { ...form, id: editing ?? nextId(safe), amount: parseNum(form.amount), vat: parseNum(form.vat) }
    if (editing != null) setExpenses(ee => (Array.isArray(ee)?ee:[]).map(e => e.id===editing ? rec : e))
    else                 setExpenses(ee => [...(Array.isArray(ee)?ee:[]), rec])
    setModal(false)
  }, [form, editing, safe, setExpenses])

  const del = id => {
    if (!window.confirm('Delete this expense?')) return
    setExpenses(ee => (Array.isArray(ee)?ee:[]).filter(e => e.id !== id))
  }

  const visible = useMemo(() => safe.filter(e => {
    const matchCat = filter === 'All' || e.category === filter
    const s = search.toLowerCase()
    const matchSearch = !s || [e.description, e.supplier, e.category, e.projectName].some(v => (v||'').toLowerCase().includes(s))
    return matchCat && matchSearch
  }).sort((a,b) => (b.date||'').localeCompare(a.date||'')), [safe, filter, search])

  const totalExpenses  = useMemo(() => safe.reduce((s,e) => s + Number(e.amount||0), 0), [safe])
  const totalVat       = useMemo(() => safe.reduce((s,e) => s + Number(e.vat||0), 0), [safe])

  const catBreakdown = useMemo(() => {
    const m = {}
    safe.forEach(e => { m[e.category] = (m[e.category]||0) + Number(e.amount||0) })
    return Object.entries(m).sort((a,b) => b[1]-a[1])
  }, [safe])

  const projBreakdown = useMemo(() => {
    const m = {}
    safe.forEach(e => {
      const key = e.projectName || e.projectId || 'Unassigned'
      m[key] = (m[key]||0) + Number(e.amount||0)
    })
    return Object.entries(m).sort((a,b) => b[1]-a[1])
  }, [safe])

  const maxCat = Math.max(...catBreakdown.map(([,v]) => v), 1)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Expenses</div>
          <div className="page-subtitle">Cost Tracking · Project-Aware</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Log Expense</button>
      </div>

      {/* Stats bar */}
      <div style={{ background:'rgba(15,26,20,0.70)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(255,255,255,0.07)`, padding:'14px 36px' }}>
        <div className="grid-4">
          {[
            { label:'Total Expenses',  val:ZAR(totalExpenses), color:T.red },
            { label:'VAT Paid',        val:ZAR(totalVat),      color:T.gold },
            { label:'Expense Records', val:safe.length,        color:T.forest },
            { label:'Categories',      val:catBreakdown.length,color:T.forestLight },
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
          {[{id:'list',label:'Expense List'},{id:'categories',label:'By Category'},{id:'projects',label:'By Project'}].map(t => (
            <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        {tab === 'list' && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:220 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search expenses…" style={{ paddingLeft:36 }} />
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textLight, pointerEvents:'none' }}>⊙</span>
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {['All', ...EXPENSE_CATEGORIES].map(c => (
                  <button key={c} className={`bp-fbtn ${filter===c?'active':''}`} onClick={() => setFilter(c)}>{c}</button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="empty-st">
                <div className="empty-ic">⊟</div>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:20, color:T.forest, marginBottom:8 }}>No expenses yet</div>
                <button className="btn btn-primary" onClick={openNew}>+ Log First Expense</button>
              </div>
            ) : (
              <div className="g-card" style={{ padding:0 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Supplier</th><th>Category</th><th>Description</th><th>Project</th><th>Amount</th><th>VAT</th><th>Payment</th><th style={{ width:80 }}></th></tr>
                    </thead>
                    <tbody>
                      {visible.map(e => (
                        <tr key={e.id}>
                          <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{fmtDate(e.date)}</td>
                          <td style={{ fontSize:12, color:T.textMid }}>{e.supplier||'—'}</td>
                          <td><span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:T.goldPale, color:T.gold }}>{e.category}</span></td>
                          <td className="td-wrap" style={{ fontSize:13 }}>{e.description}</td>
                          <td style={{ fontSize:11, color:T.teal }}>{e.projectName||'—'}</td>
                          <td style={{ fontFamily:"'Manrope',sans-serif", fontSize:16, color:T.red, whiteSpace:'nowrap' }}>{ZAR(e.amount)}</td>
                          <td style={{ fontSize:12, color:T.textMid }}>{e.vat?ZAR(e.vat):'—'}</td>
                          <td style={{ fontSize:11, color:T.textLight }}>{e.paymentMethod}</td>
                          <td>
                            <div style={{ display:'flex', gap:3 }}>
                              <button className="btn btn-outline btn-xs" onClick={() => openEdit(e)}>Edit</button>
                              <button className="btn btn-xs btn-ghost" style={{ color:T.textLight }} onClick={() => del(e.id)}>✕</button>
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

        {tab === 'categories' && (
          <div>
            <div className="sec-label">Spend by Category</div>
            {catBreakdown.length === 0 ? <div style={{ color:T.textLight, fontSize:13 }}>No data yet.</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {catBreakdown.map(([cat, val]) => (
                  <div key={cat} className="g-card" style={{ padding:'12px 18px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:T.forest }}>{cat}</div>
                        <div style={{ fontSize:11, color:T.textLight }}>{safe.filter(e=>e.category===cat).length} records · {totalExpenses > 0 ? ((val/totalExpenses)*100).toFixed(1) : 0}% of total</div>
                      </div>
                      <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:22, color:T.red }}>{ZAR(val)}</div>
                    </div>
                    <div className="pbar">
                      <div className="pbar-fill pbar-red" style={{ width:`${(val/maxCat)*100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'projects' && (
          <div>
            <div className="sec-label">Spend by Project</div>
            {projBreakdown.length === 0 ? <div style={{ color:T.textLight, fontSize:13 }}>No project-linked expenses yet.</div> : (
              <div className="g-card" style={{ padding:0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Project</th><th>Expense Count</th><th>Total Cost</th><th>% of Total</th></tr></thead>
                    <tbody>
                      {projBreakdown.map(([proj, val]) => (
                        <tr key={proj}>
                          <td className="td-name">{proj}</td>
                          <td style={{ fontSize:13 }}>{safe.filter(e=>(e.projectName||e.projectId||'Unassigned')===proj).length}</td>
                          <td style={{ fontFamily:"'Manrope',sans-serif", fontSize:17, color:T.red }}>{ZAR(val)}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div className="pbar" style={{ width:100 }}><div className="pbar-fill pbar-red" style={{ width:`${totalExpenses>0?(val/totalExpenses)*100:0}%` }}/></div>
                              <span style={{ fontSize:12, color:T.textMid, whiteSpace:'nowrap' }}>{totalExpenses>0?((val/totalExpenses)*100).toFixed(1):0}%</span>
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
        )}
      </div>

      <Modal open={modal} onClose={closeModal} title={editing != null ? 'Edit Expense' : 'Log Expense'}
        footer={<><button className="btn btn-outline" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Expense</button></>}
      >
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="exp-date">Date <span style={{ color:T.danger }}>*</span></label>
            <input id="exp-date" type="date" value={form.date||today()} onChange={F('date')} style={{ borderColor:errors.date?T.danger:undefined }} />
            {errors.date && <div style={{ fontSize:11, color:T.danger, marginTop:2 }}>{errors.date}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="exp-cat">Category</label>
            <select id="exp-cat" value={form.category||'Other'} onChange={F('category')}>
              {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="exp-sup">Supplier / Payee</label>
            <input id="exp-sup" value={form.supplier||''} onChange={F('supplier')} placeholder="e.g. Frank / Dongyi" />
          </div>
          <div className="form-field">
            <label htmlFor="exp-pm">Payment Method</label>
            <select id="exp-pm" value={form.paymentMethod||'EFT'} onChange={F('paymentMethod')}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="exp-proj">Project (optional)</label>
            <input id="exp-proj" value={form.projectName||''} onChange={F('projectName')} list="exp-proj-list" placeholder="Link to a project" />
            <datalist id="exp-proj-list">{safeProj.map(p => <option key={p.id} value={p.name} />)}</datalist>
          </div>
          <div className="form-field">
            <label htmlFor="exp-amt">Amount (ZAR) <span style={{ color:T.danger }}>*</span></label>
            <input id="exp-amt" type="text" inputMode="decimal" value={form.amount||''} onChange={F('amount')} placeholder="0.00" style={{ borderColor:errors.amount?T.danger:undefined }} />
            {errors.amount && <div style={{ fontSize:11, color:T.danger, marginTop:2 }}>{errors.amount}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="exp-vat">VAT Amount (ZAR)</label>
            <input id="exp-vat" type="text" inputMode="decimal" value={form.vat||''} onChange={F('vat')} placeholder="0.00" />
          </div>
          <div className="form-field full">
            <label htmlFor="exp-desc">Description <span style={{ color:T.danger }}>*</span></label>
            <input id="exp-desc" value={form.description||''} onChange={F('description')} placeholder="What was this expense for?" style={{ borderColor:errors.description?T.danger:undefined }} />
            {errors.description && <div style={{ fontSize:11, color:T.danger, marginTop:2 }}>{errors.description}</div>}
          </div>
          <div className="form-field full">
            <label htmlFor="exp-notes">Notes</label>
            <textarea id="exp-notes" value={form.notes||''} onChange={F('notes')} placeholder="Invoice number, reference, etc." style={{ minHeight:60 }} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
