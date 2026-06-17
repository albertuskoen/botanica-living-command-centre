import { useState, useRef } from 'react'
import { T } from '../utils/tokens.js'
import { ZAR, fmtDate, nextId, today } from '../utils/format.js'
import { FINANCE_CATEGORIES, PAYMENT_METHODS } from '../utils/data.js'
import Modal from '../components/Modal.jsx'

const TYPE_COLORS = { 'Owner Investment': T.teal, 'Business Income': T.green, 'Business Expense': T.red }
const TYPE_BG     = { 'Owner Investment': T.tealLight, 'Business Income': T.greenLight, 'Business Expense': T.redLight }

const BLANK_TXN = { date: today(), type: 'Business Expense', category: 'Other Expense', description: '', amount: '', supplierPayee: '', paymentMethod: 'EFT', notes: '' }

// ── AUTO-CATEGORISE ──────────────────────────────────────────────────────────
function autoClassify(desc, amount) {
  const d = desc.toLowerCase()
  let category = 'Other Expense'
  let type = 'Business Expense'
  let confidence = 'Medium Confidence'

  if (d.includes('cipc')) { category = 'CIPC / Compliance'; confidence = 'High Confidence' }
  else if (d.includes('sars') || d.includes('tax')) { category = 'SARS / Tax'; confidence = 'High Confidence' }
  else if (d.includes('domain') || d.includes('email') || d.includes('domains.co')) { category = 'Domain & Email'; confidence = 'High Confidence' }
  else if (d.includes('vercel') || d.includes('github') || d.includes('hosting') || d.includes('website')) { category = 'Website & Digital'; confidence = 'High Confidence' }
  else if (d.includes('dhl') || d.includes('fedex') || d.includes('courier') || d.includes('shipping')) { category = 'Freight & Courier'; confidence = 'High Confidence' }
  else if (d.includes('customs') || d.includes('clearing') || d.includes('duty')) { category = 'Customs & Clearing'; confidence = 'High Confidence' }
  else if (d.includes('sample') || d.includes('supplier sample')) { category = 'Supplier Samples'; confidence = 'High Confidence' }
  else if (d.includes('marketing') || d.includes('facebook') || d.includes('google ads')) { category = 'Marketing'; confidence = 'High Confidence' }
  else if (d.includes('packaging') || d.includes('assembly') || d.includes('pot')) { category = 'Assembly & Packaging'; confidence = 'High Confidence' }
  else if (d.includes('bank fee') || d.includes('service fee') || d.includes('monthly fee')) { category = 'Banking Fees'; confidence = 'High Confidence' }
  else { confidence = 'Needs Review' }

  const amt = parseFloat(String(amount).replace(/[^0-9.-]/g, ''))
  if (!isNaN(amt) && amt > 0) {
    if (d.includes('capital') || d.includes('investment') || d.includes('owner')) { type = 'Owner Investment'; category = 'Owner Capital'; confidence = 'High Confidence' }
    else if (d.includes('sales') || d.includes('payment received') || d.includes('deposit from')) { type = 'Business Income'; category = 'Product Sales'; confidence = 'Medium Confidence' }
  }

  return { type, category, confidence }
}

export default function FinanceCentre({ finance, setFinance }) {
  const [tab, setTab]           = useState('overview')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(BLANK_TXN)
  const [importRows, setImportRows] = useState([])
  const [importModal, setImportModal] = useState(false)
  const [filterType, setFilterType] = useState('All')
  const fileRef = useRef()

  // ── Aggregates ──────────────────────────────────────────────────────────────
  const invested  = finance.filter(t => t.type === 'Owner Investment').reduce((s, t) => s + Number(t.amount), 0)
  const income    = finance.filter(t => t.type === 'Business Income').reduce((s, t) => s + Number(t.amount), 0)
  const expenses  = finance.filter(t => t.type === 'Business Expense').reduce((s, t) => s + Number(t.amount), 0)
  const remaining = invested - expenses
  const net       = income - expenses

  const F = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const openNew = () => {
    setEditing(null)
    setForm({ ...BLANK_TXN, date: today() })
    setModal(true)
  }
  const openEdit = t => { setEditing(t.id); setForm(t); setModal(true) }
  const save = () => {
    if (!form.description || !form.amount) return
    const rec = { ...form, id: editing || nextId(finance), amount: parseFloat(form.amount) || 0 }
    editing
      ? setFinance(ff => ff.map(t => t.id === editing ? rec : t))
      : setFinance(ff => [...ff, rec])
    setModal(false)
  }
  const del = id => window.confirm('Delete transaction?') && setFinance(ff => ff.filter(t => t.id !== id))

  // ── Monthly summary ──────────────────────────────────────────────────────────
  const monthly = {}
  finance.forEach(t => {
    const key = t.date ? t.date.substring(0, 7) : 'Unknown'
    if (!monthly[key]) monthly[key] = { inv: 0, inc: 0, exp: 0 }
    if (t.type === 'Owner Investment') monthly[key].inv += Number(t.amount)
    else if (t.type === 'Business Income') monthly[key].inc += Number(t.amount)
    else monthly[key].exp += Number(t.amount)
  })

  // ── Category summary ─────────────────────────────────────────────────────────
  const catSummary = {}
  finance.filter(t => t.type === 'Business Expense').forEach(t => {
    catSummary[t.category] = (catSummary[t.category] || 0) + Number(t.amount)
  })
  const catRows = Object.entries(catSummary).sort((a, b) => b[1] - a[1])

  // ── AI Insight ───────────────────────────────────────────────────────────────
  const topCat = catRows[0]?.[0] || 'No expenses yet'
  const insight = `Botanica Living Group has received ${ZAR(invested)} in owner investment to date and spent ${ZAR(expenses)}. ${topCat !== 'No expenses yet' ? `The largest expense category is ${topCat}.` : ''} Remaining owner-funded balance is ${ZAR(remaining)}. ${income === 0 ? 'No business income has been recorded yet.' : `Business income to date: ${ZAR(income)}.`} Net business position: ${ZAR(net)}.`

  // ── CSV/Excel import ──────────────────────────────────────────────────────────
  const handleFileImport = e => {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'pdf') {
      alert('PDF import: File recorded. Full PDF AI reading will be added in a future backend version. You can add the transaction manually.')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target.result
      const lines = text.split('\n').filter(l => l.trim())
      const rows = lines.slice(1).map((line, i) => {
        const cols = line.split(',').map(c => c.replace(/"/g, '').trim())
        const desc   = cols[1] || cols[0] || ''
        const amount = parseFloat((cols[2] || cols[3] || '0').replace(/[^0-9.-]/g, '')) || 0
        const classified = autoClassify(desc, amount)
        return {
          _id: i + 1,
          date: cols[0] || today(),
          description: desc,
          amount: Math.abs(amount),
          supplierPayee: cols[4] || '',
          ...classified,
          approved: true,
        }
      }).filter(r => r.description)
      setImportRows(rows)
      setImportModal(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const approveImport = () => {
    const approved = importRows.filter(r => r.approved).map(r => ({
      id: nextId(finance) + r._id,
      date: r.date, type: r.type, category: r.category,
      description: r.description, amount: r.amount,
      supplierPayee: r.supplierPayee, paymentMethod: 'EFT', notes: `Imported · ${r.confidence}`,
    }))
    setFinance(ff => [...ff, ...approved])
    setImportModal(false)
    setImportRows([])
  }

  const visibleTxns = filterType === 'All' ? finance : finance.filter(t => t.type === filterType)
  const sorted = [...visibleTxns].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const confColor = c => c === 'High Confidence' ? T.forestLight : c === 'Medium Confidence' ? T.gold : T.danger

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Finance Centre</div>
          <div className="page-subtitle">Owner Investment · Income · Expenses</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>⬆ Import Statement</button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.pdf" style={{ display:'none' }} onChange={handleFileImport} />
          <button className="btn btn-primary" onClick={openNew}>+ Add Transaction</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding:'20px 36px 0', background:T.white, borderBottom:`1px solid ${T.beigeDeep}` }}>
        <div className="grid-5" style={{ paddingBottom:20 }}>
          {[
            { label:'Owner Investment', val:ZAR(invested),  color:T.teal,   cls:'fin-kpi-inv' },
            { label:'Business Income',  val:ZAR(income),    color:T.green,  cls:'fin-kpi-inc' },
            { label:'Total Expenses',   val:ZAR(expenses),  color:T.red,    cls:'fin-kpi-exp' },
            { label:'Remaining Funds',  val:ZAR(remaining), color:T.gold,   cls:'fin-kpi-rem' },
            { label:'Net Position',     val:ZAR(net),       color:remaining >= 0 ? T.forest : T.danger, cls:'fin-kpi-net' },
          ].map(k => (
            <div key={k.label} className={`stat-card ${k.cls}`}>
              <div className="card-label">{k.label}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:k.color, lineHeight:1, marginTop:6 }}>{k.val}</div>
              {k.label === 'Remaining Funds' && invested > 0 && (
                <div className="progress-bar"><div className="progress-fill" style={{ width:`${Math.min(100, (remaining/invested)*100)}%` }} /></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="page-content">
        <div className="tabs">
          {['overview','transactions','monthly','categories'].map(t => (
            <div key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</div>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid-2 gap-16">
            {/* Insight box */}
            <div className="insight-box">
              <div className="insight-label">AI-Style Finance Insight</div>
              <div className="insight-text">{insight}</div>
            </div>
            {/* Project-to-date */}
            <div className="card">
              <div className="section-label">Project-to-Date Summary</div>
              {[
                { label:'Total Owner Investment', val:ZAR(invested), color:T.teal },
                { label:'Total Business Income',  val:ZAR(income),   color:T.green },
                { label:'Total Expenses',         val:ZAR(expenses), color:T.red },
                { label:'Remaining Owner Funds',  val:ZAR(remaining),color:T.gold },
                { label:'Net Business Position',  val:ZAR(net),      color:net >= 0 ? T.forest : T.danger },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid ${T.beige}` }}>
                  <span style={{ fontSize:13, color:T.textMid }}>{r.label}</span>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'transactions' && (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              {['All','Owner Investment','Business Income','Business Expense'].map(t => (
                <button key={t} className={`btn btn-sm ${filterType===t?'btn-primary':'btn-outline'}`} onClick={() => setFilterType(t)}>{t}</button>
              ))}
            </div>
            {sorted.length === 0
              ? <div className="empty-state"><div className="empty-icon">₩</div><div>No transactions yet. Add your first entry.</div></div>
              : (
                <div className="card" style={{ padding:0 }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Payee</th><th>Amount</th><th></th></tr>
                      </thead>
                      <tbody>
                        {sorted.map(t => (
                          <tr key={t.id}>
                            <td style={{ fontSize:12, whiteSpace:'nowrap' }}>{fmtDate(t.date)}</td>
                            <td>
                              <span style={{ background:TYPE_BG[t.type], color:TYPE_COLORS[t.type], padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:500, whiteSpace:'nowrap' }}>
                                {t.type === 'Owner Investment' ? 'Investment' : t.type === 'Business Income' ? 'Income' : 'Expense'}
                              </span>
                            </td>
                            <td style={{ fontSize:12, color:T.textMid }}>{t.category}</td>
                            <td className="td-name" style={{ fontSize:13 }}>{t.description}</td>
                            <td style={{ fontSize:12, color:T.textLight }}>{t.supplierPayee}</td>
                            <td style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:TYPE_COLORS[t.type], whiteSpace:'nowrap' }}>{ZAR(t.amount)}</td>
                            <td>
                              <div style={{ display:'flex', gap:4 }}>
                                <button className="btn btn-outline btn-xs" onClick={() => openEdit(t)}>Edit</button>
                                <button className="btn btn-xs" style={{ background:'transparent', border:'none', cursor:'pointer', color:T.textLight }} onClick={() => del(t.id)}>✕</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          </>
        )}

        {tab === 'monthly' && (
          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Month</th><th>Owner Investment</th><th>Business Income</th><th>Expenses</th><th>Remaining</th><th>Net</th></tr>
                </thead>
                <tbody>
                  {Object.entries(monthly).sort((a, b) => b[0].localeCompare(a[0])).map(([month, m]) => (
                    <tr key={month}>
                      <td className="td-name">{month}</td>
                      <td style={{ color:T.teal, fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(m.inv)}</td>
                      <td style={{ color:T.green, fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(m.inc)}</td>
                      <td style={{ color:T.red, fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(m.exp)}</td>
                      <td style={{ color:T.gold, fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(m.inv - m.exp)}</td>
                      <td style={{ color:m.inc - m.exp >= 0 ? T.forest : T.danger, fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(m.inc - m.exp)}</td>
                    </tr>
                  ))}
                  {Object.keys(monthly).length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:T.textLight }}>No transactions recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'categories' && (
          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Category</th><th>Total Spend</th><th>% of Expenses</th><th>Bar</th></tr></thead>
                <tbody>
                  {catRows.map(([cat, amt]) => (
                    <tr key={cat}>
                      <td className="td-name">{cat}</td>
                      <td style={{ color:T.red, fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(amt)}</td>
                      <td style={{ color:T.textMid, fontSize:13 }}>{expenses > 0 ? ((amt/expenses)*100).toFixed(1) : 0}%</td>
                      <td style={{ width:180 }}>
                        <div style={{ height:6, background:T.beige, borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${expenses > 0 ? (amt/expenses)*100 : 0}%`, background:T.gold, borderRadius:3 }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {catRows.length === 0 && <tr><td colSpan={4} style={{ textAlign:'center', padding:32, color:T.textLight }}>No expense categories yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Transaction Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Transaction' : 'Add Transaction'}
        footer={<><button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Transaction</button></>}
      >
        <div className="form-grid">
          <div className="form-field"><label>Date</label><input type="date" value={form.date} onChange={F('date')} /></div>
          <div className="form-field">
            <label>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, category: Object.values(FINANCE_CATEGORIES)[Object.keys(FINANCE_CATEGORIES).indexOf(e.target.value)]?.[0] || '' }))}>
              {Object.keys(FINANCE_CATEGORIES).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Category</label>
            <select value={form.category} onChange={F('category')}>
              {(FINANCE_CATEGORIES[form.type] || []).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Amount (ZAR)</label><input type="number" placeholder="0.00" value={form.amount} onChange={F('amount')} /></div>
          <div className="form-field full"><label>Description</label><input value={form.description} onChange={F('description')} placeholder="e.g. Domain registration fee" /></div>
          <div className="form-field"><label>Supplier / Payee</label><input value={form.supplierPayee} onChange={F('supplierPayee')} /></div>
          <div className="form-field">
            <label>Payment Method</label>
            <select value={form.paymentMethod} onChange={F('paymentMethod')}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-field full"><label>Notes</label><textarea value={form.notes} onChange={F('notes')} /></div>
        </div>
      </Modal>

      {/* Import Review Modal */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Review Imported Transactions" size="modal-lg"
        footer={<>
          <button className="btn btn-outline" onClick={() => setImportModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={approveImport}>Save Approved ({importRows.filter(r => r.approved).length})</button>
        </>}
      >
        <div style={{ fontSize:12, color:T.textMid, marginBottom:12 }}>
          Review each row. Edit type/category or uncheck to reject. Only approved rows will be saved.
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>✓</th><th>Date</th><th>Description</th><th>Amount</th><th>Type</th><th>Category</th><th>Confidence</th></tr>
            </thead>
            <tbody>
              {importRows.map((row, i) => (
                <tr key={row._id} style={{ opacity: row.approved ? 1 : 0.4 }}>
                  <td><input type="checkbox" checked={row.approved} onChange={e => setImportRows(rows => rows.map((r, j) => j === i ? { ...r, approved: e.target.checked } : r))} /></td>
                  <td style={{ fontSize:12 }}>{row.date}</td>
                  <td style={{ fontSize:12 }}>{row.description}</td>
                  <td style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15 }}>{ZAR(row.amount)}</td>
                  <td>
                    <select value={row.type} style={{ fontSize:11, padding:'2px 6px' }} onChange={e => setImportRows(rows => rows.map((r, j) => j === i ? { ...r, type: e.target.value } : r))}>
                      {Object.keys(FINANCE_CATEGORIES).map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={row.category} style={{ fontSize:11, padding:'2px 6px' }} onChange={e => setImportRows(rows => rows.map((r, j) => j === i ? { ...r, category: e.target.value } : r))}>
                      {(FINANCE_CATEGORIES[row.type] || []).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td><span style={{ fontSize:10, color: confColor(row.confidence) }}>{row.confidence}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}
