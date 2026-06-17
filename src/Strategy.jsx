import { T } from './global.js'

const PILLARS = [
  { title: 'Botanica Living is a premium brand, not just an importer.', body: 'Every touchpoint — from product photography to assembly and delivery — must reflect luxury. We are not competing on price. We are building desire. The margin is earned through the brand experience, not the product alone.' },
  { title: 'Sell first. Scale second.', body: 'Secure real orders and market validation before committing to large inventory positions. A confirmed Checkers Hyper pilot, a designer sale, or a commercial project win is worth more than a full warehouse. Revenue de-risks everything.' },
  { title: 'Checkers Hyper is a stage, not just a customer.', body: 'Retail presence in a high-footfall premium format gives Botanica Living brand credibility, consumer visibility, and a proving ground for SKUs. Every store is a showroom that generates pull for designer, hospitality, and direct channels.' },
  { title: 'Professional assembly and quality control are value-adds.', body: 'The in-house assembly, pot finishing, and QC process is a competitive advantage. It allows Botanica Living to guarantee a product standard that direct-from-China competitors cannot. This justifies the premium sell-in price.' },
  { title: 'We sell transformed spaces and emotion — not just plants.', body: "Customers don't buy artificial plants. They buy the feeling of a lush, effortless interior. They buy the compliment from a guest. Every piece of communication — from a product description to a sales pitch — should sell the outcome, not the object." },
]

const COLS = [
  { icon: '◎', title: 'Channels',        items: ['Checkers Hyper (retail)', 'Commercial projects', 'Designers & architects', 'Hospitality', 'Direct consumer'] },
  { icon: '◈', title: 'Operations',       items: ['Import via FOB/CIF', 'Local assembly & QC', 'Pot & finishing in-house', 'Direct fulfillment', 'Container optimisation'] },
  { icon: '✦', title: 'Competitive Moat', items: ['Premium curation', 'Local assembly quality', 'Brand storytelling', 'Supplier relationships', 'Designer community'] },
]

export default function Strategy() {
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Strategy & Blueprint</div><div className="page-subtitle">Brand Principles & Commercial Direction</div></div>
      </div>
      <div className="page-content">
        <div className="quote-block">
          <div className="quote-text">"Sell first. Scale second."</div>
          <div className="quote-attr">Botanica Living — Founding Principle</div>
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
          {COLS.map(col => (
            <div className="card" key={col.title}>
              <div style={{ fontSize: 20, marginBottom: 10, color: T.gold }}>{col.icon}</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: T.forest, marginBottom: 14 }}>{col.title}</div>
              {col.items.map(item => (
                <div key={item} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: `1px solid ${T.beige}`, fontSize: 13, color: T.textMid }}>
                  <span style={{ color: T.gold, flexShrink: 0 }}>—</span> {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
