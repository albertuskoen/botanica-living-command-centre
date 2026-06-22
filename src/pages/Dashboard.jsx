// Dashboard.jsx — v2.4
import { useMemo } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, fmtDate, clamp } from '../utils/format.js'
import { MILESTONES_COMPLETED, MILESTONES_UPCOMING } from '../utils/data.js'

function Ring({ score, color, size = 80, strokeW = 7 }) {
  const r    = (size - strokeW * 2) / 2
  const circ = 2 * Math.PI * r
  const off  = circ * (1 - clamp(score, 0, 100) / 100)
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg className="ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring-bg" cx={size/2} cy={size/2} r={r} strokeWidth={strokeW} />
        <circle className="ring-fg" cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={strokeW} strokeDasharray={circ} strokeDashoffset={off} />
      </svg>
      <div className="ring-text">
        <span className="ring-num" style={{ fontSize: size * 0.24, color }}>{Math.round(score)}</span>
        <span className="ring-unit">/ 100</span>
      </div>
    </div>
  )
}

export default function Dashboard({ suppliers, products, finance, tasks, documents, quotes, invoices, expenses, setPage }) {
  const safeF = Array.isArray(finance)   ? finance   : []
  const safeQ = Array.isArray(quotes)    ? quotes    : []
  const safeI = Array.isArray(invoices)  ? invoices  : []
  const safeE = Array.isArray(expenses)  ? expenses  : []

  // ── Finance ──────────────────────────────────────────────────────────────────
  const invested    = useMemo(() => safeF.filter(t => t?.type==='Owner Investment').reduce((s,t) => s+Number(t.amount||0), 0), [safeF])
  const income      = useMemo(() => safeF.filter(t => t?.type==='Business Income').reduce((s,t)  => s+Number(t.amount||0), 0), [safeF])
  const legacyExp   = useMemo(() => safeF.filter(t => t?.type==='Business Expense').reduce((s,t) => s+Number(t.amount||0), 0), [safeF])
  const newExpenses = useMemo(() => safeE.reduce((s,e) => s+Number(e.amount||0), 0), [safeE])
  const totalExp    = legacyExp + newExpenses

  const today = new Date().toISOString().split('T')[0]
  const paidTotal      = useMemo(() => safeI.filter(i=>i.status==='Paid').reduce((s,i)=>s+Number(i.total||0),0), [safeI])
  const outstandingInv = useMemo(() => safeI.filter(i=>i.status!=='Paid').reduce((s,i)=>s+Number(i.total||0)-Number(i.amountPaid||0),0), [safeI])
  const overdueCount   = useMemo(() => safeI.filter(i=>i.status!=='Paid'&&i.dueDate&&i.dueDate<today).length, [safeI, today])
  const pipelineValue  = useMemo(() => safeQ.filter(q=>q.status==='Sent'||q.status==='Accepted').reduce((s,q)=>s+Number(q.total||0),0), [safeQ])

  const cashPosition = invested + income + paidTotal - totalExp
  const grossProfit  = income + paidTotal - totalExp
  const grossMargin  = (income + paidTotal) > 0 ? (grossProfit / (income + paidTotal)) * 100 : 0

  // ── Health scores ─────────────────────────────────────────────────────────────
  const totalMilestones = MILESTONES_COMPLETED.length + MILESTONES_UPCOMING.length
  const progressScore   = clamp(Math.round((MILESTONES_COMPLETED.length / totalMilestones) * 100), 0, 100)
  const tasksDone       = (Array.isArray(tasks)?tasks:[]).filter(t=>t?.status==='Completed').length
  const taskScore       = tasks?.length ? clamp(Math.round((tasksDone/tasks.length)*100),0,100) : 40
  const finScore        = clamp(
    (cashPosition>0?35:0)+(grossMargin>30?30:grossMargin>0?15:0)+(overdueCount===0?20:overdueCount<3?10:0)+(pipelineValue>0?15:0),
    0, 100
  )
  const healthScore = Math.round((progressScore + finScore + taskScore) / 3)

  const importerStatus = MILESTONES_UPCOMING.find(m => m.label==='Importer Registration')?.status || 'Not Started'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Botanica Living Group · Business Overview</div>
        </div>
        <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:13, fontStyle:'italic', color:T.gold, opacity:0.85 }}>
          Designed for Life. Inspired by Nature.
        </div>
      </div>

      <div className="page-content">

        {/* ── Company Banner ─────────────────────────────────────────────── */}
        <div className="company-banner mb20" style={{ marginBottom:24 }}>
          <div className="banner-gem">✦</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20, position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:18 }}>
              <img src="/botanica-logo.png" alt="Botanica Living" style={{ width:72, height:72, borderRadius:12, objectFit:'contain', background:'rgba(15,26,20,0.80)', padding:6, flexShrink:0, boxShadow:'0 4px 16px rgba(0,0,0,0.4)' }} />
              <div>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:26, color:T.goldBright, fontWeight:300, marginBottom:4, lineHeight:1.2 }}>Botanica Living Group (Pty) Ltd</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', letterSpacing:'0.12em', marginBottom:4, textTransform:'uppercase' }}>Premium Artificial Greenery</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.28)', letterSpacing:'0.06em', marginBottom:14 }}>Reg: 2026/444834/07 · botanicaliving.co.za</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span className="badge" style={{ background:'rgba(21,128,61,0.3)', color:'#6EE8A0', borderColor:'rgba(110,232,160,0.22)', fontSize:11 }}>● In Business</span>
                  <span className="badge" style={{ background:'rgba(184,151,90,0.22)', color:T.goldBright, borderColor:'rgba(232,192,122,0.25)', fontSize:11 }}>Name Change ✓</span>
                  <span className="badge" style={{ background:'rgba(255,255,255,0.07)', color:'rgba(15,26,20,0.60)', borderColor:'rgba(255,255,255,0.1)', fontSize:11 }}>PWA v2.4</span>
                  <span className="badge" style={{ background: importerStatus==='Completed'?'rgba(21,128,61,0.3)':'rgba(184,151,90,0.18)', color:importerStatus==='Completed'?'#6EE8A0':T.goldBright, fontSize:11 }}>
                    {importerStatus==='Completed'?'Importer ✓':'Importer Pending'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ textAlign:'center' }}>
              <Ring score={healthScore} color={T.goldBright} size={92} strokeW={7} />
              <div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', marginTop:8, fontWeight:600 }}>Business Health</div>
            </div>
          </div>
        </div>

        {/* ── Financial KPIs ─────────────────────────────────────────────── */}
        <div className="grid-5 mb20" style={{ marginBottom:24 }}>
          {[
            { label:'Cash Position',      val:ZAR(cashPosition), color:cashPosition>=0?T.gold:T.danger, cls:'border-rem', page:'finance-hub',  chip:cashPosition>=0?'Positive':'Deficit',   chipBg:cashPosition>=0?T.goldPale:T.redPale, chipColor:cashPosition>=0?T.gold:T.danger },
            { label:'Outstanding Inv.',   val:ZAR(outstandingInv), color:T.teal, cls:'border-inv', page:'invoices',   chip:`${safeI.filter(i=>i.status!=='Paid').length} open`, chipBg:T.tealPale, chipColor:T.teal },
            { label:'Quotes Pipeline',    val:ZAR(pipelineValue), color:T.gold, cls:'border-rem', page:'quotes',     chip:`${safeQ.filter(q=>q.status==='Sent'||q.status==='Accepted').length} active`, chipBg:T.goldPale, chipColor:T.gold },
            { label:'Total Expenses',     val:ZAR(totalExp), color:T.red, cls:'border-exp', page:'expenses',   chip:`${safeE.length} records`, chipBg:T.redPale, chipColor:T.red },
            { label:'Gross Margin',       val:grossMargin.toFixed(1)+'%', color:grossMargin>=30?T.green:grossMargin>0?T.gold:T.danger, cls:'border-net', page:'finance-hub', chip:grossProfit>=0?'Profitable':'Needs Revenue', chipBg:grossProfit>=0?T.greenPale:T.redPale, chipColor:grossProfit>=0?T.green:T.danger },
          ].map(k => (
            <div key={k.label} className={`stat-card ${k.cls}`} onClick={() => setPage(k.page)} style={{ cursor:'pointer' }}>
              <div className="stat-top" style={{ background:`linear-gradient(90deg,${k.color}88,${k.color}22)` }} />
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, background:k.chipBg, color:k.chipColor, fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12 }}>{k.chip}</div>
              <div className="stat-label">{k.label}</div>
              <div className="stat-value" style={{ color:k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* ── Health Scores ──────────────────────────────────────────────── */}
        <div className="grid-3 mb20" style={{ marginBottom:24 }}>
          {[
            { label:'Business Health', score:healthScore, color:T.gold, desc:'Overall company readiness & progress' },
            { label:'Project Progress', score:progressScore, color:T.forestGlow, desc:`${MILESTONES_COMPLETED.length} of ${totalMilestones} milestones complete` },
            { label:'Financial Health', score:finScore, color:T.teal, desc:'Cash, margins & receivables status' },
          ].map(h => (
            <div key={h.label} className="g-card" style={{ display:'flex', alignItems:'center', gap:18 }}>
              <Ring score={h.score} color={h.color} size={74} strokeW={6} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13, color:T.forest, marginBottom:3 }}>{h.label}</div>
                <div style={{ fontSize:11, color:T.textMid, marginBottom:10, lineHeight:1.5 }}>{h.desc}</div>
                <div className="pbar"><div className="pbar-fill" style={{ width:`${h.score}%`, background:`linear-gradient(90deg,${h.color}88,${h.color})` }}/></div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Middle Row ─────────────────────────────────────────────────── */}
        <div className="grid-3 mb20" style={{ marginBottom:24 }}>

          {/* Outstanding Actions */}
          <div className="g-card g-card-click" onClick={() => setPage('actions')}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div className="sec-label" style={{ marginBottom:0 }}>Outstanding Actions</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:32, color:T.forest, lineHeight:1 }}>
                {(Array.isArray(tasks)?tasks:[]).filter(t=>t?.status!=='Completed').length}
              </div>
            </div>
            {(Array.isArray(tasks)?tasks:[]).filter(t=>t?.status!=='Completed').slice(0,4).map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
                <span className={`badge ${t.priority==='Critical'?'pri-critical':t.priority==='High'?'pri-high':'pri-medium'}`} style={{ fontSize:9, padding:'2px 7px', flexShrink:0 }}>{t.priority}</span>
                <span style={{ fontSize:12, color:T.text, lineHeight:1.4 }}>{t.name}</span>
              </div>
            ))}
          </div>

          {/* Key Milestones */}
          <div className="g-card">
            <div className="sec-label">Key Milestones</div>
            {MILESTONES_COMPLETED.slice(-3).map((m,i) => (
              <div className="milestone-row" key={`d${i}`}>
                <div className="m-icon m-done">✓</div>
                <div><div className="m-title">{m.label}</div><div className="m-sub">Completed · {m.date}</div></div>
              </div>
            ))}
            {MILESTONES_UPCOMING.slice(0,3).map((m,i) => (
              <div className="milestone-row" key={`u${i}`}>
                <div className={`m-icon ${m.status==='In Progress'?'m-prog':'m-future'}`}>{m.status==='In Progress'?'◑':'○'}</div>
                <div><div className="m-title">{m.label}</div><div className="m-sub">{m.status}</div></div>
              </div>
            ))}
          </div>

          {/* Financial Hub quick access */}
          <div className="g-card g-card-click" onClick={() => setPage('finance-hub')}>
            <div className="sec-label">Financial Hub</div>
            {[
              { label:'Quotes', val:safeQ.length, sub:ZAR(safeQ.reduce((s,q)=>s+Number(q.total||0),0)), color:T.gold, page:'quotes' },
              { label:'Invoices', val:safeI.length, sub:ZAR(safeI.reduce((s,i)=>s+Number(i.total||0),0)), color:T.teal, page:'invoices' },
              { label:'Expenses', val:safeE.length, sub:ZAR(safeE.reduce((s,e)=>s+Number(e.amount||0),0)), color:T.red, page:'expenses' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid rgba(255,255,255,0.07)`, cursor:'pointer' }}
                onClick={e => { e.stopPropagation(); setPage(r.page) }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:T.forest }}>{r.label}</div>
                  <div style={{ fontSize:11, color:T.textLight }}>{r.val} records</div>
                </div>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:18, color:r.color }}>{r.sub}</div>
              </div>
            ))}
            {overdueCount > 0 && (
              <div style={{ marginTop:10, padding:'8px 12px', background:T.redPale, border:`1px solid rgba(185,28,28,0.15)`, borderRadius:8, fontSize:12, color:T.danger, fontWeight:600 }}>
                ⚠ {overdueCount} overdue invoice{overdueCount>1?'s':''}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Row ─────────────────────────────────────────────────── */}
        <div className="grid-2" style={{ gap:20 }}>
          <div className="g-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div className="sec-label" style={{ marginBottom:0 }}>Suppliers & Products</div>
              <span style={{ fontSize:12, color:T.gold, cursor:'pointer', fontWeight:600 }} onClick={() => setPage('products')}>View all →</span>
            </div>
            {suppliers.map(s => (
              <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:T.forest }}>{s.name}</div>
                  <div style={{ fontSize:11, color:T.textLight, marginTop:1 }}>{s.country} · {s.terms}</div>
                </div>
                <span className="badge badge-forest">{s.status}</span>
              </div>
            ))}
            <div style={{ marginTop:12, padding:'10px 0', borderTop:`1px solid rgba(255,255,255,0.07)`, fontSize:12, color:T.textMid }}>
              {products.length} products · {products.filter(p=>p.foundersCollection).length} in Founders Collection
            </div>
          </div>

          <div className="g-card">
            <div className="sec-label">Current Priorities</div>
            {[
              { green:false, title:'Open business bank account', desc:'Unblocks supplier payments. Waiting on name change documents.' },
              { green:false, title:'Complete importer registration', desc:'SARS eFiling — required before first shipment can clear customs.' },
              { green:false, title:'Order Founders Collection samples', desc:'Confirm with Frank / Dongyi. 6 hero SKUs selected and ready.' },
              { green:true,  title:'Build Checkers Hyper pitch deck', desc:'Financial model + shop-in-shop visual concept + pilot proposal.' },
              { green:true,  title:'Finalise import cost assumptions', desc:'Align duty % and exchange rate with clearing agent.' },
            ].map((p,i) => (
              <div className="priority-item" key={i}>
                <div className={`p-dot ${p.green?'p-dot-green':'p-dot-gold'}`} />
                <div><div className="p-title">{p.title}</div><div className="p-desc">{p.desc}</div></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
