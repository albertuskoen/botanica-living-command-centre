// BusinessDocuments.jsx — Bug 4 fix: real document vault
// - Files stored as base64 in localStorage (with size warning)
// - PDF preview via iframe blob URL
// - Image preview inline
// - CSV preview table
// - Download + Open + Preview actions
// - Search by name/supplier/category/notes
// - Filter by category
// - Transaction linking
// - Cloud-ready architecture (storage adapter pattern)
import { useState, useRef, useCallback } from 'react'
import { T } from '../utils/tokens.js'
import { nextId, today, fmtDate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

// ── CATEGORIES ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['CIPC','SARS','Banking','Suppliers','Imports','Finance','Quotes','Invoices','General']
const DOC_ICONS  = { CIPC:'📋', SARS:'📊', Banking:'🏦', Suppliers:'📦', Imports:'🚢', Finance:'💰', Quotes:'📝', Invoices:'🧾', General:'📄' }
const CAT_COLORS = {
  CIPC:     ['rgba(21,128,61,0.12)',    T.green],
  SARS:     ['rgba(184,151,90,0.14)',   T.gold],
  Banking:  ['rgba(29,78,216,0.1)',     T.blue],
  Suppliers:['rgba(14,116,144,0.1)',    T.teal],
  Imports:  ['rgba(185,28,28,0.1)',     T.danger],
  Finance:  ['rgba(21,128,61,0.1)',     T.forestLight],
  Quotes:   ['rgba(124,58,237,0.1)',    T.purple],
  Invoices: ['rgba(184,151,90,0.1)',    '#92650A'],
  General:  ['rgba(161,161,170,0.1)',   T.textMid],
}
const STORAGE_LIMIT_MB = 8  // warn if total file storage approaches this

// ── FILE → BASE64 ───────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)   // data:mime;base64,xxx
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

// ── BASE64 → Blob URL (for preview/download) ────────────────────────────────────
function base64ToBlobUrl(dataUrl) {
  if (!dataUrl) return null
  try {
    const [meta, b64] = dataUrl.split(',')
    const mime = meta.match(/:(.*?);/)?.[1] || 'application/octet-stream'
    const bytes = atob(b64)
    const arr   = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return URL.createObjectURL(new Blob([arr], { type: mime }))
  } catch { return null }
}

// ── PARSE CSV TEXT → table rows ─────────────────────────────────────────────────
function parseCSVPreview(text, maxRows = 20) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (!lines.length) return { headers:[], rows:[] }
  const split = l => l.split(',').map(c => c.replace(/^"|"$/g,'').trim())
  const headers = split(lines[0])
  const rows    = lines.slice(1, maxRows + 1).map(split)
  return { headers, rows }
}

// ── BLANK DOCUMENT ──────────────────────────────────────────────────────────────
const BLANK = {
  name:'', category:'General', dateUploaded:today(),
  notes:'', supplier:'', linkedTransactionId:null,
  // stored after upload:
  fileName:'', fileSize:'', fileSizeBytes:0, fileType:'', fileData:null,
}

// ── STORAGE SIZE HELPER ──────────────────────────────────────────────────────────
function totalStorageMB(docs) {
  return docs.reduce((s, d) => s + (d.fileSizeBytes || 0), 0) / (1024 * 1024)
}

export default function BusinessDocuments({ documents, setDocuments, finance = [] }) {
  const [modal,      setModal]      = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(BLANK)
  const [uploading,  setUploading]  = useState(false)
  const [search,     setSearch]     = useState('')
  const [filterCat,  setFilterCat]  = useState('All')
  const [dragOver,   setDragOver]   = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)  // doc being previewed
  const [previewUrl, setPreviewUrl] = useState(null)  // blob URL for preview
  const [csvData,    setCsvData]    = useState(null)  // parsed CSV for preview
  const fileRef = useRef()

  // ── Derived ────────────────────────────────────────────────────────────────────
  const usedMB   = totalStorageMB(documents)
  const nearLimit = usedMB > STORAGE_LIMIT_MB * 0.75

  // ── CRUD helpers ───────────────────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setForm({ ...BLANK, dateUploaded:today() }); setModal(true) }
  const openEdit = d  => { setEditing(d.id); setForm(d); setModal(true) }

  const save = () => {
    if (!form.name) return
    const rec = { ...form, id: editing || nextId(documents) }
    editing
      ? setDocuments(dd => dd.map(d => d.id === editing ? rec : d))
      : setDocuments(dd => [...dd, rec])
    setModal(false)
  }

  const del = id => {
    if (!window.confirm('Remove document? This will also delete the stored file.')) return
    setDocuments(dd => dd.filter(d => d.id !== id))
    if (selected === id) setSelected(null)
  }

  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── File processing ────────────────────────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const ext      = file.name.split('.').pop().toLowerCase()
      const sizeMB   = (file.size / 1024 / 1024).toFixed(2)
      const nameNoExt = file.name.replace(/\.[^/.]+$/, '')

      // Warn if file is large
      if (file.size > 4 * 1024 * 1024) {
        if (!window.confirm(`This file is ${sizeMB}MB. Large files may slow down the app since they're stored in the browser. Continue?`)) {
          setUploading(false)
          return
        }
      }

      // Read file as base64 data URL
      const fileData = await fileToBase64(file)

      setForm(f => ({
        ...f,
        fileName:      file.name,
        fileSize:      `${sizeMB} MB`,
        fileSizeBytes: file.size,
        fileType:      ext,
        fileData,
        name: f.name || nameNoExt,
        // Auto-detect category from extension/name
        category: f.category !== 'General' ? f.category :
          (ext === 'pdf' && /invoice|inv/i.test(file.name)) ? 'Invoices' :
          (ext === 'pdf' && /quote|qt/i.test(file.name))    ? 'Quotes' :
          f.category,
      }))
    } catch (err) {
      alert(`Could not read file: ${err.message}`)
    }
    setUploading(false)
  }, [])

  const handleFilePick = e => { processFile(e.target.files[0]); e.target.value = '' }

  const handleDrop = e => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) { processFile(file); setEditing(null); setForm({ ...BLANK, dateUploaded:today() }); setModal(true) }
  }

  // ── Preview ────────────────────────────────────────────────────────────────────
  const openPreview = useCallback(doc => {
    setPreviewDoc(doc)
    setCsvData(null)
    setPreviewUrl(null)

    if (!doc.fileData) return

    const ext = (doc.fileType || '').toLowerCase()
    if (['jpg','jpeg','png','webp','gif','bmp','svg'].includes(ext)) {
      // Image: use data URL directly
      setPreviewUrl(doc.fileData)
    } else if (ext === 'pdf') {
      // PDF: create blob URL for iframe
      const url = base64ToBlobUrl(doc.fileData)
      setPreviewUrl(url)
    } else if (ext === 'csv' || ext === 'tsv') {
      // CSV: decode base64 and parse
      try {
        const [, b64] = doc.fileData.split(',')
        const text = atob(b64)
        setCsvData(parseCSVPreview(text))
      } catch { setCsvData({ headers:[], rows:[] }) }
    }
    // xlsx/xls: show "download to open" message — can't render Excel in browser without library
  }, [])

  const closePreview = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPreviewDoc(null)
    setPreviewUrl(null)
    setCsvData(null)
  }

  // ── Download ───────────────────────────────────────────────────────────────────
  const downloadDoc = useCallback(doc => {
    if (!doc.fileData) { alert('No file stored for this document.'); return }
    const url = base64ToBlobUrl(doc.fileData)
    if (!url) { alert('Could not create download link.'); return }
    const a = document.createElement('a')
    a.href = url; a.download = doc.fileName || doc.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [])

  // ── Open in new tab ──────────────────────────────────────────────────────────────
  const openInTab = useCallback(doc => {
    if (!doc.fileData) { alert('No file stored for this document.'); return }
    const url = base64ToBlobUrl(doc.fileData)
    if (!url) { alert('Could not open file.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }, [])

  // ── Filter ─────────────────────────────────────────────────────────────────────
  const visible = documents.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || [d.name, d.supplier, d.category, d.notes, d.fileName]
      .some(f => (f||'').toLowerCase().includes(q))
    const matchCat = filterCat === 'All' || d.category === filterCat
    return matchSearch && matchCat
  })

  const selectedDoc = selected ? documents.find(d => d.id === selected) : null

  // ── Linked transaction ──────────────────────────────────────────────────────────
  const linkedTxn = selectedDoc?.linkedTransactionId
    ? finance.find(t => t.id === selectedDoc.linkedTransactionId)
    : null

  // ── RENDER ─────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Business Documents</div>
          <div className="page-subtitle">Secure Document Vault · CIPC · SARS · Suppliers · Finance</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Document</button>
      </div>

      <div className="page-content">

        {/* ── Storage warnings ─────────────────────────────────────────────── */}
        <div style={{ background:'rgba(184,151,90,0.1)', border:`1px solid rgba(184,151,90,0.22)`, borderRadius:12, padding:'12px 18px', marginBottom:16, fontSize:12, color:'#6B4E10', display:'flex', gap:12, alignItems:'flex-start' }}>
          <span style={{ fontSize:16, flexShrink:0 }}>🔒</span>
          <div>
            <strong>Local Storage Vault:</strong> Files are stored in your browser. They will be lost if you clear browser data.{' '}
            <strong>Back up regularly</strong> using Settings → Export Backup.
            {nearLimit && <span style={{ color:T.danger, fontWeight:700 }}> ⚠ Storage is at {usedMB.toFixed(1)}MB — approaching browser limit. Consider downloading older files.</span>}
            {' '}<span style={{ color:T.textMid }}>Cloud storage (Supabase/Firebase) coming in a future version.</span>
          </div>
        </div>

        {/* Storage usage bar */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:T.textLight, marginBottom:4 }}>
            <span>Storage used: {usedMB.toFixed(2)} MB of ~{STORAGE_LIMIT_MB} MB recommended max</span>
            <span>{documents.length} document{documents.length!==1?'s':''}</span>
          </div>
          <div className="pbar">
            <div className="pbar-fill" style={{ width:`${Math.min(100,(usedMB/STORAGE_LIMIT_MB)*100)}%`, background: nearLimit ? `linear-gradient(90deg,${T.red},${T.danger})` : undefined }} />
          </div>
        </div>

        {/* ── Drag-drop zone ────────────────────────────────────────────────── */}
        <div
          className={`doc-drop-zone mb20 ${dragOver ? 'over' : ''}`}
          style={{ marginBottom:24 }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={openNew}
        >
          <div style={{ fontSize:36, opacity:0.4, marginBottom:12 }}>⬆</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.forest, marginBottom:6 }}>
            {dragOver ? 'Drop to add document' : 'Drag & drop to upload, or click to add'}
          </div>
          <div style={{ fontSize:12, color:T.textLight }}>PDF · Image · CSV · Excel · Any file — stored securely in your browser</div>
        </div>

        {/* ── Category summary ──────────────────────────────────────────────── */}
        <div className="sec-label">Categories</div>
        <div className="grid-4" style={{ marginBottom:24, gap:12 }}>
          <div
            className="g-card g-card-click"
            style={{ padding:'14px 16px', textAlign:'center', border: filterCat==='All' ? `1.5px solid ${T.gold}` : undefined }}
            onClick={() => setFilterCat('All')}
          >
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:T.forest, marginBottom:3 }}>{documents.length}</div>
            <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:T.textLight, fontWeight:600 }}>All Documents</div>
          </div>
          {CATEGORIES.filter(c => documents.some(d => d.category === c)).map(cat => {
            const count = documents.filter(d => d.category === cat).length
            const [bg, color] = CAT_COLORS[cat] || ['rgba(161,161,170,0.1)', T.textMid]
            return (
              <div
                key={cat}
                className="g-card g-card-click"
                style={{ padding:'12px 14px', border: filterCat===cat ? `1.5px solid ${T.gold}` : undefined }}
                onClick={() => setFilterCat(filterCat===cat ? 'All' : cat)}
              >
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
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
                <div style={{ fontSize:13, color:T.textMid }}>Add CIPC certificates, SARS registration, bank statements, supplier catalogues, or invoices.</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Search + filter ────────────────────────────────────────────────── */}
        {documents.length > 0 && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:220 }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, supplier, category, notes…"
                  style={{ paddingLeft:36 }}
                />
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textLight, pointerEvents:'none' }}>⊙</span>
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {['All',...CATEGORIES].map(c => (
                  <button key={c} className={`bp-fbtn ${filterCat===c?'active':''}`} onClick={() => setFilterCat(c)}>{c}</button>
                ))}
              </div>
            </div>

            {/* ── Two-panel layout ─── */}
            <div style={{ display:'grid', gridTemplateColumns: selectedDoc ? '1fr 340px' : '1fr', gap:16, alignItems:'start' }}>

              {/* Document list */}
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {visible.length === 0 && <div className="empty-st"><div className="empty-ic">🔍</div><div>No documents match that filter.</div></div>}
                {visible.map(d => {
                  const [catBg, catColor] = CAT_COLORS[d.category] || ['rgba(161,161,170,0.1)', T.textMid]
                  const isSel = selected === d.id
                  const hasFile = !!d.fileData
                  return (
                    <div
                      key={d.id}
                      className="doc-card"
                      style={{
                        border: isSel ? `1.5px solid ${T.gold}` : undefined,
                        boxShadow: isSel ? `0 0 0 3px rgba(184,151,90,0.12), 0 8px 24px rgba(15,35,24,0.1)` : undefined,
                      }}
                      onClick={() => setSelected(isSel ? null : d.id)}
                    >
                      <div className="doc-icon" style={{ background:`linear-gradient(145deg, ${catBg}, rgba(255,255,255,0.3))` }}>
                        {DOC_ICONS[d.category] || '📄'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:T.forest }}>{d.name}</div>
                        <div style={{ fontSize:11, color:T.textLight, marginTop:2 }}>
                          <span style={{ color:catColor, fontWeight:600 }}>{d.category}</span>
                          {d.supplier && <> · {d.supplier}</>}
                          {' · '}Added {fmtDate(d.dateUploaded)}
                          {d.fileName && <> · <span style={{ fontFamily:'monospace', fontSize:10 }}>{d.fileName}</span></>}
                          {d.fileSize && <> <span style={{ color:T.textMuted }}>({d.fileSize})</span></>}
                        </div>
                        {d.notes && <div style={{ fontSize:12, color:T.textMid, marginTop:4, lineHeight:1.5 }}>{d.notes.substring(0,100)}{d.notes.length>100?'…':''}</div>}
                        {d.linkedTransactionId && <div style={{ fontSize:10, color:T.teal, marginTop:3, fontWeight:600 }}>🔗 Linked to transaction</div>}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                        {hasFile && (
                          <>
                            <button className="btn btn-outline btn-xs" onClick={() => openPreview(d)} title="Preview">👁 Preview</button>
                            <button className="btn btn-outline btn-xs" onClick={() => downloadDoc(d)} title="Download">⬇ Download</button>
                            <button className="btn btn-outline btn-xs" onClick={() => openInTab(d)} title="Open in new tab">↗ Open</button>
                          </>
                        )}
                        {!hasFile && <span style={{ fontSize:10, color:T.textMuted, padding:'2px 6px' }}>No file</span>}
                        <button className="btn btn-outline btn-xs" onClick={() => openEdit(d)}>Edit</button>
                        <button className="btn btn-xs btn-ghost" style={{ color:T.textLight, fontSize:11 }} onClick={() => del(d.id)}>✕ Remove</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Detail panel */}
              {selectedDoc && (
                <div className="g-card" style={{ position:'sticky', top:80 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:14, borderBottom:`1px solid rgba(210,200,184,0.4)` }}>
                    <div className="doc-icon" style={{ width:46, height:46 }}>{DOC_ICONS[selectedDoc.category]||'📄'}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:T.forest, lineHeight:1.2 }}>{selectedDoc.name}</div>
                      <div style={{ fontSize:10, color:T.gold, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:700, marginTop:3 }}>{selectedDoc.category}</div>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={() => setSelected(null)}>✕</button>
                  </div>

                  {/* Meta */}
                  {[
                    ['Date Added', fmtDate(selectedDoc.dateUploaded)],
                    ['Supplier', selectedDoc.supplier || '—'],
                    ['File Name', selectedDoc.fileName || '—'],
                    ['File Size', selectedDoc.fileSize || '—'],
                    ['File Type', selectedDoc.fileType ? selectedDoc.fileType.toUpperCase() : '—'],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid rgba(210,200,184,0.3)`, fontSize:13 }}>
                      <span style={{ color:T.textMid, fontWeight:500 }}>{k}</span>
                      <span style={{ color:T.forest, fontFamily:"'Cormorant Garamond',serif", fontSize:14, textAlign:'right', maxWidth:160, wordBreak:'break-all' }}>{v}</span>
                    </div>
                  ))}

                  {selectedDoc.notes && (
                    <div style={{ marginTop:12, padding:12, background:'rgba(228,221,208,0.4)', borderRadius:8, fontSize:12, color:T.textMid, lineHeight:1.6 }}>
                      {selectedDoc.notes}
                    </div>
                  )}

                  {/* Linked transaction */}
                  {linkedTxn && (
                    <div style={{ marginTop:12, padding:12, background:T.tealPale, borderRadius:8, border:`1px solid rgba(14,116,144,0.2)` }}>
                      <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:T.teal, fontWeight:700, marginBottom:6 }}>🔗 Linked Transaction</div>
                      <div style={{ fontSize:12, color:T.text, fontWeight:500 }}>{linkedTxn.description}</div>
                      <div style={{ fontSize:11, color:T.textMid, marginTop:2 }}>{fmtDate(linkedTxn.date)} · {linkedTxn.category}</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:T.teal, marginTop:4 }}>
                        {linkedTxn.type==='Business Expense'?'-':'+'}
                        {linkedTxn.amount?.toLocaleString('en-ZA',{minimumFractionDigits:2})}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:14 }}>
                    {selectedDoc.fileData && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => openPreview(selectedDoc)}>👁 Preview Document</button>
                        <div style={{ display:'flex', gap:8 }}>
                          <button className="btn btn-outline btn-sm" style={{ flex:1 }} onClick={() => downloadDoc(selectedDoc)}>⬇ Download</button>
                          <button className="btn btn-outline btn-sm" style={{ flex:1 }} onClick={() => openInTab(selectedDoc)}>↗ Open Tab</button>
                        </div>
                      </>
                    )}
                    {!selectedDoc.fileData && (
                      <div style={{ fontSize:12, color:T.textLight, padding:'8px 0', textAlign:'center' }}>No file attached. Edit to add a file.</div>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(selectedDoc)}>✎ Edit Document</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════ ADD/EDIT MODAL ══════════════════════════════════════ */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Document' : 'Add Document'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!form.name}>Save Document</button>
          </>
        }
      >
        <div style={{ background:'rgba(184,151,90,0.09)', border:'1px solid rgba(184,151,90,0.18)', borderRadius:10, padding:'11px 15px', marginBottom:18, fontSize:12, color:'#6B4E10' }}>
          Files are stored in your browser. Back up regularly via Settings → Export Backup.
        </div>

        {/* File upload area */}
        <div
          style={{ border:`2px dashed rgba(210,200,184,0.7)`, borderRadius:12, padding:'24px', textAlign:'center', marginBottom:18, cursor:'pointer', transition:'all 0.15s', background: form.fileData ? 'rgba(21,128,61,0.05)' : 'rgba(255,255,255,0.3)' }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); processFile(e.dataTransfer.files[0]) }}
        >
          {uploading ? (
            <div>
              <div style={{ fontSize:28, marginBottom:8 }}>⏳</div>
              <div style={{ fontSize:13, color:T.textMid }}>Reading file…</div>
            </div>
          ) : form.fileData ? (
            <div>
              <div style={{ fontSize:28, marginBottom:6 }}>✅</div>
              <div style={{ fontSize:13, fontWeight:600, color:T.green }}>{form.fileName}</div>
              <div style={{ fontSize:11, color:T.textLight }}>({form.fileSize}) — Click to replace</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:28, marginBottom:6, opacity:0.4 }}>📎</div>
              <div style={{ fontSize:13, color:T.textMid }}>Click or drag & drop a file to attach</div>
              <div style={{ fontSize:11, color:T.textLight, marginTop:4 }}>PDF · Image · CSV · Excel · Any file</div>
            </div>
          )}
          <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleFilePick} />
        </div>

        <div className="form-grid">
          <div className="form-field full"><label>Document Name</label><input value={form.name} onChange={F('name')} placeholder="e.g. COR14.3 Certificate of Incorporation" /></div>
          <div className="form-field">
            <label>Category</label>
            <select value={form.category} onChange={F('category')}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Date</label><input type="date" value={form.dateUploaded} onChange={F('dateUploaded')} /></div>
          <div className="form-field full"><label>Related Supplier (optional)</label><input value={form.supplier||''} onChange={F('supplier')} placeholder="e.g. Frank / Dongyi" /></div>
          <div className="form-field full">
            <label>Link to Transaction (optional)</label>
            <select value={form.linkedTransactionId||''} onChange={e => setForm(f => ({ ...f, linkedTransactionId: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">— No linked transaction —</option>
              {finance.map(t => (
                <option key={t.id} value={t.id}>
                  {fmtDate(t.date)} · {t.description} · {t.amount?.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')} placeholder="e.g. Original certificate. Digital copy also in Google Drive." /></div>
        </div>
      </Modal>

      {/* ═══════════════ PREVIEW MODAL ══════════════════════════════════════ */}
      {previewDoc && (
        <div className="modal-overlay" onClick={closePreview}>
          <div
            className="modal modal-xl"
            style={{ maxHeight:'96vh', display:'flex', flexDirection:'column', padding:0 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Preview header */}
            <div style={{ padding:'18px 24px', borderBottom:'1px solid rgba(210,200,184,0.5)', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, flex:1 }}>
                {previewDoc.name}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => downloadDoc(previewDoc)}>⬇ Download</button>
                <button className="btn btn-outline btn-sm" onClick={() => openInTab(previewDoc)}>↗ Open Tab</button>
                <button className="modal-close" onClick={closePreview}>✕</button>
              </div>
            </div>

            {/* Preview body */}
            <div style={{ flex:1, overflow:'auto', padding:'16px', minHeight:0 }}>
              {/* Image preview */}
              {['jpg','jpeg','png','webp','gif','bmp','svg'].includes(previewDoc.fileType||'') && previewUrl && (
                <div style={{ textAlign:'center' }}>
                  <img
                    src={previewUrl}
                    alt={previewDoc.name}
                    style={{ maxWidth:'100%', maxHeight:'70vh', borderRadius:8, boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }}
                  />
                </div>
              )}

              {/* PDF preview */}
              {previewDoc.fileType==='pdf' && previewUrl && (
                <iframe
                  src={previewUrl}
                  title={previewDoc.name}
                  style={{ width:'100%', height:'72vh', border:'none', borderRadius:8 }}
                />
              )}

              {/* CSV preview */}
              {(previewDoc.fileType==='csv'||previewDoc.fileType==='tsv') && csvData && (
                <div>
                  <div style={{ fontSize:12, color:T.textMid, marginBottom:10 }}>
                    Showing first {csvData.rows.length} rows · {csvData.headers.length} columns
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>{csvData.headers.map((h,i) => <th key={i}>{h||`Col ${i+1}`}</th>)}</tr>
                      </thead>
                      <tbody>
                        {csvData.rows.map((row,ri) => (
                          <tr key={ri}>
                            {csvData.headers.map((_, ci) => (
                              <td key={ci} style={{ fontSize:12 }}>{row[ci]||''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Excel — cannot render in browser */}
              {['xlsx','xls'].includes(previewDoc.fileType||'') && (
                <div style={{ textAlign:'center', padding:'48px 24px' }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.forest, marginBottom:8 }}>Excel File</div>
                  <div style={{ fontSize:13, color:T.textMid, marginBottom:20, lineHeight:1.7 }}>
                    Excel files cannot be previewed directly in the browser without an additional library.<br />
                    Download the file to open it in Excel or Google Sheets.
                  </div>
                  <button className="btn btn-primary" onClick={() => downloadDoc(previewDoc)}>⬇ Download to Open</button>
                </div>
              )}

              {/* No file data */}
              {!previewDoc.fileData && (
                <div style={{ textAlign:'center', padding:'48px 24px' }}>
                  <div style={{ fontSize:48, marginBottom:16, opacity:0.4 }}>📄</div>
                  <div style={{ fontSize:16, color:T.textMid }}>No file attached to this document record.</div>
                  <div style={{ fontSize:13, color:T.textLight, marginTop:8 }}>Edit the document to attach a file.</div>
                </div>
              )}

              {/* Unknown type with data */}
              {previewDoc.fileData &&
               !['jpg','jpeg','png','webp','gif','bmp','svg','pdf','csv','tsv','xlsx','xls'].includes(previewDoc.fileType||'') && (
                <div style={{ textAlign:'center', padding:'48px 24px' }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📎</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, marginBottom:8 }}>{previewDoc.fileName}</div>
                  <div style={{ fontSize:13, color:T.textMid, marginBottom:20 }}>Preview not available for this file type. Download to open.</div>
                  <button className="btn btn-primary" onClick={() => downloadDoc(previewDoc)}>⬇ Download</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
