// FinancialHub.jsx — v2.4
// Central financial dashboard for Botanica Living Group
import { useMemo } from 'react'
import { T } from '../../utils/tokens.js'
import { ZAR, fmtDate, clamp } from '../../utils/format.js'

function Ring({ score, color, size = 72, strokeW = 6 }) {
  const r = (size - strokeW * 2) / 2
  const circ = 2 * Math.PI * r
  const off  = circ * (1 - clamp(score, 0, 100) / 100)
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg className="ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring-bg" cx={size/2} cy={size/2} r={r} strokeWidth={strokeW} />
        <circle className="ring-fg" cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={strokeW} strokeDasharray={circ} strokeDashoffset={off} />
      </svg>
      <div className="ring-text">
        <span className="ring-num" style={{ fontSize: size * 0.22, color }}>{Math.round(score)}</span>
        <span className="ring-unit">/ 100</span>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color, sub, badge, badgeBg, badgeColor, onClick, topColor }) {
  return (
    <div className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default', borderTop: `2px solid ${topColor || color}` }} onClick={onClick}>
      {badge && (
        <div style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20, background: badgeBg || 'rgba(184,151,90,0.1)', color: badgeColor || color, fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>
          {badge}
        </div>
      )}
      <div className="stat-label">{label}</div>
      <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:26, color, lineHeight:1, marginTop:6 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color: T.textLight, marginTop:6 }}>{sub}</div>}
    </div>
  )
}

export default function FinancialHub({ finance, quotes, invoices, expenses, projects, setPage }) {
  const safeF = Array.isArray(finance)   ? finance   : []
  const safeQ = Array.isArray(quotes)    ? quotes    : []
  const safeI = Array.isArray(invoices)  ? invoices  : []
  const safeE = Array.isArray(expenses)  ? expenses  : []
  const safeP = Array.isArray(projects)  ? projects  : []

  // ── Finance aggregates ───────────────────────────────────────────────────────
  const invested  = useMemo(() => safeF.filter(t => t?.type === 'Owner Investment').reduce((s,t) => s + Number(t.amount||0), 0), [safeF])
  const income    = useMemo(() => safeF.filter(t => t?.type === 'Business Income').reduce((s,t)  => s + Number(t.amount||0), 0), [safeF])
  const legacyExp = useMemo(() => safeF.filter(t => t?.type === 'Business Expense').reduce((s,t) => s + Number(t.amount||0), 0), [safeF])

  // ── New modules aggregates ───────────────────────────────────────────────────
  const totalExpenses = useMemo(() => safeE.reduce((s,e) => s + Number(e.amount||0), 0), [safeE]) + legacyExp

  const invoicedTotal  = useMemo(() => safeI.reduce((s,i) => s + Number(i.total||0), 0), [safeI])
  const paidTotal      = useMemo(() => safeI.filter(i => i.status === 'Paid').reduce((s,i) => s + Number(i.total||0), 0), [safeI])
  const outstandingInv = invoicedTotal - paidTotal

  const quotesTotal    = useMemo(() => safeQ.reduce((s,q) => s + Number(q.total||0), 0), [safeQ])
  const acceptedQuotes = useMemo(() => safeQ.filter(q => q.status === 'Accepted').reduce((s,q) => s + Number(q.total||0), 0), [safeQ])

  const cashPosition   = invested + income + paidTotal - totalExpenses
  const grossProfit    = income + paidTotal - totalExpenses
  const grossMargin    = (income + paidTotal) > 0 ? (grossProfit / (income + paidTotal)) * 100 : 0

  const openProjects   = safeP.filter(p => p.status === 'Active' || p.status === 'Planning').length
  const pipelineValue  = useMemo(() => safeQ.filter(q => q.status === 'Sent' || q.status === 'Accepted').reduce((s,q) => s + Number(q.total||0), 0), [safeQ])

  // ── Overdue invoices ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const overdueInvoices = useMemo(() => safeI.filter(i => i.status !== 'Paid' && i.dueDate && i.dueDate < today), [safeI, today])
  const overdueValue    = useMemo(() => overdueInvoices.reduce((s,i) => s + Number(i.total||0) - Number(i.amountPaid||0), 0), [overdueInvoices])

  // ── Health score ─────────────────────────────────────────────────────────────
  const finHealthScore = clamp(
    (cashPosition > 0 ? 35 : 0) +
    (grossMargin > 30 ? 30 : grossMargin > 0 ? 15 : 0) +
    (overdueInvoices.length === 0 ? 20 : overdueInvoices.length < 3 ? 10 : 0) +
    (pipelineValue > 0 ? 15 : 0),
    0, 100
  )

  // ── Monthly expense trend (last 6) ───────────────────────────────────────────
  const monthlyExpenses = useMemo(() => {
    const m = {}
    safeE.forEach(e => {
      const key = (e.date || '').substring(0,7)
      if (key) m[key] = (m[key] || 0) + Number(e.amount || 0)
    })
    safeF.filter(t => t?.type === 'Business Expense').forEach(t => {
      const key = (t.date || '').substring(0,7)
      if (key) m[key] = (m[key] || 0) + Number(t.amount || 0)
    })
    return Object.entries(m).sort((a,b) => a[0].localeCompare(b[0])).slice(-6)
  }, [safeE, safeF])

  const maxMonthly = Math.max(...monthlyExpenses.map(([,v]) => v), 1)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Financial Hub</div>
          <div className="page-subtitle">Botanica Living Group · Business Visibility Dashboard</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setPage('quotes')}>+ New Quote</button>
          <button className="btn btn-primary btn-sm" onClick={() => setPage('invoices')}>+ New Invoice</button>
        </div>
      </div>

      <div className="page-content">

        {/* ── Cash Position Banner ───────────────────────────────────────── */}
        <div className="g-card-dark mb20" style={{ marginBottom:24, padding:'22px 28px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20, position:'relative' }}>
            <div>
              <div style={{ fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color: T.gold, fontWeight:700, marginBottom:10 }}>Current Cash Position</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:44, fontWeight:300, color: cashPosition >= 0 ? T.goldBright : '#F87171', lineHeight:1, marginBottom:6 }}>
                {ZAR(cashPosition)}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }}>
                {ZAR(invested)} invested · {ZAR(totalExpenses)} expenses · {ZAR(paidTotal)} received
              </div>
            </div>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              <div style={{ textAlign:'center' }}>
                <Ring score={finHealthScore} color={T.goldBright} size={80} strokeW={6} />
                <div style={{ fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', marginTop:6, fontWeight:600 }}>Financial Health</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:32, color: grossMargin >= 30 ? '#6EE8A0' : grossMargin > 0 ? T.goldBright : '#F87171', lineHeight:1 }}>
                  {grossMargin.toFixed(1)}%
                </div>
                <div style={{ fontSize:9, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', marginTop:6, fontWeight:600 }}>Gross Margin</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ──────────────────────────────────────────────────── */}
        <div className="grid-4 mb20" style={{ marginBottom:24 }}>
          <KpiCard label="Outstanding Invoices" value={ZAR(outstandingInv)} color={T.teal} topColor={T.teal} badge={`${safeI.filter(i=>i.status!=='Paid').length} open`} badgeBg={T.tealPale} badgeColor={T.teal} onClick={() => setPage('invoices')} sub={overdueValue > 0 ? `${ZAR(overdueValue)} overdue` : 'None overdue'} />
          <KpiCard label="Quotes Pipeline" value={ZAR(pipelineValue)} color={T.gold} topColor={T.gold} badge={`${safeQ.filter(q=>q.status==='Sent'||q.status==='Accepted').length} active`} badgeBg={T.goldPale} badgeColor={T.gold} onClick={() => setPage('quotes')} sub={`${safeQ.length} total quotes`} />
          <KpiCard label="Total Expenses" value={ZAR(totalExpenses)} color={T.red} topColor={T.red} badge={`${safeE.length} records`} badgeBg={T.redPale} badgeColor={T.red} onClick={() => setPage('expenses')} sub="All recorded expenses" />
          <KpiCard label="Open Projects" value={openProjects} color={T.forestLight} topColor={T.forestLight} badge={`${safeP.length} total`} badgeBg="rgba(45,90,61,0.12)" badgeColor={T.forestLight} onClick={() => setPage('projects')} sub="Active & planning" />
        </div>

        {/* ── Financial Summary + Quick Actions ─────────────────────────── */}
        <div className="grid-3 mb20" style={{ marginBottom:24 }}>

          {/* P&L Summary */}
          <div className="g-card">
            <div className="sec-label">Profit & Loss</div>
            {[
              { label:'Owner Investment', val: ZAR(invested), color: T.teal },
              { label:'Revenue (invoiced)', val: ZAR(income + paidTotal), color: T.green },
              { label:'Total Expenses', val: ZAR(totalExpenses), color: T.red },
              { label:'Gross Profit', val: ZAR(grossProfit), color: grossProfit >= 0 ? T.forestLight : T.danger },
              { label:'Gross Margin', val: grossMargin.toFixed(1) + '%', color: grossMargin >= 30 ? T.green : grossMargin > 0 ? T.gold : T.danger },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
                <span style={{ fontSize:13, color: T.textMid }}>{r.label}</span>
                <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:17, color: r.color }}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Quick Module Nav */}
          <div className="g-card">
            <div className="sec-label">Quick Access</div>
            {[
              { icon:'◻', label:'Create Quote',    sub:'New client proposal',          page:'quotes',    color: T.gold },
              { icon:'▣', label:'Create Invoice',  sub:'Bill a client',                page:'invoices',  color: T.teal },
              { icon:'⊟', label:'Log Expense',     sub:'Record a business cost',       page:'expenses',  color: T.red },
              { icon:'⊞', label:'New Project',     sub:'Track a job or order',         page:'projects',  color: T.forestLight },
            ].map(a => (
              <div key={a.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:`1px solid rgba(255,255,255,0.07)`, cursor:'pointer' }} onClick={() => setPage(a.page)}>
                <div style={{ width:34, height:34, borderRadius:9, background:`rgba(184,151,90,0.1)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color: a.color, flexShrink:0 }}>{a.icon}</div>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color: T.forest }}>{a.label}</div>
                  <div style={{ fontSize:11, color: T.textLight }}>{a.sub}</div>
                </div>
                <span style={{ marginLeft:'auto', color: T.textLight, fontSize:12 }}>→</span>
              </div>
            ))}
          </div>

          {/* Invoice Status */}
          <div className="g-card">
            <div className="sec-label">Invoice Status</div>
            {safeI.length === 0 ? (
              <div className="empty-st" style={{ padding:'24px 0' }}>
                <div className="empty-ic" style={{ fontSize:24 }}>▣</div>
                <div style={{ fontSize:13, color: T.textLight }}>No invoices yet.</div>
                <button className="btn btn-outline btn-sm" style={{ marginTop:10 }} onClick={() => setPage('invoices')}>Create first invoice</button>
              </div>
            ) : (
              <>
                {['Draft','Sent','Partially Paid','Paid','Overdue'].map(s => {
                  const inv = safeI.filter(i => i.status === s)
                  if (!inv.length) return null
                  const val = inv.reduce((sum, i) => sum + Number(i.total||0), 0)
                  const color = s==='Paid'?T.green:s==='Overdue'?T.danger:s==='Partially Paid'?T.teal:s==='Sent'?T.gold:T.textMid
                  return (
                    <div key={s} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:7, height:7, borderRadius:'50%', background: color }} />
                        <span style={{ fontSize:13, color: T.textMid }}>{s}</span>
                        <span style={{ fontSize:11, color: T.textLight }}>({inv.length})</span>
                      </div>
                      <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:16, color }}>{ZAR(val)}</span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* ── Expense Trend + Recent ─────────────────────────────────────── */}
        <div className="grid-2" style={{ gap:20 }}>

          {/* Expense trend bar chart */}
          <div className="g-card">
            <div className="sec-label">Monthly Expenses</div>
            {monthlyExpenses.length === 0 ? (
              <div style={{ fontSize:13, color: T.textLight, padding:'16px 0' }}>No expense data yet.</div>
            ) : (
              <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80 }}>
                {monthlyExpenses.map(([month, val]) => (
                  <div key={month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ width:'100%', borderRadius:'3px 3px 0 0', background:`linear-gradient(180deg, ${T.red}CC, ${T.red}55)`, height: `${clamp(Math.round((val/maxMonthly)*100), 4, 100)}%`, minWidth:6, transition:'height 0.6s ease' }} />
                    <div style={{ fontSize:9, color: T.textLight, textAlign:'center' }}>{month.slice(5)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent invoices */}
          <div className="g-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div className="sec-label" style={{ marginBottom:0 }}>Recent Invoices</div>
              <span style={{ fontSize:12, color: T.gold, cursor:'pointer', fontWeight:600 }} onClick={() => setPage('invoices')}>View all →</span>
            </div>
            {safeI.length === 0 ? (
              <div style={{ fontSize:13, color: T.textLight }}>No invoices yet.</div>
            ) : (
              safeI.slice().sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0,5).map(inv => (
                <div key={inv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color: T.forest }}>{inv.number || `INV-${inv.id}`}</div>
                    <div style={{ fontSize:11, color: T.textLight }}>{inv.client} · {fmtDate(inv.date)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:16, color: inv.status==='Paid'?T.green:inv.status==='Overdue'?T.danger:T.teal }}>{ZAR(inv.total)}</div>
                    <div style={{ fontSize:10, color: inv.status==='Paid'?T.green:inv.status==='Overdue'?T.danger:T.gold, fontWeight:600 }}>{inv.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
