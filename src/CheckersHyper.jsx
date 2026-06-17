import { useState } from 'react'
import { ZAR, pct } from './format.js'
import { T } from './global.js'

export default function CheckersHyper() {
  const [s, setS] = useState({ stores: 15, unitsPerStoreMonth: 4, sellIn: 1350, landed: 742 })
  const F = k => e => setS(ss => ({ ...ss, [k]: parseFloat(e.target.value) || 0 }))

  const monthlyVol = s.stores * s.unitsPerStoreMonth
  const annualVol  = monthlyVol * 12
  const annualRev  = annualVol * s.sellIn
  const annualGP   = annualVol * (s.sellIn - s.landed)
  const gpPct      = s.sellIn > 0 ? ((s.sellIn - s.landed) / s.sellIn) * 100 : 0
  const containers = Math.ceil(annualVol / 1200)

  const scenarios = [
    { label: 'Pilot (5 stores)',      stores: 5,  vol: 5  * s.unitsPerStoreMonth * 12, rev: 5  * s.unitsPerStoreMonth * 12 * s.sellIn },
    { label: 'Phase 2 (15 stores)',   stores: 15, vol: 15 * s.unitsPerStoreMonth * 12, rev: 15 * s.unitsPerStoreMonth * 12 * s.sellIn },
    { label: 'Full Roll (30 stores)', stores: 30, vol: 30 * s.unitsPerStoreMonth * 12, rev: 30 * s.unitsPerStoreMonth * 12 * s.sellIn },
  ]

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Checkers Hyper</div><div className="page-subtitle">Pilot Scenario Builder</div></div>
      </div>
      <div className="page-content">
        <div className="grid-2 gap-24">
          <div>
            <div className="card mb-24">
              <div className="section-label">Scenario Inputs</div>
              <div className="flex-col gap-16">
                <div className="form-field"><label>Number of Stores</label><input type="number" value={s.stores} onChange={F('stores')} min="1" /></div>
                <div className="form-field"><label>Units per Store per Month</label><input type="number" value={s.unitsPerStoreMonth} onChange={F('unitsPerStoreMonth')} min="1" /></div>
                <div className="form-field"><label>Sell-in Price (ZAR)</label><input type="number" value={s.sellIn} onChange={F('sellIn')} /></div>
                <div className="form-field"><label>Landed Cost / Unit (ZAR)</label><input type="number" value={s.landed} onChange={F('landed')} /></div>
              </div>
            </div>
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 20px 0' }}><div className="section-label">Quick Comparison</div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Scenario</th><th>Annual Volume</th><th>Annual Revenue</th></tr></thead>
                  <tbody>
                    {scenarios.map(sc => (
                      <tr key={sc.label} style={{ background: sc.stores === s.stores ? T.goldPale : 'transparent' }}>
                        <td className="td-name">{sc.label}</td>
                        <td className="td-mono">{sc.vol.toLocaleString()} units</td>
                        <td className="td-mono">{ZAR(sc.rev)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex-col gap-16">
            <div className="scenario-output">
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.gold, fontWeight: 600 }}>Scenario Output</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: T.white, marginTop: 4 }}>{s.stores} stores · {s.unitsPerStoreMonth} units/store/month</div>
              </div>
              <div className="grid-2" style={{ marginBottom: 24 }}>
                {[
                  { label: 'Monthly Volume',      value: monthlyVol.toLocaleString() + ' units' },
                  { label: 'Annual Volume',        value: annualVol.toLocaleString() + ' units'  },
                  { label: 'Annual Revenue',       value: ZAR(annualRev) },
                  { label: 'Annual Gross Profit',  value: ZAR(annualGP)  },
                ].map(m => (
                  <div key={m.label} className="scenario-metric" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8 }}>
                    <div className="scenario-metric-value">{m.value}</div>
                    <div className="scenario-metric-label">{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Botanica Margin</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: T.goldLight }}>{pct(gpPct)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Est. Container Requirement (40ft)</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: T.goldLight }}>~{containers} / year</span>
              </div>
            </div>
            <div className="card">
              <div className="section-label">Strategic Notes</div>
              {['Checkers Hyper is a stage, not just a customer. It validates the mass-premium concept.','Pilot at 5 stores before committing to full roll-out.','Negotiate consignment or sale-or-return for the pilot phase.','Each store is a showroom for commercial and designer referrals.'].map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.beige}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.gold, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: T.textMid }}>{n}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
