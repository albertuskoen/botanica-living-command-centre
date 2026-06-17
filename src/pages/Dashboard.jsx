import { T } from '../utils/tokens.js'
import { ZAR, fmtDate } from '../utils/format.js'
import { MILESTONES_COMPLETED, MILESTONES_UPCOMING } from '../utils/data.js'

export default function Dashboard({ suppliers, products, finance, tasks, documents, setPage }) {
  const foundersCount = products.filter(p => p.foundersCollection).length
  const totalInvested = finance.filter(t => t.type === 'Owner Investment').reduce((s, t) => s + Number(t.amount), 0)
  const totalIncome   = finance.filter(t => t.type === 'Business Income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = finance.filter(t => t.type === 'Business Expense').reduce((s, t) => s + Number(t.amount), 0)
  const remaining     = totalInvested - totalExpenses
  const netPosition   = totalIncome - totalExpenses
  const openTasks     = tasks.filter(t => t.status !== 'Completed').length
  const criticalTasks = tasks.filter(t => t.priority === 'Critical' && t.status !== 'Completed').length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Botanica Living Group — Operational Overview</div>
        </div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, fontStyle:'italic', color:T.gold }}>
          "Sell first. Scale second."
        </div>
      </div>

      <div className="page-content">

        {/* Company Status */}
        <div className="card mb-20" style={{ background:T.forest, border:'none' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.goldLight, marginBottom:4 }}>Botanica Living Group (Pty) Ltd</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', letterSpacing:'0.06em' }}>Reg: 2026/444834/07</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <span className="badge badge-green">In Business</span>
              <span className="badge badge-gold">Name Change ✓</span>
              <span className="badge" style={{ background:'rgba(184,151,90,0.2)', color:T.goldLight }}>PWA Ready</span>
            </div>
          </div>
        </div>

        {/* Finance KPIs */}
        <div className="section-label">Finance Summary</div>
        <div className="grid-5 mb-20" style={{ gridTemplateColumns:'repeat(5,1fr)' }}>
          {[
            { label:'Owner Invested', val:ZAR(totalInvested), cls:'fin-kpi-inv', color:T.teal },
            { label:'Business Income', val:ZAR(totalIncome),  cls:'fin-kpi-inc', color:T.green },
            { label:'Total Expenses',  val:ZAR(totalExpenses),cls:'fin-kpi-exp', color:T.red },
            { label:'Remaining Funds', val:ZAR(remaining),    cls:'fin-kpi-rem', color:T.gold },
            { label:'Net Position',    val:ZAR(netPosition),  cls:'fin-kpi-net', color:T.forest },
          ].map(k => (
            <div className={`stat-card ${k.cls}`} key={k.label} style={{ cursor:'pointer' }} onClick={() => setPage('finance')}>
              <div className="card-label">{k.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:k.color, lineHeight:1, marginTop:4 }}>{k.val}</div>
            </div>
          ))}
        </div>

        <div className="grid-3 gap-20 mb-20">
          {/* Milestones */}
          <div className="card">
            <div className="section-label">Milestones</div>
            {MILESTONES_COMPLETED.slice(-3).map((m, i) => (
              <div className="milestone-row" key={i}>
                <div className="milestone-icon milestone-done">✓</div>
                <div>
                  <div className="milestone-title">{m.label}</div>
                  <div className="milestone-subtitle">Completed · {m.date}</div>
                </div>
              </div>
            ))}
            {MILESTONES_UPCOMING.slice(0, 3).map((m, i) => (
              <div className="milestone-row" key={i}>
                <div className={`milestone-icon ${m.status === 'In Progress' ? 'milestone-next' : 'milestone-future'}`}>
                  {m.status === 'In Progress' ? '◑' : '○'}
                </div>
                <div>
                  <div className="milestone-title">{m.label}</div>
                  <div className="milestone-subtitle">{m.status}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Centre summary */}
          <div className="card" style={{ cursor:'pointer' }} onClick={() => setPage('actions')}>
            <div className="section-label">Action Centre</div>
            <div style={{ display:'flex', gap:12, marginBottom:16 }}>
              <div style={{ textAlign:'center', flex:1, background:T.beige, borderRadius:8, padding:'12px 8px' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:T.forest }}>{openTasks}</div>
                <div style={{ fontSize:10, color:T.textLight, letterSpacing:'0.1em', textTransform:'uppercase' }}>Open</div>
              </div>
              <div style={{ textAlign:'center', flex:1, background:'rgba(139,58,58,0.08)', borderRadius:8, padding:'12px 8px' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:T.danger }}>{criticalTasks}</div>
                <div style={{ fontSize:10, color:T.textLight, letterSpacing:'0.1em', textTransform:'uppercase' }}>Critical</div>
              </div>
            </div>
            {tasks.filter(t => t.status !== 'Completed').slice(0, 3).map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:`1px solid ${T.beige}` }}>
                <span className={`badge ${t.priority === 'Critical' ? 'pri-critical' : t.priority === 'High' ? 'pri-high' : 'pri-medium'}`} style={{ fontSize:9, padding:'2px 6px' }}>{t.priority}</span>
                <span style={{ fontSize:12 }}>{t.name}</span>
              </div>
            ))}
          </div>

          {/* Documents */}
          <div className="card" style={{ cursor:'pointer' }} onClick={() => setPage('documents')}>
            <div className="section-label">Documents</div>
            {documents.length === 0 ? (
              <div style={{ color:T.textLight, fontSize:13 }}>No documents uploaded yet. Click to add.</div>
            ) : (
              documents.slice(0, 4).map(d => (
                <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${T.beige}` }}>
                  <span style={{ fontSize:16 }}>📄</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:500 }}>{d.name}</div>
                    <div style={{ fontSize:10, color:T.textLight }}>{d.category} · {fmtDate(d.dateUploaded)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid-2 gap-20">
          {/* Suppliers & Products */}
          <div className="card">
            <div className="section-label">Suppliers & Products</div>
            {suppliers.map(s => (
              <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid ${T.beige}` }}>
                <div>
                  <div style={{ fontWeight:500, fontSize:13 }}>{s.name}</div>
                  <div style={{ fontSize:11, color:T.textLight }}>{s.country} · {s.terms}</div>
                </div>
                <span className="badge badge-green">{s.status}</span>
              </div>
            ))}
            <div style={{ marginTop:12, padding:'9px 0', borderTop:`1px solid ${T.beige}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMid }}>
                <span>{products.length} products · {foundersCount} in Founders Collection</span>
                <span style={{ color:T.gold, cursor:'pointer' }} onClick={() => setPage('products')}>View →</span>
              </div>
            </div>
          </div>

          {/* Priorities */}
          <div className="card">
            <div className="section-label">Current Priorities</div>
            {[
              { dot:'green', title:'Open bank account', desc:'Waiting on name change — unblock supplier payments.' },
              { dot:'',      title:'Complete importer registration', desc:'SARS eFiling — required before first shipment.' },
              { dot:'',      title:'Order Founders Collection samples', desc:'Confirm with Frank / Dongyi. Payment on hold.' },
              { dot:'green', title:'Build Checkers Hyper pitch deck', desc:'Financial model + shop-in-shop concept + pilot proposal.' },
              { dot:'',      title:'Finalise Checkers Hyper pricing', desc:'Present sell-in and RRP matrix to buyer.' },
            ].map((p, i) => (
              <div className="priority-item" key={i}>
                <div className={`priority-dot ${p.dot}`} />
                <div>
                  <div className="priority-title">{p.title}</div>
                  <div className="priority-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
