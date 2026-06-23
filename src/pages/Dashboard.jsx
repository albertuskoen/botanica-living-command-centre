// Dashboard.jsx — v2.0  Live data from all modules
import { T } from '../utils/tokens.js'
import { ZAR, safeStr } from '../utils/format.js'

function clamp(n, lo, hi) { return Math.min(Math.max(n, lo), hi) }

function Ring({ score, color, size = 80, strokeW = 6 }) {
  const r   = (size - strokeW * 2) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={strokeW}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
        style={{ transition:'stroke-dashoffset 0.6s ease' }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size*0.22} fontWeight={700}
        style={{ transform:`rotate(90deg) translate(0, -${size}px)`, transformOrigin:`${size/2}px ${size/2}px` }}>
        {score}%
      </text>
    </svg>
  )
}

// Mini bar chart for expense trend
function SparkBar({ values, color }) {
  if (!values || values.length === 0) return null
  const max = Math.max(...values, 1)
  return (
    <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:32 }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex:1, background:color, borderRadius:2, height:`${Math.round((v/max)*100)}%`, minHeight:2, opacity:0.7 }}/>
      ))}
    </div>
  )
}

// Quick-action card
function QuickCard({ icon, title, sub, color, colorPale, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:'#FFFFFF', border:`1px solid rgba(210,200,184,0.5)`,
      borderRadius:14, padding:'16px 18px', cursor:'pointer',
      display:'flex', alignItems:'center', gap:14,
      transition:'box-shadow 0.15s, transform 0.15s',
      boxShadow:'0 1px 4px rgba(15,35,24,0.06)',
    }}
    onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 16px rgba(15,35,24,0.12)'; e.currentTarget.style.transform='translateY(-1px)'}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(15,35,24,0.06)'; e.currentTarget.style.transform='none'}}
    >
      <div style={{ width:40,height:40,borderRadius:10,background:colorPale,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,color }}>
        {icon}
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:600,color:T.forest,lineHeight:1.3 }}>{title}</div>
        {sub && <div style={{ fontSize:11,color:T.textMid,marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// Stat pill
function Pill({ label, value, color, colorPale }) {
  return (
    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid rgba(210,200,184,0.3)` }}>
      <span style={{ fontSize:12,color:T.textMid }}>{label}</span>
      <span style={{ fontSize:13,fontWeight:700,color,background:colorPale,padding:'2px 8px',borderRadius:20 }}>{value}</span>
    </div>
  )
}

export default function Dashboard({ suppliers, products, finance, tasks, documents, progress, clients, quotes, invoices, setPage }) {
  // ── Finance figures from live bl_finance ──────────────────────────────────
  const sf = Array.isArray(finance) ? finance : []
  const invested  = sf.filter(t=>t.type==='Owner Investment').reduce((s,t)=>s+Number(t.amount||0),0)
  const income    = sf.filter(t=>t.type==='Business Income').reduce((s,t)=>s+Number(t.amount||0),0)
  const expenses  = sf.filter(t=>t.type==='Business Expense').reduce((s,t)=>s+Number(t.amount||0),0)
  const remaining = invested - expenses
  const netPos    = income - expenses
  const expTxns   = sf.filter(t=>t.type==='Business Expense')
  const expData   = expTxns.slice(-8).map(t=>Number(t.amount||0))

  // ── Tasks from bl_tasks ────────────────────────────────────────────────────
  const st      = Array.isArray(tasks) ? tasks : []
  const openT   = st.filter(t=>t.status!=='Completed').length
  const critT   = st.filter(t=>t.priority==='Critical'&&t.status!=='Completed').length
  const doneT   = st.filter(t=>t.status==='Completed').length

  // ── Progress from bl_progress (sections with tasks) ───────────────────────
  const sp      = Array.isArray(progress) ? progress : []
  const allPT   = sp.flatMap(sec=>Array.isArray(sec?.tasks)?sec.tasks:[])
  const donePT  = allPT.filter(t=>t?.status==='Completed').length
  const inProgPT= allPT.filter(t=>t?.status==='In Progress').length

  // ── Clients ──────────────────────────────────────────────────────────────────
  const sc       = Array.isArray(clients)  ? clients  : []
  const critCl   = sc.filter(c=>c.priority==='Critical'||c.priority==='High').length
  const activeCl = sc.filter(c=>c.status==='Active Client').length

  // ── Invoicing pipeline ────────────────────────────────────────────────────
  const sq = Array.isArray(quotes)   ? quotes   : []
  const si = Array.isArray(invoices) ? invoices : []
  const openQuotes    = sq.filter(q=>q.status==='Draft'||q.status==='Sent').length
  const openInvoices  = si.filter(i=>i.status==='Sent'||i.status==='Partially Paid'||i.status==='Overdue').length
  const invoiceValue  = si.filter(i=>i.status!=='Draft').reduce((s,i)=>s+Number(i.total||0),0)

  // ── Health score — live data ──────────────────────────────────────────────
  const finScore  = invested > 0
    ? clamp(Math.round(((remaining/invested)*55)+(income>0?30:0)+15), 0, 100)
    : 20
  const taskScore = allPT.length > 0 ? clamp(Math.round((donePT/allPT.length)*100),0,100) : 30
  const bizScore  = clamp(
    (activeCl>0?20:0)+(invoiceValue>0?20:0)+(sq.length>0?15:0)+
    (Array.isArray(suppliers)&&suppliers.length>0?15:0)+(income>0?30:0),
    0,100
  )
  const healthScore = Math.round((finScore+taskScore+bizScore)/3)

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Botanica Living · Business Operating Platform</div>
        </div>
      </div>

      {/* ── Botanical hero banner ─────────────────────────────────────────── */}
      <div style={{ position:'relative',borderRadius:24,marginBottom:24,overflow:'hidden',boxShadow:'0 8px 40px rgba(15,40,20,0.18)' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'url(/bg-interior.jpg)',backgroundSize:'cover',backgroundPosition:'center 30%' }}/>
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(10,28,14,0.72) 0%,rgba(20,48,24,0.55) 45%,rgba(40,80,40,0.30) 75%,rgba(180,155,100,0.18) 100%)' }}/>
        <div style={{ position:'absolute',bottom:0,left:0,right:0,height:'40%',background:'linear-gradient(0deg,rgba(8,22,12,0.50) 0%,transparent 100%)' }}/>

        <div style={{ position:'relative',zIndex:2,padding:'28px 32px' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20 }}>
            <div style={{ display:'flex',alignItems:'center',gap:18 }}>
              <img src="/botanica-logo.png" alt="Botanica Living"
                style={{ width:72,height:72,borderRadius:12,objectFit:'contain',objectPosition:'center',background:'rgba(245,240,232,0.9)',padding:6,flexShrink:0,boxShadow:'0 4px 16px rgba(0,0,0,0.4)' }}/>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:'#E8C07A',fontWeight:300,marginBottom:4,lineHeight:1.2 }}>
                  Botanica Living (Pty) Ltd
                </div>
                <div style={{ fontSize:11,color:'rgba(255,255,255,0.45)',letterSpacing:'0.12em',marginBottom:4,textTransform:'uppercase' }}>
                  Premium Artificial Greenery
                </div>
                <div style={{ fontSize:10,color:'rgba(255,255,255,0.28)',letterSpacing:'0.06em' }}>
                  Reg: 2026/444834/07 · botanicaliving.co.za
                </div>
                <div style={{ marginTop:10,display:'flex',gap:6,flexWrap:'wrap' }}>
                  {[
                    {label:income>0?'Revenue':'Pre-Revenue',bg:'rgba(21,128,61,0.3)',color:'#6EE8A0'},
                    {label:`${(Array.isArray(suppliers)?suppliers:[]).filter(s=>s.status==='Active').length} Suppliers`,bg:'rgba(14,116,144,0.3)',color:'#67E8F9'},
                    {label:`${sc.length} Prospects`,bg:'rgba(184,151,90,0.3)',color:'#E8C07A'},
                  ].map(b=>(
                    <span key={b.label} style={{ fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:b.bg,color:b.color,letterSpacing:'0.08em' }}>
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* Health ring */}
            <div style={{ textAlign:'center' }}>
              <Ring score={healthScore} color={healthScore>=70?'#E8C07A':healthScore>=40?'#67E8F9':'#F87171'} size={92} strokeW={7}/>
              <div style={{ fontSize:9,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(255,255,255,0.28)',marginTop:8,fontWeight:600 }}>
                Business Health
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content" style={{ display:'flex',flexDirection:'column',gap:20 }}>

        {/* ── Finance KPI row ─────────────────────────────────────────────── */}
        <div className="grid-5">
          {[
            { label:'Owner Investment', value:ZAR(invested), color:T.teal,    bg:T.tealPale,  page:'finance' },
            { label:'Cash Position',    value:ZAR(remaining),color:remaining>=0?T.gold:T.danger, bg:remaining>=0?T.goldPale:T.redPale, page:'finance' },
            { label:'Business Income',  value:ZAR(income),  color:T.green,   bg:T.greenPale, page:'finance' },
            { label:'Total Expenses',   value:ZAR(expenses), color:T.red,    bg:T.redPale,   page:'finance' },
            { label:'Net Position',     value:ZAR(netPos),  color:netPos>=0?T.forestLight:T.danger, bg:netPos>=0?T.greenPale:T.redPale, page:'finance' },
          ].map(k=>(
            <div key={k.label} className="stat-card" onClick={()=>setPage(k.page)} style={{ cursor:'pointer' }}>
              <div className="stat-label">{k.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:k.color,lineHeight:1,marginTop:4,fontWeight:600 }}>{k.value}</div>
              {k.label==='Total Expenses' && expData.length>0 && (
                <div style={{ marginTop:8 }}><SparkBar values={expData} color={T.red}/></div>
              )}
            </div>
          ))}
        </div>

        {/* ── Quick actions ────────────────────────────────────────────────── */}
        <div>
          <div className="sec-label">Quick Actions</div>
          <div className="grid-4">
            <QuickCard icon="+" title="Add Transaction" sub="Finance Centre" color={T.teal} colorPale={T.tealPale} onClick={()=>setPage('finance')} />
            <QuickCard icon="◎" title="Supplier Zone" sub={`${(Array.isArray(suppliers)?suppliers:[]).length} suppliers`} color={T.green} colorPale={T.greenPale} onClick={()=>setPage('supplierzone')} />
            <QuickCard icon="◉" title="Client Database" sub={`${sc.length} organisations`} color={T.teal} colorPale={T.tealPale} onClick={()=>setPage('clients')} />
            <QuickCard icon="⊞" title="Create Quote" sub="Invoicing" color={T.gold} colorPale={T.goldPale} onClick={()=>setPage('financialhub')} />
          </div>
        </div>

        {/* ── Three column info cards ──────────────────────────────────────── */}
        <div className="grid-3">

          {/* Finance snapshot */}
          <div className="g-card">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.forest }}>Finance Centre</div>
              <button className="btn btn-ghost btn-xs" style={{ color:T.gold }} onClick={()=>setPage('finance')}>Open →</button>
            </div>
            <Pill label="Owner Investment" value={ZAR(invested)} color={T.teal} colorPale={T.tealPale} />
            <Pill label="Total Expenses"   value={ZAR(expenses)} color={T.red}  colorPale={T.redPale}  />
            <Pill label="Transactions"     value={sf.length}     color={T.textMid} colorPale="rgba(161,161,170,0.1)" />
            <Pill label="Documents"        value={(Array.isArray(documents)?documents:[]).length} color={T.teal} colorPale={T.tealPale} />
          </div>

          {/* Business Progress */}
          <div className="g-card" style={{ cursor:'pointer' }} onClick={()=>setPage('progress')}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.forest }}>Business Progress</div>
              <span style={{ fontSize:11,color:T.gold }}>View →</span>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:T.green,lineHeight:1 }}>{donePT}</div>
                <div style={{ fontSize:10,color:T.textMid,textTransform:'uppercase',letterSpacing:'0.1em' }}>Done</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:T.gold,lineHeight:1 }}>{inProgPT}</div>
                <div style={{ fontSize:10,color:T.textMid,textTransform:'uppercase',letterSpacing:'0.1em' }}>In Progress</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:T.textLight,lineHeight:1 }}>{allPT.length-donePT-inProgPT}</div>
                <div style={{ fontSize:10,color:T.textMid,textTransform:'uppercase',letterSpacing:'0.1em' }}>Pending</div>
              </div>
            </div>
            {allPT.length>0 && (
              <div style={{ background:'rgba(210,200,184,0.3)',borderRadius:99,height:6,overflow:'hidden' }}>
                <div style={{ height:'100%',background:T.green,borderRadius:99,width:`${Math.round(donePT/allPT.length*100)}%`,transition:'width 0.6s' }}/>
              </div>
            )}
            <div style={{ fontSize:11,color:T.textLight,marginTop:6,textAlign:'center' }}>
              {allPT.length} roadmap tasks across {sp.length} sections
            </div>
          </div>

          {/* Invoicing pipeline */}
          <div className="g-card">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.forest }}>Invoicing Pipeline</div>
              <button className="btn btn-ghost btn-xs" style={{ color:T.gold }} onClick={()=>setPage('financialhub')}>Open →</button>
            </div>
            <Pill label="Open Quotes"    value={openQuotes}   color={T.teal} colorPale={T.tealPale} />
            <Pill label="Open Invoices"  value={openInvoices} color={openInvoices>0?T.danger:T.green} colorPale={openInvoices>0?T.redPale:T.greenPale} />
            <Pill label="Invoice Value"  value={ZAR(invoiceValue)} color={T.gold} colorPale={T.goldPale} />
            <div style={{ marginTop:10,fontSize:12,color:T.textMid,lineHeight:1.6 }}>
              {sq.length===0&&si.length===0
                ? 'No quotes or invoices yet. Create your first quote in Invoicing.'
                : `${sq.length} total quotes · ${si.length} total invoices`}
            </div>
          </div>
        </div>

        {/* ── Bottom row ───────────────────────────────────────────────────── */}
        <div className="grid-3">

          {/* Client highlights */}
          <div className="g-card">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.forest }}>Client Database</div>
              <button className="btn btn-ghost btn-xs" style={{ color:T.gold }} onClick={()=>setPage('clients')}>View all →</button>
            </div>
            {sc.slice(0,4).map(cl=>(
              <div key={cl.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid rgba(210,200,184,0.3)` }}>
                <div>
                  <div style={{ fontSize:12,fontWeight:600,color:T.forest }}>{safeStr(cl.company)}</div>
                  <div style={{ fontSize:10,color:T.textMid }}>{cl.sector}</div>
                </div>
                <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,
                  background:cl.priority==='Critical'?T.redPale:cl.priority==='High'?T.goldPale:'rgba(161,161,170,0.1)',
                  color:cl.priority==='Critical'?T.danger:cl.priority==='High'?T.gold:T.textMid }}>
                  {cl.priority}
                </span>
              </div>
            ))}
            {sc.length>4 && <div style={{ fontSize:11,color:T.textLight,marginTop:8,textAlign:'center' }}>+{sc.length-4} more organisations</div>}
            {sc.length===0 && <div style={{ fontSize:12,color:T.textMid }}>No clients yet. Add your first prospect.</div>}
          </div>

          {/* Action Centre tasks */}
          <div className="g-card">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.forest }}>Action Centre</div>
              <button className="btn btn-ghost btn-xs" style={{ color:T.gold }} onClick={()=>setPage('actions')}>Open →</button>
            </div>
            {critT>0 && (
              <div style={{ padding:'8px 12px',background:T.redPale,border:`1px solid rgba(185,28,28,0.2)`,borderRadius:8,fontSize:12,color:T.danger,marginBottom:10,fontWeight:600 }}>
                ⚠ {critT} critical task{critT!==1?'s':''} need attention
              </div>
            )}
            <Pill label="Open Tasks"    value={openT}  color={T.gold}  colorPale={T.goldPale}  />
            <Pill label="Completed"     value={doneT}  color={T.green} colorPale={T.greenPale} />
            {st.filter(t=>t.status!=='Completed').slice(0,2).map(t=>(
              <div key={t.id} style={{ padding:'5px 0',borderBottom:`1px solid rgba(210,200,184,0.25)`,fontSize:12,color:T.textMid }}>
                <span style={{ color:t.priority==='Critical'?T.danger:t.priority==='High'?T.gold:T.textMid,marginRight:6 }}>●</span>
                {safeStr(t.name).slice(0,45)}
              </div>
            ))}
          </div>

          {/* Supplier snapshot */}
          <div className="g-card">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.forest }}>Supplier Zone</div>
              <button className="btn btn-ghost btn-xs" style={{ color:T.gold }} onClick={()=>setPage('supplierzone')}>View all →</button>
            </div>
            {(Array.isArray(suppliers)?suppliers:[]).slice(0,3).map(s=>(
              <div key={s.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid rgba(210,200,184,0.3)` }}>
                <div>
                  <div style={{ fontSize:12,fontWeight:600,color:T.forest }}>{safeStr(s.name)}</div>
                  <div style={{ fontSize:10,color:T.textMid }}>{s.country} · {s.terms}</div>
                </div>
                <span style={{ fontSize:10,fontWeight:600,color:s.status==='Active'?T.green:T.textMid }}>{s.status}</span>
              </div>
            ))}
            <Pill label="Products in database" value={(Array.isArray(products)?products:[]).length} color={T.teal} colorPale={T.tealPale} />
          </div>
        </div>

      </div>
    </div>
  )
}
