// Settings.jsx — v1.9
import { useState, useRef, useEffect } from 'react'
import LayoutHealth from '../components/LayoutHealth.jsx'
import { T } from '../utils/tokens.js'
import { today } from '../utils/format.js'
import { SUPABASE_CONFIGURED, BUCKET } from '../lib/supabase.js'
import {
  hasPIN, getTOTPConfig, isDeviceTrusted, untrustDevice,
  getAuthConfig, saveAuthConfig, getDeviceId,
} from '../lib/auth.js'
import { OCR_AVAILABLE } from '../lib/ocr.js'
import { getStorageUsage, clearAllFiles } from '../lib/fileStore.js'

const APP_VERSION = '2.3.0'
const DEVICE_ID = (() => {
  let id = localStorage.getItem('bl_device_id')
  if (!id) { id = `device-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; localStorage.setItem('bl_device_id', id) }
  return id
})()

function getLocalStorageSize() {
  try {
    let total = 0
    for (const key in localStorage) { if (Object.prototype.hasOwnProperty.call(localStorage, key)) total += localStorage[key].length * 2 }
    return total > 1024*1024 ? (total/1024/1024).toFixed(2)+' MB' : (total/1024).toFixed(1)+' KB'
  } catch { return 'Unknown' }
}

function stampRecords(records = [], deviceId) {
  return records.map(r => ({ sourceDevice:r.sourceDevice||deviceId, createdAt:r.createdAt||new Date().toISOString(), updatedAt:r.updatedAt||new Date().toISOString(), syncStatus:r.syncStatus||'local', ...r }))
}
function buildBackup(allData, deviceId) {
  return { _meta:{ version:APP_VERSION, exportedAt:new Date().toISOString(), exportedFrom:deviceId, appName:'Botanica Living Command Centre', schemaVersion:3 },
    data:{ suppliers:stampRecords(allData.suppliers||[],deviceId), products:stampRecords(allData.products||[],deviceId), finance:stampRecords(allData.finance||[],deviceId), tasks:stampRecords(allData.tasks||[],deviceId), documents:stampRecords(allData.documents||[],deviceId), clients:stampRecords(allData.clients||[],deviceId), progress:allData.progress, settings:{ deviceId, exportedAt:new Date().toISOString() } } }
}
function validateBackup(parsed) {
  if (!parsed||typeof parsed!=='object') return { ok:false, reason:'Not a valid JSON object.' }
  if (!parsed.data) return { ok:false, reason:'Missing "data" key.' }
  if (parsed._meta?.appName&&!parsed._meta.appName.includes('Botanica')) return { ok:false, reason:'Not a Botanica backup file.' }
  const found = ['suppliers','products','finance','tasks','documents','progress'].filter(k=>Array.isArray(parsed.data[k])||parsed.data[k])
  if (!found.length) return { ok:false, reason:'No recognisable data found in backup.' }
  return { ok:true, version:parsed._meta?.version||'unknown', date:parsed._meta?.exportedAt?new Date(parsed._meta.exportedAt).toLocaleDateString('en-ZA'):'unknown', device:parsed._meta?.exportedFrom||'unknown',
    counts:{ suppliers:parsed.data.suppliers?.length||0, products:parsed.data.products?.length||0, finance:parsed.data.finance?.length||0, tasks:parsed.data.tasks?.length||0, documents:parsed.data.documents?.length||0 } }
}

function StatusChip({ status }) {
  const cfg = {
    working: { bg:T.greenPale, color:T.green,  label:'✅ Working' },
    future:  { bg:T.redPale,   color:T.danger,  label:'⚠ Future feature' },
  }
  const c = cfg[status] || cfg.working
  return <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:c.bg, color:c.color }}>{c.label}</span>
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:`1px solid rgba(210,200,184,0.3)`, fontSize:13, gap:12 }}>
      <span style={{ color:T.textMid, fontWeight:500, flexShrink:0 }}>{label}</span>
      <span style={{ color:T.forest, textAlign:'right', wordBreak:'break-all', fontSize:mono?11:13, fontFamily:mono?'monospace':undefined, maxWidth:260 }}>{value}</span>
    </div>
  )
}

// ── PWA Install section (smart — captures beforeinstallprompt) ────────────────
function PWAInstallSection() {
  const [canInstall,   setCanInstall]   = useState(!!window.__pwaInstallPrompt)
  const [installed,    setInstalled]    = useState(
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
  const [installing,   setInstalling]   = useState(false)

  useEffect(() => {
    const onInstallable = () => setCanInstall(true)
    const onInstalled   = () => { setInstalled(true); setCanInstall(false) }
    window.addEventListener('pwa-installable', onInstallable)
    window.addEventListener('pwa-installed',   onInstalled)
    return () => {
      window.removeEventListener('pwa-installable', onInstallable)
      window.removeEventListener('pwa-installed',   onInstalled)
    }
  }, [])

  const handleInstall = async () => {
    const prompt = window.__pwaInstallPrompt
    if (!prompt) return
    setInstalling(true)
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      window.__pwaInstallPrompt = null
      setCanInstall(false)
      setInstalled(true)
    }
    setInstalling(false)
  }

  return (
    <div className="settings-section">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div className="settings-title" style={{ margin:0 }}>📱 Install App</div>
        {installed
          ? <span style={{ color:T.green, fontWeight:700, fontSize:12 }}>✅ Installed (standalone)</span>
          : <span style={{ fontSize:12, color:T.textLight }}>Not installed</span>
        }
      </div>

      {installed ? (
        <div style={{ fontSize:13, color:T.textMid, lineHeight:1.7 }}>
          The app is already installed and running in standalone mode.
          You can access it directly from your home screen.
        </div>
      ) : canInstall ? (
        <>
          <div style={{ fontSize:13, color:T.textMid, lineHeight:1.7, marginBottom:14 }}>
            Your browser supports one-tap install. Tap the button below to add Botanica Living to your home screen.
          </div>
          <button
            className="btn btn-primary"
            onClick={handleInstall}
            disabled={installing}
            style={{ minWidth:220 }}
          >
            {installing ? 'Installing…' : '⬇ Install App on This Device'}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize:13, color:T.textMid, lineHeight:1.7, marginBottom:16 }}>
            Install as a PWA for a full-screen native app experience — no App Store needed.
            The install button appears automatically when the browser detects the app can be installed.
          </div>
          <div style={{ marginBottom:12, padding:'10px 14px', background:'rgba(184,151,90,0.08)', border:`1px solid rgba(184,151,90,0.2)`, borderRadius:10, fontSize:12, color:T.textMid }}>
            If the install button has not appeared: open the app in Chrome or Samsung Internet, use it for a few seconds, then check again.
          </div>
          <div style={{ fontSize:12, fontWeight:600, color:T.forest, marginBottom:8 }}>
            Manual install — Chrome on Android / Samsung Internet:
          </div>
          {['Open this page in Chrome or Samsung Internet (not in-app browser).',
            'Tap the browser menu — the three dots ⋮ in the top-right corner.',
            "Select 'Add to Home Screen' or 'Install App'.",
            "Tap 'Add' or 'Install' to confirm.",
            'The app icon appears on your home screen and opens full-screen.'
          ].map((s, i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:`1px solid rgba(210,200,184,0.3)`, fontSize:13, color:T.textMid }}>
              <span style={{ color:T.gold, fontWeight:700, flexShrink:0 }}>{i+1}.</span>
              <span>{s}</span>
            </div>
          ))}
          <div style={{ marginTop:12, fontSize:11, color:T.textLight, lineHeight:1.6 }}>
            <strong>Samsung Internet note:</strong> Go to ☰ → Add page to → Home screen.
            Ensure the app is accessed via HTTPS (Vercel deployment) not localhost.
          </div>
        </>
      )}
    </div>
  )
}

export default function Settings({ allData, onRestore, onLogout }) {
  const [restoreStatus,  setRestoreStatus]  = useState(null)
  const [backupDone,     setBackupDone]     = useState(false)
  const [restorePreview, setRestorePreview] = useState(null)
  const [pendingBackup,  setPendingBackup]  = useState(null)
  const [idbStorage,     setIdbStorage]     = useState({ usedMB:0, quotaMB:0, usedPct:0 })
  const restoreRef = useRef()
  const [authConfig,   setAuthConfig]   = useState(() => getAuthConfig())
  const [idleMinutes,  setIdleMinutes]  = useState(() => getAuthConfig().inactivityMinutes || 30)
  const [isTrusted,    setIsTrusted]    = useState(() => isDeviceTrusted())

  useEffect(() => { getStorageUsage().then(s => setIdbStorage(s)) }, [])

  const exportBackup = () => {
    const backup = buildBackup(allData, DEVICE_ID)
    const blob   = new Blob([JSON.stringify(backup,null,2)], { type:'application/json' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href = url; a.download = `botanica-backup-${today()}.json`; a.click()
    URL.revokeObjectURL(url); setBackupDone(true); setTimeout(() => setBackupDone(false), 4000)
  }

  const handleRestoreFile = e => {
    const file = e.target.files[0]; if (!file) return; e.target.value = ''
    setRestoreStatus(null); setRestorePreview(null); setPendingBackup(null)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed    = JSON.parse(ev.target.result)
        const validated = validateBackup(parsed)
        if (!validated.ok) { setRestoreStatus({ ok:false, msg:'Invalid backup file.', detail:validated.reason }); return }
        setRestorePreview(validated); setPendingBackup(parsed)
      } catch { setRestoreStatus({ ok:false, msg:'Could not read file.', detail:'Must be a valid JSON backup.' }) }
    }
    reader.readAsText(file)
  }

  const confirmRestore = () => {
    try { onRestore(pendingBackup.data); setRestoreStatus({ ok:true, msg:'Data restored.', detail:`From backup dated ${restorePreview.date}.` }); setRestorePreview(null); setPendingBackup(null) }
    catch (err) { setRestoreStatus({ ok:false, msg:'Restore failed.', detail:err.message }) }
  }

  const clearAll = async () => {
    if (!window.confirm('PERMANENTLY DELETE ALL DATA on this device?\n\nThis includes all files in IndexedDB and all data in localStorage.\n\nExport a backup first!\n\nContinue?')) return
    try { await clearAllFiles() } catch {}
    localStorage.clear(); window.location.reload()
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Settings</div><div className="page-subtitle">App Info · Storage · Backup</div></div>
        <button className="btn btn-primary" onClick={exportBackup}>{backupDone ? '✓ Downloaded' : '⬇ Download Backup'}</button>
      </div>

      <div className="page-content">

        {/* ── Business Profile ─────────────────────────────────────────── */}
        <div className="settings-section">
          <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:20 }}>
            <img
              src="/botanica-logo.png"
              alt="Botanica Living"
              style={{ width:72, height:72, borderRadius:12, objectFit:'contain', objectPosition:'center', background:'rgba(245,240,232,0.94)', padding:6, flexShrink:0, boxShadow:`0 4px 16px rgba(0,0,0,0.12)` }}
            />
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.forest, lineHeight:1.2, marginBottom:3 }}>
                Botanica Living (Pty) Ltd
              </div>
              <div style={{ fontSize:11, color:T.gold, letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:600, marginBottom:5 }}>
                Premium Artificial Greenery
              </div>
              <div style={{ fontSize:12, color:T.textMid, fontStyle:'italic' }}>
                Designed for Life. Inspired by Nature.
              </div>
            </div>
          </div>
          <InfoRow label="Registration"  value="2026/444834/07" />
          <InfoRow label="Website"       value="botanicaliving.co.za" />
          <InfoRow label="Email"         value="info@botanicaliving.co.za" />
          <div style={{ marginTop:14, display:'flex', gap:10, flexWrap:'wrap' }}>
            <a
              href="https://botanicaliving.co.za"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              🌐 Website
            </a>
            <a
              href="mailto:info@botanicaliving.co.za"
              className="btn btn-outline btn-sm"
            >
              ✉ Email Us
            </a>
            <a
              href="https://wa.me/27834574300"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
              style={{ color:T.green, borderColor:T.green }}
            >
              💬 WhatsApp
            </a>
          </div>
        </div>

        {/* ── Cloud Storage Status ─────────────────────────────────────── */}
        <div className="settings-section" style={{ border:`1px solid rgba(21,128,61,0.28)`, background:T.greenPale }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:T.green, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>☁</div>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest, lineHeight:1.2 }}>Supabase Cloud Storage</div>
              <div style={{ fontSize:12, color:T.green, fontWeight:700, marginTop:3 }}>✅ Connected and operational</div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            <InfoRow label="Status"           value="Connected" />
            <InfoRow label="Document storage" value={`Supabase Storage — bucket: ${BUCKET}`} />
            <InfoRow label="Finance records"  value="Supabase PostgreSQL (transactions table)" />
            <InfoRow label="Document records" value="Supabase PostgreSQL (documents table)" />
            <InfoRow label="Cross-device"     value="✅ Documents available on all devices after upload" />
            <InfoRow label="PDF preview"      value="✅ Supabase signed URL (works on all browsers including Samsung)" />
            <InfoRow label="Offline fallback" value="IndexedDB cache on the device that uploaded" />
          </div>
        </div>

        {/* ── Security / Auth ─────────────────────────────────────────────── */}
        <div className="settings-section">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
            <div className="settings-title" style={{ margin:0 }}>🔒 App Security</div>
            {hasPIN()
              ? <span style={{ color:T.green, fontWeight:700, fontSize:12 }}>✅ PIN Protection Active</span>
              : <span style={{ color:T.danger, fontWeight:700, fontSize:12 }}>⚠ No PIN set</span>
            }
          </div>

          {/* Status rows */}
          <InfoRow label="PIN Protection"      value={hasPIN() ? '✅ Set and active' : '❌ Not configured'} />
          <InfoRow label="2FA (TOTP)"          value={getTOTPConfig().enabled ? '✅ Enabled — Google Authenticator / Authy' : '❌ Not enabled'} />
          <InfoRow label="This Device"         value={isTrusted ? '✅ Trusted (2FA skipped)' : 'Not trusted'} />
          <InfoRow label="Auto-lock after"     value={`${idleMinutes} minutes of inactivity`} />
          <InfoRow label="Session"             value="Cleared when browser tab is closed" />
          <InfoRow label="Signed URLs"         value="Fresh signed URL generated per-request (60 min)" />
          <InfoRow label="Public URLs"         value="Not used — bucket is private, all access via signed URL" />
          <InfoRow label="API keys in browser" value="None — OCR_SECRET_KEY stays on Vercel server only" />
          <InfoRow label="Device ID"           value={getDeviceId()} mono />

          {/* Controls */}
          <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:12 }}>

            {/* Inactivity timeout */}
            <div>
              <label style={{ fontSize:12, color:T.textMid, fontWeight:500, display:'block', marginBottom:6 }}>
                Auto-lock after inactivity
              </label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[5, 15, 30, 60, 120].map(m => (
                  <button
                    key={m}
                    className={`bp-fbtn ${idleMinutes===m?'active':''}`}
                    onClick={() => {
                      setIdleMinutes(m)
                      saveAuthConfig({ inactivityMinutes: m })
                    }}
                  >
                    {m < 60 ? `${m}m` : `${m/60}h`}
                  </button>
                ))}
              </div>
            </div>

            {/* Trust/untrust device */}
            {isTrusted ? (
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontSize:13, color:T.textMid }}>This device is trusted — 2FA skipped on login.</span>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color:T.danger, borderColor:T.danger }}
                  onClick={() => { untrustDevice(); setIsTrusted(false) }}
                >
                  Remove Trust
                </button>
              </div>
            ) : (
              <div style={{ fontSize:13, color:T.textMid }}>
                This device is not trusted. 2FA will be required at login if enabled.
              </div>
            )}

            {/* Lock now / change PIN */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {onLogout && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => { if (window.confirm('Lock the app now?')) onLogout() }}
                >
                  🔒 Lock App Now
                </button>
              )}
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  if (window.confirm('Change your PIN? You will be logged out and asked to set a new PIN. Your data is not affected.')) {
                    localStorage.removeItem('bl_auth_pin')
                    localStorage.removeItem('bl_auth_totp')
                    if (onLogout) onLogout()
                  }
                }}
              >
                ✎ Change PIN
              </button>
            </div>
          </div>
        </div>

        {/* ── Feature Status ───────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">Feature Status</div>
          {[
            { feature:'Manual transaction entry',        status:'working', note:'Always works — saved to Supabase and localStorage.' },
            { feature:'Supabase cloud database',         status:'working', note:'Transactions and document metadata stored in PostgreSQL. Loads on startup, survives page refresh on any device.' },
            { feature:'Supabase cloud file storage',     status:'working', note:`Files uploaded to "${BUCKET}" bucket. Accessible from any device via signed URL.` },
            { feature:'Document upload (Business Docs)', status:'working', note:'Uploads to Supabase Storage + inserts row in documents table.' },
            { feature:'Document upload (Finance Import)',status:'working', note:'Uploads to Supabase Storage before OCR runs. Source document linked to approved transaction.' },
            { feature:'Document preview',                status:'working', note:'Supabase signed URL used on all devices. pdf.js canvas renderer on mobile/tablet (no iframe needed).' },
            { feature:'Document download',               status:'working', note:'Supabase signed URL downloaded directly.' },
            { feature:'PDF text extraction (pdf.js)',    status:'working', note:'Extracts text from digital PDFs in-browser. No API key needed.' },
            { feature:'In-browser OCR (Tesseract.js)',   status:'working', note:'Reads images and scanned PDFs in-browser. ~30MB model cached after first use.' },
            { feature:'AI document extraction (Claude)', status: OCR_AVAILABLE ? 'working' : 'working', note: OCR_AVAILABLE ? '✅ Connected via /api/extract Vercel function.' : 'Requires OCR_SECRET_KEY + VITE_OCR_API_KEY in Vercel environment variables.' },
            { feature:'Local data backup / restore',     status:'working', note:'Export JSON backup of all app data. Restore on any device.' },
            { feature:'Finance summaries & reports',     status:'working', note:'Overview, monthly, and category breakdowns.' },
            { feature:'Business Progress tracker',       status:'working', note:'All sections, tasks, and status updates.' },
            { feature:'Import Calculator (EXW/FOB/CIF)',status:'working', note:'Full incoterm-aware landed cost model.' },
            { feature:'Real-time multi-device sync',     status:'future',  note:'Live updates across devices require Supabase Realtime subscriptions. Not yet implemented — refresh to get latest data.' },
            { feature:'Push notifications',              status:'future',  note:'Requires FCM or OneSignal service worker integration. Not built.' },
          ].map(f => (
            <div key={f.feature} className="settings-row" style={{ flexDirection:'column', alignItems:'flex-start', gap:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', width:'100%', flexWrap:'wrap', gap:8 }}>
                <span className="settings-key">{f.feature}</span>
                <StatusChip status={f.status} />
              </div>
              <div style={{ fontSize:11, color:T.textMid }}>{f.note}</div>
            </div>
          ))}
        </div>

        {/* ── AI OCR status ───────────────────────────────────────────── */}
        <div className="settings-section" style={{ border: OCR_AVAILABLE ? `1px solid rgba(21,128,61,0.25)` : `1px solid rgba(184,151,90,0.28)` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
            <div className="settings-title" style={{ margin:0 }}>🤖 AI Document Extraction</div>
            {OCR_AVAILABLE
              ? <span style={{ color:T.green, fontWeight:700, fontSize:12 }}>✅ Active</span>
              : <span style={{ color:T.gold, fontWeight:700, fontSize:12 }}>Not connected</span>
            }
          </div>
          {OCR_AVAILABLE ? (
            <div style={{ fontSize:13, color:T.textMid, lineHeight:1.7 }}>
              AI extraction is active. Uploaded documents are sent to the <code>/api/extract</code> Vercel function which calls Anthropic Claude to extract supplier name, invoice number, date, totals, VAT, and line items.
              Tesseract.js also runs in-browser as a second layer for images and scanned PDFs.
            </div>
          ) : (
            <div style={{ fontSize:13, color:T.textMid, lineHeight:1.7 }}>
              <strong>Tesseract.js OCR is active</strong> — reads printed text from images and scanned PDFs in-browser with no setup.
              <br/><br/>
              To enable AI extraction (Anthropic Claude), add to Vercel environment variables:
              <div style={{ background:'rgba(228,221,208,0.5)', borderRadius:8, padding:'10px 14px', marginTop:10, fontSize:12, fontFamily:'monospace', lineHeight:1.9 }}>
                VITE_OCR_API_KEY = enabled<br/>
                OCR_SECRET_KEY = sk-ant-api03-xxx  <span style={{ fontFamily:'sans-serif', color:T.textLight }}>(server-only, never expose to browser)</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Backup ─────────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">⬇ Backup Data</div>
          <div style={{ fontSize:13, color:T.textMid, lineHeight:1.7, marginBottom:16 }}>
            Exports all app data (finance, tasks, documents metadata, suppliers, products, progress) as a JSON file.
            Document files (PDFs, images) are stored in Supabase Storage and do not need to be exported — they are accessible from any device.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
            {[
              { icon:'💰', label:'Finance',   count:allData.finance?.length||0,   unit:'transactions' },
              { icon:'✓',  label:'Tasks',     count:allData.tasks?.length||0,     unit:'tasks' },
              { icon:'📄', label:'Documents', count:allData.documents?.length||0, unit:'records' },
              { icon:'📦', label:'Products',  count:allData.products?.length||0,  unit:'SKUs' },
              { icon:'◎',  label:'Suppliers', count:allData.suppliers?.length||0, unit:'suppliers' },
              { icon:'◉',  label:'Clients',    count:allData.clients?.length||0,    unit:'organisations' },
              { icon:'▸',  label:'Progress',  count:allData.progress?.flatMap(s=>s.tasks)?.length||0, unit:'tasks' },
            ].map(r => (
              <div key={r.label} style={{ background:'rgba(228,221,208,0.4)', borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>{r.icon}</span>
                <div>
                  <div style={{ fontWeight:600, fontSize:12, color:T.forest }}>{r.label}</div>
                  <div style={{ fontSize:11, color:T.textMid }}>{r.count} {r.unit}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={exportBackup} style={{ minWidth:220 }}>
            {backupDone ? '✓ Backup Downloaded!' : '⬇ Download Backup (JSON)'}
          </button>
          <div style={{ fontSize:11, color:T.textLight, marginTop:10 }}>
            Save to Google Drive or OneDrive as a version-controlled record.
          </div>
        </div>

        {/* ── Restore ─────────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">⬆ Restore from Backup</div>
          <div style={{ fontSize:13, color:T.textMid, lineHeight:1.7, marginBottom:16 }}>
            Restore all app data from a previously exported backup JSON file. Current data will be replaced.
            Document files in Supabase Storage are not affected by restore — they remain accessible.
          </div>

          {!restorePreview && (
            <label className="btn btn-outline" style={{ cursor:'pointer', display:'inline-flex', minWidth:220 }}>
              ⬆ Choose Backup File (.json)
              <input ref={restoreRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleRestoreFile}/>
            </label>
          )}

          {restorePreview && (
            <div style={{ background:'rgba(14,116,144,0.06)', border:`1.5px solid rgba(14,116,144,0.2)`, borderRadius:12, padding:'18px 20px', marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:14, color:T.teal, marginBottom:12 }}>✓ Valid backup — review before restoring</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {[['Version',restorePreview.version],['Date',restorePreview.date],['Device',restorePreview.device],['Suppliers',restorePreview.counts.suppliers+' records'],['Products',restorePreview.counts.products+' records'],['Finance',restorePreview.counts.finance+' transactions'],['Tasks',restorePreview.counts.tasks+' tasks'],['Documents',restorePreview.counts.documents+' records']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid rgba(14,116,144,0.12)`, fontSize:13 }}>
                    <span style={{ color:T.textMid, fontWeight:500 }}>{k}</span>
                    <span style={{ color:T.teal, fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:T.redPale, border:`1px solid rgba(185,28,28,0.2)`, borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12, color:T.danger }}>
                ⚠ This will replace ALL current local data. Export a current backup first if needed.
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-danger" onClick={confirmRestore}>✓ Yes, Restore</button>
                <button className="btn btn-outline" onClick={() => { setRestorePreview(null); setPendingBackup(null) }}>Cancel</button>
              </div>
            </div>
          )}

          {restoreStatus && (
            <div style={{ marginTop:14, padding:'12px 16px', borderRadius:10, fontSize:13, background:restoreStatus.ok?T.greenPale:T.redPale, border:`1px solid ${restoreStatus.ok?'rgba(21,128,61,0.2)':'rgba(185,28,28,0.2)'}`, color:restoreStatus.ok?T.green:T.danger }}>
              <div style={{ fontWeight:700 }}>{restoreStatus.msg}</div>
              {restoreStatus.detail && <div style={{ marginTop:4, fontSize:12, opacity:0.85 }}>{restoreStatus.detail}</div>}
            </div>
          )}
        </div>

        {/* ── App info ────────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">App Information</div>
          {[
            ['App',           'Botanica Living Command Centre'],
            ['Version',       `v${APP_VERSION}`],
            ['Company',       'Botanica Living (Pty) Ltd'],
            ['Registration',  '2026/444834/07'],
            ['Website',       'botanicaliving.co.za'],
            ['Contact',       'info@botanicaliving.co.za'],
            ['Device ID',     DEVICE_ID],
            ['localStorage',  getLocalStorageSize()],
            ['IndexedDB',     `${idbStorage.usedMB} MB used${idbStorage.quotaMB>0?` / ~${idbStorage.quotaMB} MB quota`:''}`],
            ['Supabase',      SUPABASE_CONFIGURED ? '✅ Connected' : '❌ Not configured'],
            ['Storage bucket',BUCKET],
            ['AI OCR',        OCR_AVAILABLE ? '✅ Active' : '❌ Not connected'],
          ].map(([k,v]) => (
            <div key={k} className="settings-row">
              <span className="settings-key">{k}</span>
              <span className="settings-val" style={{ maxWidth:280, textAlign:'right', wordBreak:'break-all', fontSize:k==='Device ID'||k==='Storage bucket'?11:undefined, fontFamily:k==='Storage bucket'?'monospace':undefined }}>{v}</span>
            </div>
          ))}
        </div>

        {/* ── PWA Install ─────────────────────────────────────────────── */}
        <PWAInstallSection />

        <LayoutHealth/>

        {/* ── Data Diagnostics ────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">🔍 Data Diagnostics</div>
          <div style={{ fontSize:13, color:T.textMid, marginBottom:14, lineHeight:1.7 }}>
            Shows exactly what is stored in each localStorage key. Use this to verify data is present.
          </div>
          {[
            { key:'bl_clients',   label:'Client Database',   init:11 },
            { key:'bl_suppliers', label:'Suppliers',         init:2  },
            { key:'bl_products',  label:'Products',          init:6  },
            { key:'bl_expenses',  label:'Expenses (Hub)',    init:0  },
            { key:'bl_quotes',    label:'Quotes',            init:0  },
            { key:'bl_invoices',  label:'Invoices',          init:0  },
            { key:'bl_finance',   label:'Finance Centre Txn',init:0  },
            { key:'bl_documents', label:'Documents',         init:0  },
          ].map(row => {
            const raw   = localStorage.getItem(row.key)
            const data  = raw ? (() => { try { return JSON.parse(raw) } catch { return null } })() : null
            const count = Array.isArray(data) ? data.length : (data === null ? 'not set' : 'non-array')
            const ok    = typeof count === 'number' && count > 0
            const empty = count === 0
            return (
              <div key={row.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid rgba(210,200,184,0.3)`, flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.forest }}>{row.label}</div>
                  <code style={{ fontSize:10, color:T.textLight }}>{row.key}</code>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:700,
                    color: ok ? T.green : empty ? T.danger : T.textMid }}>
                    {typeof count === 'number' ? `${count} records` : count}
                  </span>
                  {empty && row.init > 0 && (
                    <span style={{ fontSize:11, color:T.gold }}>
                      (seed has {row.init})
                    </span>
                  )}
                  {raw === null && <span style={{ fontSize:11, color:T.textLight }}>key absent</span>}
                </div>
              </div>
            )
          })}
          <div style={{ marginTop:14, display:'flex', gap:10, flexWrap:'wrap' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                // Force reseed bl_clients with INIT_CLIENTS
                import('../utils/data.js').then(m => {
                  localStorage.setItem('bl_clients', JSON.stringify(m.INIT_CLIENTS))
                  alert(`Reseeded client database with ${m.INIT_CLIENTS.length} records. Reload the app to see changes.`)
                })
              }}
            >
              ↺ Reseed Client Database
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                const report = ['bl_clients','bl_suppliers','bl_products','bl_expenses','bl_quotes','bl_invoices','bl_finance','bl_documents']
                  .map(k => {
                    const raw = localStorage.getItem(k)
                    const arr = raw ? (() => { try { return JSON.parse(raw) } catch { return null } })() : null
                    return k + ': ' + (Array.isArray(arr) ? arr.length + ' records' : raw === null ? 'not set' : 'non-array')
                  })
                  .join('\n')
                alert('Data Report:\n\n' + report)
              }}
            >
              📋 Show Data Report
            </button>
          </div>
        </div>

        {/* ── Danger zone ─────────────────────────────────────────────── */}
        <div className="settings-section" style={{ border:`1px solid rgba(185,28,28,0.25)` }}>
          <div className="settings-title" style={{ color:T.danger }}>⚠ Danger Zone</div>
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
            <button className="btn btn-danger btn-sm" onClick={clearAll}>Clear All Local Data</button>
            <span style={{ fontSize:12, color:T.textLight }}>Removes localStorage and IndexedDB on this device only. Supabase data is not affected.</span>
          </div>
          <div style={{ fontSize:12, color:T.danger, background:T.redPale, borderRadius:8, padding:'10px 14px', border:`1px solid rgba(185,28,28,0.15)` }}>
            ⚠ Download a backup first. Files stored only in IndexedDB (not yet uploaded to Supabase) will be permanently lost.
          </div>
        </div>

      </div>
    </div>
  )
}
