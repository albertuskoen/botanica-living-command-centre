import { T } from './global.js'

export default function Dashboard({ suppliers, products }) {
  const foundersCount = products.filter(p => p.foundersCollection).length

  const priorities = [
    { dot: 'green', title: 'Confirm Founders Collection sample orders',    desc: '6 products selected — awaiting Dongyi confirmation on 2 pending samples.' },
    { dot: '',      title: 'Complete Checkers Hyper scenario modelling',    desc: 'Run 5, 15 and 30-store scenarios with current landed costs.' },
    { dot: '',      title: 'Finalise import calculator for Olive Tree SKU', desc: 'Align exchange rate and duty assumptions with clearing agent.' },
    { dot: 'green', title: 'Supplier relationship — Dongyi',               desc: 'Schedule video call to discuss MOQ flexibility on initial order.' },
    { dot: '',      title: 'Retail pricing sign-off',                      desc: 'Present sell-in and RRP matrix to Checkers buyer.' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Command Centre</div>
          <div className="page-subtitle">Botanica Living — Operational Overview</div>
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: 'italic', color: T.gold }}>
          "Sell first. Scale second."
        </div>
      </div>
      <div className="page-content">
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {[
            { label: 'Suppliers',       value: suppliers.length,    desc: 'Active supplier relationships' },
            { label: 'Products',        value: products.length,     desc: `${foundersCount} in Founders Collection` },
            { label: 'Avg Landed Cost', value: 'R 38.00',           desc: 'Per unit, weighted avg.' },
            { label: 'Target Margin',   value: '42.5%',             desc: 'Botanica GP target' },
          ].map(k => (
            <div className="stat-card" key={k.label}>
              <div className="card-label">{k.label}</div>
              <div className="card-value">{k.value}</div>
              <div className="card-desc">{k.desc}</div>
            </div>
          ))}
        </div>

        <div className="grid-2 gap-24">
          <div className="card">
            <div className="section-label">Current Priorities</div>
            {priorities.map((p, i) => (
              <div className="priority-item" key={i}>
                <div className={`priority-dot ${p.dot}`} />
                <div>
                  <div className="priority-title">{p.title}</div>
                  <div className="priority-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-col gap-16">
            <div className="quote-block">
              <div className="quote-text">"We don't sell plants.<br/>We sell transformed spaces."</div>
              <div className="quote-attr">Botanica Living — Brand Philosophy</div>
            </div>
            <div className="card">
              <div className="section-label">Supplier Snapshot</div>
              {suppliers.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.beige}` }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>{s.country} · {s.terms}</div>
                  </div>
                  <span className={`badge ${s.status === 'Active' ? 'badge-green' : 'badge-grey'}`}>{s.status}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="section-label">Sample Tracker</div>
              {products.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.beige}` }}>
                  <div style={{ fontSize: 12 }}>{p.name}</div>
                  <span className={`badge ${p.sampleStatus === 'Received' ? 'badge-green' : p.sampleStatus === 'Ordered' ? 'badge-gold' : 'badge-grey'}`}>{p.sampleStatus}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
