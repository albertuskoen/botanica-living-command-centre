import { useState } from 'react'
import { T } from '../utils/tokens.js'

const APP_VERSION  = '1.2.0'
const LAST_UPDATED = '2026'

export default function Settings({ allData, onRestore }) {
  const [restoreStatus, setRestoreStatus] = useState('')

  const getStorageSize = () => {
    try {
      let total = 0
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) total += (localStorage[key].length * 2)
      }
      return (total / 1024).toFixed(1) + ' KB'
    } catch { return 'Unknown' }
  }

  const exportBackup = () => {
    const backup = { version: APP_VERSION, exportedAt: new Date().toISOString(), data: allData }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `botanica-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result)
        if (backup.data) {
          onRestore(backup.data)
          setRestoreStatus('✓ Data restored successfully from backup.')
        } else {
          setRestoreStatus('✗ Invalid backup file format.')
        }
      } catch {
        setRestoreStatus('✗ Could not read backup file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const clearAll = () => {
    if (window.confirm('This will clear ALL local data. Are you sure?')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">App Info · Backup · Restore</div>
        </div>
      </div>

      <div className="page-content">

        {/* App Info */}
        <div className="settings-section">
          <div className="settings-title">App Information</div>
          {[
            { key:'App Name',           val:'Botanica Living Group Command Centre' },
            { key:'Version',            val:`v${APP_VERSION}` },
            { key:'Last Updated',       val:LAST_UPDATED },
            { key:'Company',            val:'Botanica Living Group (Pty) Ltd' },
            { key:'Registration',       val:'2026/444834/07' },
            { key:'Status',             val:'In Business' },
            { key:'PWA / Installable',  val:'Yes — Add to Home Screen on Android/Samsung' },
            { key:'Storage Type',       val:'Browser localStorage (local device only)' },
            { key:'Storage Used',       val:getStorageSize() },
          ].map(r => (
            <div key={r.key} className="settings-row">
              <span className="settings-key">{r.key}</span>
              <span className="settings-val">{r.val}</span>
            </div>
          ))}
        </div>

        {/* Data Notice */}
        <div className="settings-section">
          <div className="settings-title">Data Storage Notice</div>
          <div style={{ fontSize:13, color:T.textMid, lineHeight:1.8 }}>
            All data is stored locally in your browser's localStorage. This means:<br />
            • Data is private and stays on your device.<br />
            • Data does NOT sync across devices automatically.<br />
            • Clearing browser data or localStorage will erase all data.<br />
            • Use the Backup feature below to export a JSON file regularly.<br />
            • Cloud sync will be added in a future version.
          </div>
        </div>

        {/* Backup */}
        <div className="settings-section">
          <div className="settings-title">Backup & Restore</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
            <button className="btn btn-primary" onClick={exportBackup}>⬇ Export Backup (JSON)</button>
            <label className="btn btn-outline" style={{ cursor:'pointer' }}>
              ⬆ Import Backup
              <input type="file" accept=".json" style={{ display:'none' }} onChange={importBackup} />
            </label>
          </div>
          {restoreStatus && (
            <div style={{ fontSize:13, color: restoreStatus.startsWith('✓') ? T.forestLight : T.danger, padding:'10px 14px', background: restoreStatus.startsWith('✓') ? T.greenLight : T.redLight, borderRadius:8 }}>
              {restoreStatus}
            </div>
          )}
          <div style={{ fontSize:12, color:T.textLight, marginTop:12 }}>
            Backup includes: Finance transactions · Tasks · Documents · Products · Suppliers · Business Progress.
          </div>
        </div>

        {/* PWA */}
        <div className="settings-section">
          <div className="settings-title">Install on Samsung / Android</div>
          <div style={{ fontSize:13, color:T.textMid, lineHeight:1.8, marginBottom:14 }}>
            This app is a Progressive Web App (PWA). To install on your Samsung phone or Android tablet:
          </div>
          {[
            '1. Open the app in Chrome or Samsung Internet.',
            '2. Tap the browser menu (⋮ three dots).',
            '3. Select "Add to Home Screen" or "Install App".',
            '4. Confirm. The app will appear on your home screen.',
            '5. Open it like any native app — no browser bar.',
          ].map((s, i) => (
            <div key={i} style={{ fontSize:13, color:T.textMid, padding:'6px 0', borderBottom:`1px solid ${T.beige}` }}>{s}</div>
          ))}
        </div>

        {/* Future */}
        <div className="settings-section">
          <div className="settings-title">Coming in Future Versions</div>
          {[
            { label:'Cloud Sync',           status:'Planned',      desc:'Sync data across all your devices automatically.' },
            { label:'Multi-device Sync',    status:'Planned',      desc:'Access from phone, tablet, and desktop.' },
            { label:'PDF AI Reading',        status:'In Design',    desc:'Auto-extract transactions from bank statements and invoices.' },
            { label:'Push Notifications',   status:'Planned',      desc:'Reminders for due tasks and upcoming milestones.' },
            { label:'Secure Login',          status:'Planned',      desc:'Password-protect the Command Centre.' },
            { label:'Accounting Integration',status:'Considering', desc:'Xero or QuickBooks sync for formal accounting.' },
          ].map(f => (
            <div key={f.label} className="settings-row">
              <div>
                <div className="settings-key">{f.label}</div>
                <div style={{ fontSize:11, color:T.textLight, marginTop:1 }}>{f.desc}</div>
              </div>
              <span className="badge badge-grey">{f.status}</span>
            </div>
          ))}
        </div>

        {/* Danger zone */}
        <div className="settings-section" style={{ border:`1px solid ${T.redLight}` }}>
          <div className="settings-title" style={{ color:T.danger }}>Danger Zone</div>
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <button className="btn btn-danger btn-sm" onClick={clearAll}>Clear All Local Data</button>
            <span style={{ fontSize:12, color:T.textLight }}>This permanently erases all data from this device. Export a backup first.</span>
          </div>
        </div>

      </div>
    </div>
  )
}
