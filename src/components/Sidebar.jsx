import { NAV } from '../utils/data.js'

const GROUPS = ['Core', 'Suppliers', 'Clients', 'Finance', 'Operations', 'Knowledge', 'System']

const PAGE_ICONS = {
  dashboard:    { icon: '⬡', label: 'Dashboard' },
  supplierzone: { icon: '◎', label: 'Supplier Zone' },
  products:     { icon: '❧', label: 'Product Database' },
  clients:      { icon: '◉', label: 'Client Database' },
  financialhub: { icon: '⊞', label: 'Invoicing' },
  finance:      { icon: '₩', label: 'Finance Centre' },
  progress:     { icon: '▸', label: 'Business Progress' },
  actions:      { icon: '✓', label: 'Action Centre' },
  documents:    { icon: '◻', label: 'Documents' },
  strategy:     { icon: '⊟', label: 'Strategy' },
  founders:     { icon: '✦', label: "Founders' Collection" },
  settings:     { icon: '⚙', label: 'Settings' },
}

export default function Sidebar({ page, setPage, mobileOpen, setMobileOpen, onLogout }) {
  const groups = GROUPS.map(g => ({ group: g, items: NAV.filter(n => n.group === g) }))
  const navigate = id => { setPage(id); setMobileOpen(false) }

  return (
    <>
      <div className={`mob-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />

      <div className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">
            <img
              src="/botanica-logo.png"
              alt="Botanica Living"
              style={{
                width:44, height:44, borderRadius:10, objectFit:'contain',
                objectPosition:'center', background:'rgba(245,240,232,0.92)',
                padding:4, flexShrink:0,
                boxShadow:'0 2px 8px rgba(0,0,0,0.35)',
              }}
            />
            <div className="logo-text">
              <span className="wordmark">Botanica Living</span>
              <span className="sub">Command Centre</span>
            </div>
          </div>
          <div className="logo-reg">Reg: 2026/444834/07 · v2.3</div>
        </div>

        {/* Nav */}
        <div className="sidebar-scroll">
          {groups.map(({ group, items }) => (
            <div key={group} className="nav-section">
              <div className="nav-section-label">{group}</div>
              {items.map(n => {
                const meta = PAGE_ICONS[n.id] || {}
                const isActive = page === n.id
                return (
                  <div
                    key={n.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(n.id)}
                  >
                    <div className="nav-icon">{meta.icon || n.icon}</div>
                    <span className="nav-label">{n.label}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          {onLogout && (
            <button
              onClick={() => { if (window.confirm('Lock the app and return to login?')) onLogout() }}
              style={{
                width: '100%', padding: '9px 14px', marginBottom: 12,
                background: 'rgba(232,192,122,0.08)', border: '1px solid rgba(232,192,122,0.18)',
                borderRadius: 10, color: 'rgba(232,192,122,0.65)', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                fontFamily: "'Inter',sans-serif", letterSpacing: '0.04em',
              }}
            >
              <span>🔒</span> Lock App
            </button>
          )}
          © Botanica Living Group 2026
          <div className="sidebar-version">In Business · PWA Ready · Samsung Optimised</div>
        </div>
      </div>

      <button className="mob-btn" onClick={() => setMobileOpen(o => !o)}>☰</button>
    </>
  )
}
