import { useState, useRef } from 'react'
import { T } from '../utils/tokens.js'
import { nextId, today, fmtDate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

const CATEGORIES = ['CIPC','SARS','Banking','Suppliers','Imports','Finance','Legal','Other']
const DOC_ICONS  = { CIPC:'📋', SARS:'📊', Banking:'🏦', Suppliers:'📦', Imports:'🚢', Finance:'💰', Legal:'⚖', Other:'📄' }
const CAT_COLORS = {
  CIPC:      [T.greenPale,   T.green],
  SARS:      [T.goldPale,    T.gold],
  Banking:   [T.bluePale,    T.blue],
  Suppliers: [T.tealPale,    T.teal],
  Imports:   [T.redPale,     T.danger],
  Finance:   [T.greenPale,   T.forestLight],
  Legal:     [T.goldPale,    '#92650A'],
  Other:     ['rgba(161,161,170,0.1)', T.textMid],
}
const BLANK = { name:'', category:'CIPC', dateUploaded:today(), notes:'', fileName:'', fileSize:'' }

export default function BusinessDocuments({ documents, setDocuments }) {
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(BLANK)
  const [search,    setSearch]    = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [dragOver,  setDragOver]  = useState(false)
  const [selected,  setSelected]  = useState(null)
  const fileRef = useRef()

  const openNew  = ()  => { setEditing(null); setForm({ ...BLANK, dateUploaded:today() }); setModal(true) }
  const openEdit = d   => { setEditing(d.id); setForm(d); setModal(true) }
  const save = () => {
    if (!form.name) return
    editing
      ? setDocuments(dd => dd.map(d => d.id === editing ? { ...form, id:editing } : d))
      : setDocuments(dd => [...dd, { ...form, id:nextId(dd) }])
    setModal(false)
  }
  const del = id => window.confirm('Remove document?') && setDocuments(dd => dd.filter(d => d.id !== id))
  const F   = k  => e => setForm(f => ({ ...f, [k]:e.target.value }))

  const processFile = file => {
    if (!file) return
    const sizeMB = (file.size / 1024 / 1024).toFixed(2)
    setForm(f => ({ ...f, fileName:file.name, fileSize:`${sizeMB} MB`, name:f.name||file.name.replace(/\.[^/.]+$/,'') }))
  }
  const onFilePick = e => { processFile(e.target.files[0]); e.target.value='' }
  const onDrop = e => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setEditing(null)
      setForm({ ...BLANK, dateUploaded:today() })
      processFile(file)
      setModal(true)
    }
  }

  const visible = documents.filter(d =>
    (filterCat === 'All' || d.category === filterCat) &&
    (d.name.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()))
  )
  const selectedDoc = selected ? documents.find(d => d.id === selected) : null

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
        <div style={{ background:T.goldPale, border:`1px solid rgba(184,151,90,0.22)`, borderRadius:12, padding:'12px 18px', marginBottom:22, fontSize:12, color:'#6B4E10', display:'flex', gap:12, alignItems:'flex-start' }}>
          <span style={{ fontSize:16, flexShrink:0 }}>ℹ</span>
          <div><strong>Document Storage:</strong> Metadata saved locally in your browser. Actual files are not stored in the cloud in this version — permanent cloud storage via Google Drive / Supabase will be added in a future release.</div>
        </div>

        {/* Drop zone */}
        <div
          className={`doc-drop-zone mb20 ${dragOver ? 'over' : ''}`}
          style={{ marginBottom:24 }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={openNew}
        >
          <div style={{ fontSize:36, opacity:0.4, marginBottom:12 }}>⬆</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.forest, marginBottom:6 }}>
            {dragOver ? 'Drop to add document' : 'Drag & drop a file, or click to add'}
          </div>
          <div style={{ fontSize:12, color:T.textLight }}>PDF · Image · Word · Excel · Any file type</div>
        </div>

        {/* Category grid */}
        <div className="sec-label">Categories</div>
        <div className="grid-4" style={{ marginBottom:24, gap:12 }}>
          <div
            className="g-card g-card-click"
            style={{ padding:'16px 18px', textAlign:'center', border: filterCat==='All' ? `1.5px solid ${T.gold}` : undefined }}
            onClick={() => setFilterCat('All')}
          >
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, color:T.forest, marginBottom:4 }}>{documents.length}</div>
            <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:T.textLight, fontWeight:600 }}>All</div>
          </div>
          {CATEGORIES.filter(c => documents.some(d => d.category === c)).map(cat => {
            const count  = documents.filter(d => d.category === cat).length
            const [bg, color] = CAT_COLORS[cat] || ['rgba(161,161,170,0.1)', T.textMid]
            return (
              <div
                key={cat}
                className="g-card g-card-click"
                style={{ padding:'14px 16px', border: filterCat===cat ? `1.5px solid ${T.gold}` : undefined }}
                onClick={() => setFilterCat(filterCat===cat ? 'All' : cat)}
              >
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{DOC_ICONS[cat]}</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:T.forest }}>{cat}</div>
                    <div style={{ fontSize:11, color }}>{count} doc{count!==1?'s':''}</div>
                  </div>
                </div>
                <div className="pbar">
                  <div className="pbar-fill pbar-gold" style={{ width:`${(count/Math.max(documents.length,1))*100}%` }} />
                </div>
              </div>
            )
          })}
          {documents.length === 0 && (
            <div style={{ gridColumn:'1/-1' }}>
              <div className="empty-st">
                <div className="empty-ic">📁</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, marginBottom:6 }}>No documents yet</div>
                <div style={{ fontSize:13, color:T.textMid }}>Add your first document — CIPC certificate, SARS registration, or supplier catalogue.</div>
              </div>
            </div>
          )}
        </div>

        {/* Search + filter */}
        {documents.length > 0 && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:200 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents…" style={{ paddingLeft:36 }} />
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textLight, pointerEvents:'none' }}>⊙</span>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['All',...CATEGORIES].map(c => (
                  <button key={c} className={`bp-fbtn ${filterCat===c?'active':''}`} onClick={() => setFilterCat(c)}>{c}</button>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns: selectedDoc ? '1fr 340px' : '1fr', gap:16, alignItems:'start' }}>
              {/* Document list */}
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {visible.length === 0 && <div className="empty-st"><div className="empty-ic">🔍</div><div>No documents match that filter.</div></div>}
                {visible.map(d => {
                  const [catBg, catColor] = CAT_COLORS[d.category] || ['rgba(161,161,170,0.1)', T.textMid]
                  const isSel = selected === d.id
                  return (
                    <div
                      key={d.id}
                      className="doc-card"
                      style={{ border: isSel ? `1.5px solid ${T.gold}` : undefined, boxShadow: isSel ? `0 0 0 3px rgba(184,151,90,0.12), 0 8px 24px rgba(15,35,24,0.1)` : undefined }}
                      onClick={() => setSelected(isSel ? null : d.id)}
                    >
                      <div className="doc-icon" style={{ background:`linear-gradient(145deg, ${catBg}, rgba(255,255,255,0.3))` }}>
                        {DOC_ICONS[d.category]||'📄'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:T.forest }}>{d.name}</div>
                        <div style={{ fontSize:11, color:T.textLight, marginTop:2 }}>
                          <span style={{ color:catColor, fontWeight:600 }}>{d.category}</span>
                          {' · '}Added {fmtDate(d.dateUploaded)}
                          {d.fileName && <> · <span style={{ fontFamily:'monospace', fontSize:10 }}>{d.fileName}</span></>}
                          {d.fileSize && <> <span style={{ color:T.textMuted }}>({d.fileSize})</span></>}
                        </div>
                        {d.notes && <div style={{ fontSize:12, color:T.textMid, marginTop:5, lineHeight:1.5 }}>{d.notes}</div>}
                      </div>
                      <div style={{ display:'flex', gap:4, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                        <button className="btn btn-outline btn-xs" onClick={() => openEdit(d)}>Edit</button>
                        <button className="btn btn-xs btn-ghost" style={{ color:T.textLight }} onClick={() => del(d.id)}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Detail panel */}
              {selectedDoc && (
                <div className="g-card" style={{ position:'sticky', top:80 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18, paddingBottom:16, borderBottom:`1px solid rgba(210,200,184,0.4)` }}>
                    <div className="doc-icon" style={{ width:50, height:50 }}>{DOC_ICONS[selectedDoc.category]||'📄'}</div>
                    <div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:T.forest, fontWeight:400, lineHeight:1.2 }}>{selectedDoc.name}</div>
                      <div style={{ fontSize:10, color:T.gold, letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:700, marginTop:3 }}>{selectedDoc.category}</div>
                    </div>
                  </div>
                  {[['Date Added', fmtDate(selectedDoc.dateUploaded)], ['File Name', selectedDoc.fileName||'—'], ['File Size', selectedDoc.fileSize||'—']].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid rgba(210,200,184,0.3)`, fontSize:13 }}>
                      <span style={{ color:T.textMid, fontWeight:500 }}>{k}</span>
                      <span style={{ color:T.forest, fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{v}</span>
                    </div>
                  ))}
                  {selectedDoc.notes && <div style={{ marginTop:14, padding:13, background:'rgba(228,221,208,0.4)', borderRadius:8, fontSize:12, color:T.textMid, lineHeight:1.6 }}>{selectedDoc.notes}</div>}
                  <div style={{ display:'flex', gap:8, marginTop:16 }}>
                    <button className="btn btn-outline btn-sm" style={{ flex:1 }} onClick={() => openEdit(selectedDoc)}>Edit Document</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Document' : 'Add Document'}
        footer={<><button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Document</button></>}
      >
        <div style={{ background:T.goldPale, border:`1px solid rgba(184,151,90,0.18)`, borderRadius:10, padding:'11px 15px', marginBottom:18, fontSize:12, color:'#6B4E10' }}>
          Only file metadata is saved locally. Keep the actual file on Google Drive or your device.
        </div>
        <div className="form-grid">
          <div className="form-field full"><label>Document Name</label><input value={form.name} onChange={F('name')} placeholder="e.g. COR14.3 Certificate of Incorporation" /></div>
          <div className="form-field"><label>Category</label><select value={form.category} onChange={F('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="form-field"><label>Date</label><input type="date" value={form.dateUploaded} onChange={F('dateUploaded')} /></div>
          <div className="form-field full">
            <label>Attach File (metadata only)</label>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>Choose File</button>
              <span style={{ fontSize:12, color: form.fileName ? T.green : T.textMid, fontWeight: form.fileName ? 600 : 400 }}>
                {form.fileName || 'No file selected'}{form.fileSize && ` (${form.fileSize})`}
              </span>
            </div>
            <input ref={fileRef} type="file" style={{ display:'none' }} onChange={onFilePick} />
          </div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes} onChange={F('notes')} placeholder="e.g. Original certificate. Digital copy in Google Drive." /></div>
        </div>
      </Modal>
    </div>
  )
}
