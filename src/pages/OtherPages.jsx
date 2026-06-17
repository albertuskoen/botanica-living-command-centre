// ── Calculator ────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { T } from '../utils/tokens.js'
import { R2, ZAR, pct, USD } from '../utils/format.js'

export function Calculator() {
  const [c, setC] = useState({ basePrice:31, priceType:'FOB', freight:3.5, insurance:0.5, exchangeRate:18.8, duty:15, clearing:850, localTransport:350, assembly:120, pot:200, qc:80, botanicaMargin:45, retailerMargin:50, units:1 })
  const F  = k => e => setC(cc => ({ ...cc, [k]: parseFloat(e.target.value) || 0 }))
  const Fk = k => e => setC(cc => ({ ...cc, [k]: e.target.value }))

  const cifUsd  = c.basePrice + c.freight + c.insurance
  const cifZar  = cifUsd * c.exchangeRate
  const dutyZar = cifZar * (c.duty / 100)
  const perUnit = (c.clearing + c.localTransport) / (c.units > 0 ? c.units : 1)
  const landed  = cifZar + dutyZar + perUnit + c.assembly + c.pot + c.qc
  const sellIn  = landed / (1 - c.botanicaMargin / 100)
  const retail  = sellIn / (1 - c.retailerMargin / 100)
  const gp      = sellIn - landed
  const gpPct   = landed > 0 ? (gp / sellIn) * 100 : 0

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Import Calculator</div><div className="page-subtitle">Landed Cost & Pricing Model</div></div>
      </div>
      <div className="page-content">
        <div className="grid-2 gap-16">
          <div className="flex-col gap-12">
            <div className="calc-section">
              <div className="calc-section-title">Supply Price</div>
              <div className="form-grid">
                <div className="form-field"><label>Price Type</label><select value={c.priceType} onChange={Fk('priceType')}><option>EXW</option><option>FOB</option><option>CIF</option></select></div>
                <div className="form-field"><label>Price (USD)</label><input type="number" value={c.basePrice} onChange={F('basePrice')} /></div>
                <div className="form-field"><label>Freight / Unit</label><input type="number" value={c.freight} onChange={F('freight')} /></div>
                <div className="form-field"><label>Insurance / Unit</label><input type="number" value={c.insurance} onChange={F('insurance')} /></div>
              </div>
            </div>
            <div className="calc-section">
              <div className="calc-section-title">Import Costs</div>
              <div className="form-grid">
                <div className="form-field"><label>Rate (ZAR/USD)</label><input type="number" value={c.exchangeRate} onChange={F('exchangeRate')} step="0.1" /></div>
                <div className="form-field"><label>Duty %</label><input type="number" value={c.duty} onChange={F('duty')} /></div>
                <div className="form-field"><label>Clearing (ZAR total)</label><input type="number" value={c.clearing} onChange={F('clearing')} /></div>
                <div className="form-field"><label>Transport (ZAR total)</label><input type="number" value={c.localTransport} onChange={F('localTransport')} /></div>
                <div className="form-field"><label>Units in shipment</label><input type="number" value={c.units} onChange={F('units')} min="1" /></div>
              </div>
            </div>
            <div className="calc-section">
              <div className="calc-section-title">Assembly & Finishing (ZAR/unit)</div>
              <div className="form-grid">
                <div className="form-field"><label>Assembly</label><input type="number" value={c.assembly} onChange={F('assembly')} /></div>
                <div className="form-field"><label>Pot / Finishing</label><input type="number" value={c.pot} onChange={F('pot')} /></div>
                <div className="form-field"><label>QC / Handling</label><input type="number" value={c.qc} onChange={F('qc')} /></div>
              </div>
            </div>
            <div className="calc-section">
              <div className="calc-section-title">Margin Targets</div>
              <div className="form-grid">
                <div className="form-field"><label>Botanica Margin %</label><input type="number" value={c.botanicaMargin} onChange={F('botanicaMargin')} /></div>
                <div className="form-field"><label>Retailer Margin %</label><input type="number" value={c.retailerMargin} onChange={F('retailerMargin')} /></div>
              </div>
            </div>
          </div>
          <div className="flex-col gap-12">
            <div className="calc-result">
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:T.gold, fontWeight:600 }}>Results</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:3 }}>Per unit, based on inputs</div>
              </div>
              {[
                { label:'CIF Value (USD)',      value:`$${R2(cifUsd)}` },
                { label:'CIF Value (ZAR)',      value:ZAR(cifZar) },
                { label:`Duty (${c.duty}%)`,   value:ZAR(dutyZar) },
                { label:'Clearing & Transport', value:ZAR(perUnit) },
                { label:'Assembly & Finishing', value:ZAR(c.assembly+c.pot+c.qc) },
              ].map(row => (
                <div className="calc-result-row" key={row.label}>
                  <span className="calc-result-label">{row.label}</span>
                  <span className="calc-result-value">{row.value}</span>
                </div>
              ))}
              <div className="calc-result-row" style={{ borderTop:'1px solid rgba(255,255,255,0.2)', marginTop:6 }}>
                <span style={{ fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:T.goldLight, fontWeight:600 }}>Total Landed Cost</span>
                <span className="calc-result-value highlight">{ZAR(landed)}</span>
              </div>
              <div style={{ height:1, background:'rgba(255,255,255,0.1)', margin:'14px 0' }} />
              {[
                { label:`Sell-in (${c.botanicaMargin}% GM)`, value:ZAR(sellIn) },
                { label:`Retail (${c.retailerMargin}% ret.)`, value:ZAR(retail) },
                { label:'Gross Profit / unit', value:ZAR(gp) },
                { label:'Botanica Margin %', value:pct(gpPct), hi:true },
              ].map(row => (
                <div className="calc-result-row" key={row.label}>
                  <span className="calc-result-label">{row.label}</span>
                  <span className="calc-result-value" style={{ color: row.hi ? T.goldLight : T.white }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Checkers Hyper ────────────────────────────────────────────────────────────
export function CheckersHyper() {
  const [s, setS] = useState({ stores:15, unitsPerStoreMonth:4, sellIn:1350, landed:742 })
  const F = k => e => setS(ss => ({ ...ss, [k]: parseFloat(e.target.value) || 0 }))

  const mVol   = s.stores * s.unitsPerStoreMonth
  const aVol   = mVol * 12
  const aRev   = aVol * s.sellIn
  const aGP    = aVol * (s.sellIn - s.landed)
  const gpPct  = s.sellIn > 0 ? ((s.sellIn - s.landed) / s.sellIn) * 100 : 0
  const ctnrs  = Math.ceil(aVol / 1200)
  const scens  = [
    { label:'Pilot (5)',      n:5 },
    { label:'Phase 2 (15)',   n:15 },
    { label:'Full Roll (30)', n:30 },
  ]

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Checkers Hyper</div><div className="page-subtitle">Pilot Scenario Builder</div></div>
      </div>
      <div className="page-content">
        <div className="grid-2 gap-16">
          <div>
            <div className="card mb-16">
              <div className="section-label">Scenario Inputs</div>
              <div className="flex-col gap-12">
                <div className="form-field"><label>Number of Stores</label><input type="number" value={s.stores} onChange={F('stores')} min="1" /></div>
                <div className="form-field"><label>Units / Store / Month</label><input type="number" value={s.unitsPerStoreMonth} onChange={F('unitsPerStoreMonth')} min="1" /></div>
                <div className="form-field"><label>Sell-in Price (ZAR)</label><input type="number" value={s.sellIn} onChange={F('sellIn')} /></div>
                <div className="form-field"><label>Landed Cost / Unit (ZAR)</label><input type="number" value={s.landed} onChange={F('landed')} /></div>
              </div>
            </div>
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:'14px 18px 0' }}><div className="section-label">Quick Comparison</div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Scenario</th><th>Annual Vol</th><th>Annual Rev</th></tr></thead>
                  <tbody>
                    {scens.map(sc => (
                      <tr key={sc.label} style={{ background: sc.n === s.stores ? T.goldPale : 'transparent' }}>
                        <td className="td-name">{sc.label}</td>
                        <td className="td-mono">{(sc.n * s.unitsPerStoreMonth * 12).toLocaleString()}</td>
                        <td className="td-mono">{ZAR(sc.n * s.unitsPerStoreMonth * 12 * s.sellIn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="flex-col gap-12">
            <div className="scenario-output">
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:T.gold, fontWeight:600 }}>Output</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:T.white, marginTop:4 }}>{s.stores} stores · {s.unitsPerStoreMonth}/store/mo</div>
              </div>
              <div className="grid-2" style={{ marginBottom:20 }}>
                {[
                  { l:'Monthly Volume', v:mVol.toLocaleString()+' units' },
                  { l:'Annual Volume',  v:aVol.toLocaleString()+' units' },
                  { l:'Annual Revenue', v:ZAR(aRev) },
                  { l:'Annual GP',      v:ZAR(aGP) },
                ].map(m => (
                  <div key={m.l} className="scenario-metric" style={{ background:'rgba(255,255,255,0.06)', borderRadius:8 }}>
                    <div className="scenario-metric-value">{m.v}</div>
                    <div className="scenario-metric-label">{m.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Botanica Margin</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.goldLight }}>{pct(gpPct)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Est. 40ft Containers / Year</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:T.goldLight }}>~{ctnrs}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Founders Collection ───────────────────────────────────────────────────────
export function FoundersCollection({ products }) {
  const founders = products.filter(p => p.foundersCollection)
  const XR       = 18.8
  const getLanded = p => ((p.cifPrice||p.fobPrice||p.exwPrice||0)*XR)*1.33
  const getSellIn = p => getLanded(p)/(1-0.45)
  const getRetail = p => getSellIn(p)/(1-0.50)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Founders Collection</div><div className="page-subtitle">Launch Range — Premium Selection</div></div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, fontStyle:'italic', color:T.gold }}>{founders.length} products selected</div>
      </div>
      <div className="page-content">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
          {founders.map(p => (
            <div className="founder-card" key={p.id}>
              <div className="founder-card-name">{p.name}</div>
              <div className="founder-card-cat">{p.category} · {p.supplier}</div>
              <div style={{ fontSize:11, color:T.textLight }}>{p.height} · MOQ {p.moq} · {p.leadTime}</div>
              <div className="founder-metrics">
                <div className="founder-metric"><div className="founder-metric-label">Landed (est.)</div><div className="founder-metric-value">{ZAR(getLanded(p))}</div></div>
                <div className="founder-metric"><div className="founder-metric-label">Sell-in</div><div className="founder-metric-value">{ZAR(getSellIn(p))}</div></div>
                <div className="founder-metric"><div className="founder-metric-label">Est. Retail</div><div className="founder-metric-value">{ZAR(getRetail(p))}</div></div>
                <div className="founder-metric"><div className="founder-metric-label">Sample</div><div style={{ marginTop:3 }}><span className={`badge ${p.sampleStatus==='Received'?'badge-green':p.sampleStatus==='Ordered'?'badge-gold':'badge-grey'}`}>{p.sampleStatus}</span></div></div>
              </div>
            </div>
          ))}
        </div>
        {founders.length === 0 && <div className="empty-state"><div className="empty-icon">✦</div><div>No Founders Collection products. Edit products to flag them.</div></div>}
      </div>
    </div>
  )
}

// ── Strategy ──────────────────────────────────────────────────────────────────
const PILLARS = [
  { title:'Botanica Living is a premium brand, not just an importer.', body:'Every touchpoint — from product photography to assembly and delivery — must reflect luxury. We are not competing on price. We are building desire.' },
  { title:'Sell first. Scale second.', body:'Secure real orders and market validation before committing to large inventory positions. Revenue de-risks everything.' },
  { title:'Checkers Hyper is a stage, not just a customer.', body:'Retail presence in a high-footfall premium format gives brand credibility and a proving ground for SKUs. Every store is a showroom.' },
  { title:'Professional assembly and quality control are value-adds.', body:'The in-house assembly, pot finishing, and QC process is a competitive advantage that direct-from-China competitors cannot match.' },
  { title:'We sell transformed spaces and emotion — not just plants.', body:"Customers don't buy artificial plants. They buy the feeling of a lush, effortless interior. Every communication should sell the outcome, not the object." },
]

export function Strategy() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Strategy & Blueprint</div><div className="page-subtitle">Brand Principles & Commercial Direction</div></div>
      </div>
      <div className="page-content">
        <div className="quote-block">
          <div className="quote-text">"Sell first. Scale second."</div>
          <div className="quote-attr">Botanica Living Group — Founding Principle</div>
        </div>
        <div className="section-label">Brand Pillars</div>
        {PILLARS.map((p, i) => (
          <div className="strategy-pillar" key={i}>
            <div className="strategy-pillar-title">{p.title}</div>
            <div className="strategy-pillar-body">{p.body}</div>
          </div>
        ))}
        <div className="divider" />
        <div className="grid-3">
          {[
            { icon:'◎', title:'Channels', items:['Checkers Hyper (retail)','Commercial projects','Designers & architects','Hospitality','Direct consumer'] },
            { icon:'◈', title:'Operations', items:['Import via FOB/CIF','Local assembly & QC','Pot & finishing in-house','Direct fulfillment','Container optimisation'] },
            { icon:'✦', title:'Competitive Moat', items:['Premium curation','Local assembly quality','Brand storytelling','Supplier relationships','Designer community'] },
          ].map(col => (
            <div className="card" key={col.title}>
              <div style={{ fontSize:18, marginBottom:8, color:T.gold }}>{col.icon}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:T.forest, marginBottom:12 }}>{col.title}</div>
              {col.items.map(item => (
                <div key={item} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:`1px solid ${T.beige}`, fontSize:13, color:T.textMid }}>
                  <span style={{ color:T.gold }}>—</span>{item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
