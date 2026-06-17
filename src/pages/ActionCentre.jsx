import { useState } from 'react'
import { T } from '../utils/tokens.js'
import { nextId, today } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

const PRIORITIES = ['Critical','High','Medium','Low']
const STATUSES   = ['Not Started','In Progress','Waiting','Completed']
const CATEGORIES = ['Compliance','Finance','Suppliers','Products','Sales','Operations','Digital','Other']
const PRI_COLOR  = { Critical:'pri-critical', High:'pri-high', Medium:'pri-medium', Low:'pri-low' }
const BLANK = { name:'', priority:'High', status:'Not Started', dueDate:'', notes:'', category:'Other' }

export default function ActionCentre({ tasks, setTasks }) {
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(BLANK)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPri, setFilterPri]       = useState('All')

  const openNew  = ()  => { setEditing(null); setForm({ ...BLANK, dueDate: today() }); setModal(true) }
  const openEdit = (t) => { setEditing(t.id); setForm(t); setModal(true) }
  const save = () => {
    if (!form.name) return
    editing
      ? setTasks(tt => tt.map(t => t.id === editing ? { ...form, id: editing } : t))
      : setTasks(tt => [...tt, { ...form, id: nextId(tt) }])
    setModal(false)
  }
  const del       = id => window.confirm('Delete task?') && setTasks(tt => tt.filter(t => t.id !== id))
  const toggleDone = t => setTasks(tt => tt.map(x => x.id === t.id ? { ...x, status: x.status === 'Completed' ? 'Not Started' : 'Completed' } : x))
  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const filtered = tasks.filter(t =>
    (filterStatus === 'All' || t.status === filterStatus) &&
    (filterPri === 'All' || t.priority === filterPri)
  ).sort((a, b) => {
    const po = { Critical:0, High:1, Medium:2, Low:3 }
    return (po[a.priority] ?? 4) - (po[b.priority] ?? 4)
  })

  const counts = {
    open: tasks.filter(t => t.status !== 'Completed').length,
    done: tasks.filter(t => t.status === 'Completed').length,
    crit: tasks.filter(t => t.priority === 'Critical' && t.status !== 'Completed').length,
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

      <div style={{ background:T.white, borderBottom:`1px solid ${T.beigeDeep}`, padding:'16px 36px', display:'flex', gap:24 }}>
        {[
          { label:'Open Tasks', val:counts.open, color:T.forest },
          { label:'Critical',   val:counts.crit, color:T.danger },
          { label:'Completed',  val:counts.done, color:T.forestLight },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:s.color }}>{s.val}</span>
            <span style={{ fontSize:11, color:T.textLight, letterSpacing:'0.08em', textTransform:'uppercase' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="page-content">
        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          <span style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:T.textLight, alignSelf:'center' }}>Status</span>
          {['All',...STATUSES].map(s => (
            <button key={s} className={`bp-filter-btn ${filterStatus===s?'active':''}`} onClick={() => setFilterStatus(s)}>{s}</button>
          ))}
          <span style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:T.textLight, alignSelf:'center', marginLeft:8 }}>Priority</span>
          {['All',...PRIORITIES].map(p => (
            <button key={p} className={`bp-filter-btn ${filterPri===p?'active':''}`} onClick={() => setFilterPri(p)}>{p}</button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="empty-state"><div className="empty-icon">✓</div><div>No tasks match the current filter.</div></div>
          : filtered.map(task => (
            <div className="action-card" key={task.id}>
              <div className="action-top">
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, flex:1 }}>
                  <div
                    style={{ width:17, height:17, borderRadius:4, border:`1.5px solid ${task.status === 'Completed' ? T.forestLight : T.beigeDeep}`, cursor:'pointer', background: task.status === 'Completed' ? T.forestLight : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:T.white, flexShrink:0, marginTop:2 }}
                    onClick={() => toggleDone(task)}
                  >{task.status === 'Completed' ? '✓' : ''}</div>
                  <div>
                    <div className={`action-name ${task.status === 'Completed' ? 'done' : ''}`}>{task.name}</div>
                    {task.notes && <div style={{ fontSize:12, color:T.textLight, marginTop:2 }}>{task.notes}</div>}
                    <div className="action-meta">
                      <span className={`badge ${PRI_COLOR[task.priority]}`}>{task.priority}</span>
                      <span className="badge badge-grey">{task.status}</span>
                      {task.category && <span className="badge badge-grey">{task.category}</span>}
                      {task.dueDate && <span style={{ fontSize:11, color:T.textLight }}>Due: {task.dueDate}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  <button className="btn btn-outline btn-xs" onClick={() => openEdit(task)}>Edit</button>
                  <button className="btn btn-xs" style={{ background:'transparent', border:'none', cursor:'pointer', color:T.textLight }} onClick={() => del(task.id)}>✕</button>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Task' : 'New Task'}
        footer={<><button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Task</button></>}
      >
        <div className="form-grid">
          <div className="form-field full"><label>Task Name</label><input value={form.name} onChange={F('name')} placeholder="e.g. Complete importer registration" /></div>
          <div className="form-field"><label>Priority</label><select value={form.priority} onChange={F('priority')}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
          <div className="form-field"><label>Status</label><select value={form.status} onChange={F('status')}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
          <div className="form-field"><label>Category</label><select value={form.category} onChange={F('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="form-field"><label>Due Date</label><input type="date" value={form.dueDate} onChange={F('dueDate')} /></div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes} onChange={F('notes')} /></div>
        </div>
      </Modal>
    </div>
  )
}
