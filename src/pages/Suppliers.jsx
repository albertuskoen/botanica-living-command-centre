// Suppliers.jsx — v1.4 Production hardened
// Fixes: validation with error display, duplicate name check, null safety, a11y
import { useState, useCallback } from 'react'
import { T } from '../utils/tokens.js'
import { nextId, safeStr, truncate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

const INCOTERMS  = ['EXW','FOB','CIF','DDP','DAP']
const STATUSES   = ['Active','Inactive','Prospective']
const BLANK      = { name:'', contact:'', country:'China', email:'', whatsapp:'', terms:'FOB', notes:'', status:'Active' }

function validate(form, existing, editingId) {
  const errors = {}
  if (!form.name?.trim()) {
    errors.name = 'Supplier name is required'
  } else {
    const dup = existing.find(s => s.name.toLowerCase().trim() === form.name.toLowerCase().trim() && s.id !== editingId)
    if (dup) errors.name = 'A supplier with this name already exists'
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address'
  }
  return errors
}

export default function Suppliers({ suppliers, setSuppliers }) {
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(BLANK)
  const [errors,  setErrors]  = useState({})

  const safe = Array.isArray(suppliers) ? suppliers : []

  const openNew  = useCallback(() => { setEditing(null); setForm(BLANK); setErrors({}); setModal(true) }, [])
  const openEdit = useCallback(s => { setEditing(s.id); setForm({ ...s }); setErrors({}); setModal(true) }, [])
  const closeModal = useCallback(() => { setModal(false); setErrors({}) }, [])

  const save = useCallback(() => {
    const errs = validate(form, safe, editing)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const rec = { ...BLANK, ...form, name: form.name.trim() }
    if (editing != null) {
      setSuppliers(ss => (Array.isArray(ss) ? ss : []).map(s => s.id === editing ? { ...rec, id: editing } : s))
    } else {
      setSuppliers(ss => [...(Array.isArray(ss) ? ss : []), { ...rec, id: nextId(Array.isArray(ss) ? ss : []) }])
    }
    setModal(false)
    setErrors({})
  }, [form, editing, safe, setSuppliers])

  const del = useCallback(id => {
    if (!window.confirm('Remove this supplier? This cannot be undone.')) return
    setSuppliers(ss => (Array.isArray(ss) ? ss : []).filter(s => s.id !== id))
  }, [setSuppliers])

  const F = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: undefined })) }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Suppliers</div><div className="page-subtitle">Import Partner Relationships</div></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Supplier</button>
      </div>
      <div className="page-content">
        {safe.length === 0 ? (
          <div className="empty-st"><div className="empty-ic">◎</div><div>No suppliers yet. Add your first supplier.</div></div>
        ) : (
          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Supplier</th><th>Contact</th><th>Country</th><th>Email</th><th>WhatsApp</th><th>Terms</th><th>Status</th><th>Notes</th><th style={{ width:90 }}></th></tr>
                </thead>
                <tbody>
                  {safe.map(s => s && (
                    <tr key={s.id}>
                      <td className="td-name">{safeStr(s.name)}</td>
                      <td className="td-wrap">{safeStr(s.contact)}</td>
                      <td>{safeStr(s.country)}</td>
                      <td style={{ fontSize:12 }}><a href={`mailto:${s.email}`} style={{ color:T.teal, textDecoration:'none' }}>{safeStr(s.email)}</a></td>
                      <td style={{ fontSize:12 }}>{safeStr(s.whatsapp)}</td>
                      <td><span className="badge badge-gold">{safeStr(s.terms)}</span></td>
                      <td><span className={`badge ${s.status === 'Active' ? 'badge-green' : 'badge-grey'}`}>{safeStr(s.status)}</span></td>
                      <td className="td-wrap" style={{ fontSize:12, color:T.textMid }}>{truncate(safeStr(s.notes), 55)}</td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-outline btn-xs" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>Edit</button>
                          <button className="btn btn-xs btn-ghost" style={{ color:T.textLight }} onClick={() => del(s.id)} aria-label={`Remove ${s.name}`}>✕</button>
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

      <Modal open={modal} onClose={closeModal} title={editing != null ? 'Edit Supplier' : 'New Supplier'}
        footer={<><button className="btn btn-outline" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Supplier</button></>}
      >
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="sup-name">Supplier Name <span style={{ color:T.danger }}>*</span></label>
            <input id="sup-name" value={form.name} onChange={F('name')} placeholder="e.g. Shenzhen Green Arts Co." aria-required="true" style={{ borderColor:errors.name?T.danger:undefined }} />
            {errors.name && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{errors.name}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="sup-contact">Contact Person</label>
            <input id="sup-contact" value={form.contact} onChange={F('contact')} placeholder="e.g. Frank / Dongyi" />
          </div>
          <div className="form-field">
            <label htmlFor="sup-country">Country</label>
            <input id="sup-country" value={form.country} onChange={F('country')} />
          </div>
          <div className="form-field">
            <label htmlFor="sup-email">Email</label>
            <input id="sup-email" type="email" value={form.email} onChange={F('email')} placeholder="name@supplier.com" style={{ borderColor:errors.email?T.danger:undefined }} />
            {errors.email && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{errors.email}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="sup-wa">WhatsApp</label>
            <input id="sup-wa" value={form.whatsapp} onChange={F('whatsapp')} placeholder="+86 xxx xxxx xxxx" />
          </div>
          <div className="form-field">
            <label htmlFor="sup-terms">Incoterms</label>
            <select id="sup-terms" value={form.terms} onChange={F('terms')}>
              {INCOTERMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="sup-status">Status</label>
            <select id="sup-status" value={form.status} onChange={F('status')}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field full">
            <label htmlFor="sup-notes">Notes</label>
            <textarea id="sup-notes" value={form.notes} onChange={F('notes')} placeholder="Payment terms, MOQ requirements, lead times…" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
