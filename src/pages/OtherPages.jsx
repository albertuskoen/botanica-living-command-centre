// OtherPages.jsx — Bug 2 (Incoterms), Bug 3 (smart number inputs), Founders, Strategy
import { useState } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, USD, pct, parseNum } from '../utils/format.js'

// ── Smart number text field ─────────────────────────────────────────────────────
// Bug 3: controlled text input, parses to number only on calculation, no forced zero
function NumField({ label, value, onChange, prefix, suffix, disabled, hint }) {
  return (
    <div className="form-field">
      <label style={{ opacity: disabled ? 0.4 : 1 }}>
        {label}
        {suffix && <span style={{ color:T.textLight, fontWeight:400, letterSpacing:0, textTransform:'none' }}> ({suffix})</span>}
      </label>
      <div style={{ position:'relative' }}>
        {prefix && <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:12, color:T.textMid, pointerEvents:'none' }}>{prefix}</span>}
        <input
          type="text" inputMode="decimal"
          value={value} onChange={e => onChange(e.target.value)}
          disabled={disabled} placeholder="0"
          style={{ paddingLeft: prefix ? 28 : undefined, opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : undefined, background: disabled ? 'rgba(228,221,208,0.3)' : undefined }}
        />
      </div>
      {hint && !disabled && <div style={{ fontSize:10, color:T.gold, marginTop:2 }}>{hint}</div>}
    </div>
  )
}

// hook: raw string + setter + parsed number
function useField(init) {
  const [raw, set] = useState(String(init === 0 ? '' : init))
  return [raw, set, parseNum(raw)]
}

// ── Incoterm definitions ────────────────────────────────────────────────────────
const INCOTERMS = {
  EXW: {
    label: 'EXW — Ex Works',
    included: 'Product cost at factory gate only.',
    excluded: 'Factory→port transport, export handling, freight, insurance, duty, clearing, local transport, assembly, finishing, QC',
    showLocalChina: true, showFreight: true, showInsurance: true,
  },
  FOB: {
    label: 'FOB — Free On Board',
    included: 'Product + factory→port transport + export handling. Loaded on vessel.',
    excluded: 'Freight, insurance, duty, clearing, local transport, assembly, finishing, QC',
    showLocalChina: false, showFreight: true, showInsurance: true,
  },
  CIF: {
    label: 'CIF — Cost, Insurance & Freight',
    included: 'Product + freight + insurance to destination port.',
    excluded: 'Duty, clearing, local transport, assembly, finishing, QC',
    showLocalChina: false, showFreight: false, showInsurance: false,
  },
}

// ── CALCULATOR ──────────────────────────────────────────────────────────────────
export function Calculator() {
  const [term, setTerm] = useState('FOB')
  const [baseRaw,     setBaseRaw,     base]     = useField(31)
  const [chinaRaw,    setChinaRaw,    china]    = useField(2)
  const [freightRaw,  setFreightRaw,  freight]  = useField(3.5)
  const [insureRaw,   setInsureRaw,   insure]   = useField(0.5)
  const [xrRaw,       setXrRaw,       xr]       = useField(18.8)
  const [dutyRaw,     setDutyRaw,     duty]     = useField(15)
  const [clearRaw,    setClearRaw,    clear]     = useField(850)
  const [ltRaw,       setLtRaw,       lt]       = useField(350)
  const [unitsRaw,    setUnitsRaw,    units]     = useField(1)
  const [assemblyRaw, setAssemblyRaw, assembly]  = useField(120)
  const [potRaw,      setPotRaw,      pot]       = useField(200)
  const [qcRaw,       setQcRaw,       qc]        = useField(80)
  const [bmRaw,       setBmRaw,       bm]        = useField(45)
  const [rmRaw,       setRmRaw,       rm]        = useField(50)

  const info = INCOTERMS[term]

  // CIF equivalent in USD
  let cifUsd = base
  if (term === 'EXW') cifUsd = base + china + freight + insure
  if (term === 'FOB') cifUsd = base + freight + insure
  // CIF: cifUsd = base (freight+insurance already in price)

  const cifZar   = cifUsd * xr
  const dutyZar  = cifZar * (duty / 100)
  const safeU    = Math.max(1, units)
  const clearPU  = (clear + lt) / safeU
  const finishPU = assembly + pot + qc
  const landed   = cifZar + dutyZar + clearPU + finishPU
  const sellIn   = bm < 100 ? landed / (1 - bm / 100) : landed
  const retail   = rm < 100 ? sellIn / (1 - rm / 100) : sellIn
  const gp       = sellIn - landed
  const gpPct    = landed > 0 ? (gp / sellIn) * 100 : 0

  // Comparison: same base price, different terms
  const compRows = ['EXW','FOB','CIF'].map(t => {
    const addUsd = t==='EXW' ? china+freight+insure : t==='FOB' ? freight+insure : 0
    const c = (base + addUsd) * xr
    const d = c * (duty/100)
    const l = c + d + clearPU + finishPU
    return { t, landed:l }
  })

  const RRow = ({ label, value, bold, gold }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize:12, color: gold ? T.goldBright : 'rgba(255,255,255,0.52)' }}>{label}</span>
      <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize: bold ? 24 : 19, color: gold ? T.white : T.goldBright }}>{value}</span>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Import Calculator</div><div className="page-subtitle">Incoterm-Aware Landed Cost & Pricing Model</div></div>
      </div>
      <div className="page-content">
        {/* Incoterm selector */}
        <div className="g-card" style={{ marginBottom:20 }}>
          <div className="sec-label">Incoterm — Select Your Supplier Pricing Basis</div>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            {['EXW','FOB','CIF'].map(t => (
              <button key={t} className={`btn ${term===t?'btn-primary':'btn-outline'}`} style={{ flex:1 }} onClick={() => setTerm(t)}>{t}</button>
            ))}
          </div>
          <div style={{ background:'rgba(228,221,208,0.4)', borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontWeight:700, fontSize:13, color:T.forest, marginBottom:6 }}>{info.label}</div>
            <div style={{ fontSize:12, color:T.textMid, marginBottom:4 }}>
              <span style={{ fontWeight:700, color:T.green }}>✓ Included: </span>{info.included}
            </div>
            <div style={{ fontSize:12, color:T.textMid }}>
              <span style={{ fontWeight:700, color:T.red }}>+ You add: </span>{info.excluded}
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ gap:20 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="calc-section">
              <div className="calc-stitle">Supplier Price</div>
              <div className="form-grid">
                <NumField label="Supplier Price" value={baseRaw} onChange={setBaseRaw} suffix="USD" />
                <NumField label="Exchange Rate" value={xrRaw} onChange={setXrRaw} suffix="ZAR/USD" />
              </div>
            </div>

            {info.showLocalChina && (
              <div className="calc-section" style={{ border:'1.5px solid rgba(184,151,90,0.28)' }}>
                <div className="calc-stitle" style={{ color:T.gold }}>EXW Only — China Local Costs (add these yourself)</div>
                <div className="form-grid">
                  <NumField label="Factory → Port Transport" value={chinaRaw} onChange={setChinaRaw} suffix="USD/unit" hint="Truck from factory to export port" />
                </div>
              </div>
            )}

            <div className="calc-section" style={{ opacity: !info.showFreight ? 0.42 : 1 }}>
              <div className="calc-stitle">
                {info.showFreight ? 'Ocean Freight & Insurance (add these)' : 'Freight & Insurance — already in CIF price ✓'}
              </div>
              <div className="form-grid">
                <NumField label="Ocean Freight" value={freightRaw} onChange={setFreightRaw} suffix="USD/unit" disabled={!info.showFreight} hint={info.showFreight ? 'Sea freight from China to SA' : undefined} />
                <NumField label="Insurance" value={insureRaw} onChange={setInsureRaw} suffix="USD/unit" disabled={!info.showInsurance} />
              </div>
            </div>

            <div className="calc-section">
              <div className="calc-stitle">SA Import Costs — always apply</div>
              <div className="form-grid">
                <NumField label="Customs Duty" value={dutyRaw} onChange={setDutyRaw} suffix="%" hint="Applied to CIF value in ZAR" />
                <NumField label="Clearing Agent" value={clearRaw} onChange={setClearRaw} suffix="ZAR total" />
                <NumField label="Local Transport" value={ltRaw} onChange={setLtRaw} suffix="ZAR total" />
                <NumField label="Units in Shipment" value={unitsRaw} onChange={setUnitsRaw} hint="Clearing & transport shared across all units" />
              </div>
            </div>

            <div className="calc-section">
              <div className="calc-stitle">Assembly & Finishing — per unit (ZAR)</div>
              <div className="form-grid">
                <NumField label="Assembly" value={assemblyRaw} onChange={setAssemblyRaw} />
                <NumField label="Pot / Finishing" value={potRaw} onChange={setPotRaw} />
                <NumField label="QC / Handling" value={qcRaw} onChange={setQcRaw} />
              </div>
            </div>

            <div className="calc-section">
              <div className="calc-stitle">Margin Targets</div>
              <div className="form-grid">
                <NumField label="Botanica Margin" value={bmRaw} onChange={setBmRaw} suffix="%" />
                <NumField label="Retailer Margin" value={rmRaw} onChange={setRmRaw} suffix="%" />
              </div>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="calc-result">
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9, letterSpacing:'0.24em', textTransform:'uppercase', color:T.gold, fontWeight:700 }}>Results · {term}</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, color:'rgba(255,255,255,0.36)', marginTop:3 }}>Per unit · based on inputs</div>
              </div>
              <RRow label={`Supplier Price (${term})`} value={USD(base)} />
              {term==='EXW' && <RRow label="+ China Local" value={USD(china)} />}
              {info.showFreight && <RRow label="+ Ocean Freight" value={USD(freight)} />}
              {info.showInsurance && <RRow label="+ Insurance" value={USD(insure)} />}
              <RRow label="= CIF Equivalent (USD)" value={USD(cifUsd)} />
              <RRow label={`  × ${xr} ZAR/USD`} value={ZAR(cifZar)} />
              <RRow label={`+ Customs Duty ${duty}%`} value={ZAR(dutyZar)} />
              <RRow label="+ Clearing & Transport / unit" value={ZAR(clearPU)} />
              <RRow label="+ Assembly & Finishing" value={ZAR(finishPU)} />
              <div style={{ height:1, background:'rgba(255,255,255,0.14)', margin:'10px 0' }} />
              <RRow label="TOTAL LANDED COST" value={ZAR(landed)} bold gold />
              <div style={{ height:1, background:'rgba(255,255,255,0.08)', margin:'10px 0' }} />
              <RRow label={`Sell-in to Retailer (${bm}% GM)`} value={ZAR(sellIn)} />
              <RRow label={`Est. Retail Price (${rm}% ret.)`} value={ZAR(retail)} />
              <RRow label="Gross Profit / unit" value={ZAR(gp)} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'8px 0' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.52)' }}>Botanica Margin %</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, color: gpPct>30?'#6EE8A0':T.goldBright }}>{pct(gpPct)}</span>
              </div>
            </div>

            {/* Waterfall */}
            <div className="g-card">
              <div className="sec-label">Pricing Waterfall</div>
              {[
                { label:'Supplier Price (converted)',  val:ZAR(base*xr) },
                { label:'+ Import Additions',          val:ZAR((cifUsd-base)*xr) },
                { label:'+ Duty',                      val:ZAR(dutyZar) },
                { label:'+ Clearing & Transport',      val:ZAR(clearPU) },
                { label:'+ Assembly & Finishing',      val:ZAR(finishPU) },
                { label:'= Landed Cost',               val:ZAR(landed), bold:true },
                { label:'↳ Sell-in',                   val:ZAR(sellIn), note:`${bm}% GM`, bold:true },
                { label:'↳ Retail Price',              val:ZAR(retail), note:`${rm}% ret.`, bold:true },
              ].map((r,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid rgba(210,200,184,0.3)` }}>
                  <span style={{ fontSize:12, color:r.bold?T.forest:T.textMid, fontWeight:r.bold?700:400 }}>{r.label}</span>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    {r.note && <span style={{ fontSize:10, color:T.gold, fontWeight:600 }}>{r.note}</span>}
                    <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:r.bold?T.forest:T.textMid }}>{r.val}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Incoterm comparison */}
            <div className="g-card">
              <div className="sec-label">Incoterm Comparison — Same Base Price</div>
              <div style={{ fontSize:12, color:T.textMid, marginBottom:12 }}>How much would your landed cost differ if the incoterm changed?</div>
              {compRows.map(r => (
                <div key={r.t} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', marginBottom:4, borderRadius:8, background: r.t===term ? 'rgba(184,151,90,0.1)' : 'rgba(228,221,208,0.3)', border: r.t===term ? `1px solid rgba(184,151,90,0.2)` : '1px solid transparent' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:r.t===term?T.forest:T.textMid }}>{r.t} {r.t===term && <span style={{ color:T.gold }}>← current</span>}</div>
                    <div style={{ fontSize:10, color:T.textLight }}>
                      {r.t==='EXW' ? 'All logistics your responsibility' : r.t==='FOB' ? 'Port to port your cost' : 'Freight & insurance included'}
                    </div>
                  </div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:r.t===term?T.forest:T.textMid }}>{ZAR(r.landed)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CHECKERS HYPER — Bug 3 fix ──────────────────────────────────────────────────
export function CheckersHyper() {
  const [storesRaw, setStoresRaw, stores]  = useField(15)
  const [upsmRaw,   setUpsmRaw,   upsm]    = useField(4)
  const [sellInRaw, setSellInRaw, sellIn]  = useField(1350)
  const [landedRaw, setLandedRaw, landed]  = useField(742)

  const mVol  = stores * upsm
  const aVol  = mVol * 12
  const aRev  = aVol * sellIn
  const aGP   = aVol * (sellIn - landed)
  const gpPct = sellIn > 0 ? ((sellIn - landed) / sellIn) * 100 : 0
  const ctnrs = Math.ceil(aVol / 1200)

  const scens = [5,15,30].map(n => ({
    n, label: n===5?'Pilot (5 stores)':n===15?'Phase 2 (15 stores)':'Full Roll (30 stores)',
    vol: n*upsm*12, rev: n*upsm*12*sellIn,
  }))

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Checkers Hyper</div><div className="page-subtitle">Pilot Scenario Builder</div></div>
      </div>
      <div className="page-content">
        <div className="grid-2" style={{ gap:20 }}>
          <div>
            <div className="g-card" style={{ marginBottom:16 }}>
              <div className="sec-label">Scenario Inputs</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <NumField label="Number of Stores" value={storesRaw} onChange={setStoresRaw} />
                <NumField label="Units per Store per Month" value={upsmRaw} onChange={setUpsmRaw} />
                <NumField label="Sell-in Price to Retailer" value={sellInRaw} onChange={setSellInRaw} prefix="R" />
                <NumField label="Landed Cost per Unit" value={landedRaw} onChange={setLandedRaw} prefix="R" />
              </div>
            </div>
            <div className="g-card" style={{ padding:0 }}>
              <div style={{ padding:'16px 20px 0' }}><div className="sec-label">Quick Comparison</div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Scenario</th><th>Annual Volume</th><th>Annual Revenue</th></tr></thead>
                  <tbody>
                    {scens.map(sc => (
                      <tr key={sc.n} style={{ background: sc.n===stores ? 'rgba(184,151,90,0.08)' : undefined }}>
                        <td className="td-name">{sc.label}</td>
                        <td className="td-num">{sc.vol.toLocaleString()} units</td>
                        <td className="td-num">{ZAR(sc.rev)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="scenario-out">
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:9, letterSpacing:'0.24em', textTransform:'uppercase', color:T.gold, fontWeight:700 }}>Scenario Output</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.white, marginTop:4 }}>{stores} stores · {upsm} units/store/month</div>
              </div>
              <div className="grid-2" style={{ marginBottom:20 }}>
                {[
                  { l:'Monthly Volume', v:mVol.toLocaleString()+' units' },
                  { l:'Annual Volume',  v:aVol.toLocaleString()+' units' },
                  { l:'Annual Revenue', v:ZAR(aRev) },
                  { l:'Annual GP',      v:ZAR(aGP) },
                ].map(m => (
                  <div key={m.l} className="sc-metric" style={{ background:'rgba(255,255,255,0.06)', borderRadius:8 }}>
                    <div className="sc-val">{m.v}</div>
                    <div className="sc-lbl">{m.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }}>Botanica Margin</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:T.goldBright }}>{pct(gpPct)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }}>Est. 40ft Containers / Year</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:T.goldBright }}>~{ctnrs}</span>
              </div>
            </div>
            <div className="g-card">
              <div className="sec-label">Strategic Notes</div>
              {['Checkers Hyper is a stage, not just a customer. It validates the mass-premium concept.',
                'Pilot at 5 stores before committing to full roll-out.',
                'Negotiate consignment or sale-or-return for the pilot phase.',
                'Each store is a showroom for commercial and designer referrals.',
              ].map((n,i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:`1px solid rgba(210,200,184,0.3)` }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:T.gold, marginTop:7, flexShrink:0 }} />
                  <div style={{ fontSize:13, color:T.textMid }}>{n}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FOUNDERS COLLECTION ──────────────────────────────────────────────────────────
export function FoundersCollection({ products }) {
  const founders = products.filter(p => p.foundersCollection)
  const XR = 18.8
  const gl = p => ((p.cifPrice||p.fobPrice||p.exwPrice||0)*XR)*1.33
  const gs = p => gl(p)/(1-0.45)
  const gr = p => gs(p)/(1-0.50)
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Founders Collection</div><div className="page-subtitle">Launch Range — Premium Selection</div></div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, fontStyle:'italic', color:T.gold }}>{founders.length} products</div>
      </div>
      <div className="page-content">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
          {founders.map(p => (
            <div className="fc-card" key={p.id}>
              <div className="fc-name">{p.name}</div>
              <div className="fc-cat">{p.category} · {p.supplier}</div>
              <div style={{ fontSize:11, color:T.textLight }}>{p.height} · MOQ {p.moq} · {p.leadTime}</div>
              <div className="fc-metrics">
                <div className="fc-metric"><div className="fc-mlabel">Landed (est.)</div><div className="fc-mvalue">{ZAR(gl(p))}</div></div>
                <div className="fc-metric"><div className="fc-mlabel">Sell-in</div><div className="fc-mvalue">{ZAR(gs(p))}</div></div>
                <div className="fc-metric"><div className="fc-mlabel">Est. Retail</div><div className="fc-mvalue">{ZAR(gr(p))}</div></div>
                <div className="fc-metric">
                  <div className="fc-mlabel">Sample</div>
                  <div style={{ marginTop:3 }}><span className={`badge ${p.sampleStatus==='Received'?'badge-forest':p.sampleStatus==='Ordered'?'badge-gold':'badge-grey'}`}>{p.sampleStatus}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {founders.length===0 && <div className="empty-st"><div className="empty-ic">✦</div><div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.forest }}>No Founders Collection products.</div><div style={{ fontSize:13, color:T.textMid, marginTop:6 }}>Edit any product and enable the Founders Collection flag.</div></div>}
      </div>
    </div>
  )
}

// ── STRATEGY ──────────────────────────────────────────────────────────────────────
const PILLARS = [
  { title:'Botanica Living is a premium brand, not just an importer.', body:'Every touchpoint must reflect luxury. We are not competing on price. We are building desire.' },
  { title:'Sell first. Scale second.', body:'Secure real orders before committing to large inventory. Revenue de-risks everything.' },
  { title:'Checkers Hyper is a stage, not just a customer.', body:'Every store is a showroom generating pull for designers, hospitality, and direct channels.' },
  { title:'Professional assembly and quality control are value-adds.', body:'Local assembly and QC is a competitive advantage that justifies the premium sell-in price.' },
  { title:'We sell transformed spaces — not just plants.', body:"Customers buy the feeling of a lush, effortless interior. Sell the outcome, not the object." },
]
export function Strategy() {
  const [tab, setTab] = useState('pillars')
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Strategy</div>
          <div className="page-subtitle">Long Term Opportunities · Brand Pillars · Growth Planning</div>
        </div>
      </div>
      <div className="page-content">
        <div className="tabs">
          {[{id:'pillars',label:'Brand Pillars'},{id:'opportunities',label:'Long Term Opportunities'},{id:'channels',label:'Channels & Operations'}].map(t=>(
            <div key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        {tab==='pillars' && (
          <>
            <div className="quote-block"><div className="quote-text">Designed for Life. Inspired by Nature.</div><div className="quote-attr">Botanica Living — Brand Tagline</div></div>
            <div className="sec-label">Brand Pillars</div>
            {PILLARS.map((p,i) => (
              <div className="strategy-pillar" key={i}>
                <div className="sp-title">{p.title}</div>
                <div className="sp-body">{p.body}</div>
              </div>
            ))}
          </>
        )}

        {tab==='opportunities' && (
          <div>
            <div className="sec-label">Long Term Opportunities</div>
            {[
              { icon:'⊟', title:'Checkers Hyper — Shop-in-Shop', priority:'Critical',
                body:'Anchor retail opportunity. Premium artificial greenery branded shop-in-shop concept for Checkers Hyper stores nationally. Requires: pitch deck, pilot proposal, buyer contact in Non-Foods/Home category at Shoprite Holdings.',
                actions:['Build pitch deck','Model pilot financials','Identify category buyer contact','Submit pilot proposal'] },
              { icon:'◉', title:'Healthcare Network Rollout', priority:'High',
                body:'Mediclinic, Netcare and Life Healthcare represent recurring high-volume opportunities for reception, corridor and waiting area greenery. Low maintenance requirement is a key advantage over live plants.',
                actions:['Create healthcare-specific product selection','Identify facilities management contacts','Build B2B pricing structure'] },
              { icon:'✦', title:'Property Sector Partnerships', priority:'High',
                body:'Growthpoint, Redefine and Attacq manage large office and retail portfolios. Facilities management departments control interior greening budgets. Annual or biennial replacement cycles create recurring revenue.',
                actions:['Contact facilities management at Growthpoint','Build commercial project case study','Create volume pricing proposal'] },
              { icon:'◈', title:'Designer & Architect Community', priority:'Medium',
                body:'Interior designers and architects specify products for commercial and residential projects. Trade programme with trade pricing, sample room access and co-branding opportunities.',
                actions:['Launch trade programme','Create trade lookbook','Establish designer pricing tier'] },
            ].map(opp => (
              <div key={opp.title} className="g-card" style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <span style={{fontSize:20,color:T.gold}}>{opp.icon}</span>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.forest}}>{opp.title}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20,
                    background:opp.priority==='Critical'?T.redPale:opp.priority==='High'?T.goldPale:'rgba(161,161,170,0.1)',
                    color:opp.priority==='Critical'?T.danger:opp.priority==='High'?T.gold:T.textMid}}>
                    {opp.priority}
                  </span>
                </div>
                <div style={{fontSize:13,color:T.textMid,lineHeight:1.7,marginBottom:12}}>{opp.body}</div>
                <div className="sec-label" style={{fontSize:9,marginBottom:6}}>Actions required</div>
                {opp.actions.map(a=>(
                  <div key={a} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:`1px solid rgba(210,200,184,0.25)`,fontSize:12,color:T.textMid}}>
                    <span style={{color:T.gold,flexShrink:0}}>→</span>{a}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab==='channels' && (
          <div className="grid-3">
            {[
              { icon:'◎', title:'Sales Channels',   items:['Checkers Hyper (anchor retail)','Commercial projects','Designers & architects','Hospitality','Healthcare & education','Direct consumer'] },
              { icon:'◈', title:'Operations',        items:['Import via FOB/CIF','Local assembly & QC (Paarl)','Pot & finishing in-house','Direct fulfillment','Container optimisation'] },
              { icon:'✦', title:'Competitive Moat',  items:['Premium curation & brand','Local assembly quality','Botanica Living story','Supplier relationships','Designer community access'] },
            ].map(col => (
              <div className="g-card" key={col.title}>
                <div style={{fontSize:18,marginBottom:8,color:T.gold}}>{col.icon}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.forest,marginBottom:12}}>{col.title}</div>
                {col.items.map(item => (
                  <div key={item} style={{display:'flex',gap:8,padding:'6px 0',borderBottom:`1px solid rgba(210,200,184,0.3)`,fontSize:13,color:T.textMid}}>
                    <span style={{color:T.gold}}>—</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
