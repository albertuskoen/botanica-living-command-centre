import { useState } from 'react'
import { T } from './global.js'

const INIT_PROGRESS = [
  { section: 'Company Registration', icon: '◎', tasks: [
    { id: 'cr1', name: 'Company registered', status: 'Completed', priority: 'Critical', dueDate: '', notes: 'Registration confirmed with CIPC.' },
    { id: 'cr2', name: 'CIPC name change submitted', status: 'Completed', priority: 'Critical', dueDate: '', notes: 'Submitted. Awaiting approval.' },
    { id: 'cr3', name: 'Name change approved', status: 'In Progress', priority: 'Critical', dueDate: '', notes: '' },
    { id: 'cr4', name: 'Company documents updated', status: 'Not Started', priority: 'High', dueDate: '', notes: 'Update MOI, letterhead, and bank mandate once name approved.' },
  ]},
  { section: 'SARS & Import Compliance', icon: '⊟', tasks: [
    { id: 'sars1', name: 'SARS income tax registration completed', status: 'Completed', priority: 'Critical', dueDate: '', notes: '' },
    { id: 'sars2', name: 'Importer registration submitted', status: 'In Progress', priority: 'Critical', dueDate: '', notes: 'Busy with SARS eFiling registration as importer.' },
    { id: 'sars3', name: 'Customs code received', status: 'Not Started', priority: 'Critical', dueDate: '', notes: 'Required before first shipment can be cleared.' },
  ]},
  { section: 'Brand & Digital', icon: '✦', tasks: [
    { id: 'bd1', name: 'Logo created', status: 'Completed', priority: 'High', dueDate: '', notes: 'Premium botanical mark finalised.' },
    { id: 'bd2', name: 'Domain registered: botanicaliving.co.za', status: 'Completed', priority: 'High', dueDate: '', notes: '' },
    { id: 'bd3', name: 'Email active: aldo@botanicaliving.co.za', status: 'Completed', priority: 'High', dueDate: '', notes: '' },
    { id: 'bd4', name: 'Website concept in progress', status: 'In Progress', priority: 'Medium', dueDate: '', notes: 'Landing page to follow Founders Collection launch.' },
    { id: 'bd5', name: 'Email signature created', status: 'Completed', priority: 'Low', dueDate: '', notes: '' },
  ]},
  { section: 'Supplier Development', icon: '❧', tasks: [
    { id: 'sd1', name: 'Frank / Dongyi relationship active', status: 'Completed', priority: 'Critical', dueDate: '', notes: 'Primary supplier confirmed.' },
    { id: 'sd2', name: 'Campion / Trustfloral relationship active', status: 'Completed', priority: 'High', dueDate: '', notes: 'Specialist for hanging greenery and boxwood panels.' },
    { id: 'sd3', name: 'Supplier video meetings scheduled', status: 'In Progress', priority: 'High', dueDate: '', notes: 'Schedule calls to discuss MOQ flexibility.' },
    { id: 'sd4', name: 'Catalogues received', status: 'In Progress', priority: 'Medium', dueDate: '', notes: 'Catalogues from Dongyi received. Trustfloral pending.' },
    { id: 'sd5', name: 'Sample quotes confirmed', status: 'In Progress', priority: 'High', dueDate: '', notes: 'Quotes received for Olive and Ficus. Palm pending.' },
    { id: 'sd6', name: 'Supplier comparison matrix completed', status: 'Not Started', priority: 'Medium', dueDate: '', notes: 'Score each supplier on quality, MOQ, lead time, and pricing.' },
  ]},
  { section: 'Product Development', icon: '◈', tasks: [
    { id: 'pd1', name: 'Founders Collection draft completed', status: 'In Progress', priority: 'Critical', dueDate: '', notes: '6 hero SKUs identified. Scoring in progress.' },
    { id: 'pd2', name: 'Samples ordered', status: 'Not Started', priority: 'Critical', dueDate: '', notes: 'Waiting on customs code and bank account before payment.' },
    { id: 'pd3', name: 'Product scoring sheet completed', status: 'Not Started', priority: 'High', dueDate: '', notes: 'Score on margin, visual impact, retail fit, and MOQ viability.' },
    { id: 'pd4', name: 'Landed cost model completed', status: 'In Progress', priority: 'Critical', dueDate: '', notes: 'Import calculator built. Needs alignment with clearing agent.' },
  ]},
  { section: 'Operations', icon: '⊞', tasks: [
    { id: 'op1', name: 'Paarl assembly location identified', status: 'Completed', priority: 'High', dueDate: '', notes: 'Concept confirmed. Space suitable for assembly and QC.' },
    { id: 'op2', name: 'Assembly SOP documented', status: 'Not Started', priority: 'High', dueDate: '', notes: 'Standard operating procedure for tree assembly and finishing.' },
    { id: 'op3', name: 'QC checklist created', status: 'Not Started', priority: 'High', dueDate: '', notes: 'Per-SKU quality gate before dispatch.' },
    { id: 'op4', name: 'Storage and handling plan finalised', status: 'Not Started', priority: 'Medium', dueDate: '', notes: 'Define storage layout, packaging standards, and dispatch flow.' },
  ]},
  { section: 'Retail Strategy', icon: '◉', tasks: [
    { id: 'rs1', name: 'Checkers Hyper identified as anchor opportunity', status: 'Completed', priority: 'Critical', dueDate: '', notes: 'Shop-in-shop format confirmed as primary retail vehicle.' },
    { id: 'rs2', name: 'Shop-in-shop concept defined', status: 'Completed', priority: 'High', dueDate: '', notes: 'Visual merchandising concept drafted.' },
    { id: 'rs3', name: 'Pitch deck created', status: 'Not Started', priority: 'Critical', dueDate: '', notes: 'Need financial model, visual concept, and pilot proposal in deck.' },
    { id: 'rs4', name: 'Checkers buyer contact established', status: 'Not Started', priority: 'Critical', dueDate: '', notes: 'Identify and reach the correct category buyer.' },
    { id: 'rs5', name: 'Pilot proposal submitted', status: 'Not Started', priority: 'Critical', dueDate: '', notes: 'Formal 5-store pilot proposal with sell-in pricing and support plan.' },
  ]},
  { section: 'Finance', icon: '◈', tasks: [
    { id: 'fi1', name: 'Import cost model created', status: 'Completed', priority: 'Critical', dueDate: '', notes: 'Full landed cost calculator built and functional.' },
    { id: 'fi2', name: 'Pricing strategy in progress', status: 'In Progress', priority: 'Critical', dueDate: '', notes: 'Sell-in and RRP matrix being finalised against margin targets.' },
    { id: 'fi3', name: 'Business bank account opened', status: 'Not Started', priority: 'Critical', dueDate: '', notes: 'Required for supplier payments. Waiting on name change approval.' },
    { id: 'fi4', name: 'Funding / investor strategy defined', status: 'Not Started', priority: 'High', dueDate: '', notes: 'Define whether to bootstrap, seek investors, or explore trade finance.' },
  ]},
]

const PRI = { Critical: 'pri-critical', High: 'pri-high', Medium: 'pri-medium', Low: 'pri-low' }
const CHK = { Completed: '✓', 'In Progress': '◑', 'Not Started': '' }
const CYCLE = ['Not Started', 'In Progress', 'Completed']

function useLS(key, init) {
  const [val, setVal] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init } catch { return init } })
  const set = v => { setVal(v); try { localStorage.setItem(key, JSON.stringify(typeof v === 'function' ? v(val) : v)) } catch {} }
  return [val, set]
}

export default function BusinessProgress() {
  const [progress, setProgress] = useLS('bl_progress', INIT_PROGRESS)
  const [fStatus,  setFStatus]  = useState('All')
  const [fPri,     setFPri]     = useState('All')
  const [expanded, setExpanded] = useState(null)

  const all       = progress.flatMap(s => s.tasks)
  const total     = all.length
  const completed = all.filter(t => t.status === 'Completed').length
  const inProg    = all.filter(t => t.status === 'In Progress').length
  const notStart  = all.filter(t => t.status === 'Not Started').length
  const overall   = total > 0 ? Math.round((completed / total) * 100) : 0

  const update = (si, id, field, val) =>
    setProgress(prev => prev.map((sec, i) => i !== si ? sec : { ...sec, tasks: sec.tasks.map(t => t.id === id ? { ...t, [field]: val } : t) }))

  const cycle = (si, id, cur) => update(si, id, 'status', CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length])

  const secPct = tasks => tasks.length ? Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100) : 0

  const filtered = tasks => tasks.filter(t => (fStatus === 'All' || t.status === fStatus) && (fPri === 'All' || t.priority === fPri))

  const selClass = s => s === 'Completed' ? 'completed' : s === 'In Progress' ? 'in-progress' : 'not-started'

  return (
    <div>
      <div className="bp-hero">
        <div>
          <div className="bp-hero-title">Business Progress</div>
          <div className="bp-hero-sub">Botanica Living — Full Journey Tracker</div>
        </div>
        <div className="bp-overall">
          <div className="bp-overall-pct">{overall}%</div>
          <div className="bp-overall-label">Overall Completion</div>
          <div className="bp-overall-bar"><div className="bp-overall-bar-fill" style={{ width: `${overall}%` }} /></div>
        </div>
      </div>

      <div className="bp-filters">
        <span className="bp-filter-label">Status</span>
        {['All','Completed','In Progress','Not Started'].map(s => (
          <button key={s} className={`bp-filter-btn ${fStatus === s ? 'active' : ''}`} onClick={() => setFStatus(s)}>{s}</button>
        ))}
        <span className="bp-filter-label" style={{ marginLeft: 16 }}>Priority</span>
        {['All','Critical','High','Medium','Low'].map(p => (
          <button key={p} className={`bp-filter-btn ${fPri === p ? 'active' : ''}`} onClick={() => setFPri(p)}>{p}</button>
        ))}
      </div>

      <div className="page-content">
        <div className="bp-summary-row">
          {[
            { num: total,     lbl: 'Total Tasks',  color: T.forest      },
            { num: completed, lbl: 'Completed',    color: T.forestLight },
            { num: inProg,    lbl: 'In Progress',  color: T.gold        },
            { num: notStart,  lbl: 'Not Started',  color: T.textMid     },
          ].map(s => (
            <div className="bp-summary-card" key={s.lbl}>
              <div className="bp-summary-num" style={{ color: s.color }}>{s.num}</div>
              <div className="bp-summary-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {progress.map((section, si) => {
          const vis  = filtered(section.tasks)
          if (!vis.length) return null
          const pct  = secPct(section.tasks)
          const done = section.tasks.filter(t => t.status === 'Completed').length
          return (
            <div className="bp-section" key={section.section}>
              <div className="bp-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: T.gold, fontSize: 18 }}>{section.icon}</span>
                  <div className="bp-section-title">{section.section}</div>
                </div>
                <div className="bp-section-meta">
                  <span className="bp-section-count">{done}/{section.tasks.length} complete</span>
                  <div className="bp-mini-bar"><div className="bp-mini-bar-fill" style={{ width: `${pct}%` }} /></div>
                  <span style={{ fontSize: 12, fontFamily: "'Cormorant Garamond',serif", color: T.gold, minWidth: 34 }}>{pct}%</span>
                </div>
              </div>

              {vis.map(task => {
                const isExp = expanded === task.id
                return (
                  <div className="bp-task" key={task.id}>
                    <div className="bp-task-top">
                      <div className="bp-task-left">
                        <div className={`bp-task-checkbox ${task.status === 'Completed' ? 'completed' : task.status === 'In Progress' ? 'in-progress' : ''}`} onClick={() => cycle(si, task.id, task.status)} title="Click to cycle status">
                          {CHK[task.status]}
                        </div>
                        <div>
                          <div className={`bp-task-name ${task.status === 'Completed' ? 'completed' : ''}`}>{task.name}</div>
                          {task.notes && !isExp && <div style={{ fontSize: 12, color: T.textLight, marginTop: 3 }}>{task.notes.substring(0, 80)}{task.notes.length > 80 ? '…' : ''}</div>}
                        </div>
                      </div>
                      <div className="bp-task-right">
                        <span className={`badge ${PRI[task.priority]}`}>{task.priority}</span>
                        <select className={`bp-status-select ${selClass(task.status)}`} value={task.status} onChange={e => update(si, task.id, 'status', e.target.value)}>
                          <option>Not Started</option><option>In Progress</option><option>Completed</option>
                        </select>
                        <button className="bp-task-expand-btn" onClick={() => setExpanded(isExp ? null : task.id)}>{isExp ? '▲ Less' : '▼ Details'}</button>
                      </div>
                    </div>

                    <div className="bp-task-bottom">
                      <div className="bp-task-meta-item"><span className="bp-task-meta-label">Priority:</span><span>{task.priority}</span></div>
                      {task.dueDate
                        ? <div className="bp-task-meta-item"><span className="bp-task-meta-label">Due:</span><span>{task.dueDate}</span></div>
                        : <div className="bp-task-meta-item" style={{ color: T.beigeDeep }}>No due date set</div>
                      }
                    </div>

                    {isExp && (
                      <div className="bp-task-detail">
                        <div className="form-field">
                          <label>Notes</label>
                          <textarea value={task.notes} onChange={e => update(si, task.id, 'notes', e.target.value)} placeholder="Add notes, context, or next actions…" style={{ minHeight: 72 }} />
                        </div>
                        <div className="flex-col gap-12">
                          <div className="form-field"><label>Due Date</label><input type="date" value={task.dueDate} onChange={e => update(si, task.id, 'dueDate', e.target.value)} /></div>
                          <div className="form-field"><label>Priority</label>
                            <select value={task.priority} onChange={e => update(si, task.id, 'priority', e.target.value)}>
                              <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
