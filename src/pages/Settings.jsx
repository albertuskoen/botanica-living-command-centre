import { useState, useRef } from 'react'
import LayoutHealth from '../components/LayoutHealth.jsx'
import { T } from '../utils/tokens.js'
import { today } from '../utils/format.js'

const APP_VERSION  = '1.3.0'
const LAST_UPDATED = '2026'
const DEVICE_ID    = (() => {
  let id = localStorage.getItem('bl_device_id')
  if (!id) { id = `device-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; localStorage.setItem('bl_device_id', id) }
  return id
})()

// ── Helpers ──────────────────────────────────────────────────────────────────────
function getStorageSize() {
  try {
    let total = 0
    for (const key in localStorage) { if (Object.prototype.hasOwnProperty.call(localStorage, key)) total += localStorage[key].length * 2 }
    return { bytes: total, display: total > 1024 * 1024 ? (total / 1024 / 1024).toFixed(2) + ' MB' : (total / 1024).toFixed(1) + ' KB' }
  } catch { return { bytes: 0, display: 'Unknown' } }
}

// Stamp every record with sync metadata (non-destructive — adds fields if missing)
function stampRecords(records = [], deviceId) {
  return records.map(r => ({
    sourceDevice:  r.sourceDevice  || deviceId,
    createdAt:     r.createdAt     || new Date().toISOString(),
    updatedAt:     r.updatedAt     || new Date().toISOString(),
    syncStatus:    r.syncStatus    || 'local',
    ...r,
  }))
}

function buildBackup(allData, deviceId) {
  return {
    _meta: {
      version:        APP_VERSION,
      exportedAt:     new Date().toISOString(),
      exportedFrom:   deviceId,
      appName:        'Botanica Living Group Command Centre',
      company:        'Botanica Living Group (Pty) Ltd',
      registration:   '2026/444834/07',
      schemaVersion:  2,
    },
    data: {
      suppliers:  stampRecords(allData.suppliers,  deviceId),
      products:   stampRecords(allData.products,   deviceId),
      finance:    stampRecords(allData.finance,     deviceId),
      tasks:      stampRecords(allData.tasks,       deviceId),
      documents:  stampRecords(allData.documents,  deviceId),
      progress:   allData.progress,   // structured differently — sections+tasks
      settings:   { deviceId, exportedAt: new Date().toISOString() },
    },
  }
}

function validateBackup(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'Not a valid JSON object.' }
  if (!parsed.data)                          return { ok: false, reason: 'Missing "data" key — not a Botanica backup file.' }
  if (parsed._meta?.appName && !parsed._meta.appName.includes('Botanica'))
                                             return { ok: false, reason: 'This backup is from a different application.' }
  const keys = ['suppliers','products','finance','tasks','documents','progress']
  const found = keys.filter(k => Array.isArray(parsed.data[k]) || parsed.data[k])
  if (found.length === 0)                    return { ok: false, reason: 'Backup contains no recognisable data collections.' }
  return {
    ok:      true,
    version: parsed._meta?.version || 'unknown',
    date:    parsed._meta?.exportedAt ? new Date(parsed._meta.exportedAt).toLocaleDateString('en-ZA') : 'unknown',
    device:  parsed._meta?.exportedFrom || 'unknown',
    counts: {
      suppliers: parsed.data.suppliers?.length  || 0,
      products:  parsed.data.products?.length   || 0,
      finance:   parsed.data.finance?.length    || 0,
      tasks:     parsed.data.tasks?.length      || 0,
      documents: parsed.data.documents?.length  || 0,
    },
  }
}

// ── Cloud provider configs ────────────────────────────────────────────────────────
const CLOUD_PROVIDERS = [
  {
    id:      'gdrive',
    name:    'Google Drive',
    icon:    '🔵',
    color:   '#1A73E8',
    desc:    'Free 15 GB. Works great on Android/Samsung.',
    steps: [
      'Export a backup JSON from this page.',
      'Open Google Drive (drive.google.com) on any device.',
      'Upload the backup JSON to a "Botanica Backups" folder.',
      'To restore: download the JSON and use Restore below.',
    ],
    why:     'Best choice for Samsung devices — Google Drive is built in.',
    status:  'Manual (auto-sync coming)',
  },
  {
    id:      'onedrive',
    name:    'OneDrive',
    icon:    '🔷',
    color:   '#0078D4',
    desc:    'Free 5 GB. Works on Windows PC and Android.',
    steps: [
      'Export a backup JSON from this page.',
      'Open OneDrive on your PC or phone.',
      'Upload the backup JSON to a dedicated folder.',
      'Download and restore when needed.',
    ],
    why:     'Best if your PC runs Windows.',
    status:  'Manual (auto-sync coming)',
  },
  {
    id:      'dropbox',
    name:    'Dropbox',
    icon:    '📦',
    color:   '#0061FF',
    desc:    'Free 2 GB. Cross-platform.',
    steps: [
      'Export a backup JSON from this page.',
      'Save it to your Dropbox folder.',
      'Access from any device via Dropbox app.',
    ],
    why:     'Good for cross-platform access.',
    status:  'Manual (auto-sync coming)',
  },
  {
    id:      'supabase',
    name:    'Supabase',
    icon:    '⚡',
    color:   '#3ECF8E',
    desc:    'Open-source backend. Real-time database sync.',
    steps: [
      'Create a free Supabase project at supabase.com.',
      'Add your Project URL and Anon Key in the fields below.',
      'All data will sync automatically across all devices.',
    ],
    why:     'Best for true real-time multi-device sync. Requires setup.',
    status:  'In development — coming soon',
    comingSoon: true,
  },
  {
    id:      'firebase',
    name:    'Firebase',
    icon:    '🔥',
    color:   '#FFCA28',
    desc:    'Google Firebase Firestore. Generous free tier.',
    steps: [
      'Create a Firebase project at firebase.google.com.',
      'Enable Firestore database.',
      'Add your Firebase config to connect.',
    ],
    why:     'Excellent if you already use Google services.',
    status:  'In development — coming soon',
    comingSoon: true,
  },
]

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────────
export default function Settings({ allData, onRestore }) {
  const [restoreStatus,    setRestoreStatus]    = useState(null)   // null | { ok, msg, detail }
  const [backupDone,       setBackupDone]       = useState(false)
  const [expandedProvider, setExpandedProvider] = useState(null)
  const [restorePreview,   setRestorePreview]   = useState(null)   // validated backup info
  const [pendingBackup,    setPendingBackup]     = useState(null)   // parsed JSON awaiting confirm
  const restoreRef = useRef()

  const storage = getStorageSize()
  const storagePct = Math.min(100, (storage.bytes / (10 * 1024 * 1024)) * 100) // 10 MB reference

  // ── Export ────────────────────────────────────────────────────────────────────────
  const exportBackup = () => {
    const backup = buildBackup(allData, DEVICE_ID)
    const json   = JSON.stringify(backup, null, 2)
    const blob   = new Blob([json], { type: 'application/json' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = `botanica-backup-${today()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setBackupDone(true)
    setTimeout(() => setBackupDone(false), 4000)
  }

  // ── Import — step 1: read & validate ──────────────────────────────────────────────
  const handleImportFile = e => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setRestoreStatus(null)
    setRestorePreview(null)
    setPendingBackup(null)

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed    = JSON.parse(ev.target.result)
        const validated = validateBackup(parsed)
        if (!validated.ok) {
          setRestoreStatus({ ok: false, msg: 'Backup file rejected.', detail: validated.reason })
          return
        }
        setRestorePreview(validated)
        setPendingBackup(parsed)
      } catch {
        setRestoreStatus({ ok: false, msg: 'Could not read file.', detail: 'Make sure the file is a valid JSON backup exported from this app.' })
      }
    }
    reader.readAsText(file)
  }

  // ── Import — step 2: confirm & apply ────────────────────────────────────────────
  const confirmRestore = () => {
    if (!pendingBackup) return
    try {
      onRestore(pendingBackup.data)
      setRestoreStatus({ ok: true, msg: 'Data restored successfully.', detail: `Restored from backup dated ${restorePreview.date}.` })
      setRestorePreview(null)
      setPendingBackup(null)
    } catch (err) {
      setRestoreStatus({ ok: false, msg: 'Restore failed.', detail: err.message })
    }
  }

  const cancelRestore = () => { setRestorePreview(null); setPendingBackup(null) }

  // ── Clear all ─────────────────────────────────────────────────────────────────────
  const clearAll = () => {
    if (!window.confirm('This will permanently erase ALL data on this device.\n\nMake sure you have exported a backup first.\n\nContinue?')) return
    localStorage.clear()
    window.location.reload()
  }

  // ── RENDER ────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">App Info · Cloud Backup & Sync · Restore</div>
        </div>
        <button className="btn btn-primary" onClick={exportBackup}>
          {backupDone ? '✓ Backup Downloaded' : '⬇ Download Backup'}
        </button>
      </div>

      <div className="page-content">

        {/* ── PERSISTENT REMINDER BANNER ───────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(184,151,90,0.15), rgba(184,151,90,0.06))',
          border: `1.5px solid rgba(184,151,90,0.28)`,
          borderRadius: 14, padding: '18px 22px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 16,
        }}>
          <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>☁</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.forest, marginBottom: 5 }}>
              Your data is currently stored locally on this device only.
            </div>
            <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.7 }}>
              Local data <strong>will be lost</strong> if you clear browser/app data, reset your device, or switch browsers.
              Export a backup regularly and save it to Google Drive, OneDrive, or Dropbox so you can restore from any device.
              Automatic cloud sync across your Samsung tablet, phone, and PC is in development.
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-gold btn-sm" onClick={exportBackup}>
                ⬇ Download Backup Now
              </button>
              <span style={{ fontSize: 12, color: T.textMid, alignSelf: 'center' }}>
                Last storage check: {storage.display} used
              </span>
            </div>
          </div>
        </div>

        {/* ── CLOUD BACKUP & SYNC ──────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">☁ Cloud Backup & Sync</div>

          <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.75, marginBottom: 20 }}>
            True automatic multi-device sync requires a backend connection. For now, use the <strong>manual workflow</strong> below
            to keep your data safe across your Samsung tablet, phone, and PC.
            Automatic cloud sync via Supabase or Firebase is in development.
          </div>

          {/* Manual workflow */}
          <div style={{ background: 'rgba(228,221,208,0.45)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.gold, fontWeight: 700, marginBottom: 14 }}>
              Recommended Manual Workflow
            </div>
            {[
              { step: '1', icon: '⬇', text: 'Download a backup JSON from this page.', sub: 'Use the "Download Backup" button above.' },
              { step: '2', icon: '☁', text: 'Upload it to Google Drive (or OneDrive / Dropbox).', sub: 'Create a "Botanica Backups" folder — keep the last 5 backups.' },
              { step: '3', icon: '📱', text: 'On another device, download the backup from Google Drive.', sub: 'Open Botanica Living, go to Settings → Restore from Backup.' },
              { step: '4', icon: '✓',  text: 'All your data is restored on the new device.', sub: 'Finance, tasks, documents, products, suppliers — everything.' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: '1px solid rgba(210,200,184,0.4)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: T.forest, color: T.goldBright, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: T.forest }}>{s.text}</div>
                  <div style={{ fontSize: 11, color: T.textMid, marginTop: 2 }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Cloud providers */}
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.gold, fontWeight: 700, marginBottom: 12 }}>
            Cloud Storage Options
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CLOUD_PROVIDERS.map(p => {
              const isOpen = expandedProvider === p.id
              return (
                <div
                  key={p.id}
                  style={{
                    border: `1px solid rgba(210,200,184,0.5)`,
                    borderRadius: 12, overflow: 'hidden',
                    opacity: p.comingSoon ? 0.7 : 1,
                    transition: 'all 0.18s',
                  }}
                >
                  {/* Provider header */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer', background: isOpen ? 'rgba(228,221,208,0.4)' : 'rgba(255,255,255,0.5)' }}
                    onClick={() => setExpandedProvider(isOpen ? null : p.id)}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${p.color}18`, border: `1.5px solid ${p.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {p.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: T.forest }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: T.textMid }}>{p.desc}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${p.comingSoon ? 'badge-grey' : 'badge-gold'}`} style={{ fontSize: 10 }}>
                        {p.comingSoon ? 'Coming Soon' : 'Manual'}
                      </span>
                      <span style={{ color: T.textLight, fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Provider detail */}
                  {isOpen && (
                    <div style={{ padding: '16px 18px', borderTop: '1px solid rgba(210,200,184,0.4)', background: 'rgba(255,255,255,0.4)' }}>
                      <div style={{ fontSize: 12, color: T.gold, fontWeight: 600, marginBottom: 10 }}>Why {p.name}? {p.why}</div>
                      <div style={{ fontSize: 12, color: T.textMid, fontWeight: 600, marginBottom: 8 }}>
                        {p.comingSoon ? 'What auto-sync will do:' : 'How to use manually:'}
                      </div>
                      {p.steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', fontSize: 12, color: T.textMid }}>
                          <span style={{ color: T.gold, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                      {p.comingSoon && (
                        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(184,151,90,0.08)', borderRadius: 8, fontSize: 12, color: '#6B4E10' }}>
                          🔧 <strong>Auto-sync in development.</strong> This will require authentication and backend configuration. For now, use the manual export/import workflow above.
                        </div>
                      )}
                      {!p.comingSoon && (
                        <div style={{ marginTop: 14 }}>
                          <button className="btn btn-outline btn-sm" onClick={exportBackup}>⬇ Download Backup to Upload</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Future architecture note */}
          <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(14,116,144,0.07)', border: '1px solid rgba(14,116,144,0.18)', borderRadius: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: T.teal, marginBottom: 6 }}>⚙ Future Architecture</div>
            <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.7 }}>
              Every record in this app already carries <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>id</code>,
              <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: 3, fontSize: 11, marginLeft: 4 }}>createdAt</code>,
              <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: 3, fontSize: 11, marginLeft: 4 }}>updatedAt</code>,
              <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: 3, fontSize: 11, marginLeft: 4 }}>sourceDevice</code>, and
              <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: 3, fontSize: 11, marginLeft: 4 }}>syncStatus</code> fields in exported backups.
              This schema is ready to plug into Supabase, Firebase, or any REST API when cloud sync is activated.
            </div>
          </div>
        </div>

        {/* ── BACKUP ─────────────────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">⬇ Download Backup</div>
          <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.7, marginBottom: 18 }}>
            Exports all app data — finance, tasks, documents, suppliers, products, and business progress —
            as a single JSON file. Save this to Google Drive, OneDrive, or any safe location.
          </div>

          {/* What's included */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
            {[
              { icon: '💰', label: 'Finance', count: allData.finance?.length || 0, unit: 'transactions' },
              { icon: '✓',  label: 'Tasks',   count: allData.tasks?.length || 0,   unit: 'tasks' },
              { icon: '📄', label: 'Documents',count: allData.documents?.length || 0,unit: 'records' },
              { icon: '📦', label: 'Products', count: allData.products?.length || 0, unit: 'SKUs' },
              { icon: '◎',  label: 'Suppliers',count: allData.suppliers?.length || 0,unit: 'suppliers' },
              { icon: '▸',  label: 'Progress', count: allData.progress?.flatMap(s=>s.tasks)?.length || 0, unit: 'tasks' },
            ].map(r => (
              <div key={r.label} style={{ background: 'rgba(228,221,208,0.4)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{r.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: T.forest }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: T.textMid }}>{r.count} {r.unit}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={exportBackup} style={{ minWidth: 200 }}>
              {backupDone ? '✓ Backup Downloaded!' : '⬇ Download Backup (JSON)'}
            </button>
            {backupDone && (
              <span style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>
                Saved as botanica-backup-{today()}.json
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: T.textLight, marginTop: 10 }}>
            Tip: rename files to include the date, e.g. <em>botanica-backup-2026-07-01.json</em>, and keep the last 5 backups.
          </div>
        </div>

        {/* ── RESTORE ────────────────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">⬆ Restore from Backup</div>
          <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.7, marginBottom: 18 }}>
            Restore all data from a backup JSON file. Your existing data will be replaced.
            Use this to move data to a new device or recover from accidental deletion.
          </div>

          {/* Step 1: choose file */}
          {!restorePreview && (
            <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', minWidth: 220 }}>
              ⬆ Choose Backup File (.json)
              <input ref={restoreRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
            </label>
          )}

          {/* Step 2: preview before confirm */}
          {restorePreview && (
            <div style={{ background: 'rgba(14,116,144,0.06)', border: `1.5px solid rgba(14,116,144,0.2)`, borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.teal, marginBottom: 12 }}>
                ✓ Valid backup file found — review before restoring
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  ['Backup version',  restorePreview.version],
                  ['Backup date',     restorePreview.date],
                  ['Source device',   restorePreview.device],
                  ['Suppliers',       `${restorePreview.counts.suppliers} records`],
                  ['Products',        `${restorePreview.counts.products} records`],
                  ['Finance',         `${restorePreview.counts.finance} transactions`],
                  ['Tasks',           `${restorePreview.counts.tasks} tasks`],
                  ['Documents',       `${restorePreview.counts.documents} records`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(14,116,144,0.12)', fontSize: 13 }}>
                    <span style={{ color: T.textMid, fontWeight: 500 }}>{k}</span>
                    <span style={{ color: T.teal, fontFamily: "'Cormorant Garamond',serif", fontSize: 15 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: T.redPale, border: `1px solid rgba(185,28,28,0.2)`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: T.danger }}>
                ⚠ <strong>Warning:</strong> Restoring will replace ALL current data on this device with data from the backup. This cannot be undone.
                Export a backup of your current data first if you want to keep it.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-danger" onClick={confirmRestore}>✓ Yes, Restore This Backup</button>
                <button className="btn btn-outline" onClick={cancelRestore}>Cancel</button>
              </div>
            </div>
          )}

          {/* Status message */}
          {restoreStatus && (
            <div style={{
              marginTop: 14, padding: '12px 16px', borderRadius: 10, fontSize: 13,
              background: restoreStatus.ok ? T.greenPale : T.redPale,
              border: `1px solid ${restoreStatus.ok ? 'rgba(21,128,61,0.2)' : 'rgba(185,28,28,0.2)'}`,
              color: restoreStatus.ok ? T.green : T.danger,
            }}>
              <div style={{ fontWeight: 700 }}>{restoreStatus.msg}</div>
              {restoreStatus.detail && <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{restoreStatus.detail}</div>}
            </div>
          )}
        </div>

        {/* ── APP INFORMATION ─────────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">App Information</div>
          {[
            { key: 'App Name',          val: 'Botanica Living Group Command Centre' },
            { key: 'Version',           val: `v${APP_VERSION}` },
            { key: 'Last Updated',      val: LAST_UPDATED },
            { key: 'Company',           val: 'Botanica Living Group (Pty) Ltd' },
            { key: 'Registration',      val: '2026/444834/07' },
            { key: 'Status',            val: 'In Business' },
            { key: 'Device ID',         val: DEVICE_ID },
            { key: 'Storage Type',      val: 'Browser localStorage (local, offline)' },
            { key: 'Storage Used',      val: storage.display },
            { key: 'PWA',               val: 'Installable — Add to Home Screen on Samsung / Android' },
          ].map(r => (
            <div key={r.key} className="settings-row">
              <span className="settings-key">{r.key}</span>
              <span className="settings-val" style={{ maxWidth: 280, textAlign: 'right', wordBreak: 'break-all', fontSize: r.key === 'Device ID' ? 11 : undefined }}>{r.val}</span>
            </div>
          ))}

          {/* Storage usage bar */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.textLight, marginBottom: 4 }}>
              <span>localStorage usage</span>
              <span>{storage.display} of ~10 MB recommended max</span>
            </div>
            <div className="pbar">
              <div className="pbar-fill" style={{ width: `${storagePct}%`, background: storagePct > 75 ? `linear-gradient(90deg,${T.red},${T.danger})` : undefined }} />
            </div>
          </div>
        </div>

        {/* ── DATA SAFETY NOTICE ─────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">Data Safety Notice</div>
          <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.8 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <span>⚠</span>
              <span><strong>Local data can be permanently lost</strong> if you clear browser data, reset your device, or switch to a different browser profile.</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <span>☁</span>
              <span><strong>Cloud sync</strong> (automatic, real-time, multi-device) will be added in a future version via Supabase or Firebase.</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <span>📱</span>
              <span><strong>For now</strong>, export a backup regularly and store it in Google Drive to share between your Samsung tablet, phone, and PC.</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span>🔒</span>
              <span><strong>Your data is private</strong> — nothing leaves your device unless you explicitly export or upload it yourself.</span>
            </div>
          </div>
        </div>

        {/* ── INSTALL ON SAMSUNG ────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">📱 Install on Samsung / Android</div>
          <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.8, marginBottom: 14 }}>
            This app is a Progressive Web App (PWA) — install it on any Android or Samsung device for a native app experience.
          </div>
          {[
            '1. Open the app in Chrome or Samsung Internet.',
            '2. Tap the browser menu (⋮ three dots at top right).',
            '3. Select "Add to Home Screen" or "Install App".',
            '4. Confirm. The app appears on your home screen.',
            '5. Open it like any native app — no browser bar, full screen.',
          ].map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: T.textMid, padding: '7px 0', borderBottom: `1px solid rgba(210,200,184,0.35)`, display: 'flex', gap: 10 }}>
              <span style={{ color: T.gold, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <span>{s.slice(3)}</span>
            </div>
          ))}
        </div>

        {/* ── COMING SOON ──────────────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-title">Coming in Future Versions</div>
          {[
            { label: 'Supabase Cloud Sync',      status: 'In Development', desc: 'Real-time sync across all devices automatically.' },
            { label: 'Firebase Cloud Sync',      status: 'In Development', desc: 'Google Firebase Firestore — multi-device, real-time.' },
            { label: 'Google Drive Auto-Backup', status: 'Planned',        desc: 'Automatic scheduled backup to your Google Drive.' },
            { label: 'PDF AI Reading',            status: 'Planned',        desc: 'Auto-extract transactions from bank statements.' },
            { label: 'Push Notifications',       status: 'Planned',        desc: 'Reminders for due tasks and upcoming milestones.' },
            { label: 'Secure Login / Pin',       status: 'Planned',        desc: 'Protect the Command Centre with a password or PIN.' },
            { label: 'Accounting Integration',   status: 'Considering',    desc: 'Xero or QuickBooks sync for formal accounting.' },
          ].map(f => (
            <div key={f.label} className="settings-row">
              <div>
                <div className="settings-key">{f.label}</div>
                <div style={{ fontSize: 11, color: T.textLight, marginTop: 1 }}>{f.desc}</div>
              </div>
              <span className={`badge ${f.status === 'In Development' ? 'badge-teal' : f.status === 'Planned' ? 'badge-gold' : 'badge-grey'}`}>
                {f.status}
              </span>
            </div>
          ))}
        </div>

        {/* ── DANGER ZONE ──────────────────────────────────────────────────── */}
        <div className="settings-section" style={{ border: `1px solid rgba(185,28,28,0.25)` }}>
          <div className="settings-title" style={{ color: T.danger }}>⚠ Danger Zone</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <button className="btn btn-danger btn-sm" onClick={clearAll}>Clear All Local Data</button>
            <span style={{ fontSize: 12, color: T.textLight }}>Permanently erases all data from this device. Cannot be undone.</span>
          </div>
          <div style={{ fontSize: 12, color: T.danger, background: T.redPale, borderRadius: 8, padding: '10px 14px', border: `1px solid rgba(185,28,28,0.15)` }}>
            ⚠ Download a backup before clearing. Once cleared, your data cannot be recovered.
          </div>
        </div>

      <LayoutHealth />

      </div>
    </div>
  )
}
