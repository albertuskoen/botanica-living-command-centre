import { useState } from 'react'
import { R, ZAR, pct } from './format.js'
import { T } from './global.js'

export default function Calculator() {
  const [c, setC] = useState({ basePrice: 31, priceType: 'FOB', freight: 3.5, insurance: 0.5, exchangeRate: 18.8, duty: 15, clearing: 850, localTransport: 350, assembly: 120, pot: 200, qc: 80, botanicaMargin: 45, retailerMargin: 50, units: 1 })
  const F  = k => e => setC(cc => ({ ...cc, [k]: parseFloat(e.target.value) || 0 }))
  const Fk = k => e => setC(cc => ({ ...cc, [k]: e.target.value }))

  const cifUsd   = c.basePrice + c.freight + c.insurance
  const cifZar   = cifUsd * c.exchangeRate
  const dutyZar  = cifZar * (c.duty / 100)
  const perUnit  = (c.clearing + c.localTransport) / (c.units > 0 ? c.units : 1)
  const landed   = cifZar + dutyZar + perUnit + c.assembly + c.pot + c.qc
  const sellIn   = landed / (1 - c.botanicaMargin / 100)
  const retail   = sellIn / (1 - c.retailerMargin / 100)
  const gp       = sellIn - landed
  const gpPct    = landed > 0 ? (gp / sellIn) * 100 : 0

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Import Calculator</div><div className="page-subtitle">Landed Cost & Pricing Model</div></div>
      </div>
      <div className="page-content">
        <div className="grid-2 gap-24">
          <div className="flex-col gap-16">
            <div className="calc-section">
              <div className="calc-section-title">Supply Price</div>
              <div className="form-grid">
                <div className="form-field"><label>Price Type</label><select value={c.priceType} onChange={Fk('priceType')}><option>EXW</option><option>FOB</option><option>CIF</option></select></div>
                <div className="form-field"><label>Price (USD)</label><input type="number" value={c.basePrice} onChange={F('basePrice')} /></div>
                <div className="form-field"><label>Freight / Unit (USD)</label><input type="number" value={c.freight} onChange={F('freight')} /></div>
                <div className="form-field"><label>Insurance / Unit (USD)</label><input type="number" value={c.insurance} onChange={F('insurance')} /></div>
              </div>
            </div>
            <div className="calc-section">
              <div className="calc-section-title">Import Costs</div>
              <div className="form-grid">
                <div className="form-field"><label>Exchange Rate (ZAR/USD)</label><input type="number" value={c.exchangeRate} onChange={F('exchangeRate')} step="0.1" /></div>
                <div className="form-field"><label>Duty %</label><input type="number" value={c.duty} onChange={F('duty')} /></div>
                <div className="form-field"><label>Clearing Cost (ZAR total)</label><input type="number" value={c.clearing} onChange={F('clearing')} /></div>
                <div className="form-field"><label>Local Transport (ZAR total)</label><input type="number" value={c.localTransport} onChange={F('localTransport')} /></div>
                <div className="form-field"><label>Units in Shipment</label><input type="number" value={c.units} onChange={F('units')} min="1" /></div>
              </div>
            </div>
            <div className="calc-section">
              <div className="calc-section-title">Assembly & Finishing (ZAR / unit)</div>
              <div className="form-grid">
                <div className="form-field"><label>Assembly Cost</label><input type="number" value={c.assembly} onChange={F('assembly')} /></div>
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

          <div className="flex-col gap-16">
            <div className="calc-result">
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.gold, fontWeight: 600, marginBottom: 4 }}>Results</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>Per unit, based on inputs</div>
              </div>
              {[
                { label: 'CIF Value (USD)', value: `$${R(cifUsd)}` },
                { label: 'CIF Value (ZAR)', value: ZAR(cifZar) },
                { label: `Duty (${c.duty}%)`, value: ZAR(dutyZar) },
                { label: 'Clearing & Transport / unit', value: ZAR(perUnit) },
                { label: 'Assembly & Finishing', value: ZAR(c.assembly + c.pot + c.qc) },
              ].map(row => (
                <div className="calc-result-row" key={row.label}>
                  <span className="calc-result-label">{row.label}</span>
                  <span className="calc-result-value">{row.value}</span>
                </div>
              ))}
              <div className="calc-result-row" style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: 8 }}>
                <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.goldLight, fontWeight: 600 }}>Total Landed Cost</span>
                <span className="calc-result-value highlight">{ZAR(landed)}</span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />
              {[
                { label: `Sell-in (${c.botanicaMargin}% GM)`, value: ZAR(sellIn), hi: false },
                { label: `Est. Retail (${c.retailerMargin}% retailer)`, value: ZAR(retail), hi: false },
                { label: 'Gross Profit / unit', value: ZAR(gp), hi: false },
                { label: 'Botanica Margin %', value: pct(gpPct), hi: true },
              ].map(row => (
                <div className="calc-result-row" key={row.label}>
                  <span className="calc-result-label">{row.label}</span>
                  <span className="calc-result-value" style={{ color: row.hi ? T.goldLight : T.white }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="section-label">Pricing Waterfall</div>
              {[
                { step: 'Supply (CIF)',          val: ZAR(cifZar),   note: null,                            bold: false },
                { step: '+ Duty',                val: ZAR(dutyZar),  note: null,                            bold: false },
                { step: '+ Landing & Finishing', val: ZAR(perUnit + c.assembly + c.pot + c.qc), note: null, bold: false },
                { step: '= Landed Cost',         val: ZAR(landed),   note: null,                            bold: true  },
                { step: '↳ Sell-in',             val: ZAR(sellIn),   note: pct(c.botanicaMargin) + ' GM',  bold: true  },
                { step: '↳ Retail Price',        val: ZAR(retail),   note: pct(c.retailerMargin) + ' ret.',bold: true  },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.beige}` }}>
                  <span style={{ fontSize: 12, color: row.bold ? T.forest : T.textMid, fontWeight: row.bold ? 600 : 400 }}>{row.step}</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {row.note && <span style={{ fontSize: 11, color: T.gold }}>{row.note}</span>}
                    <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: row.bold ? T.forest : T.textMid }}>{row.val}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
