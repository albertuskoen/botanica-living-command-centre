// App.jsx — v2.4
// Full Financial Hub restructure
import { useState, useCallback, useEffect, useRef } from 'react'
import css from './utils/css.js'
import useLocalStorage from './hooks/useLocalStorage.js'
import { flushSyncQueue, SUPABASE_CONFIGURED, loadDocumentsFromCloud, loadTransactionsFromCloud } from './lib/supabase.js'
import {
  INIT_SUPPLIERS, INIT_PRODUCTS, INIT_PROGRESS, INIT_FINANCE, INIT_TASKS,
  INIT_DOCUMENTS, INIT_CLIENTS, INIT_QUOTES, INIT_INVOICES, INIT_EXPENSES, INIT_PROJECTS,
} from './utils/data.js'
import {
  isSessionValid, touchSession, clearSession, isIdleExpired, getAuthConfig,
} from './lib/auth.js'

import Sidebar           from './components/Sidebar.jsx'
import LoginScreen       from './components/LoginScreen.jsx'

// Pages
import Dashboard         from './pages/Dashboard.jsx'
import BusinessProgress  from './pages/BusinessProgress.jsx'
import FinanceCentre     from './pages/FinanceCentre.jsx'   // legacy, kept as Expenses fallback
import ActionCentre      from './pages/ActionCentre.jsx'
import BusinessDocuments from './pages/BusinessDocuments.jsx'
import Suppliers         from './pages/Suppliers.jsx'
import Products          from './pages/Products.jsx'
import Settings          from './pages/Settings.jsx'
import { FoundersCollection, Strategy } from './pages/OtherPages.jsx'
import SupplierZone      from './pages/SupplierZone.jsx'
import ClientDatabase    from './pages/ClientDatabase.jsx'
import Projects          from './pages/Projects.jsx'

// Financial Hub
import FinancialHub      from './pages/finance/FinancialHub.jsx'
import Quotes            from './pages/finance/Quotes.jsx'
import Invoices          from './pages/finance/Invoices.jsx'
import Expenses          from './pages/finance/Expenses.jsx'

// ── Global error boundary ─────────────────────────────────────────────────────
import { Component } from 'react'
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[Botanica] Uncaught error:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:40, fontFamily:'Inter, sans-serif', maxWidth:560, margin:'80px auto', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>⚠</div>
          <div style={{ fontSize:22, fontFamily:"'Manrope',sans-serif", color:'#F7F8F7', marginBottom:12 }}>Something went wrong</div>
          <div style={{ fontSize:13, color:'#52525B', lineHeight:1.7, marginBottom:24 }}>The app encountered an unexpected error. Your data is safe.</div>
          <div style={{ fontSize:12, color:'#A1A1AA', background:'#0F1A14', borderRadius:8, padding:'10px 14px', marginBottom:24, textAlign:'left', fontFamily:'monospace' }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button onClick={() => this.setState({ error: null })} style={{ padding:'10px 24px', background:'#0F2318', color:'#E8C07A', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600, marginRight:10 }}>Try Again</button>
          <button onClick={() => window.location.reload()} style={{ padding:'10px 24px', background:'transparent', color:'rgba(247,248,247,0.55)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600 }}>Reload App</button>
        </div>
      )
    }
    return this.props.children
  }
}

function PageBoundary({ children, pageName }) {
  return <ErrorBoundary key={pageName}>{children}</ErrorBoundary>
}

const ensureArray = v => Array.isArray(v) ? v : []

// ── Inactivity tracker ─────────────────────────────────────────────────────────
let _activityTimer = null
function resetActivityTimer(onLogout) {
  clearTimeout(_activityTimer)
  touchSession()
  const { inactivityMinutes } = getAuthConfig()
  _activityTimer = setTimeout(() => {
    if (isIdleExpired()) { clearSession(); onLogout() }
  }, inactivityMinutes * 60 * 1000)
}

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [authenticated, setAuthenticated] = useState(() => isSessionValid())

  const handleLogout = useCallback(() => {
    clearSession()
    clearTimeout(_activityTimer)
    setAuthenticated(false)
  }, [])

  const handleAuthenticated = useCallback(() => setAuthenticated(true), [])

  useEffect(() => {
    if (!authenticated) return
    const events = ['mousedown','keydown','touchstart','scroll','mousemove']
    const onActivity = () => resetActivityTimer(handleLogout)
    events.forEach(e => window.addEventListener(e, onActivity, { passive:true }))
    resetActivityTimer(handleLogout)
    return () => { events.forEach(e => window.removeEventListener(e, onActivity)); clearTimeout(_activityTimer) }
  }, [authenticated, handleLogout])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (!isSessionValid() || isIdleExpired()) { clearSession(); setAuthenticated(false) }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ── App data ────────────────────────────────────────────────────────────────
  const [page,       setPage]       = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  const [suppliers,  setSuppliers]  = useLocalStorage('bl_suppliers',  INIT_SUPPLIERS)
  const [products,   setProducts]   = useLocalStorage('bl_products',   INIT_PRODUCTS)
  const [progress,   setProgress]   = useLocalStorage('bl_progress',   INIT_PROGRESS)
  const [finance,    setFinance]    = useLocalStorage('bl_finance',    INIT_FINANCE)
  const [tasks,      setTasks]      = useLocalStorage('bl_tasks',      INIT_TASKS)
  const [documents,  setDocuments]  = useLocalStorage('bl_documents',  INIT_DOCUMENTS)
  const [clients,    setClients]    = useLocalStorage('bl_clients',    INIT_CLIENTS)

  // New Financial Hub data
  const [quotes,     setQuotes]     = useLocalStorage('bl_quotes',     INIT_QUOTES)
  const [invoices,   setInvoices]   = useLocalStorage('bl_invoices',   INIT_INVOICES)
  const [expenses,   setExpenses]   = useLocalStorage('bl_expenses',   INIT_EXPENSES)
  const [projList,   setProjList]   = useLocalStorage('bl_projects',   INIT_PROJECTS)

  // ── Listen for internal navigation events (quote → invoice conversion) ────
  useEffect(() => {
    const handler = e => { if (e.detail) navigate(e.detail) }
    window.addEventListener('bl-navigate', handler)
    return () => window.removeEventListener('bl-navigate', handler)
  }, [])

  // ── Load from Supabase on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!authenticated || !SUPABASE_CONFIGURED) return
    flushSyncQueue().catch(console.warn)
    loadTransactionsFromCloud()
      .then(rows => {
        if (!rows || rows.length === 0) return
        const mapped = rows.map(r => ({
          id: r.id, date: r.date, type: r.type,
          amount: parseFloat(r.amount) || 0, category: r.category,
          description: r.description, supplierPayee: r.supplier_payee || '',
          paymentMethod: r.payment_method || 'EFT', notes: r.notes || '',
          invoiceNumber: r.invoice_number || '', vatAmount: parseFloat(r.vat_amount) || 0,
          source: r.source || 'manual', sourceFile: r.source_file || '',
          sourceDocumentId: r.source_document_id || null, sourceDocId: r.source_document_id || null,
        }))
        setFinance(mapped)
      })
      .catch(e => console.warn('[App] Supabase txn load:', e.message))

    loadDocumentsFromCloud()
      .then(rows => {
        if (!rows || rows.length === 0) return
        const mapped = rows.map(r => ({
          id: r.id, supabaseId: r.id, name: r.file_name, fileName: r.file_name,
          fileType: r.file_type, fileSize: r.file_size_display || '', fileSizeBytes: r.file_size_bytes || 0,
          category: r.category || 'General', dateUploaded: r.date_uploaded || r.created_at?.split('T')[0] || '',
          notes: r.notes || '', supplier: r.supplier_name || '', storagePath: r.storage_path,
          publicUrl: r.public_url, linkedTransactionId: r.linked_transaction_id || null,
          hasFile: true, storageBackend: 'supabase',
        }))
        setDocuments(mapped)
      })
      .catch(e => console.warn('[App] Supabase docs load:', e.message))
  }, [authenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const safeSuppliers = ensureArray(suppliers)
  const safeProducts  = ensureArray(products)
  const safeProgress  = ensureArray(progress)
  const safeFinance   = ensureArray(finance)
  const safeTasks     = ensureArray(tasks)
  const safeDocuments = ensureArray(documents)
  const safeClients   = ensureArray(clients)
  const safeQuotes    = ensureArray(quotes)
  const safeInvoices  = ensureArray(invoices)
  const safeExpenses  = ensureArray(expenses)
  const safeProjects  = ensureArray(projList)

  const allData = {
    suppliers:safeSuppliers, products:safeProducts, progress:safeProgress,
    finance:safeFinance, tasks:safeTasks, documents:safeDocuments, clients:safeClients,
    quotes:safeQuotes, invoices:safeInvoices, expenses:safeExpenses, projects:safeProjects,
  }

  const onRestore = useCallback(d => {
    try {
      if (!d || typeof d !== 'object') throw new Error('Invalid backup data')
      const src = d.data || d  // support both { data:{} } and flat format
      if (Array.isArray(src.suppliers))  setSuppliers(src.suppliers)
      if (Array.isArray(src.products))   setProducts(src.products)
      if (Array.isArray(src.progress))   setProgress(src.progress)
      if (Array.isArray(src.finance))    setFinance(src.finance)
      if (Array.isArray(src.tasks))      setTasks(src.tasks)
      if (Array.isArray(src.documents))  setDocuments(src.documents)
      if (Array.isArray(src.clients))    setClients(src.clients)
      if (Array.isArray(src.quotes))     setQuotes(src.quotes)
      if (Array.isArray(src.invoices))   setInvoices(src.invoices)
      if (Array.isArray(src.expenses))   setExpenses(src.expenses)
      if (Array.isArray(src.projects))   setProjList(src.projects)
    } catch (err) { console.error('[Botanica] Restore failed:', err); alert('Restore failed: ' + err.message) }
  }, [setSuppliers, setProducts, setProgress, setFinance, setTasks, setDocuments, setClients, setQuotes, setInvoices, setExpenses, setProjList])

  const navigate = useCallback(p => { setPage(p); setMobileOpen(false) }, [])

  // ── Login gate ───────────────────────────────────────────────────────────────
  if (!authenticated) {
    return <ErrorBoundary><LoginScreen onAuthenticated={handleAuthenticated} /></ErrorBoundary>
  }

  return (
    <ErrorBoundary>
      <style>{css}</style>
      <div className="app">
        <Sidebar page={page} setPage={navigate} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onLogout={handleLogout} />
        <main className="main">
          <PageBoundary pageName={page}>
            {page === 'dashboard'    && <Dashboard suppliers={safeSuppliers} products={safeProducts} finance={safeFinance} tasks={safeTasks} documents={safeDocuments} quotes={safeQuotes} invoices={safeInvoices} expenses={safeExpenses} setPage={navigate} />}
            {page === 'progress'     && <BusinessProgress progress={safeProgress} setProgress={setProgress} />}
            {page === 'actions'      && <ActionCentre tasks={safeTasks} setTasks={setTasks} />}
            {page === 'documents'    && <BusinessDocuments documents={safeDocuments} setDocuments={setDocuments} finance={safeFinance} />}
            {page === 'supplierzone' && <SupplierZone suppliers={safeSuppliers} setSuppliers={setSuppliers} products={safeProducts} />}
            {page === 'products'     && <Products products={safeProducts} setProducts={setProducts} suppliers={safeSuppliers} />}
            {page === 'clients'      && <ClientDatabase clients={safeClients} setClients={setClients} />}
            {page === 'founders'     && <FoundersCollection products={safeProducts} />}
            {page === 'strategy'     && <Strategy />}
            {page === 'projects'     && <Projects projects={safeProjects} setProjects={setProjList} clients={safeClients} expenses={safeExpenses} invoices={safeInvoices} />}
            {/* Financial Hub */}
            {page === 'finance-hub'  && <FinancialHub finance={safeFinance} quotes={safeQuotes} invoices={safeInvoices} expenses={safeExpenses} projects={safeProjects} setPage={navigate} />}
            {page === 'quotes'       && <Quotes quotes={safeQuotes} setQuotes={setQuotes} clients={safeClients} />}
            {page === 'invoices'     && <Invoices invoices={safeInvoices} setInvoices={setInvoices} clients={safeClients} />}
            {page === 'expenses'     && <Expenses expenses={safeExpenses} setExpenses={setExpenses} projects={safeProjects} />}
            {/* Legacy finance (now sub-module) */}
            {page === 'finance'      && <FinanceCentre finance={safeFinance} setFinance={setFinance} />}
            {page === 'settings'     && <Settings allData={allData} onRestore={onRestore} onLogout={handleLogout} />}
          </PageBoundary>
        </main>
      </div>
    </ErrorBoundary>
  )
}
