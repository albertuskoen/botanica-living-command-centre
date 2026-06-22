// src/components/DocPreview.jsx
// Shared PDF/image/CSV preview component used by both BusinessDocuments and FinanceCentre.
//
// TABLET/MOBILE BEHAVIOUR:
//   - Detects mobile/tablet browsers (Samsung Internet, Chrome Android, Safari iOS)
//   - On mobile: renders PDF with pdf.js canvas — does NOT use <iframe> (blocked on Android)
//   - On desktop: tries <iframe> first, falls back to pdf.js canvas on error
//
// URL PRIORITY (no blobs for cross-device):
//   1. Supabase signed URL (fresh, always works, correct Content-Type, any device)
//   2. Supabase public URL (permanent, only works when bucket is public)
//   3. IndexedDB blob URL (same device only, offline fallback)
//
// DEBUG INFO:
//   Shows preview source, bucket, storage path, and generated URL in a collapsible panel.

import { useState, useEffect, useRef, useCallback } from 'react'
import { T } from '../utils/tokens.js'
import { BUCKET, getDocumentUrl, SUPABASE_CONFIGURED } from '../lib/supabase.js'

// ── Device detection ───────────────────────────────────────────────────────────
function isMobileOrTablet() {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Samsung|SamsungBrowser/i
    .test(navigator.userAgent)
}

// ── CSV table preview ──────────────────────────────────────────────────────────
function CSVTable({ text }) {
  const lines   = (text || '').trim().split('\n').filter(Boolean)
  if (lines.length < 2) return <div style={{fontSize:12,color:T.textLight}}>No rows found.</div>
  const d       = (lines[0].match(/\t/g)?.length||0) > (lines[0].match(/,/g)?.length||0) ? '\t' : ','
  const headers = lines[0].split(d).map(c => c.replace(/"/g,'').trim())
  const rows    = lines.slice(1, 26).map(l => l.split(d).map(c => c.replace(/"/g,'').trim()))
  return (
    <div>
      <div style={{fontSize:11,color:T.textLight,marginBottom:8}}>
        First {Math.min(rows.length,25)} of {lines.length-1} rows · {headers.length} columns
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{headers.map((h,i) => <th key={i}>{h||`Col ${i+1}`}</th>)}</tr></thead>
          <tbody>{rows.map((r,ri) => <tr key={ri}>{headers.map((_,ci) => <td key={ci} style={{fontSize:12}}>{r[ci]||''}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

// ── pdf.js canvas renderer — used on mobile/tablet ────────────────────────────
function PdfJsRenderer({ url, fileName, onFallback }) {
  const containerRef = useRef(null)
  const [pageCount, setPageCount]   = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale]           = useState(1.2)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const renderTaskRef               = useRef(null)
  const pdfRef                      = useRef(null)

  const renderPage = useCallback(async (pdf, pageNum, sc) => {
    if (!containerRef.current) return
    try {
      const page     = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: sc })
      let canvas     = containerRef.current.querySelector('canvas')
      if (!canvas) {
        canvas = document.createElement('canvas')
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(canvas)
      }
      canvas.width  = viewport.width
      canvas.height = viewport.height
      canvas.style.width  = '100%'
      canvas.style.borderRadius = '8px'
      const ctx = canvas.getContext('2d')
      if (renderTaskRef.current) { try { renderTaskRef.current.cancel() } catch {} }
      renderTaskRef.current = page.render({ canvasContext: ctx, viewport })
      await renderTaskRef.current.promise
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('[PdfJs] render error:', err.message)
      }
    }
  }, [])

  useEffect(() => {
    if (!url) return
    let cancelled = false
    setLoading(true); setError('')

    ;(async () => {
      try {
        // Load pdf.js from CDN if not already loaded
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const s  = document.createElement('script')
            s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            s.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
              res()
            }
            s.onerror = () => rej(new Error('Could not load pdf.js from CDN'))
            document.head.appendChild(s)
          })
        }
        if (cancelled) return
        const pdf = await window.pdfjsLib.getDocument({ url, withCredentials: false }).promise
        if (cancelled) return
        pdfRef.current = pdf
        setPageCount(pdf.numPages)
        await renderPage(pdf, 1, scale)
        if (!cancelled) setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
          onFallback?.()
        }
      }
    })()

    return () => { cancelled = true }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pdfRef.current) renderPage(pdfRef.current, currentPage, scale)
  }, [currentPage, scale, renderPage])

  if (error) return null  // parent shows fallback

  return (
    <div>
      {loading && (
        <div style={{textAlign:'center',padding:'32px 16px'}}>
          <div style={{fontSize:24,marginBottom:8}}>⏳</div>
          <div style={{fontSize:13,color:T.textMid}}>Loading PDF… (first load downloads pdf.js ~1MB)</div>
        </div>
      )}
      <div ref={containerRef} style={{width:'100%',lineHeight:0}} />
      {!loading && pageCount > 1 && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,padding:'10px 0',fontSize:13}}>
          <button className="btn btn-outline btn-sm" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage<=1}>←</button>
          <span style={{color:T.textMid}}>Page {currentPage} of {pageCount}</span>
          <button className="btn btn-outline btn-sm" onClick={()=>setCurrentPage(p=>Math.min(pageCount,p+1))} disabled={currentPage>=pageCount}>→</button>
          <select value={scale} onChange={e=>setScale(parseFloat(e.target.value))} style={{fontSize:11,padding:'3px 6px'}}>
            <option value="0.8">80%</option>
            <option value="1.0">100%</option>
            <option value="1.2">120%</option>
            <option value="1.5">150%</option>
            <option value="2.0">200%</option>
          </select>
        </div>
      )}
    </div>
  )
}

// ── PDF iframe with error detection ───────────────────────────────────────────
function PdfIframe({ url, fileName, onError }) {
  const iframeRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    // Some browsers fire onload even on error. Check after delay.
    const timer = setTimeout(() => {
      try {
        const iframe = iframeRef.current
        if (iframe && (iframe.contentDocument?.body?.innerHTML?.length < 10 ||
            iframe.contentDocument?.title?.includes('error'))) {
          setFailed(true); onError?.()
        }
      } catch { /* cross-origin, can't inspect — assume ok */ }
    }, 3000)
    return () => clearTimeout(timer)
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return null
  return (
    <iframe
      ref={iframeRef}
      src={url}
      title={fileName || 'PDF document'}
      style={{width:'100%',height:'72vh',border:'none',borderRadius:8}}
      onError={() => { setFailed(true); onError?.() }}
    />
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DocPreview COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
//
// Props:
//   doc = {
//     id, supabaseId,          // Supabase document UUID
//     storage_path, storagePath, // path inside bucket
//     public_url, publicUrl,   // direct public URL
//     file_name, fileName,     // original filename
//     file_type, fileType,     // extension: 'pdf', 'jpg', etc.
//     csvText,                 // pre-parsed CSV text (optional)
//   }
//   rawText      — extracted OCR/pdf.js text to show in collapsible debug section
//   onDownload   — called when Download is clicked (fn receives the url)
//   style        — extra style for outer container
//   showDebug    — show debug info panel (default: true in dev)

const IMG_EXT = new Set(['jpg','jpeg','png','webp','gif','bmp','svg'])

export default function DocPreview({ doc, rawText, onDownload, style, showDebug = false }) {
  const [activeUrl,  setActiveUrl]  = useState(null)
  const [urlSource,  setUrlSource]  = useState('')  // 'signed'|'public'|'indexeddb'|'blob'
  const [loading,    setLoading]    = useState(true)
  const [loadErr,    setLoadErr]    = useState('')
  const [usePdfJs,   setUsePdfJs]   = useState(isMobileOrTablet())
  const [pdfFailed,  setPdfFailed]  = useState(false)
  const revokeRef = useRef(null)

  const isMobile   = isMobileOrTablet()
  const fileName   = doc?.file_name   || doc?.fileName   || ''
  const fileType   = (doc?.file_type  || doc?.fileType   || fileName.split('.').pop() || '').toLowerCase()
  const storagePath= doc?.storage_path || doc?.storagePath || ''
  const publicUrl  = doc?.public_url  || doc?.publicUrl  || ''
  const idbKey     = doc?.supabaseId  || doc?.id         || ''
  const isPdf      = fileType === 'pdf' || fileName.toLowerCase().endsWith('.pdf')
  const isImg      = IMG_EXT.has(fileType)
  const isCsv      = fileType === 'csv' || fileType === 'tsv'

  // ── Resolve URL from Supabase (priority: signed > public > IDB) ─────────────
  useEffect(() => {
    if (!doc) return
    let cancelled = false

    // Cleanup old blob URL
    if (revokeRef.current) { URL.revokeObjectURL(revokeRef.current); revokeRef.current = null }
    setActiveUrl(null); setLoadErr(''); setLoading(true); setPdfFailed(false)

    // CSV with pre-parsed text — no URL needed
    if (isCsv && doc?.csvText) {
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const sbDoc = {
          id:           idbKey,
          storage_path: storagePath,
          public_url:   publicUrl,
          _idb_key:     idbKey,
        }
        const { url, source, revoke } = await getDocumentUrl(sbDoc, 3600)
        if (cancelled) return
        if (revoke) revokeRef.current = url
        setActiveUrl(url)
        setUrlSource(source)
      } catch (err) {
        if (!cancelled) setLoadErr(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idbKey, storagePath, publicUrl])

  // Cleanup on unmount
  useEffect(() => () => {
    if (revokeRef.current) URL.revokeObjectURL(revokeRef.current)
  }, [])

  const handleDownload = useCallback(() => {
    if (!activeUrl) return
    if (onDownload) { onDownload(activeUrl); return }
    const a = document.createElement('a')
    a.href = activeUrl; a.download = fileName || 'document'; a.click()
  }, [activeUrl, fileName, onDownload])

  const openInTab = useCallback(() => {
    if (activeUrl) window.open(activeUrl, '_blank')
  }, [activeUrl])

  // ── Action buttons — always shown when URL is available ──────────────────────
  const ActionButtons = ({ alwaysShow = false }) => {
    if (!activeUrl && !alwaysShow) return null
    return (
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
        {activeUrl && (
          <>
            <a href={activeUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
              ↗ Open in New Tab
            </a>
            <button className="btn btn-outline btn-sm" onClick={handleDownload}>⬇ Download</button>
          </>
        )}
      </div>
    )
  }

  // ── Outer container ───────────────────────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12,...(style||{})}}>

      {/* Loading */}
      {loading && (
        <div style={{textAlign:'center',padding:'32px 16px'}}>
          <div style={{fontSize:24,marginBottom:8}}>⏳</div>
          <div style={{fontSize:13,color:T.textMid}}>
            {SUPABASE_CONFIGURED ? 'Fetching from Supabase Storage…' : 'Loading…'}
          </div>
        </div>
      )}

      {/* Error loading URL */}
      {!loading && loadErr && (
        <div>
          <div style={{padding:'12px 14px',background:T.redPale,border:`1px solid rgba(185,28,28,0.2)`,borderRadius:8,fontSize:12,color:T.danger,marginBottom:10}}>
            ⚠ Could not load preview: {loadErr}
          </div>
          <div style={{fontSize:12,color:T.textMid,marginBottom:10}}>
            {SUPABASE_CONFIGURED
              ? 'The file may not be accessible. Try opening or downloading directly.'
              : 'Supabase is not connected. File may only be available on the device it was uploaded from.'}
          </div>
          <ActionButtons alwaysShow={false}/>
        </div>
      )}

      {/* CSV table */}
      {!loading && !loadErr && isCsv && doc?.csvText && (
        <CSVTable text={doc.csvText} />
      )}

      {/* Image */}
      {!loading && !loadErr && activeUrl && isImg && (
        <div>
          <img
            src={activeUrl}
            alt={fileName}
            style={{maxWidth:'100%',maxHeight:'72vh',borderRadius:8,boxShadow:'0 4px 20px rgba(0,0,0,0.15)',objectFit:'contain',display:'block'}}
            onError={() => setLoadErr('Image failed to load. Try downloading.')}
          />
          <ActionButtons />
        </div>
      )}

      {/* PDF — mobile/tablet: pdf.js canvas renderer */}
      {!loading && !loadErr && activeUrl && isPdf && (isMobile || usePdfJs) && !pdfFailed && (
        <div>
          <div style={{fontSize:11,color:T.textMid,marginBottom:6,display:'flex',alignItems:'center',gap:8}}>
            <span>📱 PDF renderer (pdf.js)</span>
            <button className="btn btn-ghost btn-xs" style={{fontSize:10}} onClick={()=>setUsePdfJs(false)}>
              Try inline view
            </button>
          </div>
          <PdfJsRenderer
            url={activeUrl}
            fileName={fileName}
            onFallback={() => setPdfFailed(true)}
          />
          <ActionButtons />
        </div>
      )}

      {/* PDF — desktop: iframe with error fallback to pdf.js */}
      {!loading && !loadErr && activeUrl && isPdf && !isMobile && !usePdfJs && !pdfFailed && (
        <div>
          <PdfIframe
            url={activeUrl}
            fileName={fileName}
            onError={() => { setUsePdfJs(true) }}
          />
          <ActionButtons />
        </div>
      )}

      {/* PDF fallback — pdf.js also failed or pdfFailed is true */}
      {!loading && !loadErr && activeUrl && isPdf && pdfFailed && (
        <div style={{textAlign:'center',padding:'32px 20px',background:'rgba(228,221,208,0.3)',borderRadius:12}}>
          <div style={{fontSize:36,marginBottom:12,opacity:0.4}}>📄</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,color:T.forest,marginBottom:8}}>
            {fileName}
          </div>
          <div style={{fontSize:13,color:T.textMid,marginBottom:16,maxWidth:320,margin:'0 auto 16px'}}>
            PDF preview is limited on this device.{isMobile ? ' Use Open or Download to view the full document.' : ''}
          </div>
          <ActionButtons alwaysShow />
        </div>
      )}

      {/* Unsupported file type with URL */}
      {!loading && !loadErr && activeUrl && !isPdf && !isImg && !(isCsv && doc?.csvText) && (
        <div style={{textAlign:'center',padding:'32px 20px'}}>
          <div style={{fontSize:36,marginBottom:12,opacity:0.4}}>📎</div>
          <div style={{fontSize:13,color:T.textMid,marginBottom:16}}>
            Preview not available for <strong>.{fileType}</strong> files.
          </div>
          <ActionButtons alwaysShow />
        </div>
      )}

      {/* No URL, no CSV, no error, not loading */}
      {!loading && !loadErr && !activeUrl && !(isCsv && doc?.csvText) && (
        <div style={{textAlign:'center',padding:'32px 20px',color:T.textLight}}>
          <div style={{fontSize:36,marginBottom:10,opacity:0.3}}>📄</div>
          <div style={{fontSize:13}}>No file available for preview.</div>
          {!SUPABASE_CONFIGURED && (
            <div style={{fontSize:11,color:T.textMid,marginTop:8,maxWidth:280,margin:'8px auto 0'}}>
              Supabase is not connected. Documents uploaded on another device are not available here.
            </div>
          )}
        </div>
      )}

      {/* Debug info */}
      {showDebug && (
        <details style={{marginTop:4}}>
          <summary style={{fontSize:10,color:T.textLight,cursor:'pointer',userSelect:'none'}}>
            Preview debug info
          </summary>
          <div style={{fontSize:10,fontFamily:'monospace',color:T.textMid,background:'rgba(228,221,208,0.4)',borderRadius:8,padding:10,marginTop:6,lineHeight:1.7,wordBreak:'break-all'}}>
            <div><strong>Source:</strong> {urlSource || 'none'}</div>
            <div><strong>Bucket:</strong> {BUCKET}</div>
            <div><strong>Storage path:</strong> {storagePath || '—'}</div>
            <div><strong>Public URL:</strong> {publicUrl ? publicUrl.substring(0,80)+'…' : '—'}</div>
            <div><strong>Active URL:</strong> {activeUrl ? activeUrl.substring(0,80)+'…' : '—'}</div>
            <div><strong>File type:</strong> {fileType}</div>
            <div><strong>Device:</strong> {isMobile ? 'mobile/tablet' : 'desktop'}</div>
            <div><strong>Supabase:</strong> {SUPABASE_CONFIGURED ? 'connected' : 'not configured'}</div>
          </div>
        </details>
      )}

      {/* Extracted text toggle */}
      {rawText && (
        <details>
          <summary style={{fontSize:11,color:T.textLight,cursor:'pointer',userSelect:'none'}}>
            Show extracted text
          </summary>
          <pre style={{fontSize:10,color:T.textMid,background:'rgba(228,221,208,0.4)',borderRadius:8,padding:10,maxHeight:160,overflow:'auto',fontFamily:'monospace',lineHeight:1.5,whiteSpace:'pre-wrap',marginTop:6}}>
            {rawText.substring(0,1800)}{rawText.length>1800?'\n…':''}
          </pre>
        </details>
      )}
    </div>
  )
}
