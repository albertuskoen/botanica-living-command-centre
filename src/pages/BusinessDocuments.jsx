import { useState, useRef } from 'react'
import { T } from '../utils/tokens.js'
import { nextId, today, fmtDate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

const CATEGORIES = ['CIPC','SARS','Banking','Suppliers','Imports','Finance','Legal','Other']
const DOC_ICONS  = { CIPC:'📋', SARS:'📊', Banking:'🏦', Suppliers:'📦', Imports:'🚢', Finance:'💰', Legal:'⚖', Other:'📄' }
const BLANK = { name:'', category:'CIPC', dateUploaded: today(), notes:'', fileName:'', fileSize:'' }

export default function BusinessDocuments({ documents, setDocuments }) {
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(BLANK)
  const [search, setSearch]     = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const fileRef = useRef()

  const openNew  = ()  => { setEditing(null); setForm({ ...BLANK, dateUploaded: today() }); setModal(true) }
  const openEdit = (d) => { setEditing(d.id); setForm(d); setModal(true) }
  const save = () => {
    if (!form.name) return
    editing
      ? setDocuments(dd => dd.map(d => d.id === editing ? { ...form, id: editing } : d))
      : setDocuments(dd => [...dd, { ...form, id: nextId(dd) }])
    setModal(false)
  }
  const del = id => window.confirm('Remove document?') && setDocuments(dd => dd.filter(d => d.id !== id))
  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    const sizeMB = (file.size / 1024 / 1024).toFixed(2)
    setForm(f => ({ ...f, fileName: file.name, fileSize: `${sizeMB} MB`, name: f.name || file.name.replace(/\.[^/.]+$/, '') }))
    e.target.value = ''
  }

  const visible = documents.filter(d =>
    (filterCat === 'All' || d.category === filterCat) &&
    (d.name.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Business Documents</div>
          <div className="page-subtitle">Official Records · CIPC · SARS · Banking · Suppliers</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Document</button>
      </div>

      <div className="page-content">
        {/* Notice */}
        <div style={{ background:T.goldPale, borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:12, color:'#5a4010', display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:16 }}>ℹ️</span>
          <div><strong>Document Storage:</strong> Document metadata is saved locally in your browser. Actual files are not uploaded to cloud storage in this version. Permanent file storage will require cloud integration (Google Drive / Supabase) in a future version. Store files securely on your own device or Google Drive for now.</div>
        </div>

        {/* Filter bar */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…" style={{ width:220, padding:'7px 12px', fontSize:13 }} />
          {['All',...CATEGORIES].map(c => (
            <button key={c} className={`bp-filter-btn ${filterCat===c?'active':''}`} onClick={() => setFilterCat(c)}>{c}</button>
          ))}
        </div>

        {/* Category summary */}
        <div className="grid-4 mb-20">
          {CATEGORIES.filter(c => documents.some(d => d.category === c)).map(cat => {
            const count = documents.filter(d => d.category === cat).length
            return (
              <div key={cat} className="card" style={{ padding:'14px 16px', cursor:'pointer' }} onClick={() => setFilterCat(cat)}>
                <div style={{ fontSize:20, marginBottom:6 }}>{DOC_ICONS[cat]}</div>
                <div style={{ fontWeight:500, fontSize:13, color:T.forest }}>{cat}</div>
                <div style={{ fontSize:12, color:T.textLight }}>{count} document{count !== 1 ? 's' : ''}</div>
              </div>
            )
          })}
          {documents.length === 0 && (
            <div style={{ gridColumn:'1/-1' }}>
              <div className="empty-state"><div className="empty-icon">📁</div><div>No documents added yet.</div><div style={{ fontSize:12, marginTop:6 }}>Click "+ Add Document" to record CIPC registration, SARS certificates, or supplier catalogues.</div></div>
            </div>
          )}
        </div>

        {/* Document list */}
        {visible.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {visible.map(d => (
              <div className="doc-card" key={d.id}>
                <div className="doc-icon">{DOC_ICONS[d.category] || '📄'}</div>
                <div style={{ flex:1 }}>
                  <div className="doc-name">{d.name}</div>
                  <div className="doc-meta">{d.category} · Added {fmtDate(d.dateUploaded)}{d.fileName ? ` · ${d.fileName}` : ''}{d.fileSize ? ` (${d.fileSize})` : ''}</div>
                  {d.notes && <div style={{ fontSize:12, color:T.textMid, marginTop:4 }}>{d.notes}</div>}
                </div>
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  <button className="btn btn-outline btn-xs" onClick={() => openEdit(d)}>Edit</button>
                  <button className="btn btn-xs" style={{ background:'transparent', border:'none', cursor:'pointer', color:T.textLight }} onClick={() => del(d.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Document' : 'Add Document'}
        footer={<><button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Document</button></>}
      >
        <div className="form-grid">
          <div className="form-field full"><label>Document Name</label><input value={form.name} onChange={F('name')} placeholder="e.g. COR14.3 Certificate" /></div>
          <div className="form-field"><label>Category</label><select value={form.category} onChange={F('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="form-field"><label>Date</label><input type="date" value={form.dateUploaded} onChange={F('dateUploaded')} /></div>
          <div className="form-field full">
            <label>Attach File (metadata only)</label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>Choose File</button>
              <span style={{ fontSize:12, color:T.textMid }}>{form.fileName || 'No file selected'}</span>
            </div>
            <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleFile} />
          </div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes} onChange={F('notes')} placeholder="e.g. Original certificate. Scan stored in Google Drive." /></div>
        </div>
      </Modal>
    </div>
  )
}
