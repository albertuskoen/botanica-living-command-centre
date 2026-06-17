import { useState } from 'react'
import { USD, nextId } from './format.js'
import { T } from './global.js'

const BLANK = { name: '', category: 'Trees', supplier: '', sku: '', height: '', moq: '', exwPrice: '', fobPrice: '', cifPrice: '', sampleCost: '', leadTime: '', assembly: false, foundersCollection: false, sampleStatus: 'Pending' }

export default function Products({ products, setProducts, suppliers }) {
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter]   = useState('All')
  const [form, setForm]       = useState({ ...BLANK, supplier: suppliers[0]?.name || '' })

  const cats     = ['All', ...Array.from(new Set(products.map(p => p.category)))]
  const filtered = filter === 'All' ? products : products.filter(p => p.category === filter)

  const openNew  = ()  => { setEditing(null); setForm({ ...BLANK, supplier: suppliers[0]?.name || '' }); setModal(true) }
  const openEdit = (p) => { setEditing(p.id); setForm(p); setModal(true) }
  const save = () => {
    if (!form.name) return
    editing
      ? setProducts(pp => pp.map(p => p.id === editing ? { ...form, id: editing } : p))
      : setProducts(pp => [...pp, { ...form, id: nextId(pp) }])
    setModal(false)
  }
  const del = id => window.confirm('Remove product?') && setProducts(pp => pp.filter(p => p.id !== id))
  const F = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Products</div><div className="page-subtitle">SKU & Catalogue Management</div></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Product</button>
      </div>
      <div className="page-content">
        <div className="tabs">
          {cats.map(c => <div key={c} className={`tab ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>{c}</div>)}
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Supplier</th><th>SKU</th><th>Height</th><th>MOQ</th><th>EXW</th><th>FOB</th><th>CIF</th><th>Assembly</th><th>Founders</th><th>Sample</th><th></th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="td-name">{p.name}</td>
                    <td><span className="badge badge-grey">{p.category}</span></td>
                    <td style={{ fontSize: 12 }}>{p.supplier}</td>
                    <td style={{ fontSize: 11, color: T.textLight, fontFamily: 'monospace' }}>{p.sku}</td>
                    <td style={{ fontSize: 12 }}>{p.height}</td>
                    <td className="td-mono">{p.moq}</td>
                    <td className="td-mono">{USD(p.exwPrice)}</td>
                    <td className="td-mono">{USD(p.fobPrice)}</td>
                    <td className="td-mono">{USD(p.cifPrice)}</td>
                    <td>{p.assembly ? '✓' : <span style={{ color: T.textLight }}>—</span>}</td>
                    <td>{p.foundersCollection ? <span style={{ color: T.gold }}>✦</span> : <span style={{ color: T.textLight }}>—</span>}</td>
                    <td><span className={`badge ${p.sampleStatus === 'Received' ? 'badge-green' : p.sampleStatus === 'Ordered' ? 'badge-gold' : 'badge-grey'}`}>{p.sampleStatus}</span></td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                        <button className="btn btn-sm" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.textLight }} onClick={() => del(p.id)}>✕</button>
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
          <div className="modal" style={{ width: 760 }}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Product' : 'New Product'}</div>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-grid">
              <div className="form-field full"><label>Product Name</label><input value={form.name} onChange={F('name')} /></div>
              <div className="form-field"><label>Category</label>
                <select value={form.category} onChange={F('category')}>{['Trees','Pot Plants','Hanging','Panels','Other'].map(c => <option key={c}>{c}</option>)}</select>
              </div>
              <div className="form-field"><label>Supplier</label>
                <select value={form.supplier} onChange={F('supplier')}>{suppliers.map(s => <option key={s.id}>{s.name}</option>)}</select>
              </div>
              <div className="form-field"><label>Supplier SKU</label><input value={form.sku} onChange={F('sku')} /></div>
              <div className="form-field"><label>Height / Size</label><input value={form.height} onChange={F('height')} /></div>
              <div className="form-field"><label>MOQ</label><input type="number" value={form.moq} onChange={F('moq')} /></div>
              <div className="form-field"><label>Lead Time</label><input value={form.leadTime} onChange={F('leadTime')} /></div>
              <div className="form-field"><label>EXW Price (USD)</label><input type="number" value={form.exwPrice} onChange={F('exwPrice')} /></div>
              <div className="form-field"><label>FOB Price (USD)</label><input type="number" value={form.fobPrice} onChange={F('fobPrice')} /></div>
              <div className="form-field"><label>CIF Price (USD)</label><input type="number" value={form.cifPrice} onChange={F('cifPrice')} /></div>
              <div className="form-field"><label>Sample Cost (USD)</label><input type="number" value={form.sampleCost} onChange={F('sampleCost')} /></div>
              <div className="form-field"><label>Sample Status</label>
                <select value={form.sampleStatus} onChange={F('sampleStatus')}><option>Pending</option><option>Ordered</option><option>Received</option></select>
              </div>
              <div className="form-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.assembly} onChange={F('assembly')} style={{ width: 16, height: 16 }} /> Assembly Required
                </label>
              </div>
              <div className="form-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.foundersCollection} onChange={F('foundersCollection')} style={{ width: 16, height: 16 }} /> Founders Collection
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
