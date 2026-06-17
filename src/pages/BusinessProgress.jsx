import { useState } from 'react'
import { T } from '../utils/tokens.js'

const PRI   = { Critical:'pri-critical', High:'pri-high', Medium:'pri-medium', Low:'pri-low' }
const CHK   = { Completed:'✓', 'In Progress':'◑', 'Not Started':'' }
const CYCLE = ['Not Started','In Progress','Completed']

export default function BusinessProgress({ progress, setProgress }) {
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
  const filterTasks = tasks => tasks.filter(t => (fStatus === 'All' || t.status === fStatus) && (fPri === 'All' || t.priority === fPri))
  const selClass = s => s === 'Completed' ? 'completed' : s === 'In Progress' ? 'in-progress' : 'not-started'

  return (
    <div>
      <div className="bp-hero">
        <div>
          <div className="bp-hero-title">Business Progress</div>
          <div className="bp-hero-sub">Botanica Living Group — Full Journey Tracker</div>
        </div>
        <div className="bp-overall">
          <div className="bp-overall-pct">{overall}%</div>
          <div className="bp-overall-label">Overall Completion</div>
          <div className="bp-overall-bar"><div className="bp-overall-bar-fill" style={{ width:`${overall}%` }} /></div>
        </div>
      </div>

      <div className="bp-filters">
        <span className="bp-filter-label">Status</span>
        {['All','Completed','In Progress','Not Started'].map(s => (
          <button key={s} className={`bp-filter-btn ${fStatus===s?'active':''}`} onClick={() => setFStatus(s)}>{s}</button>
        ))}
        <span className="bp-filter-label" style={{ marginLeft:14 }}>Priority</span>
        {['All','Critical','High','Medium','Low'].map(p => (
          <button key={p} className={`bp-filter-btn ${fPri===p?'active':''}`} onClick={() => setFPri(p)}>{p}</button>
        ))}
      </div>

      <div className="page-content">
        <div className="bp-summary-row">
          {[
            { num:total,     lbl:'Total Tasks',  color:T.forest },
            { num:completed, lbl:'Completed',    color:T.forestLight },
            { num:inProg,    lbl:'In Progress',  color:T.gold },
            { num:notStart,  lbl:'Not Started',  color:T.textMid },
          ].map(s => (
            <div className="bp-summary-card" key={s.lbl}>
              <div className="bp-summary-num" style={{ color:s.color }}>{s.num}</div>
              <div className="bp-summary-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {progress.map((section, si) => {
          const vis  = filterTasks(section.tasks)
          if (!vis.length) return null
          const pct  = secPct(section.tasks)
          const done = section.tasks.filter(t => t.status === 'Completed').length
          return (
            <div className="bp-section" key={section.section}>
              <div className="bp-section-header">
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ color:T.gold, fontSize:16 }}>{section.icon}</span>
                  <div className="bp-section-title">{section.section}</div>
                </div>
                <div className="bp-section-meta">
                  <span className="bp-section-count">{done}/{section.tasks.length} complete</span>
                  <div className="bp-mini-bar"><div className="bp-mini-bar-fill" style={{ width:`${pct}%` }} /></div>
                  <span style={{ fontSize:12, fontFamily:"'Cormorant Garamond',serif", color:T.gold, minWidth:32 }}>{pct}%</span>
                </div>
              </div>
              {vis.map(task => {
                const isExp = expanded === task.id
                return (
                  <div className="bp-task" key={task.id}>
                    <div className="bp-task-top">
                      <div className="bp-task-left">
                        <div className={`bp-task-checkbox ${task.status === 'Completed' ? 'completed' : task.status === 'In Progress' ? 'in-progress' : ''}`} onClick={() => cycle(si, task.id, task.status)}>
                          {CHK[task.status]}
                        </div>
                        <div>
                          <div className={`bp-task-name ${task.status === 'Completed' ? 'completed' : ''}`}>{task.name}</div>
                          {task.notes && !isExp && <div style={{ fontSize:12, color:T.textLight, marginTop:2 }}>{task.notes.substring(0,80)}{task.notes.length > 80 ? '…' : ''}</div>}
                        </div>
                      </div>
                      <div className="bp-task-right">
                        <span className={`badge ${PRI[task.priority]}`}>{task.priority}</span>
                        <select className={`bp-status-select ${selClass(task.status)}`} value={task.status} onChange={e => update(si, task.id, 'status', e.target.value)}>
                          <option>Not Started</option><option>In Progress</option><option>Completed</option>
                        </select>
                        <button className="bp-task-expand-btn" onClick={() => setExpanded(isExp ? null : task.id)}>{isExp ? '▲' : '▼'}</button>
                      </div>
                    </div>
                    <div className="bp-task-bottom">
                      <div className="bp-task-meta-item"><span className="bp-task-meta-label">Priority:</span><span>{task.priority}</span></div>
                      {task.dueDate ? <div className="bp-task-meta-item"><span className="bp-task-meta-label">Due:</span><span>{task.dueDate}</span></div> : <div className="bp-task-meta-item" style={{ color:T.beigeDeep }}>No due date</div>}
                    </div>
                    {isExp && (
                      <div className="bp-task-detail">
                        <div className="form-field"><label>Notes</label><textarea value={task.notes} onChange={e => update(si, task.id, 'notes', e.target.value)} style={{ minHeight:60 }} /></div>
                        <div className="flex-col gap-8">
                          <div className="form-field"><label>Due Date</label><input type="date" value={task.dueDate} onChange={e => update(si, task.id, 'dueDate', e.target.value)} /></div>
                          <div className="form-field"><label>Priority</label><select value={task.priority} onChange={e => update(si, task.id, 'priority', e.target.value)}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div>
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
