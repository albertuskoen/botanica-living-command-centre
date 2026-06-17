import { ZAR } from './format.js'
import { T } from './global.js'

const XR = 18.8

export default function FoundersCollection({ products }) {
  const founders  = products.filter(p => p.foundersCollection)
  const landed    = p => ((p.cifPrice || p.fobPrice || p.exwPrice || 0) * XR) * 1.33
  const sellIn    = p => landed(p) / (1 - 0.45)
  const retail    = p => sellIn(p) / (1 - 0.50)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Founders Collection</div><div className="page-subtitle">Launch Range — Premium Selection</div></div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontStyle: 'italic', color: T.gold }}>{founders.length} products selected</div>
      </div>
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 24 }}>
          {founders.map(p => (
            <div className="founder-card" key={p.id}>
              <div className="founder-card-name">{p.name}</div>
              <div className="founder-card-cat">{p.category} · {p.supplier}</div>
              <div style={{ fontSize: 12, color: T.textLight, marginBottom: 8 }}>{p.height} · MOQ {p.moq} · {p.leadTime}</div>
              <div className="founder-metrics">
                <div className="founder-metric"><div className="founder-metric-label">Landed (est.)</div><div className="founder-metric-value">{ZAR(landed(p))}</div></div>
                <div className="founder-metric"><div className="founder-metric-label">Sell-in</div><div className="founder-metric-value">{ZAR(sellIn(p))}</div></div>
                <div className="founder-metric"><div className="founder-metric-label">Est. Retail</div><div className="founder-metric-value">{ZAR(retail(p))}</div></div>
                <div className="founder-metric">
                  <div className="founder-metric-label">Sample Status</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge ${p.sampleStatus === 'Received' ? 'badge-green' : p.sampleStatus === 'Ordered' ? 'badge-gold' : 'badge-grey'}`}>{p.sampleStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {founders.length === 0 && <div className="empty-state"><div className="empty-icon">✦</div><div>No products marked for Founders Collection yet.</div></div>}
        <div className="card">
          <div className="section-label">Collection Notes</div>
          <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.8 }}>
            The Founders Collection represents Botanica Living's hero launch SKUs. Each piece selected for <strong>emotional impact</strong>, retail standout, and <strong>commercial viability</strong>. Estimates use ZAR/USD {XR} and 33% blended import factor. Sell-in at 45% Botanica margin, retail at 50% retailer margin.
          </div>
        </div>
      </div>
    </div>
  )
}
