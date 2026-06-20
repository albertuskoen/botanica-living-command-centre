// BusinessProgress.jsx — v1.4 Production hardened
// Fixes: old CSS class names → new design system classes
// Added: safe array guards, progress validation, null safety throughout
import { useState, useCallback } from 'react'
import { T } from '../utils/tokens.js'
import { safeStr, truncate } from '../utils/format.js'

const PRI   = { Critical:'pri-critical', High:'pri-high', Medium:'pri-medium', Low:'pri-low' }
const CHK   = { Completed:'✓', 'In Progress':'◑', 'Not Started':'' }
const CYCLE = ['Not Started','In Progress','Completed']
const STATUSES  = ['All','Completed','In Progress','Not Started']
const PRIORITIES = ['All','Critical','High','Medium','Low']

// Safe helpers
const safeTasks   = sec => Array.isArray(sec?.tasks) ? sec.tasks : []
const safeStatus  = t   => CYCLE.includes(t?.status) ? t.status : 'Not Started'
const selClass    = s   => s === 'Completed' ? 'done' : s === 'In Progress' ? 'prog' : 'not'

export default function BusinessProgress({ progress, setProgress }) {
  const [fStatus,  setFStatus]  = useState('All')
  const [fPri,     setFPri]     = useState('All')
  const [expanded, setExpanded] = useState(null)

  // Guard: progress must be array of sections
  const sections = Array.isArray(progress) ? progress : []

  const all       = sections.flatMap(safeTasks)
  const total     = all.length
  const completed = all.filter(t => t?.status === 'Completed').length
  const inProg    = all.filter(t => t?.status === 'In Progress').length
  const notStart  = all.filter(t => t?.status === 'Not Started').length
  const overall   = total > 0 ? Math.round((completed / total) * 100) : 0

  // Immutable update — never mutates source
  const update = useCallback((si, id, field, val) => {
    setProgress(prev => {
      if (!Array.isArray(prev)) return prev
      return prev.map((sec, i) => {
        if (i !== si) return sec
        return {
          ...sec,
          tasks: safeTasks(sec).map(t => t?.id === id ? { ...t, [field]: val } : t),
        }
      })
    })
  }, [setProgress])

  const cycle = useCallback((si, id, cur) => {
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length]
    update(si, id, 'status', next)
  }, [update])

  const secPct = tasks => {
    if (!Array.isArray(tasks) || tasks.length === 0) return 0
    return Math.round((tasks.filter(t => t?.status === 'Completed').length / tasks.length) * 100)
  }

  const filterTasks = tasks =>
    (Array.isArray(tasks) ? tasks : []).filter(t =>
      t && (fStatus === 'All' || t.status === fStatus) && (fPri === 'All' || t.priority === fPri)
    )

  return (
    <div>
      {/* ── Hero ── */}
      <div className="bp-hero">
        <div style={{ position:'relative' }}>
          <div className="bp-title">Business Progress</div>
          <div className="bp-sub">Botanica Living Group — Full Journey Tracker</div>
        </div>
        <div style={{ textAlign:'right', position:'relative' }}>
          <div className="bp-pct">{overall}%</div>
          <div className="bp-pct-lbl">Overall Completion</div>
          <div className="bp-pbar"><div className="bp-pbar-f" style={{ width:`${overall}%` }} /></div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bp-filters">
        <span className="bp-flabel">Status</span>
        {STATUSES.map(s => (
          <button key={s} className={`bp-fbtn ${fStatus===s?'active':''}`} onClick={() => setFStatus(s)}>{s}</button>
        ))}
        <span className="bp-flabel" style={{ marginLeft:14 }}>Priority</span>
        {PRIORITIES.map(p => (
          <button key={p} className={`bp-fbtn ${fPri===p?'active':''}`} onClick={() => setFPri(p)}>{p}</button>
        ))}
      </div>

      <div className="page-content">
        {/* ── Summary row ── */}
        <div className="bp-sum-row">
          {[
            { num:total,     lbl:'Total Tasks',  color:T.forest },
            { num:completed, lbl:'Completed',    color:T.forestLight },
            { num:inProg,    lbl:'In Progress',  color:T.gold },
            { num:notStart,  lbl:'Not Started',  color:T.textMid },
          ].map(s => (
            <div className="bp-sum-card" key={s.lbl}>
              <div className="bp-sum-num" style={{ color:s.color }}>{s.num}</div>
              <div className="bp-sum-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* ── Sections ── */}
        {sections.map((section, si) => {
          if (!section || !section.section) return null
          const tasks = safeTasks(section)
          const vis   = filterTasks(tasks)
          if (!vis.length) return null
          const pct  = secPct(tasks)
          const done = tasks.filter(t => t?.status === 'Completed').length
          return (
            <div className="bp-section" key={`${section.section}-${si}`}>
              <div className="bp-sec-header">
                <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                  <span style={{ color:T.gold, fontSize:16, flexShrink:0 }}>{section.icon || '◎'}</span>
                  <div className="bp-sec-title">{safeStr(section.section)}</div>
                </div>
                <div className="bp-sec-meta">
                  <span className="bp-sec-count">{done}/{tasks.length}</span>
                  <div className="bp-minibar"><div className="bp-minibar-fill" style={{ width:`${pct}%` }} /></div>
                  <span className="bp-sec-pct">{pct}%</span>
                </div>
              </div>

              {vis.map(task => {
                if (!task || task.id == null) return null
                const isExp = expanded === task.id
                const status = safeStatus(task)
                return (
                  <div className="bp-task" key={task.id}>
                    <div className="bp-task-top">
                      <div className="bp-task-left">
                        <div
                          className={`bp-chk ${status === 'Completed' ? 'done' : status === 'In Progress' ? 'prog' : ''}`}
                          onClick={() => cycle(si, task.id, status)}
                          role="checkbox"
                          aria-checked={status === 'Completed'}
                          tabIndex={0}
                          onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? cycle(si, task.id, status) : null}
                        >
                          {CHK[status] || ''}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div className={`bp-tname ${status === 'Completed' ? 'done' : ''}`}>
                            {safeStr(task.name) || '(unnamed task)'}
                          </div>
                          {task.notes && !isExp && (
                            <div style={{ fontSize:12, color:T.textLight, marginTop:2, overflow:'hidden', textOverflow:'ellipsis' }}>
                              {truncate(task.notes, 80)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bp-tright">
                        {task.priority && <span className={`badge ${PRI[task.priority] || 'badge-grey'}`}>{task.priority}</span>}
                        <select
                          className={`bp-ssel ${selClass(status)}`}
                          value={status}
                          onChange={e => update(si, task.id, 'status', e.target.value)}
                          aria-label="Task status"
                        >
                          <option>Not Started</option>
                          <option>In Progress</option>
                          <option>Completed</option>
                        </select>
                        <button
                          className="bp-expand"
                          onClick={() => setExpanded(isExp ? null : task.id)}
                          aria-expanded={isExp}
                          aria-label={isExp ? 'Collapse task' : 'Expand task'}
                        >
                          {isExp ? '▲ Less' : '▼ More'}
                        </button>
                      </div>
                    </div>

                    <div className="bp-tmeta">
                      <div className="bp-tmi">
                        <span className="bp-tml">Priority:</span>
                        <span>{safeStr(task.priority, 'Medium')}</span>
                      </div>
                      <div className="bp-tmi">
                        <span className="bp-tml">Due:</span>
                        <span style={{ color: task.dueDate ? T.text : T.textMuted }}>
                          {task.dueDate || 'Not set'}
                        </span>
                      </div>
                    </div>

                    {isExp && (
                      <div className="bp-detail">
                        <div className="form-field">
                          <label>Notes</label>
                          <textarea
                            value={safeStr(task.notes)}
                            onChange={e => update(si, task.id, 'notes', e.target.value)}
                            style={{ minHeight:60 }}
                            placeholder="Add notes…"
                          />
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          <div className="form-field">
                            <label>Due Date</label>
                            <input
                              type="date"
                              value={safeStr(task.dueDate)}
                              onChange={e => update(si, task.id, 'dueDate', e.target.value)}
                            />
                          </div>
                          <div className="form-field">
                            <label>Priority</label>
                            <select value={safeStr(task.priority, 'Medium')} onChange={e => update(si, task.id, 'priority', e.target.value)}>
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

        {sections.length === 0 && (
          <div className="empty-st">
            <div className="empty-ic">◐</div>
            <div>No progress sections found.</div>
          </div>
        )}
      </div>
    </div>
  )
}
