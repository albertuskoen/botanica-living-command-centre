// BusinessDocuments.jsx — v1.7
// Storage: IndexedDB (always) + Supabase Storage (when configured)
// Upload → IndexedDB + Supabase → preview/download from IndexedDB first,
//           fall back to Supabase signed/public URL → delete from both.
import { useState, useRef, useCallback, useEffect } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, nextId, today, fmtDate, safeStr, truncate } from '../utils/format.js'
import Modal from '../components/Modal.jsx'
import {
  storeFile, retrieveFile, deleteFile as idbDelete,
  createObjectURL, downloadFileById, getStorageUsage,
  formatBytes as fbytes,
} from '../lib/fileStore.js'
import {
  SUPABASE_CONFIGURED, isOnline,
  uploadDocument, deleteDocumentCloud, getDocumentUrl, linkDocumentToTransaction,
} from '../lib/supabase.js'
import DocPreview from '../components/DocPreview.jsx'

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['CIPC','SARS','Banking','Suppliers','Imports','Finance','Quotes','Invoices','General']
const DOC_ICONS  = { CIPC:'📋',SARS:'📊',Banking:'🏦',Suppliers:'📦',Imports:'🚢',Finance:'💰',Quotes:'📝',Invoices:'🧾',General:'📄' }
const CAT_BG = { CIPC:T.greenPale,SARS:T.goldPale,Banking:T.bluePale,Suppliers:T.tealPale,Imports:T.redPale,Finance:T.greenPale,Quotes:T.purplePale,Invoices:'rgba(184,151,90,0.12)',General:'rgba(161,161,170,0.1)' }
const CAT_FG = { CIPC:T.green,SARS:T.gold,Banking:T.blue,Suppliers:T.teal,Imports:T.danger,Finance:T.forestLight,Quotes:T.purple,Invoices:'#92650A',General:T.textMid }
const IMG_EXT = new Set(['jpg','jpeg','png','webp','gif','bmp','svg'])
const BLANK   = { name:'',category:'General',dateUploaded:today(),notes:'',supplier:'',linkedTransactionId:null }

// ── CSV table preview ──────────────────────────────────────────────────────────
function CSVPreview({ text }) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return <div style={{fontSize:12,color:T.textLight}}>No rows found.</div>
  const d = (lines[0].match(/\t/g)?.length||0) > (lines[0].match(/,/g)?.length||0) ? '\t' : ','
  const headers = lines[0].split(d).map(c=>c.replace(/"/g,'').trim())
  const rows    = lines.slice(1,26).map(l=>l.split(d).map(c=>c.replace(/"/g,'').trim()))
  return (
    <div>
      <div style={{fontSize:11,color:T.textLight,marginBottom:8}}>
        First {Math.min(rows.length,25)} of {lines.length-1} rows · {headers.length} columns
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{headers.map((h,i)=><th key={i}>{h||`Col ${i+1}`}</th>)}</tr></thead>
          <tbody>{rows.map((r,ri)=><tr key={ri}>{headers.map((_,ci)=><td key={ci} style={{fontSize:12}}>{r[ci]||''}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

// ── Storage status banner ──────────────────────────────────────────────────────
function StorageBanner({ storage }) {
  if (SUPABASE_CONFIGURED) return (
    <div style={{ display:'flex', gap:12, alignItems:'center', padding:'11px 16px', background:'rgba(110,232,160,0.10)', border:`1px solid rgba(21,128,61,0.2)`, borderRadius:10, marginBottom:18, fontSize:12 }}>
      <span style={{ width:8,height:8,borderRadius:'50%',background:T.green,flexShrink:0,boxShadow:`0 0 6px ${T.green}` }}/>
      <div>
        <strong style={{color:T.green}}>☁ Supabase Storage connected.</strong>
        <span style={{color:T.textMid}}> Files upload to "Botanica living - Documents" bucket and are accessible from any device. Local IndexedDB cache used for instant offline preview.</span>
      </div>
    </div>
  )
  return (
    <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'11px 16px', background:T.goldPale, border:`1px solid rgba(184,151,90,0.25)`, borderRadius:10, marginBottom:18, fontSize:12 }}>
      <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>💻</span>
      <div style={{color:'#6B4E10'}}>
        <strong>Local IndexedDB only.</strong> Files stored on this device.
        {storage.usedMB > 0 && <span> {storage.usedMB} MB used{storage.quotaMB > 0 ? ` / ~${storage.quotaMB} MB quota` : ''}.</span>}
        {' '}To enable cloud storage add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to Vercel.
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function BusinessDocuments({ documents, setDocuments, finance = [] }) {
  const [modal,       setModal]       = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [form,        setForm]        = useState(BLANK)
  const [formErr,     setFormErr]     = useState('')
  const [uploading,   setUploading]   = useState(false)
  const [uploadMsg,   setUploadMsg]   = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [search,      setSearch]      = useState('')
  const [filterCat,   setFilterCat]   = useState('All')
  const [dragOver,    setDragOver]    = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [storage,     setStorage]     = useState({ usedMB:0, quotaMB:0, usedPct:0 })

  // Preview
  const [previewDoc,     setPreviewDoc]     = useState(null)
  const [previewUrl,     setPreviewUrl]     = useState(null)
  const [previewText,    setPreviewText]    = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewErr,     setPreviewErr]     = useState('')
  const [previewSrc,     setPreviewSrc]     = useState('')  // 'indexeddb'|'public'|'signed'
  const prevUrlRef = useRef(null)

  const fileRef = useRef()
  const safe    = Array.isArray(documents) ? documents : []
  const safeFin = Array.isArray(finance)   ? finance   : []

  useEffect(() => { getStorageUsage().then(s => setStorage(s)) }, [documents])

  // Cleanup on unmount
  useEffect(() => () => { if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current) }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setForm({...BLANK,dateUploaded:today()}); setPendingFile(null); setFormErr(''); setModal(true) }
  const openEdit = d  => { setEditing(d.id); setForm({...d});                          setPendingFile(null); setFormErr(''); setModal(true) }
  const F = k => e => setForm(f => ({...f,[k]:e.target.value}))

  // ── Save (Upload + store metadata) ────────────────────────────────────────
  const save = useCallback(async () => {
    if (!form.name?.trim()) { setFormErr('Document name is required'); return }
    setUploading(true); setFormErr('')

    try {
      // If Supabase configured, upload there; IndexedDB cache is handled inside uploadDocument
      if (SUPABASE_CONFIGURED && pendingFile) {
        setUploadMsg('Uploading to Supabase Storage…')
        const cloudDoc = await uploadDocument(pendingFile, {
          category:    form.category || 'General',
          notes:       form.notes || null,
          supplierName:form.supplier || null,
          dateUploaded:form.dateUploaded || today(),
        })
        // Merge cloud record with user-entered metadata
        const rec = {
          ...form,
          id:              nextId(safe),   // local list ID (numeric)
          supabaseId:      cloudDoc.id,    // UUID from Supabase
          storagePath:     cloudDoc.storage_path,
          publicUrl:       cloudDoc.public_url,
          fileName:        pendingFile.name,
          fileSize:        fbytes(pendingFile.size),
          fileSizeBytes:   pendingFile.size,
          fileType:        pendingFile.name.split('.').pop().toLowerCase(),
          hasFile:         true,
          storageBackend:  cloudDoc._local ? 'local' : 'supabase',
          name:            form.name.trim(),
        }
        setDocuments(dd => [...(Array.isArray(dd)?dd:[]), rec])
        setModal(false)
        getStorageUsage().then(s => setStorage(s))
        return
      }

      // Local-only path
      const id  = editing != null ? editing : nextId(safe)
      const rec = { ...BLANK, ...form, id, name: form.name.trim() }
      if (pendingFile) {
        setUploadMsg('Storing in IndexedDB…')
        await storeFile(id, pendingFile)
        rec.fileName     = pendingFile.name
        rec.fileSize     = fbytes(pendingFile.size)
        rec.fileSizeBytes= pendingFile.size
        rec.fileType     = pendingFile.name.split('.').pop().toLowerCase()
        rec.hasFile      = true
        rec.storageBackend = 'local'
      }
      if (editing != null) {
        setDocuments(dd => (Array.isArray(dd)?dd:[]).map(d => d.id===editing ? rec : d))
      } else {
        setDocuments(dd => [...(Array.isArray(dd)?dd:[]), rec])
      }
      setModal(false)
      getStorageUsage().then(s => setStorage(s))
    } catch (err) {
      setFormErr(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false); setUploadMsg('')
    }
  }, [form, editing, safe, pendingFile, setDocuments])

  // ── Delete ─────────────────────────────────────────────────────────────────
  const del = useCallback(async d => {
    if (!window.confirm(`Remove "${d.name}"?\nFile will be deleted from ${d.storageBackend==='supabase'?'Supabase Storage and ':''}local cache. Cannot be undone.`)) return
    try {
      if (d.storageBackend === 'supabase') {
        // Delete from Supabase (also removes IDB cache inside deleteDocumentCloud)
        await deleteDocumentCloud({ id: d.supabaseId, storage_path: d.storagePath, public_url: d.publicUrl, _idb_key: d.supabaseId })
      } else {
        await idbDelete(d.id)
      }
    } catch (err) { console.warn('[Docs] delete error:', err.message) }
    setDocuments(dd => (Array.isArray(dd)?dd:[]).filter(x => x.id !== d.id))
    if (selected === d.id) setSelected(null)
    getStorageUsage().then(s => setStorage(s))
  }, [setDocuments, selected])

  // ── File pick ──────────────────────────────────────────────────────────────
  const handleFilePick = useCallback(file => {
    if (!file) return
    setPendingFile(file)
    setForm(f => ({
      ...f,
      name:          f.name?.trim() || file.name.replace(/\.[^/.]+$/,''),
      fileName:      file.name,
      fileSize:      fbytes(file.size),
      fileSizeBytes: file.size,
      fileType:      file.name.split('.').pop().toLowerCase(),
    }))
  }, [])

  const onFilePick = e => { handleFilePick(e.target.files[0]); e.target.value='' }
  const onDrop = e => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) { handleFilePick(file); setEditing(null); setForm({...BLANK,dateUploaded:today()}); setModal(true) }
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  const openPreview = useCallback(async doc => {
    // DocPreview component handles URL resolution internally.
    // For CSV/TSV we pre-parse text here so it can be passed as csvText prop.
    const ext = (doc.fileType || '').toLowerCase()
    let csvText = null
    if (ext === 'csv' || ext === 'tsv') {
      try {
        const f = await retrieveFile(doc.supabaseId || doc.id).catch(()=>null) ||
                  await retrieveFile(doc.id).catch(()=>null)
        if (f) csvText = await f.text()
      } catch {}
    }
    setPreviewText(csvText)
    setPreviewDoc(doc)
  }, [])

  const closePreview = useCallback(() => {
    if (prevUrlRef.current) { URL.revokeObjectURL(prevUrlRef.current); prevUrlRef.current = null }
    setPreviewDoc(null); setPreviewUrl(null); setPreviewText(null)
    setPreviewErr(''); setPreviewSrc('')
  }, [])

  // ── Download ───────────────────────────────────────────────────────────────
  const downloadDoc = useCallback(async doc => {
    const idbKey = doc.supabaseId || doc.id
    // Try IDB first
    const ok = await downloadFileById(idbKey, doc.fileName || doc.name)
    if (ok) return
    // Fallback: Supabase URL
    if (SUPABASE_CONFIGURED && doc.storagePath) {
      try {
        const sbDoc = { id: doc.supabaseId, storage_path: doc.storagePath, public_url: doc.publicUrl }
        const { url } = await getDocumentUrl(sbDoc)
        const a = document.createElement('a')
        a.href = url; a.download = doc.fileName || doc.name; a.target = '_blank'; a.click()
        return
      } catch (err) { alert(`Download failed: ${err.message}`); return }
    }
    alert('File not available. It may have been stored on another device.')
  }, [])

  // ── Open in new tab ────────────────────────────────────────────────────────
  const openInTab = useCallback(async doc => {
    const idbKey = doc.supabaseId || doc.id
    const url = await createObjectURL(idbKey).catch(()=>null) || await createObjectURL(doc.id).catch(()=>null)
    if (url) { window.open(url, '_blank'); setTimeout(()=>URL.revokeObjectURL(url),30000); return }
    if (SUPABASE_CONFIGURED && doc.storagePath) {
      try {
        const sbDoc = { id: doc.supabaseId, storage_path: doc.storagePath, public_url: doc.publicUrl }
        const { url: su } = await getDocumentUrl(sbDoc)
        window.open(su, '_blank')
        return
      } catch (err) { alert(`Cannot open: ${err.message}`); return }
    }
    alert('File not available locally.')
  }, [])

  // ── Link to transaction ────────────────────────────────────────────────────
  const handleLinkChange = useCallback(async (docRecord, txnId) => {
    const updated = { ...docRecord, linkedTransactionId: txnId || null }
    setDocuments(dd => (Array.isArray(dd)?dd:[]).map(d => d.id===docRecord.id ? updated : d))
    if (SUPABASE_CONFIGURED && docRecord.supabaseId && txnId) {
      try { await linkDocumentToTransaction(docRecord.supabaseId, txnId) }
      catch (err) { console.warn('[Docs] link failed:', err.message) }
    }
  }, [setDocuments])

  // ── Filtering ──────────────────────────────────────────────────────────────
  const visible = safe.filter(d => {
    const q = search.toLowerCase()
    return (filterCat==='All' || d.category===filterCat) &&
      (!q || [d.name,d.supplier,d.category,d.notes,d.fileName].some(v=>(v||'').toLowerCase().includes(q)))
  })

  const selectedDoc = selected ? safe.find(d=>d.id===selected) : null
  const linkedTxn   = selectedDoc?.linkedTransactionId
    ? safeFin.find(t=>t.id===selectedDoc.linkedTransactionId)
    : null

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Business Documents</div>
          <div className="page-subtitle">
            Document Vault · {SUPABASE_CONFIGURED ? '☁ Supabase Storage + IndexedDB Cache' : '💻 IndexedDB Local Storage'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Document</button>
      </div>

      <div className="page-content">
        <StorageBanner storage={storage} />

        {/* Storage usage bar (local mode only) */}
        {!SUPABASE_CONFIGURED && storage.quotaMB > 0 && (
          <div style={{marginBottom:18}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:T.textLight,marginBottom:4}}>
              <span>Device storage: {storage.usedMB} MB used</span>
              <span>{safe.length} document{safe.length!==1?'s':''}</span>
            </div>
            <div className="pbar" style={{height:6}}>
              <div className="pbar-fill pbar-gold" style={{width:`${Math.min(100,storage.usedPct)}%`,background:storage.usedPct>80?`linear-gradient(90deg,${T.red},${T.danger})`:undefined}}/>
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`doc-drop-zone ${dragOver?'over':''}`}
          style={{marginBottom:22}}
          onDragOver={e=>{e.preventDefault();setDragOver(true)}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={onDrop}
          onClick={openNew}
        >
          <div style={{fontSize:34,opacity:0.36,marginBottom:10}}>⬆</div>
          <div style={{fontFamily:"'Manrope',sans-serif",fontSize:20,color:T.forest,marginBottom:5}}>
            {dragOver ? 'Drop to upload document' : 'Drag & drop to upload, or click to add'}
          </div>
          <div style={{fontSize:12,color:T.textLight}}>
            PDF · Image · CSV · Excel · Any file
            {SUPABASE_CONFIGURED ? ' — stored in Supabase Storage' : ' — stored in IndexedDB'}
          </div>
        </div>

        {/* Category grid */}
        <div className="sec-label">Categories</div>
        <div className="grid-4" style={{marginBottom:22,gap:12}}>
          <div className="g-card g-card-click" style={{padding:'14px 16px',textAlign:'center',border:filterCat==='All'?`1.5px solid ${T.gold}`:undefined}} onClick={()=>setFilterCat('All')}>
            <div style={{fontFamily:"'Manrope',sans-serif",fontSize:28,color:T.forest,marginBottom:3}}>{safe.length}</div>
            <div style={{fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:T.textLight,fontWeight:600}}>All Documents</div>
          </div>
          {CATEGORIES.filter(c=>safe.some(d=>d.category===c)).map(cat => {
            const count = safe.filter(d=>d.category===cat).length
            return (
              <div key={cat} className="g-card g-card-click" style={{padding:'12px 14px',border:filterCat===cat?`1.5px solid ${T.gold}`:undefined}} onClick={()=>setFilterCat(filterCat===cat?'All':cat)}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <div style={{width:30,height:30,borderRadius:8,background:CAT_BG[cat]||'rgba(161,161,170,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{DOC_ICONS[cat]}</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:T.forest}}>{cat}</div>
                    <div style={{fontSize:11,color:CAT_FG[cat]||T.textMid}}>{count} doc{count!==1?'s':''}</div>
                  </div>
                </div>
                <div className="pbar"><div className="pbar-fill pbar-gold" style={{width:`${(count/Math.max(safe.length,1))*100}%`}}/></div>
              </div>
            )
          })}
          {safe.length===0 && (
            <div style={{gridColumn:'1/-1'}}>
              <div className="empty-st"><div className="empty-ic">📁</div>
                <div style={{fontFamily:"'Manrope',sans-serif",fontSize:18,color:T.forest,marginBottom:6}}>No documents yet</div>
                <div style={{fontSize:13,color:T.textMid}}>Add CIPC certificates, SARS registration, bank statements, supplier quotes or invoices.</div>
              </div>
            </div>
          )}
        </div>

        {safe.length > 0 && (
          <>
            {/* Search + filter */}
            <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
              <div style={{position:'relative',flex:1,minWidth:220}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, supplier, category, notes…" style={{paddingLeft:36}}/>
                <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:T.textLight,pointerEvents:'none'}}>⊙</span>
              </div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {['All',...CATEGORIES].map(c=>(
                  <button key={c} className={`bp-fbtn ${filterCat===c?'active':''}`} onClick={()=>setFilterCat(c)}>{c}</button>
                ))}
              </div>
            </div>

            {/* Two-panel layout */}
            <div style={{display:'grid',gridTemplateColumns:selectedDoc?'1fr 340px':'1fr',gap:16,alignItems:'start'}}>

              {/* Document list */}
              <div style={{display:'flex',flexDirection:'column',gap:9}}>
                {visible.length===0 && <div className="empty-st"><div className="empty-ic">🔍</div><div>No documents match that filter.</div></div>}
                {visible.map(d => {
                  if (!d) return null
                  const isSel = selected===d.id
                  const cloud = d.storageBackend==='supabase'
                  return (
                    <div key={d.id} className="doc-card"
                      style={{border:isSel?`1.5px solid ${T.gold}`:undefined,boxShadow:isSel?`0 0 0 3px rgba(184,151,90,0.12),0 8px 24px rgba(15,35,24,0.1)`:undefined}}
                      onClick={()=>setSelected(isSel?null:d.id)}
                    >
                      <div className="doc-icon" style={{background:CAT_BG[d.category]||'rgba(161,161,170,0.1)'}}>{DOC_ICONS[d.category]||'📄'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="doc-name">{safeStr(d.name)}</div>
                        <div className="doc-meta">
                          <span style={{color:CAT_FG[d.category]||T.textMid,fontWeight:600}}>{d.category}</span>
                          {d.supplier && <> · {d.supplier}</>}
                          {' · '}{fmtDate(d.dateUploaded)}
                          {d.fileName && <> · <span style={{fontFamily:'monospace',fontSize:10}}>{d.fileName}</span></>}
                          {d.fileSize && <> <span style={{color:T.textMuted}}>({d.fileSize})</span></>}
                        </div>
                        <div style={{marginTop:4,display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
                          {cloud
                            ? <span className="badge badge-teal" style={{fontSize:10,padding:'1px 6px'}}>☁ Supabase</span>
                            : d.hasFile
                            ? <span className="badge badge-green" style={{fontSize:10,padding:'1px 6px'}}>💻 IndexedDB</span>
                            : <span className="badge badge-grey"  style={{fontSize:10,padding:'1px 6px'}}>No file</span>
                          }
                          {d.linkedTransactionId && <span style={{fontSize:10,color:T.teal,fontWeight:600}}>🔗 Linked</span>}
                        </div>
                        {d.notes && <div style={{fontSize:12,color:T.textMid,marginTop:4,overflowWrap:'break-word'}}>{truncate(d.notes,100)}</div>}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                        {(d.hasFile||cloud) && <>
                          <button className="btn btn-outline btn-xs" onClick={()=>openPreview(d)}>👁 Preview</button>
                          <button className="btn btn-outline btn-xs" onClick={()=>downloadDoc(d)}>⬇ Download</button>
                          <button className="btn btn-outline btn-xs" onClick={()=>openInTab(d)}>↗ Open</button>
                        </>}
                        <button className="btn btn-outline btn-xs" onClick={()=>openEdit(d)}>✎ Edit</button>
                        <button className="btn btn-xs btn-ghost" style={{color:T.textLight,fontSize:11}} onClick={()=>del(d)}>✕ Remove</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Detail panel */}
              {selectedDoc && (
                <div className="g-card" style={{position:'sticky',top:80}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,paddingBottom:14,borderBottom:`1px solid rgba(255,255,255,0.07)`}}>
                    <div className="doc-icon" style={{width:46,height:46}}>{DOC_ICONS[selectedDoc.category]||'📄'}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Manrope',sans-serif",fontSize:17,color:T.forest,lineHeight:1.2,overflowWrap:'break-word'}}>{selectedDoc.name}</div>
                      <div style={{fontSize:10,color:T.gold,letterSpacing:'0.1em',textTransform:'uppercase',fontWeight:700,marginTop:3}}>{selectedDoc.category}</div>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={()=>setSelected(null)}>✕</button>
                  </div>

                  {[
                    ['Date Added',  fmtDate(selectedDoc.dateUploaded)],
                    ['Supplier',    selectedDoc.supplier||'—'],
                    ['File',        selectedDoc.fileName||'—'],
                    ['Size',        selectedDoc.fileSize||'—'],
                    ['Type',        selectedDoc.fileType?.toUpperCase()||'—'],
                    ['Storage',     selectedDoc.storageBackend==='supabase' ? '☁ Supabase Cloud' : selectedDoc.hasFile ? '💻 IndexedDB' : '— No file'],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid rgba(255,255,255,0.07)`,fontSize:13,gap:8}}>
                      <span style={{color:T.textMid,fontWeight:500,flexShrink:0}}>{k}</span>
                      <span style={{color:T.forest,fontFamily:"'Manrope',sans-serif",fontSize:14,textAlign:'right',overflowWrap:'break-word',maxWidth:180}}>{v}</span>
                    </div>
                  ))}

                  {selectedDoc.notes && <div style={{marginTop:12,padding:12,background:'rgba(255,255,255,0.04)',borderRadius:8,fontSize:12,color:T.textMid,lineHeight:1.6,overflowWrap:'break-word'}}>{selectedDoc.notes}</div>}

                  {/* Link to transaction */}
                  <div style={{marginTop:14}}>
                    <label style={{fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',color:T.textMid,fontWeight:600,display:'block',marginBottom:5}}>Link to Transaction</label>
                    <select
                      value={selectedDoc.linkedTransactionId||''}
                      onChange={e=>handleLinkChange(selectedDoc,e.target.value||null)}
                      style={{width:'100%',fontSize:12,padding:'8px 10px'}}
                    >
                      <option value="">— No linked transaction —</option>
                      {safeFin.map(t=><option key={t.id} value={t.id}>{fmtDate(t.date)} · {t.description} · {ZAR(t.amount)}</option>)}
                    </select>
                  </div>

                  {/* Linked txn display */}
                  {linkedTxn && (
                    <div style={{marginTop:12,padding:12,background:T.tealPale,borderRadius:8,border:`1px solid rgba(14,116,144,0.2)`}}>
                      <div style={{fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:T.teal,fontWeight:700,marginBottom:5}}>🔗 Linked Transaction</div>
                      <div style={{fontSize:12,color:T.text,fontWeight:500,overflowWrap:'break-word'}}>{linkedTxn.description}</div>
                      <div style={{fontSize:11,color:T.textMid,marginTop:2}}>{fmtDate(linkedTxn.date)} · {linkedTxn.category}</div>
                      <div style={{fontFamily:"'Manrope',sans-serif",fontSize:18,color:T.teal,marginTop:4}}>{ZAR(linkedTxn.amount)}</div>
                    </div>
                  )}

                  <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:14}}>
                    {(selectedDoc.hasFile||selectedDoc.storageBackend==='supabase') ? <>
                      <button className="btn btn-primary btn-sm" onClick={()=>openPreview(selectedDoc)}>👁 Preview Document</button>
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={()=>downloadDoc(selectedDoc)}>⬇ Download</button>
                        <button className="btn btn-outline btn-sm" style={{flex:1}} onClick={()=>openInTab(selectedDoc)}>↗ Open Tab</button>
                      </div>
                    </> : (
                      <div style={{fontSize:12,color:T.textLight,textAlign:'center',padding:'8px 0'}}>No file attached. Edit to add a file.</div>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={()=>openEdit(selectedDoc)}>✎ Edit Metadata</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing!=null?'Edit Document':'Add Document'}
        footer={<>
          <button className="btn btn-outline" onClick={()=>setModal(false)} disabled={uploading}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={uploading||(!pendingFile&&editing==null&&!form.name?.trim())}>
            {uploading ? (uploadMsg||'Uploading…') : SUPABASE_CONFIGURED&&pendingFile ? '☁ Upload to Supabase' : 'Save Document'}
          </button>
        </>}
      >
        <div style={{background:SUPABASE_CONFIGURED?T.greenPale:T.goldPale,border:`1px solid ${SUPABASE_CONFIGURED?'rgba(21,128,61,0.2)':'rgba(184,151,90,0.18)'}`,borderRadius:10,padding:'11px 15px',marginBottom:18,fontSize:12,color:SUPABASE_CONFIGURED?T.green:'#6B4E10'}}>
          {SUPABASE_CONFIGURED
            ? '☁ File will be uploaded to Supabase Storage ("Botanica living - Documents" bucket) and cached locally for offline access.'
            : '💻 File stored in IndexedDB on this device. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to enable cloud storage.'
          }
        </div>

        {/* File picker */}
        <div
          style={{border:`2px dashed rgba(255,255,255,0.07)`,borderRadius:12,padding:20,textAlign:'center',marginBottom:18,cursor:uploading?'not-allowed':'pointer',background:pendingFile?'rgba(21,128,61,0.05)':'rgba(255,255,255,0.3)',opacity:uploading?0.7:1}}
          onClick={()=>!uploading&&fileRef.current?.click()}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();if(!uploading)handleFilePick(e.dataTransfer.files[0])}}
        >
          {uploading ? (
            <div><div style={{fontSize:22,marginBottom:6}}>⏳</div><div style={{fontSize:13,color:T.textMid}}>{uploadMsg||'Uploading…'}</div></div>
          ) : pendingFile ? (
            <div><div style={{fontSize:22,marginBottom:6}}>✅</div><div style={{fontSize:13,fontWeight:600,color:T.green}}>{pendingFile.name}</div><div style={{fontSize:11,color:T.textLight}}>({fbytes(pendingFile.size)}) — Click to replace</div></div>
          ) : form.hasFile||form.storageBackend==='supabase' ? (
            <div><div style={{fontSize:22,marginBottom:6}}>📎</div><div style={{fontSize:13,fontWeight:600,color:T.forest}}>{form.fileName}</div><div style={{fontSize:11,color:T.textLight}}>Click to replace</div></div>
          ) : (
            <div>
              <div style={{fontSize:22,opacity:0.38,marginBottom:6}}>📎</div>
              <div style={{fontSize:13,color:T.textMid}}>Click or drag & drop to attach a file</div>
              <div style={{fontSize:11,color:T.textLight,marginTop:4}}>PDF · Image · CSV · Excel · Any file</div>
            </div>
          )}
          <input ref={fileRef} type="file" style={{display:'none'}} onChange={onFilePick}/>
        </div>

        {formErr && <div style={{fontSize:12,color:T.danger,marginBottom:10}} role="alert">⚠ {formErr}</div>}

        <div className="form-grid">
          <div className="form-field full">
            <label htmlFor="doc-name">Document Name <span style={{color:T.danger}}>*</span></label>
            <input id="doc-name" value={form.name||''} onChange={F('name')} placeholder="e.g. COR14.3 Certificate of Incorporation"/>
          </div>
          <div className="form-field">
            <label htmlFor="doc-cat">Category</label>
            <select id="doc-cat" value={form.category} onChange={F('category')}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
          </div>
          <div className="form-field">
            <label htmlFor="doc-date">Date</label>
            <input id="doc-date" type="date" value={form.dateUploaded} onChange={F('dateUploaded')}/>
          </div>
          <div className="form-field full">
            <label htmlFor="doc-sup">Supplier (optional)</label>
            <input id="doc-sup" value={form.supplier||''} onChange={F('supplier')} placeholder="e.g. Frank / Dongyi"/>
          </div>
          <div className="form-field full">
            <label htmlFor="doc-notes">Notes</label>
            <textarea id="doc-notes" value={form.notes||''} onChange={F('notes')} placeholder="Notes about this document…"/>
          </div>
          <div className="form-field full">
            <label htmlFor="doc-txn">Link to Transaction (optional)</label>
            <select id="doc-txn" value={form.linkedTransactionId||''} onChange={e=>setForm(f=>({...f,linkedTransactionId:e.target.value||null}))}>
              <option value="">— No linked transaction —</option>
              {safeFin.map(t=><option key={t.id} value={t.id}>{fmtDate(t.date)} · {t.description} · {ZAR(t.amount)}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* PREVIEW MODAL */}
      {previewDoc && (
        <div className="modal-overlay" onClick={closePreview}>
          <div
            className="modal modal-xl"
            style={{maxHeight:'96vh',display:'flex',flexDirection:'column',padding:0,width:'min(96vw,1100px)'}}
            onClick={e=>e.stopPropagation()}
          >
            <div style={{padding:'16px 22px',borderBottom:`1px solid rgba(255,255,255,0.07)`,display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
              <div style={{fontFamily:"'Manrope',sans-serif",fontSize:19,color:T.forest,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {previewDoc.name}
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                {previewSrc && <span style={{fontSize:10,color:T.textLight}}>{previewSrc==='indexeddb'?'💻 local':previewSrc==='public'?'☁ public URL':'☁ signed URL'}</span>}
                <button className="btn btn-outline btn-sm" onClick={()=>downloadDoc(previewDoc)}>⬇ Download</button>
                <button className="btn btn-outline btn-sm" onClick={()=>openInTab(previewDoc)}>↗ Open</button>
                <button className="modal-close" onClick={closePreview}>✕</button>
              </div>
            </div>

            <div style={{flex:1,overflow:'auto',padding:16,minHeight:0}}>
              <DocPreview
                doc={{
                  id:           previewDoc.supabaseId || previewDoc.id,
                  supabaseId:   previewDoc.supabaseId || previewDoc.id,
                  storage_path: previewDoc.storagePath,
                  public_url:   previewDoc.publicUrl,
                  file_name:    previewDoc.fileName || previewDoc.name,
                  file_type:    previewDoc.fileType,
                  csvText:      previewText || null,
                }}
                onDownload={() => downloadDoc(previewDoc)}
                showDebug={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
