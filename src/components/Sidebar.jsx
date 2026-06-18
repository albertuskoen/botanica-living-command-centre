import { NAV } from '../utils/data.js'

const GROUPS = ['Core', 'Products', 'Strategy', 'System']

const PAGE_ICONS = {
  dashboard:  { icon: '⬡', label: 'Dashboard' },
  progress:   { icon: '◐', label: 'Business Progress' },
  finance:    { icon: '◈', label: 'Finance Centre' },
  actions:    { icon: '⊙', label: 'Action Centre' },
  documents:  { icon: '▣', label: 'Documents' },
  suppliers:  { icon: '◎', label: 'Suppliers' },
  products:   { icon: '❧', label: 'Products' },
  calculator: { icon: '⊞', label: 'Import Calculator' },
  checkers:   { icon: '⊟', label: 'Checkers Hyper' },
  founders:   { icon: '✦', label: 'Founders Collection' },
  strategy:   { icon: '◉', label: 'Strategy' },
  settings:   { icon: '⊛', label: 'Settings' },
}

export default function Sidebar({ page, setPage, mobileOpen, setMobileOpen }) {
  const groups = GROUPS.map(g => ({ group: g, items: NAV.filter(n => n.group === g) }))
  const navigate = id => { setPage(id); setMobileOpen(false) }

  return (
    <>
      <div className={`mob-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />

      <div className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-gem">✦</div>
            <div className="logo-text">
              <span className="wordmark">Botanica Living</span>
              <span className="sub">Command Centre</span>
            </div>
          </div>
          <div className="logo-reg">Reg: 2026/444834/07 · v1.3</div>
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
          © Botanica Living Group 2026
          <div className="sidebar-version">In Business · PWA Ready · Samsung Optimised</div>
        </div>
      </div>

      <button className="mob-btn" onClick={() => setMobileOpen(o => !o)}>☰</button>
    </>
  )
}
