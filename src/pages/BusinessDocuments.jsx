// BusinessDocuments.jsx — v1.5
// Document Vault: upload → Supabase Storage → preview/download/delete
// Falls back to local metadata-only mode if Supabase not configured
import { useState, useRef, useCallback } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, nextId, today, fmtDate, safeStr, truncate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'
import {
  SUPABASE_CONFIGURED,
  uploadDocument,
  deleteDocument,
  getDocumentUrl,
  listDocuments,
} from '../lib/supabase.js'

const CATEGORIES = ['CIPC','SARS','Banking','Suppliers','Imports','Finance','Quotes','Invoices','General']
const DOC_ICONS  = { CIPC:'📋', SARS:'📊', Banking:'🏦', Suppliers:'📦', Imports:'🚢', Finance:'💰', Quotes:'📝', Invoices:'🧾', General:'📄' }
const CAT_COLORS = {
  CIPC:     T.greenPale,  Invoices: 'rgba(184,151,90,0.12)',
  SARS:     T.goldPale,   Quotes:   T.purplePale,
  Banking:  T.bluePale,   Finance:  T.greenPale,
  Suppliers:T.tealPale,   General:  'rgba(161,161,170,0.1)',
  Imports:  T.redPale,
}
const CAT_TEXT = {
  CIPC:T.green, SARS:T.gold, Banking:T.blue, Suppliers:T.teal, Imports:T.danger,
  Finance:T.forestLight, Quotes:'#7C3AED', Invoices:'#92650A', General:T.textMid,
}
const BLANK = { name:'', category:'General', dateUploaded:today(), notes:'', supplier:'' }
const STORAGE_WARNING_MB = 7

// ── Storage size from localStorage docs ───────────────────────────────────────
function calcLocalStorageMB(docs) {
  return docs.reduce((s, d) => s + (d.fileSizeBytes || 0), 0) / (1024 * 1024)
}

// ── base64 → blob URL (for local file preview/download) ───────────────────────
function base64ToBlobUrl(dataUrl) {
  if (!dataUrl) return null
  try {
    const [meta, b64]  = dataUrl.split(',')
    const mime         = meta.match(/:(.*?);/)?.[1] || 'application/octet-stream'
    const bytes        = atob(b64)
    const arr          = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return URL.createObjectURL(new Blob([arr], { type: mime }))
  } catch { return null }
}

// ── CSV preview parse ──────────────────────────────────────────────────────────
function parseCSVPreview(text, maxRows = 25) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  const split   = l => l.split(',').map(c => c.replace(/^"|"$/g,'').trim())
  const headers = split(lines[0])
  const rows    = lines.slice(1, maxRows + 1).map(split)
  return { headers, rows }
}

export default function BusinessDocuments({ documents, setDocuments, finance = [] }) {
  const [modal,      setModal]      = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(BLANK)
  const [uploading,  setUploading]  = useState(false)
  const [uploadErr,  setUploadErr]  = useState('')
  const [search,     setSearch]     = useState('')
  const [filterCat,  setFilterCat]  = useState('All')
  const [dragOver,   setDragOver]   = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [csvData,    setCsvData]    = useState(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const fileRef = useRef()

  const safe = Array.isArray(documents) ? documents : []
  const usedMB = calcLocalStorageMB(safe)
  const nearLimit = !SUPABASE_CONFIGURED && usedMB > STORAGE_WARNING_MB

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setForm({ ...BLANK, dateUploaded:today() }); setUploadErr(''); setModal(true) }
  const openEdit = d  => { setEditing(d.id); setForm({ ...d }); setUploadErr(''); setModal(true) }

  const save = useCallback(() => {
    if (!form.name?.trim()) { setUploadErr('Document name is required'); return }
    const rec = { ...BLANK, ...form, id: editing != null ? editing : nextId(safe), name: form.name.trim() }
    if (editing != null) {
      setDocuments(dd => (Array.isArray(dd)?dd:[]).map(d => d.id === editing ? rec : d))
    } else {
      setDocuments(dd => [...(Array.isArray(dd)?dd:[]), rec])
    }
    setModal(false)
  }, [form, editing, safe, setDocuments])

  const del = useCallback(async d => {
    if (!window.confirm(`Remove "${d.name}"? This cannot be undone.`)) return
    if (SUPABASE_CONFIGURED && d.storage_path) {
      try { await deleteDocument(d) } catch (err) { console.warn('[Docs] Supabase delete failed:', err.message) }
    }
    setDocuments(dd => (Array.isArray(dd)?dd:[]).filter(x => x.id !== d.id))
    if (selected === d.id) setSelected(null)
  }, [setDocuments, selected])

  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── File upload ────────────────────────────────────────────────────────────────
  const processFile = useCallback(async file => {
    if (!file) return
    setUploading(true)
    setUploadErr('')

    const ext     = file.name.split('.').pop().toLowerCase()
    const sizeMB  = (file.size / 1024 / 1024).toFixed(2)

    // Warn if large and no Supabase
    if (!SUPABASE_CONFIGURED && file.size > 3 * 1024 * 1024) {
      if (!window.confirm(`This file is ${sizeMB}MB. Without cloud storage, large files are stored in your browser and may fill storage. Continue?`)) {
        setUploading(false)
        return
      }
    }

    let cloudPath = null
    let publicUrl = null
    let fileData  = null  // base64, only for local mode

    if (SUPABASE_CONFIGURED) {
      // Upload to Supabase Storage
      try {
        const meta = { category: form.category || 'General', notes: form.notes, supplierName: form.supplier }
        const doc  = await uploadDocument(file, meta)
        cloudPath  = doc.storage_path
        publicUrl  = doc.public_url
        // If Supabase upload succeeded, save the DB record directly
        setDocuments(dd => [...(Array.isArray(dd)?dd:[]), {
          id:               nextId(Array.isArray(dd)?dd:[]),
          name:             form.name?.trim() || file.name.replace(/\.[^/.]+$/,''),
          category:         form.category || 'General',
          dateUploaded:     today(),
          notes:            form.notes || '',
          supplier:         form.supplier || '',
          fileName:         file.name,
          fileSize:         `${sizeMB} MB`,
          fileSizeBytes:    file.size,
          fileType:         ext,
          storagePath:      cloudPath,
          publicUrl:        publicUrl,
          storage:          'supabase',
        }])
        setUploading(false)
        setModal(false)
        return
      } catch (err) {
        console.warn('[Docs] Supabase upload failed, falling back to local:', err.message)
        setUploadErr(`Cloud upload failed: ${err.message}. Saving locally instead.`)
      }
    }

    // Local: read as base64
    try {
      fileData = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload  = () => res(reader.result)
        reader.onerror = () => rej(new Error('File read failed'))
        reader.readAsDataURL(file)
      })
    } catch (err) {
      setUploadErr(`Could not read file: ${err.message}`)
      setUploading(false)
      return
    }

    setForm(f => ({
      ...f,
      fileName:      file.name,
      fileSize:      `${sizeMB} MB`,
      fileSizeBytes: file.size,
      fileType:      ext,
      fileData:      fileData,
      storage:       'local',
      name:          f.name?.trim() || file.name.replace(/\.[^/.]+$/,''),
    }))
    setUploading(false)
  }, [form, setDocuments])

  const onFilePick = e => { processFile(e.target.files[0]); e.target.value = '' }
  const onDrop = e => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) { processFile(file); setEditing(null); setForm({ ...BLANK, dateUploaded:today() }); setModal(true) }
  }

  // ── Preview ────────────────────────────────────────────────────────────────────
  const openPreview = useCallback(async doc => {
    setPreviewDoc(doc)
    setPreviewUrl(null)
    setCsvData(null)

    const ext = (doc.fileType || '').toLowerCase()

    // Supabase — get signed or public URL
    if (doc.storage === 'supabase' || doc.storagePath) {
      setLoadingUrl(true)
      try {
        const url = await getDocumentUrl(doc)
        setPreviewUrl(url)
      } catch (err) {
        console.warn('[Docs] Could not get URL:', err.message)
      }
      setLoadingUrl(false)
      return
    }

    // Local base64
    if (!doc.fileData) return

    if (['jpg','jpeg','png','webp','gif','bmp','svg'].includes(ext)) {
      setPreviewUrl(doc.fileData)
      return
    }
    if (ext === 'pdf') {
      const url = base64ToBlobUrl(doc.fileData)
      setPreviewUrl(url)
      return
    }
    if (ext === 'csv' || ext === 'tsv') {
      try {
        const [,b64] = doc.fileData.split(',')
        const text   = atob(b64)
        setCsvData(parseCSVPreview(text))
      } catch { setCsvData({ headers:[], rows:[] }) }
    }
  }, [])

  const closePreview = useCallback(() => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPreviewDoc(null)
    setPreviewUrl(null)
    setCsvData(null)
  }, [previewUrl])

  // ── Download ──────────────────────────────────────────────────────────────────
  const downloadDoc = useCallback(async doc => {
    let url = null
    let localUrl = false

    if (doc.storage === 'supabase' || doc.storagePath) {
      try { url = await getDocumentUrl(doc) } catch (err) { alert(`Could not generate download link: ${err.message}`); return }
    } else if (doc.fileData) {
      url      = base64ToBlobUrl(doc.fileData)
      localUrl = true
    }

    if (!url) { alert('No file stored for this document.'); return }
    const a = document.createElement('a')
    a.href = url; a.download = doc.fileName || doc.name
    a.click()
    if (localUrl) setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [])

  const openInTab = useCallback(async doc => {
    let url = null
    if (doc.storage === 'supabase' || doc.storagePath) {
      try { url = await getDocumentUrl(doc) } catch (err) { alert(`Could not open: ${err.message}`); return }
    } else if (doc.fileData) {
      url = base64ToBlobUrl(doc.fileData)
    }
    if (!url) { alert('No file stored for this document.'); return }
    window.open(url, '_blank')
    if (!doc.storagePath && url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 30000)
  }, [])

  // ── Filter ────────────────────────────────────────────────────────────────────
  const visible = safe.filter(d => {
    const q = search.toLowerCase()
    return (
      (filterCat === 'All' || d.category === filterCat) &&
      (!q || [d.name, d.supplier, d.category, d.notes, d.fileName].some(v => (v||'').toLowerCase().includes(q)))
    )
  })

  const selectedDoc   = selected ? safe.find(d => d.id === selected) : null
  const linkedTxn     = selectedDoc?.linkedTransactionId ? (Array.isArray(finance) ? finance : []).find(t => t.id === selectedDoc.linkedTransactionId) : null

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Business Documents</div>
          <div className="page-subtitle">Secure Document Vault · {SUPABASE_CONFIGURED ? 'Supabase Cloud Storage' : 'Local Storage'}</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Document</button>
      </div>

      <div className="page-content">
        {/* Storage notice */}
        <div style={{
          background: SUPABASE_CONFIGURED ? T.greenPale : T.goldPale,
          border: `1px solid ${SUPABASE_CONFIGURED ? 'rgba(21,128,61,0.2)' : 'rgba(184,151,90,0.25)'}`,
          borderRadius:10, padding:'11px 16px', marginBottom:18,
          fontSize:12, color: SUPABASE_CONFIGURED ? T.green : '#6B4E10',
          display:'flex', gap:10, alignItems:'flex-start',
        }}>
          <span style={{ fontSize:16, flexShrink:0 }}>{SUPABASE_CONFIGURED ? '✓' : '☁'}</span>
          <div>
            {SUPABASE_CONFIGURED
              ? <><strong>Cloud Storage Active.</strong> Files are uploaded to Supabase Storage and stored permanently.</>
              : <><strong>Local Storage Mode.</strong> Files stored in your browser — may be lost if you clear browser data.
                  Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable permanent cloud storage.
                  Back up regularly via Settings → Export Backup.
                  {nearLimit && <span style={{ color:T.danger, fontWeight:700 }}> ⚠ Storage at {usedMB.toFixed(1)}MB — approaching limit.</span>}
                </>
            }
          </div>
        </div>

        {/* Storage usage bar */}
        {!SUPABASE_CONFIGURED && (
          <div style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:T.textLight, marginBottom:4 }}>
              <span>Browser storage used: {usedMB.toFixed(2)} MB</span>
              <span>{safe.length} document{safe.length!==1?'s':''}</span>
            </div>
            <div className="pbar">
              <div className="pbar-fill" style={{ width:`${Math.min(100,(usedMB/10)*100)}%`, background: nearLimit ? `linear-gradient(90deg,${T.red},${T.danger})` : undefined }} />
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`doc-drop-zone ${dragOver?'over':''}`}
          style={{ marginBottom:22 }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={openNew}
        >
          <div style={{ fontSize:36, opacity:0.38, marginBottom:12 }}>⬆</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, marginBottom:5 }}>
            {dragOver ? 'Drop to add document' : 'Drag & drop to upload, or click to add'}
          </div>
          <div style={{ fontSize:12, color:T.textLight }}>
            PDF · Image · CSV · Excel · Any file{SUPABASE_CONFIGURED ? ' — stored in Supabase' : ' — stored locally'}
          </div>
        </div>

        {/* Category summary */}
        <div className="sec-label">Categories</div>
        <div className="grid-4" style={{ marginBottom:22, gap:12 }}>
          <div className={`g-card g-card-click`} style={{ padding:'14px 16px', textAlign:'center', border: filterCat==='All' ? `1.5px solid ${T.gold}` : undefined }} onClick={() => setFilterCat('All')}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:T.forest, marginBottom:3 }}>{safe.length}</div>
            <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:T.textLight, fontWeight:600 }}>All Documents</div>
          </div>
          {CATEGORIES.filter(c => safe.some(d => d.category === c)).map(cat => {
            const count = safe.filter(d => d.category === cat).length
            return (
              <div key={cat} className="g-card g-card-click" style={{ padding:'12px 14px', border: filterCat===cat ? `1.5px solid ${T.gold}` : undefined }} onClick={() => setFilterCat(filterCat===cat?'All':cat)}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:CAT_COLORS[cat]||'rgba(161,161,170,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{DOC_ICONS[cat]}</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:T.forest }}>{cat}</div>
                    <div style={{ fontSize:11, color:CAT_TEXT[cat]||T.textMid }}>{count} doc{count!==1?'s':''}</div>
                  </div>
                </div>
                <div className="pbar">
                  <div className="pbar-fill pbar-gold" style={{ width:`${(count/Math.max(safe.length,1))*100}%` }} />
                </div>
              </div>
            )
          })}
          {safe.length === 0 && (
            <div style={{ gridColumn:'1/-1' }}>
              <div className="empty-st"><div className="empty-ic">📁</div><div>No documents yet. Add CIPC, SARS, supplier docs, or invoices.</div></div>
            </div>
          )}
        </div>

        {/* Search + filter + list */}
        {safe.length > 0 && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:220 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, supplier, category, notes…" style={{ paddingLeft:36 }} />
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textLight, pointerEvents:'none' }}>⊙</span>
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
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
                  if (!d) return null
                  const isSel    = selected === d.id
                  const hasFile  = !!(d.fileData || d.storagePath || d.publicUrl)
                  return (
                    <div key={d.id} className="doc-card"
                      style={{ border:isSel?`1.5px solid ${T.gold}`:undefined, boxShadow:isSel?`0 0 0 3px rgba(184,151,90,0.12),0 8px 24px rgba(15,35,24,0.1)`:undefined }}
                      onClick={() => setSelected(isSel?null:d.id)}
                    >
                      <div className="doc-icon" style={{ background:CAT_COLORS[d.category]||'rgba(161,161,170,0.1)' }}>{DOC_ICONS[d.category]||'📄'}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="doc-name">{safeStr(d.name)}</div>
                        <div className="doc-meta">
                          <span style={{ color:CAT_TEXT[d.category]||T.textMid, fontWeight:600 }}>{d.category}</span>
                          {d.supplier && <> · {d.supplier}</>}
                          {' · '}{fmtDate(d.dateUploaded)}
                          {d.fileName && <> · <span style={{ fontFamily:'monospace', fontSize:10 }}>{d.fileName}</span></>}
                          {d.fileSize && <> <span style={{ color:T.textMuted }}>({d.fileSize})</span></>}
                          {d.storage === 'supabase' && <> <span className="badge badge-teal" style={{ fontSize:9, padding:'1px 5px' }}>Cloud</span></>}
                        </div>
                        {d.notes && <div style={{ fontSize:12, color:T.textMid, marginTop:4, overflowWrap:'break-word' }}>{truncate(d.notes,100)}</div>}
                        {d.linkedTransactionId && <div style={{ fontSize:10, color:T.teal, marginTop:3, fontWeight:600 }}>🔗 Linked to transaction</div>}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                        {hasFile && <>
                          <button className="btn btn-outline btn-xs" onClick={() => openPreview(d)}>👁 Preview</button>
                          <button className="btn btn-outline btn-xs" onClick={() => downloadDoc(d)}>⬇ Download</button>
                          <button className="btn btn-outline btn-xs" onClick={() => openInTab(d)}>↗ Open</button>
                        </>}
                        {!hasFile && <span style={{ fontSize:10, color:T.textMuted, padding:'2px 6px', textAlign:'center' }}>No file</span>}
                        <button className="btn btn-outline btn-xs" onClick={() => openEdit(d)}>Edit</button>
                        <button className="btn btn-xs btn-ghost" style={{ color:T.textLight, fontSize:11 }} onClick={() => del(d)}>✕ Remove</button>
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
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:T.forest, lineHeight:1.2, overflowWrap:'break-word' }}>{selectedDoc.name}</div>
                      <div style={{ fontSize:10, color:T.gold, letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:700, marginTop:3 }}>{selectedDoc.category}</div>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={()=>setSelected(null)}>✕</button>
                  </div>
                  {[
                    ['Date Added',  fmtDate(selectedDoc.dateUploaded)],
                    ['Supplier',    selectedDoc.supplier || '—'],
                    ['File Name',   selectedDoc.fileName || '—'],
                    ['File Size',   selectedDoc.fileSize || '—'],
                    ['File Type',   selectedDoc.fileType?.toUpperCase() || '—'],
                    ['Storage',     selectedDoc.storage === 'supabase' ? '☁ Supabase Cloud' : '💻 Local Browser'],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid rgba(210,200,184,0.3)`, fontSize:13, gap:8 }}>
                      <span style={{ color:T.textMid, fontWeight:500, flexShrink:0 }}>{k}</span>
                      <span style={{ color:T.forest, fontFamily:"'Cormorant Garamond',serif", fontSize:14, textAlign:'right', overflowWrap:'break-word', maxWidth:180 }}>{v}</span>
                    </div>
                  ))}
                  {selectedDoc.notes && <div style={{ marginTop:12, padding:12, background:'rgba(228,221,208,0.4)', borderRadius:8, fontSize:12, color:T.textMid, lineHeight:1.6, overflowWrap:'break-word' }}>{selectedDoc.notes}</div>}

                  {/* Linked transaction */}
                  {linkedTxn && (
                    <div style={{ marginTop:12, padding:12, background:T.tealPale, borderRadius:8, border:`1px solid rgba(14,116,144,0.2)` }}>
                      <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:T.teal, fontWeight:700, marginBottom:6 }}>🔗 Linked Transaction</div>
                      <div style={{ fontSize:12, color:T.text, fontWeight:500, overflowWrap:'break-word' }}>{linkedTxn.description}</div>
                      <div style={{ fontSize:11, color:T.textMid, marginTop:2 }}>{fmtDate(linkedTxn.date)} · {linkedTxn.category}</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:T.teal, marginTop:4 }}>{ZAR(linkedTxn.amount)}</div>
                    </div>
                  )}

                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:14 }}>
                    {(selectedDoc.fileData || selectedDoc.storagePath || selectedDoc.publicUrl) ? <>
                      <button className="btn btn-primary btn-sm" onClick={() => openPreview(selectedDoc)}>👁 Preview Document</button>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-outline btn-sm" style={{ flex:1 }} onClick={() => downloadDoc(selectedDoc)}>⬇ Download</button>
                        <button className="btn btn-outline btn-sm" style={{ flex:1 }} onClick={() => openInTab(selectedDoc)}>↗ Open Tab</button>
                      </div>
                    </> : (
                      <div style={{ fontSize:12, color:T.textLight, textAlign:'center', padding:'8px 0' }}>No file attached. Edit to add a file.</div>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(selectedDoc)}>✎ Edit Metadata</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing!=null?'Edit Document':'Add Document'}
        footer={<><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={uploading}>{uploading?'Uploading…':'Save Document'}</button></>}
      >
        <div style={{ background:T.goldPale, border:`1px solid rgba(184,151,90,0.18)`, borderRadius:10, padding:'11px 15px', marginBottom:18, fontSize:12, color:'#6B4E10' }}>
          {SUPABASE_CONFIGURED
            ? 'Files will be uploaded to Supabase Storage for permanent cloud storage.'
            : 'Files stored locally in your browser. Export backups regularly via Settings.'}
        </div>

        {/* File drop / pick */}
        <div
          style={{ border:`2px dashed rgba(210,200,184,0.7)`, borderRadius:12, padding:20, textAlign:'center', marginBottom:18, cursor:'pointer', background: form.fileData || form.storagePath ? 'rgba(21,128,61,0.05)' : 'rgba(255,255,255,0.3)' }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();processFile(e.dataTransfer.files[0])}}
        >
          {uploading ? (
            <div><div style={{ fontSize:24, marginBottom:6 }}>⏳</div><div style={{ fontSize:13, color:T.textMid }}>Uploading{SUPABASE_CONFIGURED?' to Supabase':''}…</div></div>
          ) : form.fileData || form.storagePath ? (
            <div>
              <div style={{ fontSize:24, marginBottom:6 }}>✅</div>
              <div style={{ fontSize:13, fontWeight:600, color:T.green }}>{form.fileName}</div>
              <div style={{ fontSize:11, color:T.textLight }}>({form.fileSize}) — Click to replace</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:24, opacity:0.38, marginBottom:6 }}>📎</div>
              <div style={{ fontSize:13, color:T.textMid }}>Click or drag & drop to attach a file</div>
              <div style={{ fontSize:11, color:T.textLight, marginTop:4 }}>PDF · Image · CSV · Excel · Any file</div>
            </div>
          )}
          <input ref={fileRef} type="file" style={{ display:'none' }} onChange={onFilePick} />
        </div>
        {uploadErr && <div style={{ fontSize:12, color:T.danger, marginBottom:12 }}>⚠ {uploadErr}</div>}

        <div className="form-grid">
          <div className="form-field full"><label>Document Name</label><input value={form.name||''} onChange={F('name')} placeholder="e.g. COR14.3 Certificate of Incorporation" /></div>
          <div className="form-field"><label>Category</label><select value={form.category} onChange={F('category')}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div className="form-field"><label>Date</label><input type="date" value={form.dateUploaded} onChange={F('dateUploaded')} /></div>
          <div className="form-field full"><label>Related Supplier</label><input value={form.supplier||''} onChange={F('supplier')} placeholder="e.g. Frank / Dongyi" /></div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes||''} onChange={F('notes')} placeholder="Notes about this document…" /></div>
        </div>
      </Modal>

      {/* ── Preview Modal ── */}
      {previewDoc && (
        <div className="modal-overlay" onClick={closePreview}>
          <div className="modal modal-xl" style={{ maxHeight:'96vh', display:'flex', flexDirection:'column', padding:0 }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'16px 22px', borderBottom:`1px solid rgba(210,200,184,0.5)`, display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:T.forest, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{previewDoc.name}</div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-outline btn-sm" onClick={()=>downloadDoc(previewDoc)}>⬇ Download</button>
                <button className="btn btn-outline btn-sm" onClick={()=>openInTab(previewDoc)}>↗ Open</button>
                <button className="modal-close" onClick={closePreview}>✕</button>
              </div>
            </div>
            <div style={{ flex:1, overflow:'auto', padding:16, minHeight:0 }}>
              {loadingUrl && <div className="empty-st"><div style={{ fontSize:28 }}>⏳</div><div>Loading…</div></div>}
              {!loadingUrl && previewUrl && (['jpg','jpeg','png','webp','gif','bmp','svg'].includes(previewDoc.fileType||'')) &&
                <img src={previewUrl} alt={previewDoc.name} style={{ maxWidth:'100%', borderRadius:8, boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }} />}
              {!loadingUrl && previewUrl && (previewDoc.fileType==='pdf' || previewDoc.fileName?.endsWith('.pdf')) &&
                <iframe src={previewUrl} title={previewDoc.name} style={{ width:'100%', height:'72vh', border:'none', borderRadius:8 }} />}
              {!loadingUrl && csvData && (
                <div>
                  <div style={{ fontSize:12, color:T.textMid, marginBottom:10 }}>Showing first {csvData.rows.length} rows · {csvData.headers.length} columns</div>
                  <div className="table-wrap">
                    <table><thead><tr>{csvData.headers.map((h,i)=><th key={i}>{h||`Col ${i+1}`}</th>)}</tr></thead>
                    <tbody>{csvData.rows.map((r,ri)=><tr key={ri}>{csvData.headers.map((_,ci)=><td key={ci} style={{ fontSize:12 }}>{r[ci]||''}</td>)}</tr>)}</tbody></table>
                  </div>
                </div>
              )}
              {!loadingUrl && !previewUrl && !csvData && (
                <div style={{ textAlign:'center', padding:'48px 24px' }}>
                  <div style={{ fontSize:44, marginBottom:14 }}>📄</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, marginBottom:8 }}>{previewDoc.fileName || previewDoc.name}</div>
                  <div style={{ fontSize:13, color:T.textMid, marginBottom:20 }}>
                    {previewDoc.fileData ? 'Preview not available for this file type.' : 'No file content available.'}
                  </div>
                  <button className="btn btn-primary" onClick={()=>downloadDoc(previewDoc)}>⬇ Download to Open</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
