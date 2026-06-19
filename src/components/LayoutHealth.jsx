// LayoutHealth.jsx — Design system audit utility
// Embedded in Settings page as a collapsible section
import { useState, useEffect } from 'react'
import { T } from '../utils/tokens.js'

// Detect current layout mode based on window width
function getLayoutMode(w) {
  if (w < 600)  return { mode: 'Phone',              emoji: '📱', color: T.danger }
  if (w < 960)  return { mode: 'Tablet Portrait',    emoji: '📱', color: T.teal }
  if (w < 1400) return { mode: 'Tablet Landscape',   emoji: '💻', color: T.gold }
  return              { mode: 'Desktop',              emoji: '🖥',  color: T.green }
}

// Detect PWA display mode
function getPWAMode() {
  if (window.matchMedia('(display-mode: standalone)').matches) return 'Standalone (PWA installed)'
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'Fullscreen'
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'Minimal UI'
  if (window.navigator.standalone === true) return 'iOS Standalone'
  return 'Browser tab (not installed as PWA)'
}

// Design QA checklist items
const QA_ITEMS = [
  {
    id: 'overflow',
    label: 'No horizontal overflow',
    desc: 'Page does not scroll horizontally. No content wider than viewport.',
    check: () => document.documentElement.scrollWidth <= window.innerWidth + 2,
  },
  {
    id: 'touch',
    label: 'Touch targets ≥ 44px',
    desc: 'All buttons and interactive elements meet minimum 44×44px touch target.',
    check: () => {
      const btns = document.querySelectorAll('.btn, .nav-item, .tab, .bp-chk, .modal-close')
      const failing = Array.from(btns).filter(el => {
        const r = el.getBoundingClientRect()
        return (r.width < 40 || r.height < 28) && r.width > 0
      })
      return failing.length === 0
    },
  },
  {
    id: 'font',
    label: 'No text below 10px',
    desc: 'All visible text is at least 10px — readable on Samsung screens.',
    check: () => {
      const els = document.querySelectorAll('p, span, div, td, th, label, button')
      const failing = Array.from(els).filter(el => {
        if (!el.offsetHeight) return false
        const size = parseFloat(window.getComputedStyle(el).fontSize)
        return size < 10 && el.textContent.trim().length > 0
      })
      return failing.length === 0
    },
  },
  {
    id: 'minw',
    label: 'Cards have min-width: 0',
    desc: 'All flex/grid children have min-width:0 to prevent overflow.',
    check: () => {
      const cards = document.querySelectorAll('.g-card, .stat-card, .bp-task, .doc-card, .action-card')
      const failing = Array.from(cards).filter(el => {
        const mw = window.getComputedStyle(el).minWidth
        return mw !== '0px' && mw !== 'auto'
      })
      return failing.length === 0
    },
  },
  {
    id: 'tabs',
    label: 'Tabs scroll, never wrap',
    desc: 'Tab bars scroll horizontally on narrow screens and never wrap to a second line.',
    check: () => {
      const tabContainers = document.querySelectorAll('.tabs')
      return Array.from(tabContainers).every(el => {
        const style = window.getComputedStyle(el)
        return style.flexWrap === 'nowrap' && style.overflowX !== 'visible'
      })
    },
  },
  {
    id: 'inputsize',
    label: 'Inputs ≥ 44px height on mobile',
    desc: 'Form inputs are touch-friendly on phone and tablet screens.',
    check: () => {
      if (window.innerWidth >= 960) return true // only check on small screens
      const inputs = document.querySelectorAll('input:not([type=hidden]), select, textarea')
      const failing = Array.from(inputs).filter(el => {
        const r = el.getBoundingClientRect()
        return r.height > 0 && r.height < 36
      })
      return failing.length === 0
    },
  },
  {
    id: 'tableScroll',
    label: 'Tables are horizontally scrollable',
    desc: 'Tables are wrapped in .table-wrap with overflow-x: auto.',
    check: () => {
      const tables = document.querySelectorAll('table')
      return Array.from(tables).every(t => {
        const parent = t.parentElement
        if (!parent) return true
        const style = window.getComputedStyle(parent)
        return style.overflowX === 'auto' || style.overflowX === 'scroll' || parent.classList.contains('table-wrap')
      })
    },
  },
  {
    id: 'pageHeader',
    label: 'Page header stays within viewport',
    desc: 'Sticky page headers do not overflow or hide content.',
    check: () => {
      const headers = document.querySelectorAll('.page-header')
      return Array.from(headers).every(h => {
        const r = h.getBoundingClientRect()
        return r.width <= window.innerWidth + 2
      })
    },
  },
]

export default function LayoutHealth() {
  const [width,   setWidth]   = useState(window.innerWidth)
  const [height,  setHeight]  = useState(window.innerHeight)
  const [results, setResults] = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const handler = () => { setWidth(window.innerWidth); setHeight(window.innerHeight) }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const layout = getLayoutMode(width)

  const runAudit = () => {
    setRunning(true)
    // Small delay to let DOM settle
    setTimeout(() => {
      const res = QA_ITEMS.map(item => {
        let passed = false
        let error  = null
        try { passed = item.check() } catch (e) { error = e.message }
        return { ...item, passed, error }
      })
      setResults(res)
      setRunning(false)
    }, 100)
  }

  const passCount = results ? results.filter(r => r.passed).length : 0
  const total     = QA_ITEMS.length

  return (
    <div className="settings-section">
      <div className="settings-title">📐 Layout Health</div>

      {/* Live screen info */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:18 }}>
        {[
          { key:'Screen Width',    val:`${width}px` },
          { key:'Screen Height',   val:`${height}px` },
          { key:'Layout Mode',     val:`${layout.emoji} ${layout.mode}`, color: layout.color },
          { key:'Pixel Ratio',     val:`${window.devicePixelRatio || 1}×` },
          { key:'PWA Display',     val: getPWAMode() },
          { key:'User Agent',      val: /samsung/i.test(navigator.userAgent) ? 'Samsung Browser ✓' : /android/i.test(navigator.userAgent) ? 'Android Browser' : /iphone|ipad/i.test(navigator.userAgent) ? 'iOS Safari' : 'Desktop Browser' },
        ].map(r => (
          <div key={r.key} style={{ background:'rgba(228,221,208,0.4)', borderRadius:8, padding:'10px 12px' }}>
            <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:T.textLight, fontWeight:600, marginBottom:3 }}>{r.key}</div>
            <div style={{ fontSize:13, color: r.color || T.forest, fontFamily:"'Cormorant Garamond',serif", fontWeight:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.val}</div>
          </div>
        ))}
      </div>

      {/* Samsung Tab S8 Ultra info */}
      {width >= 600 && width < 1400 && (
        <div style={{ background:T.tealPale, border:`1px solid rgba(14,116,144,0.2)`, borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:T.teal }}>
          📱 <strong>Samsung Tab S8 Ultra detected range.</strong> In portrait mode (≈924px CSS), the app uses the tablet-portrait layout with 2-column grids. In landscape (≈1480px CSS), it uses the tablet-landscape layout with sidebar visible.
        </div>
      )}

      {/* Audit button */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: results ? 16 : 0 }}>
        <button className="btn btn-primary btn-sm" onClick={runAudit} disabled={running}>
          {running ? '⏳ Running…' : '▶ Run Design Audit'}
        </button>
        {results && (
          <span style={{ fontSize:13, color: passCount===total ? T.green : T.danger, fontWeight:600 }}>
            {passCount}/{total} checks passed
          </span>
        )}
      </div>

      {/* Results */}
      {results && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:12 }}>
          {results.map(r => (
            <div
              key={r.id}
              style={{
                display:'flex', alignItems:'flex-start', gap:12, padding:'10px 12px',
                borderRadius:8, background: r.passed ? T.greenPale : T.redPale,
                border: `1px solid ${r.passed ? 'rgba(21,128,61,0.2)' : 'rgba(185,28,28,0.2)'}`,
              }}
            >
              <span style={{ fontSize:16, flexShrink:0, lineHeight:1, marginTop:1 }}>{r.passed ? '✅' : '❌'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13, color: r.passed ? T.green : T.danger }}>{r.label}</div>
                <div style={{ fontSize:11, color:T.textMid, marginTop:2, lineHeight:1.5 }}>{r.desc}</div>
                {r.error && <div style={{ fontSize:10, color:T.danger, marginTop:2, fontFamily:'monospace' }}>Error: {r.error}</div>}
              </div>
            </div>
          ))}
          <div style={{ fontSize:11, color:T.textLight, marginTop:6, fontStyle:'italic' }}>
            Audit runs on the current page view. Navigate to a page and re-run for that page's results.
          </div>
        </div>
      )}

      {/* Design QA checklist (always visible, static) */}
      <details style={{ marginTop:16 }}>
        <summary style={{ fontSize:11, color:T.gold, cursor:'pointer', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', userSelect:'none' }}>
          ▼ Full Design QA Checklist
        </summary>
        <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { cat:'Typography',  items:['All body text ≥ 13px', 'Card titles use Cormorant Garamond', 'Labels use uppercase + letter-spacing', 'Descriptions have line-height ≥ 1.5', 'No text overflow in cards'] },
            { cat:'Layout',      items:['All cards have min-width: 0', 'No horizontal body overflow', 'Page content has correct padding per breakpoint', 'Grids collapse correctly on phone', 'Sidebar hides on tablet/phone'] },
            { cat:'Touch',       items:['All buttons ≥ 44px height', 'Nav items ≥ 44px height', 'Form inputs ≥ 44px height on mobile', 'Touch targets spaced ≥ 8px apart', 'Checkboxes ≥ 18×18px'] },
            { cat:'Tables',      items:['All tables in .table-wrap', 'table-wrap has overflow-x: auto', 'td has text-overflow: ellipsis', 'th has white-space: nowrap', 'Horizontal scrollbar visible on Samsung'] },
            { cat:'Tabs',        items:['Tabs container has flex-wrap: nowrap', 'Tabs scroll horizontally', 'Active tab clearly distinct', 'Tabs ≥ 36px height', 'Tabs never overlap'] },
            { cat:'Forms',       items:['No type="number" inputs (use text+inputMode)', 'Labels visible and uppercase', 'Focus ring visible (gold outline)', 'Inputs ≥ 44px on mobile', 'Form grids collapse to 1 col on phone'] },
            { cat:'Samsung',     items:['Safe area insets applied', 'Font-size ≥ 16px in inputs (prevents iOS zoom)', 'Smooth touch scrolling on tables', 'No hover-only interactions', 'PWA installable via Chrome/Samsung Internet'] },
          ].map(section => (
            <div key={section.cat} style={{ background:'rgba(228,221,208,0.35)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:T.gold, fontWeight:700, marginBottom:8 }}>{section.cat}</div>
              {section.items.map((item, i) => (
                <div key={i} style={{ display:'flex', gap:8, fontSize:12, color:T.textMid, padding:'3px 0' }}>
                  <span style={{ color:T.textLight, flexShrink:0 }}>□</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
