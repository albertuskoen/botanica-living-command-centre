import { T } from '../utils/tokens.js'
import { ZAR, fmtDate, clamp } from '../utils/format.js'
import { MILESTONES_COMPLETED, MILESTONES_UPCOMING } from '../utils/data.js'

// ── Score Ring ────────────────────────────────────────────────────────────────
function Ring({ score, color, size = 80, strokeW = 7 }) {
  const r    = (size - strokeW * 2) / 2
  const circ = 2 * Math.PI * r
  const off  = circ * (1 - score / 100)
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg className="ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring-bg" cx={size/2} cy={size/2} r={r} strokeWidth={strokeW} />
        <circle
          className="ring-fg"
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={strokeW}
          strokeDasharray={circ}
          strokeDashoffset={off}
        />
      </svg>
      <div className="ring-text">
        <span className="ring-num" style={{ fontSize: size * 0.24, color }}>{score}</span>
        <span className="ring-unit">/ 100</span>
      </div>
    </div>
  )
}

// ── Mini Bar Chart ─────────────────────────────────────────────────────────────
function MiniChart({ data, color }) {
  if (!data.length) return <div style={{ height: 40, display:'flex', alignItems:'center', fontSize:11, color:T.textLight }}>No data yet</div>
  const max = Math.max(...data, 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:40 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius:'3px 3px 0 0',
          background: `linear-gradient(180deg, ${color}CC, ${color}55)`,
          height: `${clamp(Math.round((v / max) * 100), 4, 100)}%`,
          minWidth: 6, transition: 'height 0.6s ease',
        }} />
      ))}
    </div>
  )
}

export default function Dashboard({ suppliers, products, finance, tasks, documents, setPage }) {
  // ── Derived figures ──────────────────────────────────────────────────────────
  const invested  = finance.filter(t => t.type === 'Owner Investment').reduce((s, t) => s + Number(t.amount), 0)
  const income    = finance.filter(t => t.type === 'Business Income').reduce((s, t) => s + Number(t.amount), 0)
  const expenses  = finance.filter(t => t.type === 'Business Expense').reduce((s, t) => s + Number(t.amount), 0)
  const remaining = invested - expenses
  const netPos    = income - expenses

  const openTasks     = tasks.filter(t => t.status !== 'Completed').length
  const critTasks     = tasks.filter(t => t.priority === 'Critical' && t.status !== 'Completed').length
  const doneTasks     = tasks.filter(t => t.status === 'Completed').length
  const foundersCount = products.filter(p => p.foundersCollection).length

  // ── Health scores ────────────────────────────────────────────────────────────
  const totalMilestones = MILESTONES_COMPLETED.length + MILESTONES_UPCOMING.length
  const progressScore   = clamp(Math.round((MILESTONES_COMPLETED.length / totalMilestones) * 100), 0, 100)
  const financeScore    = invested > 0
    ? clamp(Math.round(((remaining / invested) * 55) + (income > 0 ? 30 : 0) + 15), 0, 100)
    : 20
  const taskScore       = tasks.length > 0 ? clamp(Math.round((doneTasks / tasks.length) * 100), 0, 100) : 40
  const healthScore     = Math.round((progressScore + financeScore + taskScore) / 3)

  // ── Recent expense data for mini chart ───────────────────────────────────────
  const expData = finance
    .filter(t => t.type === 'Business Expense')
    .slice(-8).map(t => Number(t.amount))

  const importerStatus = MILESTONES_UPCOMING.find(m => m.label === 'Importer Registration')?.status || 'Not Started'

  // ── KPI card configs ─────────────────────────────────────────────────────────
  const kpiCards = [
    {
      label: 'Owner Investment', value: ZAR(invested), color: T.teal,
      chipBg: T.tealPale, chipColor: T.teal, chip: 'Capital In',
      bar: null, cls: 'border-inv', page: 'finance',
    },
    {
      label: 'Cash Position', value: ZAR(remaining), color: remaining >= 0 ? T.gold : T.danger,
      chipBg: remaining >= 0 ? T.goldPale : T.redPale,
      chipColor: remaining >= 0 ? T.gold : T.danger,
      chip: remaining >= 0 ? 'Positive' : 'Deficit',
      bar: invested > 0 ? clamp(Math.round((remaining / invested) * 100), 0, 100) : 0,
      barColor: remaining >= 0 ? T.gold : T.danger,
      cls: 'border-rem', page: 'finance',
    },
    {
      label: 'Business Income', value: ZAR(income), color: T.green,
      chipBg: T.greenPale, chipColor: T.green, chip: income > 0 ? 'Revenue' : 'Pre-Revenue',
      bar: null, cls: 'border-inc', page: 'finance',
    },
    {
      label: 'Total Expenses', value: ZAR(expenses), color: T.red,
      chipBg: T.redPale, chipColor: T.red, chip: `${finance.filter(t=>t.type==='Business Expense').length} txns`,
      bar: null, cls: 'border-exp', page: 'finance',
    },
    {
      label: 'Net Position', value: ZAR(netPos), color: netPos >= 0 ? T.forestLight : T.danger,
      chipBg: netPos >= 0 ? T.greenPale : T.redPale,
      chipColor: netPos >= 0 ? T.green : T.danger,
      chip: netPos >= 0 ? 'Positive' : 'Negative',
      bar: null, cls: 'border-net', page: 'finance',
    },
  ]

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Botanica Living · Business Platform</div>
        </div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, fontStyle:'italic', color:T.gold, opacity:0.85 }}>
          Designed for Life. Inspired by Nature.
        </div>
      </div>

      <div className="page-content">

        {/* ── Company Banner ──────────────────────────────────────────────── */}
        {/* Botanical hero — layered CSS interior background wrapping the company banner */}
        <div style={{
          position:'relative', borderRadius:24, marginBottom:24,
          overflow:'hidden', boxShadow:'0 8px 40px rgba(15,40,20,0.22)',
        }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(145deg,#1C3A24 0%,#2D5238 22%,#4A7A55 44%,#3A6045 62%,#1E3528 82%,#131F18 100%)' }}/>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 65% 85% at 96% 5%, rgba(255,235,170,0.3) 0%, rgba(240,210,130,0.12) 45%, transparent 70%)' }}/>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 42% 100% at -8% 58%, rgba(10,30,15,0.75) 0%, rgba(25,60,30,0.5) 40%, transparent 70%)' }}/>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 35% 70% at 108% 70%, rgba(55,100,50,0.55) 0%, rgba(85,135,70,0.22) 45%, transparent 68%)' }}/>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'45%', background:'linear-gradient(0deg, rgba(12,28,16,0.42) 0%, transparent 100%)' }}/>
          <div className="company-banner mb20" style={{ marginBottom:0, background:'transparent', boxShadow:'none', border:'none', borderRadius:0, position:'relative', zIndex:2 }}>
          <div className="banner-gem">✦</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20, position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:18 }}>
              <img
                src="/botanica-logo.png"
                alt="Botanica Living"
                style={{ width:72, height:72, borderRadius:12, objectFit:'contain', objectPosition:'center', background:'rgba(245,240,232,0.9)', padding:6, flexShrink:0, boxShadow:'0 4px 16px rgba(0,0,0,0.4)' }}
              />
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, color:T.goldBright, fontWeight:300, marginBottom:4, lineHeight:1.2 }}>
                  Botanica Living (Pty) Ltd
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', letterSpacing:'0.12em', marginBottom:4, textTransform:'uppercase' }}>
                  Premium Artificial Greenery
                </div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.28)', letterSpacing:'0.06em', marginBottom:14 }}>
                  Reg: 2026/444834/07 · botanicaliving.co.za
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <span className="badge" style={{ background:'rgba(21,128,61,0.3)', color:'#6EE8A0', borderColor:'rgba(110,232,160,0.22)', fontSize:11 }}>
                  ● In Business
                </span>
                <span className="badge" style={{ background:'rgba(184,151,90,0.22)', color:T.goldBright, borderColor:'rgba(232,192,122,0.25)', fontSize:11 }}>
                  Name Change ✓
                </span>
                <span className="badge" style={{ background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.5)', borderColor:'rgba(255,255,255,0.1)', fontSize:11 }}>
                  PWA Ready
                </span>
                <span className="badge" style={{
                  background: importerStatus === 'Completed' ? 'rgba(21,128,61,0.3)' : 'rgba(184,151,90,0.18)',
                  color: importerStatus === 'Completed' ? '#6EE8A0' : T.goldBright,
                  borderColor: importerStatus === 'Completed' ? 'rgba(110,232,160,0.22)' : 'rgba(232,192,122,0.22)',
                  fontSize: 11,
                }}>
                  {importerStatus === 'Completed' ? 'Importer ✓' : 'Importer Pending'}
                </span>
                </div>
              </div>
            </div>
            {/* Overall health ring */}
            <div style={{ textAlign:'center' }}>
              <Ring score={healthScore} color={T.goldBright} size={92} strokeW={7} />
              <div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', marginTop:8, fontWeight:600 }}>
                Business Health
              </div>
            </div>
          </div>
          </div>{/* /company-banner */}
        </div>{/* /botanical-hero */}

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <div className="grid-5 mb20" style={{ marginBottom:24 }}>
          {kpiCards.map(k => (
            <div key={k.label} className={`stat-card ${k.cls}`} onClick={() => setPage(k.page)}>
              <div className="stat-top" style={{ background:`linear-gradient(90deg, ${k.color}88, ${k.color}22)` }} />
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, background:k.chipBg, color:k.chipColor, fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12 }}>
                {k.chip}
              </div>
              <div className="stat-label">{k.label}</div>
              <div className="stat-value" style={{ color:k.color }}>{k.value}</div>
              {k.bar != null && (
                <div className="pbar" style={{ marginTop:12 }}>
                  <div className="pbar-fill" style={{ width:`${k.bar}%`, background:`linear-gradient(90deg, ${k.barColor}99, ${k.barColor})` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Health Scores Row ────────────────────────────────────────────── */}
        <div className="grid-3 mb20" style={{ marginBottom:24 }}>
          {[
            { label:'Business Health', score:healthScore, color:T.gold, desc:'Overall company readiness & progress' },
            { label:'Project Progress', score:progressScore, color:T.forestGlow, desc:`${MILESTONES_COMPLETED.length} of ${totalMilestones} milestones complete` },
            { label:'Finance Health', score:financeScore, color:T.teal, desc:'Capital position & income status' },
          ].map(h => (
            <div key={h.label} className="g-card" style={{ display:'flex', alignItems:'center', gap:18 }}>
              <Ring score={h.score} color={h.color} size={74} strokeW={6} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13, color:T.forest, marginBottom:3 }}>{h.label}</div>
                <div style={{ fontSize:11, color:T.textMid, marginBottom:10, lineHeight:1.5 }}>{h.desc}</div>
                <div className="pbar">
                  <div className="pbar-fill" style={{ width:`${h.score}%`, background:`linear-gradient(90deg,${h.color}88,${h.color})` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Middle Row ──────────────────────────────────────────────────── */}
        <div className="grid-3 mb20" style={{ marginBottom:24 }}>

          {/* Outstanding Actions */}
          <div className="g-card g-card-click" onClick={() => setPage('actions')}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div className="sec-label" style={{ marginBottom:0 }}>Outstanding Actions</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, color: critTasks > 0 ? T.danger : T.forest, lineHeight:1 }}>{openTasks}</div>
            </div>
            {critTasks > 0 && (
              <div style={{ background:T.redPale, border:`1px solid rgba(185,28,28,0.15)`, borderRadius:8, padding:'8px 12px', marginBottom:14, fontSize:12, color:T.danger, fontWeight:600 }}>
                ⚠ {critTasks} critical {critTasks === 1 ? 'task' : 'tasks'} need attention
              </div>
            )}
            {tasks.filter(t => t.status !== 'Completed').slice(0, 4).map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:`1px solid rgba(210,200,184,0.3)` }}>
                <span className={`badge ${t.priority === 'Critical' ? 'pri-critical' : t.priority === 'High' ? 'pri-high' : 'pri-medium'}`} style={{ fontSize:9, padding:'2px 7px', flexShrink:0 }}>{t.priority}</span>
                <span style={{ fontSize:12, color:T.text, lineHeight:1.4 }}>{t.name}</span>
              </div>
            ))}
            {openTasks === 0 && <div style={{ fontSize:13, color:T.textLight }}>All tasks complete ✓</div>}
          </div>

          {/* Key Milestones */}
          <div className="g-card">
            <div className="sec-label">Key Milestones</div>
            {MILESTONES_COMPLETED.slice(-3).map((m, i) => (
              <div className="milestone-row" key={`d${i}`}>
                <div className="m-icon m-done">✓</div>
                <div><div className="m-title">{m.label}</div><div className="m-sub">Completed · {m.date}</div></div>
              </div>
            ))}
            {MILESTONES_UPCOMING.slice(0, 3).map((m, i) => (
              <div className="milestone-row" key={`u${i}`}>
                <div className={`m-icon ${m.status === 'In Progress' ? 'm-prog' : 'm-future'}`}>
                  {m.status === 'In Progress' ? '◑' : '○'}
                </div>
                <div><div className="m-title">{m.label}</div><div className="m-sub">{m.status}</div></div>
              </div>
            ))}
          </div>

          {/* Documents + Expenses chart */}
          <div className="g-card g-card-click" onClick={() => setPage('documents')}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div className="sec-label" style={{ marginBottom:0 }}>Documents Stored</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, color:T.forest, lineHeight:1 }}>{documents.length}</div>
            </div>
            {documents.length === 0 ? (
              <div style={{ color:T.textLight, fontSize:13, lineHeight:1.7 }}>
                No documents yet.<br />
                <span style={{ color:T.gold, fontSize:12, fontWeight:600 }}>Add CIPC, SARS, supplier docs →</span>
              </div>
            ) : (
              documents.slice(0, 4).map(d => (
                <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:`1px solid rgba(210,200,184,0.3)` }}>
                  <div style={{ width:26, height:26, borderRadius:6, background:`linear-gradient(135deg, rgba(184,151,90,0.2), rgba(184,151,90,0.08))`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>📄</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:T.forest }}>{d.name}</div>
                    <div style={{ fontSize:10, color:T.textLight }}>{d.category} · {fmtDate(d.dateUploaded)}</div>
                  </div>
                </div>
              ))
            )}
            {expData.length > 0 && (
              <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid rgba(210,200,184,0.3)` }}>
                <div style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:T.textLight, fontWeight:600, marginBottom:8 }}>Recent Expenses</div>
                <MiniChart data={expData} color={T.red} />
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Row ──────────────────────────────────────────────────── */}
        <div className="grid-2" style={{ gap:20 }}>

          {/* Suppliers & Products */}
          <div className="g-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div className="sec-label" style={{ marginBottom:0 }}>Suppliers & Products</div>
              <span style={{ fontSize:12, color:T.gold, cursor:'pointer', fontWeight:600 }} onClick={() => setPage('products')}>View all →</span>
            </div>
            {suppliers.map(s => (
              <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid rgba(210,200,184,0.3)` }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:T.forest }}>{s.name}</div>
                  <div style={{ fontSize:11, color:T.textLight, marginTop:1 }}>{s.country} · {s.terms}</div>
                </div>
                <span className="badge badge-forest">{s.status}</span>
              </div>
            ))}
            <div style={{ marginTop:12, padding:'10px 0', borderTop:`1px solid rgba(210,200,184,0.3)`, fontSize:12, color:T.textMid }}>
              {products.length} products · {foundersCount} in Founders Collection
            </div>
          </div>

          {/* Current Priorities */}
          <div className="g-card">
            <div className="sec-label">Current Priorities</div>
            {[
              { green:false, title:'Open business bank account',            desc:'Unblocks supplier payments. Waiting on name change documents.' },
              { green:false, title:'Complete importer registration',         desc:'SARS eFiling — required before first shipment can clear customs.' },
              { green:false, title:'Order Founders Collection samples',      desc:'Confirm with Frank / Dongyi. 6 hero SKUs selected and ready.' },
              { green:true,  title:'Build Strategy pitch deck',        desc:'Financial model + shop-in-shop visual concept + pilot proposal.' },
              { green:true,  title:'Finalise import calculator assumptions',  desc:'Align duty % and exchange rate with clearing agent.' },
            ].map((p, i) => (
              <div className="priority-item" key={i}>
                <div className={`p-dot ${p.green ? 'p-dot-green' : 'p-dot-gold'}`} />
                <div>
                  <div className="p-title">{p.title}</div>
                  <div className="p-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
