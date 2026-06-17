const NAV = [
  { id: 'dashboard',  icon: '◈', label: 'Dashboard'           },
  { id: 'progress',   icon: '▸', label: 'Business Progress'   },
  { id: 'suppliers',  icon: '◎', label: 'Suppliers'           },
  { id: 'products',   icon: '❧', label: 'Products'            },
  { id: 'calculator', icon: '⊞', label: 'Import Calculator'   },
  { id: 'checkers',   icon: '⊟', label: 'Checkers Hyper'      },
  { id: 'founders',   icon: '✦', label: 'Founders Collection' },
  { id: 'strategy',   icon: '◉', label: 'Strategy'            },
]

export default function Sidebar({ page, setPage }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="wordmark">Botanica<br />Living</div>
        <div className="sub">Command Centre</div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV.map(n => (
          <div key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">© Botanica Living 2025<br />Internal use only</div>
    </div>
  )
}
