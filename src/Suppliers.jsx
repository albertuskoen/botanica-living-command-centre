import { useState } from 'react'
import { nextId } from './format.js'
import { T } from './global.js'

const BLANK = { name: '', contact: '', country: 'China', email: '', whatsapp: '', terms: 'FOB', notes: '', status: 'Active' }

export default function Suppliers({ suppliers, setSuppliers }) {
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(BLANK)

  const openNew  = ()  => { setEditing(null); setForm(BLANK); setModal(true) }
  const openEdit = (s) => { setEditing(s.id); setForm(s);    setModal(true) }
  const save = () => {
    if (!form.name) return
    editing
      ? setSuppliers(ss => ss.map(s => s.id === editing ? { ...form, id: editing } : s))
      : setSuppliers(ss => [...ss, { ...form, id: nextId(ss) }])
    setModal(false)
  }
  const del = id => window.confirm('Remove supplier?') && setSuppliers(ss => ss.filter(s => s.id !== id))
  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Suppliers</div><div className="page-subtitle">Import Partner Relationships</div></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Supplier</button>
      </div>
      <div className="page-content">
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Supplier</th><th>Contact</th><th>Country</th><th>Email</th><th>WhatsApp</th><th>Terms</th><th>Status</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td className="td-name">{s.name}</td>
                    <td>{s.contact}</td>
                    <td>{s.country}</td>
                    <td style={{ fontSize: 12 }}>{s.email}</td>
                    <td style={{ fontSize: 12 }}>{s.whatsapp}</td>
                    <td><span className="badge badge-gold">{s.terms}</span></td>
                    <td><span className={`badge ${s.status === 'Active' ? 'badge-green' : 'badge-grey'}`}>{s.status}</span></td>
                    <td style={{ maxWidth: 200, fontSize: 12 }}>{s.notes?.substring(0, 60)}{s.notes?.length > 60 ? '…' : ''}</td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn btn-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.textLight }} onClick={() => del(s.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Supplier' : 'New Supplier'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-grid">
              <div className="form-field"><label>Supplier Name</label><input value={form.name} onChange={F('name')} /></div>
              <div className="form-field"><label>Contact Person</label><input value={form.contact} onChange={F('contact')} /></div>
              <div className="form-field"><label>Country</label><input value={form.country} onChange={F('country')} /></div>
              <div className="form-field"><label>Email</label><input value={form.email} onChange={F('email')} /></div>
              <div className="form-field"><label>WhatsApp</label><input value={form.whatsapp} onChange={F('whatsapp')} /></div>
              <div className="form-field"><label>Terms</label>
                <select value={form.terms} onChange={F('terms')}><option>EXW</option><option>FOB</option><option>CIF</option></select>
              </div>
              <div className="form-field"><label>Status</label>
                <select value={form.status} onChange={F('status')}><option>Active</option><option>Inactive</option><option>Prospective</option></select>
              </div>
              <div className="form-field full"><label>Notes</label><textarea value={form.notes} onChange={F('notes')} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Supplier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
