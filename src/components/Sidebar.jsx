import { NAV } from '../utils/data.js'

const GROUPS = ['Core', 'Products', 'Strategy', 'System']

export default function Sidebar({ page, setPage, mobileOpen, setMobileOpen }) {
  const groups = GROUPS.map(g => ({ group: g, items: NAV.filter(n => n.group === g) }))

  return (
    <>
      <div className={`mobile-overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />
      <div className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="wordmark">Botanica<br />Living Group</div>
          <div className="sub">Command Centre v1.2</div>
          <div className="reg">Reg: 2026/444834/07</div>
        </div>
        <nav className="sidebar-nav">
          {groups.map(({ group, items }) => (
            <div key={group}>
              <div className="nav-section-label">{group}</div>
              {items.map(n => (
                <div
                  key={n.id}
                  className={`nav-item ${page === n.id ? 'active' : ''}`}
                  onClick={() => { setPage(n.id); setMobileOpen(false) }}
                >
                  <span className="nav-icon">{n.icon}</span>
                  {n.label}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          © Botanica Living Group 2026
          <div className="sidebar-version">In Business · PWA Ready</div>
        </div>
      </div>
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(o => !o)}>☰</button>
    </>
  )
}
