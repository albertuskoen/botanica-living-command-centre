// Projects.jsx — v2.4
// Project management with profitability tracking
import { useState, useCallback, useMemo } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, fmtDate, nextId, today, parseNum } from '../utils/format.js'
import { PROJECT_STATUSES } from '../utils/data.js'
import Modal from '../components/Modal.jsx'

const BLANK = {
  name:'', client:'', status:'Planning', startDate:today(), endDate:'',
  description:'', revenue:'', notes:'',
  costs:{ products:0, freight:0, clearing:0, transport:0, samples:0, other:0 },
}

const STATUS_COLORS = { Planning:T.gold, Active:T.green, 'On Hold':T.textMid, Completed:T.forestLight, Cancelled:T.danger }
const STATUS_BG     = { Planning:T.goldPale, Active:T.greenPale, 'On Hold':'rgba(161,161,170,0.1)', Completed:'rgba(45,90,61,0.1)', Cancelled:T.redPale }

function calcProfitability(p, expenses) {
  const revenue = parseNum(p.revenue)
  const directCosts = Object.values(p.costs||{}).reduce((s,v) => s + Number(v||0), 0)
  const linkedExpenses = expenses.filter(e => (e.projectId === p.id || e.projectName === p.name)).reduce((s,e) => s + Number(e.amount||0), 0)
  const totalCosts  = directCosts + linkedExpenses
  const grossProfit = revenue - totalCosts
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  return { revenue, totalCosts, directCosts, linkedExpenses, grossProfit, grossMargin }
}

export default function Projects({ projects, setProjects, clients, expenses, invoices }) {
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(BLANK)
  const [filter,   setFilter]   = useState('All')
  const [selected, setSelected] = useState(null)
  const [errors,   setErrors]   = useState({})

  const safe      = useMemo(() => Array.isArray(projects) ? projects : [], [projects])
  const safeC     = Array.isArray(clients)  ? clients  : []
  const safeE     = Array.isArray(expenses) ? expenses : []
  const safeI     = Array.isArray(invoices) ? invoices : []

  const openNew  = () => { setEditing(null); setForm({ ...BLANK, startDate:today() }); setErrors({}); setModal(true) }
  const openEdit = p  => { setEditing(p.id); setForm({ ...p, costs: p.costs || { products:0, freight:0, clearing:0, transport:0, samples:0, other:0 } }); setErrors({}); setModal(true) }
  const closeModal = () => { setModal(false); setErrors({}) }

  const F = k => e => setForm(f => ({ ...f, [k]:e.target.value }))
  const FCost = k => e => setForm(f => ({ ...f, costs: { ...f.costs, [k]:e.target.value } }))

  const validate = f => {
    const e = {}
    if (!f.name?.trim()) e.name = 'Project name is required'
    if (!f.client?.trim()) e.client = 'Client is required'
    return e
  }

  const save = useCallback(() => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    const rec = { ...form, id: editing ?? nextId(safe) }
    if (editing != null) setProjects(pp => (Array.isArray(pp)?pp:[]).map(p => p.id===editing ? rec : p))
    else                 setProjects(pp => [...(Array.isArray(pp)?pp:[]), rec])
    setModal(false)
  }, [form, editing, safe, setProjects])

  const del = id => {
    if (!window.confirm('Delete this project?')) return
    setProjects(pp => (Array.isArray(pp)?pp:[]).filter(p => p.id !== id))
    if (selected === id) setSelected(null)
  }

  const visible = useMemo(() => safe.filter(p => filter === 'All' || p.status === filter)
    .sort((a,b) => (b.startDate||'').localeCompare(a.startDate||'')), [safe, filter])

  const selectedProject = selected ? safe.find(p => p.id === selected) : null
  const profData = selectedProject ? calcProfitability(selectedProject, safeE) : null

  // Portfolio summary
  const totalRevenue = useMemo(() => safe.reduce((s,p) => s + parseNum(p.revenue), 0), [safe])
  const totalCosts   = useMemo(() => safe.reduce((s,p) => s + calcProfitability(p, safeE).totalCosts, 0), [safe, safeE])
  const totalGP      = totalRevenue - totalCosts
  const avgMargin    = totalRevenue > 0 ? (totalGP/totalRevenue)*100 : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Projects</div>
          <div className="page-subtitle">Project Profitability · Cost Tracking</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Project</button>
      </div>

      {/* Stats */}
      <div style={{ background:'rgba(15,26,20,0.70)', backdropFilter:'blur(16px)', borderBottom:`1px solid rgba(255,255,255,0.07)`, padding:'14px 36px' }}>
        <div className="grid-4">
          {[
            { label:'Active Projects',  val:safe.filter(p=>p.status==='Active').length,    color:T.green },
            { label:'Total Revenue',    val:ZAR(totalRevenue),                             color:T.forestLight },
            { label:'Total Costs',      val:ZAR(totalCosts),                               color:T.red },
            { label:'Avg Gross Margin', val:avgMargin.toFixed(1)+'%',                      color:avgMargin>=30?T.green:avgMargin>0?T.gold:T.danger },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:22, color:s.color, lineHeight:1, marginTop:4 }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div style={{ display:'flex', gap:5, marginBottom:18, flexWrap:'wrap' }}>
          {['All', ...PROJECT_STATUSES].map(s => (
            <button key={s} className={`bp-fbtn ${filter===s?'active':''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selectedProject ? '1fr 360px' : '1fr', gap:16, alignItems:'start' }}>

          {/* Project list */}
          <div>
            {visible.length === 0 ? (
              <div className="empty-st">
                <div className="empty-ic">⊞</div>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:20, color:T.forest, marginBottom:8 }}>No projects yet</div>
                <button className="btn btn-primary" onClick={openNew}>+ Create First Project</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {visible.map(p => {
                  const prof = calcProfitability(p, safeE)
                  const isSel = selected === p.id
                  return (
                    <div key={p.id} className="g-card" style={{ cursor:'pointer', border:isSel?`1.5px solid ${T.gold}`:undefined }} onClick={() => setSelected(isSel?null:p.id)}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                            <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:17, color:T.forest, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                            <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:STATUS_BG[p.status], color:STATUS_COLORS[p.status], flexShrink:0 }}>{p.status}</span>
                          </div>
                          <div style={{ fontSize:12, color:T.textMid }}>{p.client} · {fmtDate(p.startDate)}{p.endDate ? ` → ${fmtDate(p.endDate)}` : ''}</div>
                          {p.description && <div style={{ fontSize:12, color:T.textLight, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description}</div>}
                        </div>
                        <div style={{ display:'flex', gap:20, flexShrink:0, flexWrap:'wrap' }}>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:T.textLight, fontWeight:600, marginBottom:2 }}>Revenue</div>
                            <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:18, color:T.green }}>{ZAR(prof.revenue)}</div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:T.textLight, fontWeight:600, marginBottom:2 }}>GP</div>
                            <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:18, color:prof.grossProfit>=0?T.forestLight:T.danger }}>{ZAR(prof.grossProfit)}</div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:T.textLight, fontWeight:600, marginBottom:2 }}>Margin</div>
                            <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:18, color:prof.grossMargin>=30?T.green:prof.grossMargin>0?T.gold:T.danger }}>{prof.grossMargin.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:12 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-outline btn-xs" onClick={() => openEdit(p)}>Edit</button>
                        <button className="btn btn-xs btn-ghost" style={{ color:T.textLight }} onClick={() => del(p.id)}>✕ Delete</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Profitability detail panel */}
          {selectedProject && profData && (
            <div className="g-card" style={{ position:'sticky', top:80 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:14, borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:17, color:T.forest, overflow:'hidden', textOverflow:'ellipsis' }}>{selectedProject.name}</div>
                <button className="btn btn-ghost btn-xs" onClick={() => setSelected(null)}>✕</button>
              </div>

              <div className="sec-label">Profitability</div>
              {[
                { label:'Revenue', val:ZAR(profData.revenue), color:T.green },
                { label:'Product Costs', val:ZAR(parseNum(selectedProject.costs?.products)), color:T.red },
                { label:'Freight', val:ZAR(parseNum(selectedProject.costs?.freight)), color:T.red },
                { label:'Clearing & Duty', val:ZAR(parseNum(selectedProject.costs?.clearing)), color:T.red },
                { label:'Transport', val:ZAR(parseNum(selectedProject.costs?.transport)), color:T.red },
                { label:'Samples', val:ZAR(parseNum(selectedProject.costs?.samples)), color:T.red },
                { label:'Other Direct Costs', val:ZAR(parseNum(selectedProject.costs?.other)), color:T.red },
                { label:'Linked Expenses', val:ZAR(profData.linkedExpenses), color:T.red },
              ].filter(r => r.val !== ZAR(0)).map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid rgba(255,255,255,0.07)`, fontSize:13 }}>
                  <span style={{ color:T.textMid }}>{r.label}</span>
                  <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:16, color:r.color }}>{r.val}</span>
                </div>
              ))}

              <div style={{ borderTop:`2px solid rgba(255,255,255,0.07)`, paddingTop:12, marginTop:4 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:T.forest }}>Gross Profit</span>
                  <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:22, color:profData.grossProfit>=0?T.green:T.danger }}>{ZAR(profData.grossProfit)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:T.forest }}>Gross Margin</span>
                  <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:22, color:profData.grossMargin>=30?T.green:profData.grossMargin>0?T.gold:T.danger }}>{profData.grossMargin.toFixed(1)}%</span>
                </div>
              </div>

              {/* Linked invoices */}
              {safeI.filter(i => i.projectName === selectedProject.name || i.client === selectedProject.client).length > 0 && (
                <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid rgba(255,255,255,0.07)` }}>
                  <div className="sec-label" style={{ marginBottom:8 }}>Linked Invoices</div>
                  {safeI.filter(i => i.projectName === selectedProject.name).map(inv => (
                    <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
                      <span style={{ color:T.textMid }}>{inv.number}</span>
                      <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:14, color:inv.status==='Paid'?T.green:T.teal }}>{ZAR(inv.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn btn-outline btn-sm" style={{ marginTop:14, width:'100%' }} onClick={() => openEdit(selectedProject)}>✎ Edit Project</button>
            </div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={closeModal} title={editing!=null?'Edit Project':'New Project'} size="modal-lg"
        footer={<><button className="btn btn-outline" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Project</button></>}
      >
        <div className="form-grid">
          <div className="form-field full">
            <label htmlFor="pr-name">Project Name <span style={{ color:T.danger }}>*</span></label>
            <input id="pr-name" value={form.name||''} onChange={F('name')} placeholder="e.g. Growthpoint Head Office Greenery" style={{ borderColor:errors.name?T.danger:undefined }} />
            {errors.name && <div style={{ fontSize:11, color:T.danger, marginTop:2 }}>{errors.name}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="pr-client">Client <span style={{ color:T.danger }}>*</span></label>
            <input id="pr-client" value={form.client||''} onChange={F('client')} list="pr-clients" style={{ borderColor:errors.client?T.danger:undefined }} />
            <datalist id="pr-clients">{safeC.map(c=><option key={c.id} value={c.company}/>)}</datalist>
            {errors.client && <div style={{ fontSize:11, color:T.danger, marginTop:2 }}>{errors.client}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="pr-status">Status</label>
            <select id="pr-status" value={form.status||'Planning'} onChange={F('status')}>
              {PROJECT_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field"><label htmlFor="pr-start">Start Date</label><input id="pr-start" type="date" value={form.startDate||today()} onChange={F('startDate')} /></div>
          <div className="form-field"><label htmlFor="pr-end">End Date</label><input id="pr-end" type="date" value={form.endDate||''} onChange={F('endDate')} /></div>
          <div className="form-field">
            <label htmlFor="pr-rev">Projected Revenue (ZAR)</label>
            <input id="pr-rev" type="text" inputMode="decimal" value={form.revenue||''} onChange={F('revenue')} placeholder="0.00" />
          </div>
          <div className="form-field full"><label htmlFor="pr-desc">Description</label><textarea id="pr-desc" value={form.description||''} onChange={F('description')} style={{ minHeight:60 }} /></div>
        </div>

        <div style={{ marginTop:20 }}>
          <div className="sec-label">Direct Project Costs (ZAR)</div>
          <div className="form-grid">
            {[
              ['products','Product / Import Cost'],['freight','Freight'],['clearing','Clearing & Duty'],
              ['transport','Local Transport'],['samples','Samples'],['other','Other Costs'],
            ].map(([k,label]) => (
              <div key={k} className="form-field">
                <label htmlFor={`pr-c-${k}`}>{label}</label>
                <input id={`pr-c-${k}`} type="text" inputMode="decimal" value={String(form.costs?.[k]||'')} onChange={FCost(k)} placeholder="0" />
              </div>
            ))}
          </div>
        </div>

        <div className="form-field" style={{ marginTop:14 }}>
          <label htmlFor="pr-notes">Notes</label>
          <textarea id="pr-notes" value={form.notes||''} onChange={F('notes')} placeholder="Project notes, scope, deliverables…" style={{ minHeight:60 }} />
        </div>
      </Modal>
    </div>
  )
}
