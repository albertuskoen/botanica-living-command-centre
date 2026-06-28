// ActionCentre.jsx — v1.4 Production hardened
// Fixes: T.white / T.beigeDeep token refs → valid tokens
// Added: form validation with error display, safe array guards, a11y
import { useState, useCallback } from 'react'
import { T } from '../utils/tokens.js'
import { nextId, today, safeStr, truncate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

const PRIORITIES = ['Critical','High','Medium','Low']
const STATUSES   = ['Not Started','In Progress','Waiting','Completed']
const CATEGORIES = ['Compliance','Finance','Suppliers','Products','Sales','Operations','Digital','Other']
const PRI_COLOR  = { Critical:'pri-critical', High:'pri-high', Medium:'pri-medium', Low:'pri-low' }
const BLANK      = { name:'', priority:'High', status:'Not Started', dueDate:'', notes:'', category:'Other' }

// Validation
function validate(form) {
  const errors = {}
  if (!form.name?.trim()) errors.name = 'Task name is required'
  else if (form.name.trim().length < 3) errors.name = 'Task name must be at least 3 characters'
  return errors
}

export default function ActionCentre({ tasks, setTasks }) {
  const [modal,        setModal]        = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [form,         setForm]         = useState(BLANK)
  const [errors,       setErrors]       = useState({})
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPri,    setFilterPri]    = useState('All')

  const safeTasks = Array.isArray(tasks) ? tasks : []

  const openNew  = useCallback(() => { setEditing(null); setForm({ ...BLANK, dueDate: today() }); setErrors({}); setModal(true) }, [])
  const openEdit = useCallback(t => { setEditing(t.id); setForm({ ...t }); setErrors({}); setModal(true) }, [])
  const closeModal = useCallback(() => { setModal(false); setErrors({}) }, [])

  const save = useCallback(() => {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const rec = { ...BLANK, ...form, name: form.name.trim() }
    if (editing != null) {
      setTasks(tt => (Array.isArray(tt) ? tt : []).map(t => t.id === editing ? { ...rec, id: editing } : t))
    } else {
      setTasks(tt => [...(Array.isArray(tt) ? tt : []), { ...rec, id: nextId(Array.isArray(tt) ? tt : []) }])
    }
    setModal(false)
    setErrors({})
  }, [form, editing, setTasks])

  const del = useCallback(id => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return
    setTasks(tt => (Array.isArray(tt) ? tt : []).filter(t => t.id !== id))
  }, [setTasks])

  const toggleDone = useCallback(t => {
    setTasks(tt => (Array.isArray(tt) ? tt : []).map(x =>
      x.id === t.id ? { ...x, status: x.status === 'Completed' ? 'Not Started' : 'Completed' } : x
    ))
  }, [setTasks])

  const F = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: undefined })) }

  const filtered = safeTasks
    .filter(t => t && (filterStatus === 'All' || t.status === filterStatus) && (filterPri === 'All' || t.priority === filterPri))
    .sort((a, b) => {
      const po = { Critical:0, High:1, Medium:2, Low:3 }
      return (po[a?.priority] ?? 4) - (po[b?.priority] ?? 4)
    })

  const counts = {
    open: safeTasks.filter(t => t?.status !== 'Completed').length,
    done: safeTasks.filter(t => t?.status === 'Completed').length,
    crit: safeTasks.filter(t => t?.priority === 'Critical' && t?.status !== 'Completed').length,
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Action Centre</div>
          <div className="page-subtitle">Tasks · Priorities · Next Actions</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Task</button>
      </div>

      {/* Stats bar */}
      <div style={{ background:'rgba(255,255,255,0.6)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${T.beigeDeep}`, padding:'14px 36px', display:'flex', gap:24, flexWrap:'wrap' }}>
        {[
          { label:'Open Tasks', val:counts.open, color:T.forest },
          { label:'Critical',   val:counts.crit, color:T.danger },
          { label:'Completed',  val:counts.done, color:T.forestLight },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:s.color, lineHeight:1 }}>{s.val}</span>
            <span style={{ fontSize:11, color:T.textLight, letterSpacing:'0.08em', textTransform:'uppercase' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="page-content">
        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:T.textLight }}>Status</span>
          {['All',...STATUSES].map(s => (
            <button key={s} className={`bp-fbtn ${filterStatus===s?'active':''}`} onClick={() => setFilterStatus(s)}>{s}</button>
          ))}
          <span style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:T.textLight, marginLeft:8 }}>Priority</span>
          {['All',...PRIORITIES].map(p => (
            <button key={p} className={`bp-fbtn ${filterPri===p?'active':''}`} onClick={() => setFilterPri(p)}>{p}</button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="empty-st"><div className="empty-ic">✓</div><div>No tasks match the current filter.</div></div>
          : filtered.map(task => {
            if (!task || task.id == null) return null
            return (
              <div className="action-card" key={task.id} role="article" aria-label={`Task: ${task.name}`}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, flex:1, minWidth:0 }}>
                    {/* Checkbox */}
                    <div
                      role="checkbox"
                      aria-checked={task.status === 'Completed'}
                      tabIndex={0}
                      style={{
                        width:18, height:18, borderRadius:4, flexShrink:0, marginTop:2,
                        border:`1.5px solid ${task.status === 'Completed' ? T.forestLight : T.beigeDeep}`,
                        cursor:'pointer', background: task.status === 'Completed' ? T.forestLight : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:10, color:T.white, transition:'all 0.15s',
                      }}
                      onClick={() => toggleDone(task)}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggleDone(task)}
                    >
                      {task.status === 'Completed' ? '✓' : ''}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div
                        style={{
                          fontSize:13, fontWeight:600, lineHeight:1.4,
                          textDecoration: task.status === 'Completed' ? 'line-through' : 'none',
                          color: task.status === 'Completed' ? T.textLight : T.text,
                          overflowWrap:'break-word',
                        }}
                      >
                        {safeStr(task.name) || '(unnamed)'}
                      </div>
                      {task.notes && (
                        <div style={{ fontSize:12, color:T.textLight, marginTop:2, overflowWrap:'break-word' }}>
                          {truncate(task.notes, 120)}
                        </div>
                      )}
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:7 }}>
                        {task.priority && <span className={`badge ${PRI_COLOR[task.priority] || 'badge-grey'}`}>{task.priority}</span>}
                        <span className="badge badge-grey">{task.status}</span>
                        {task.category && <span className="badge badge-grey">{task.category}</span>}
                        {task.dueDate && <span style={{ fontSize:11, color:T.textLight, alignSelf:'center' }}>Due: {task.dueDate}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    <button className="btn btn-outline btn-xs" onClick={() => openEdit(task)} aria-label="Edit task">Edit</button>
                    <button
                      className="btn btn-xs btn-ghost"
                      style={{ color:T.textLight }}
                      onClick={() => del(task.id)}
                      aria-label="Delete task"
                    >✕</button>
                  </div>
                </div>
              </div>
            )
          })
        }
      </div>

      <Modal open={modal} onClose={closeModal} title={editing != null ? 'Edit Task' : 'New Task'}
        footer={
          <>
            <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save Task</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-field full">
            <label htmlFor="task-name">Task Name <span style={{ color:T.danger }}>*</span></label>
            <input
              id="task-name"
              value={form.name}
              onChange={F('name')}
              placeholder="e.g. Complete importer registration"
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'task-name-err' : undefined}
              style={{ borderColor: errors.name ? T.danger : undefined }}
            />
            {errors.name && <div id="task-name-err" role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{errors.name}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="task-priority">Priority</label>
            <select id="task-priority" value={form.priority} onChange={F('priority')}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="task-status">Status</label>
            <select id="task-status" value={form.status} onChange={F('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="task-category">Category</label>
            <select id="task-category" value={form.category} onChange={F('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="task-due">Due Date</label>
            <input id="task-due" type="date" value={form.dueDate} onChange={F('dueDate')} />
          </div>
          <div className="form-field full">
            <label htmlFor="task-notes">Notes</label>
            <textarea id="task-notes" value={form.notes} onChange={F('notes')} placeholder="Optional notes…" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
