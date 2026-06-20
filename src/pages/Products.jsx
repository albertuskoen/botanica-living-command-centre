// Products.jsx — v1.4 Production hardened
// Fixes: validation, duplicate SKU check, parseNum on price fields, null safety, a11y
import { useState, useCallback, useMemo } from 'react'
import { T } from '../utils/tokens.js'
import { USD, nextId, parseNum, safeStr } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

const CATEGORIES   = ['Trees','Pot Plants','Hanging','Panels','Topiaries','Other']
const SAMPLE_STATS = ['Pending','Ordered','Received']
const BLANK = {
  name:'', category:'Trees', supplier:'', sku:'', height:'', moq:'',
  exwPrice:'', fobPrice:'', cifPrice:'', sampleCost:'', leadTime:'',
  assembly:false, foundersCollection:false, sampleStatus:'Pending', notes:'',
}

function validate(form, existing, editingId) {
  const errors = {}
  if (!form.name?.trim()) errors.name = 'Product name is required'
  if (form.sku?.trim()) {
    const dup = existing.find(p => p.sku?.toLowerCase().trim() === form.sku.toLowerCase().trim() && p.id !== editingId)
    if (dup) errors.sku = `SKU "${form.sku}" is already used by "${dup.name}"`
  }
  const prices = [parseNum(form.exwPrice), parseNum(form.fobPrice), parseNum(form.cifPrice)]
  if (prices.every(p => p <= 0)) errors.price = 'Enter at least one price (EXW, FOB, or CIF)'
  if (parseNum(form.moq) < 0) errors.moq = 'MOQ cannot be negative'
  return errors
}

export default function Products({ products, setProducts, suppliers }) {
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter,  setFilter]  = useState('All')
  const [errors,  setErrors]  = useState({})
  const [form,    setForm]    = useState(() => ({ ...BLANK, supplier: suppliers?.[0]?.name || '' }))

  const safe = Array.isArray(products)  ? products  : []
  const safeS = Array.isArray(suppliers) ? suppliers : []

  const cats = useMemo(() => ['All', ...Array.from(new Set(safe.map(p => p?.category).filter(Boolean)))], [safe])
  const filtered = useMemo(() => filter === 'All' ? safe : safe.filter(p => p?.category === filter), [safe, filter])

  const openNew  = useCallback(() => {
    setEditing(null)
    setForm({ ...BLANK, supplier: safeS[0]?.name || '' })
    setErrors({})
    setModal(true)
  }, [safeS])

  const openEdit = useCallback(p => {
    setEditing(p.id)
    setForm({ ...BLANK, ...p })
    setErrors({})
    setModal(true)
  }, [])

  const closeModal = useCallback(() => { setModal(false); setErrors({}) }, [])

  const save = useCallback(() => {
    const errs = validate(form, safe, editing)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const rec = {
      ...BLANK, ...form,
      name:      form.name.trim(),
      sku:       form.sku?.trim() || '',
      exwPrice:  parseNum(form.exwPrice),
      fobPrice:  parseNum(form.fobPrice),
      cifPrice:  parseNum(form.cifPrice),
      sampleCost:parseNum(form.sampleCost),
      moq:       parseNum(form.moq) || form.moq,
    }
    if (editing != null) {
      setProducts(pp => (Array.isArray(pp) ? pp : []).map(p => p.id === editing ? { ...rec, id: editing } : p))
    } else {
      setProducts(pp => [...(Array.isArray(pp) ? pp : []), { ...rec, id: nextId(Array.isArray(pp) ? pp : []) }])
    }
    setModal(false)
    setErrors({})
  }, [form, editing, safe, setProducts])

  const del = useCallback(id => {
    if (!window.confirm('Remove this product? This cannot be undone.')) return
    setProducts(pp => (Array.isArray(pp) ? pp : []).filter(p => p.id !== id))
  }, [setProducts])

  const F = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
    setErrors(er => ({ ...er, [k]: undefined, price: undefined }))
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Products</div><div className="page-subtitle">SKU & Catalogue Management</div></div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Product</button>
      </div>
      <div className="page-content">
        {cats.length > 1 && (
          <div className="tabs">
            {cats.map(c => (
              <div key={c} className={`tab ${filter===c?'active':''}`} onClick={() => setFilter(c)} role="tab" aria-selected={filter===c}>{c}</div>
            ))}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="empty-st"><div className="empty-ic">❧</div><div>No products found. Add your first product.</div></div>
        ) : (
          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Category</th><th>Supplier</th><th>SKU</th><th>Height</th><th>MOQ</th><th>EXW</th><th>FOB</th><th>CIF</th><th>Asm</th><th>FC</th><th>Sample</th><th style={{ width:90 }}></th></tr>
                </thead>
                <tbody>
                  {filtered.map(p => p && (
                    <tr key={p.id}>
                      <td className="td-name">{safeStr(p.name)}</td>
                      <td><span className="badge badge-grey">{safeStr(p.category)}</span></td>
                      <td style={{ fontSize:12 }}>{safeStr(p.supplier)}</td>
                      <td style={{ fontSize:11, color:T.textLight, fontFamily:'monospace' }}>{safeStr(p.sku)}</td>
                      <td style={{ fontSize:12 }}>{safeStr(p.height)}</td>
                      <td className="td-num">{safeStr(p.moq)}</td>
                      <td className="td-num">{p.exwPrice > 0 ? USD(p.exwPrice) : <span style={{ color:T.textMuted }}>—</span>}</td>
                      <td className="td-num">{p.fobPrice > 0 ? USD(p.fobPrice) : <span style={{ color:T.textMuted }}>—</span>}</td>
                      <td className="td-num">{p.cifPrice > 0 ? USD(p.cifPrice) : <span style={{ color:T.textMuted }}>—</span>}</td>
                      <td style={{ textAlign:'center' }}>{p.assembly ? <span style={{ color:T.green }}>✓</span> : <span style={{ color:T.textMuted }}>—</span>}</td>
                      <td style={{ textAlign:'center' }}>{p.foundersCollection ? <span style={{ color:T.gold }}>✦</span> : <span style={{ color:T.textMuted }}>—</span>}</td>
                      <td><span className={`badge ${p.sampleStatus==='Received'?'badge-green':p.sampleStatus==='Ordered'?'badge-gold':'badge-grey'}`}>{safeStr(p.sampleStatus)}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-outline btn-xs" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>Edit</button>
                          <button className="btn btn-xs btn-ghost" style={{ color:T.textLight }} onClick={() => del(p.id)} aria-label={`Remove ${p.name}`}>✕</button>
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

      <Modal open={modal} onClose={closeModal} title={editing != null ? 'Edit Product' : 'New Product'} size="modal-lg"
        footer={<><button className="btn btn-outline" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Product</button></>}
      >
        <div className="form-grid">
          <div className="form-field full">
            <label htmlFor="prod-name">Product Name <span style={{ color:T.danger }}>*</span></label>
            <input id="prod-name" value={form.name} onChange={F('name')} placeholder="e.g. Large Fiddle Leaf Fig 180cm" aria-required="true" style={{ borderColor:errors.name?T.danger:undefined }} />
            {errors.name && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{errors.name}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="prod-cat">Category</label>
            <select id="prod-cat" value={form.category} onChange={F('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="prod-sup">Supplier</label>
            <select id="prod-sup" value={form.supplier} onChange={F('supplier')}>
              {safeS.length > 0
                ? safeS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                : <option value="">— Add suppliers first —</option>
              }
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="prod-sku">SKU</label>
            <input id="prod-sku" value={form.sku} onChange={F('sku')} placeholder="e.g. FLF-180-GRN" style={{ borderColor:errors.sku?T.danger:undefined }} />
            {errors.sku && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{errors.sku}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="prod-h">Height / Size</label>
            <input id="prod-h" value={form.height} onChange={F('height')} placeholder="e.g. 180cm" />
          </div>
          <div className="form-field">
            <label htmlFor="prod-moq">MOQ</label>
            <input id="prod-moq" type="text" inputMode="decimal" value={form.moq} onChange={F('moq')} placeholder="e.g. 10" style={{ borderColor:errors.moq?T.danger:undefined }} />
            {errors.moq && <div role="alert" style={{ fontSize:11, color:T.danger, marginTop:3 }}>{errors.moq}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="prod-lead">Lead Time</label>
            <input id="prod-lead" value={form.leadTime} onChange={F('leadTime')} placeholder="e.g. 30–45 days" />
          </div>

          {/* Pricing section */}
          <div className="form-field full">
            {errors.price && <div role="alert" style={{ fontSize:11, color:T.danger, padding:'6px 10px', background:T.redPale, borderRadius:6, marginBottom:6 }}>{errors.price}</div>}
          </div>
          <div className="form-field">
            <label htmlFor="prod-exw">EXW Price (USD)</label>
            <input id="prod-exw" type="text" inputMode="decimal" value={form.exwPrice} onChange={F('exwPrice')} placeholder="0" />
          </div>
          <div className="form-field">
            <label htmlFor="prod-fob">FOB Price (USD)</label>
            <input id="prod-fob" type="text" inputMode="decimal" value={form.fobPrice} onChange={F('fobPrice')} placeholder="0" />
          </div>
          <div className="form-field">
            <label htmlFor="prod-cif">CIF Price (USD)</label>
            <input id="prod-cif" type="text" inputMode="decimal" value={form.cifPrice} onChange={F('cifPrice')} placeholder="0" />
          </div>
          <div className="form-field">
            <label htmlFor="prod-sc">Sample Cost (USD)</label>
            <input id="prod-sc" type="text" inputMode="decimal" value={form.sampleCost} onChange={F('sampleCost')} placeholder="0" />
          </div>
          <div className="form-field">
            <label htmlFor="prod-ss">Sample Status</label>
            <select id="prod-ss" value={form.sampleStatus} onChange={F('sampleStatus')}>
              {SAMPLE_STATS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field full">
            <label htmlFor="prod-notes">Notes</label>
            <textarea id="prod-notes" value={form.notes || ''} onChange={F('notes')} placeholder="Optional notes about this product…" />
          </div>
          <div className="form-field">
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', textTransform:'none', letterSpacing:0, fontSize:13 }}>
              <input type="checkbox" checked={!!form.assembly} onChange={F('assembly')} style={{ width:16, height:16, flexShrink:0 }} aria-label="Assembly required" />
              Assembly Required
            </label>
          </div>
          <div className="form-field">
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', textTransform:'none', letterSpacing:0, fontSize:13 }}>
              <input type="checkbox" checked={!!form.foundersCollection} onChange={F('foundersCollection')} style={{ width:16, height:16, flexShrink:0 }} aria-label="Founders Collection" />
              <span style={{ color:T.gold }}>✦</span> Founders Collection
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
