import { useState, useCallback, useEffect, useRef } from 'react'
import css from './utils/css.js'
import useLocalStorage from './hooks/useLocalStorage.js'
import { flushSyncQueue, SUPABASE_CONFIGURED, loadDocumentsFromCloud, loadTransactionsFromCloud } from './lib/supabase.js'
import { INIT_SUPPLIERS, INIT_PRODUCTS, INIT_PROGRESS, INIT_FINANCE, INIT_TASKS, INIT_DOCUMENTS } from './utils/data.js'
import {
  isSessionValid, touchSession, clearSession, isIdleExpired, getAuthConfig,
} from './lib/auth.js'

import Sidebar           from './components/Sidebar.jsx'
import LoginScreen       from './components/LoginScreen.jsx'
import Dashboard         from './pages/Dashboard.jsx'
import BusinessProgress  from './pages/BusinessProgress.jsx'
import FinanceCentre     from './pages/FinanceCentre.jsx'
import ActionCentre      from './pages/ActionCentre.jsx'
import BusinessDocuments from './pages/BusinessDocuments.jsx'
import Suppliers         from './pages/Suppliers.jsx'
import Products          from './pages/Products.jsx'
import Settings          from './pages/Settings.jsx'
import { Calculator, CheckersHyper, FoundersCollection, Strategy } from './pages/OtherPages.jsx'

// ── Global error boundary ─────────────────────────────────────────────────────
import { Component } from 'react'
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[Botanica] Uncaught error:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', maxWidth: 560, margin: '80px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
          <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond',serif", color: '#0F2318', marginBottom: 12 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#52525B', lineHeight: 1.7, marginBottom: 24 }}>The app encountered an unexpected error. Your data is safe.</div>
          <div style={{ fontSize: 12, color: '#A1A1AA', background: '#F4EFE6', borderRadius: 8, padding: '10px 14px', marginBottom: 24, textAlign: 'left', fontFamily: 'monospace' }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button onClick={() => this.setState({ error: null })} style={{ padding: '10px 24px', background: '#0F2318', color: '#E8C07A', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginRight: 10 }}>Try Again</button>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: 'transparent', color: '#52525B', border: '1px solid #D2C9B8', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Reload App</button>
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

// ── Inactivity tracker (module-level so it persists across renders) ────────────
let _activityTimer = null
function resetActivityTimer(onLogout) {
  clearTimeout(_activityTimer)
  touchSession()
  const { inactivityMinutes } = getAuthConfig()
  _activityTimer = setTimeout(() => {
    if (isIdleExpired()) {
      clearSession()
      onLogout()
    }
  }, inactivityMinutes * 60 * 1000)
}

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [authenticated, setAuthenticated] = useState(() => isSessionValid())

  const handleLogout = useCallback(() => {
    clearSession()
    clearTimeout(_activityTimer)
    setAuthenticated(false)
  }, [])

  const handleAuthenticated = useCallback(() => {
    setAuthenticated(true)
  }, [])

  // ── Inactivity detection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!authenticated) return
    const events = ['mousedown','keydown','touchstart','scroll','mousemove']
    const onActivity = () => resetActivityTimer(handleLogout)
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    resetActivityTimer(handleLogout)  // start timer on login
    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity))
      clearTimeout(_activityTimer)
    }
  }, [authenticated, handleLogout])

  // ── Session validity check on visibility change ─────────────────────────────
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (!isSessionValid() || isIdleExpired()) {
          clearSession()
          setAuthenticated(false)
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ── App data ────────────────────────────────────────────────────────────────
  const [page,       setPage]       = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  const [suppliers,  setSuppliers]  = useLocalStorage('bl_suppliers', INIT_SUPPLIERS)
  const [products,   setProducts]   = useLocalStorage('bl_products',  INIT_PRODUCTS)
  const [progress,   setProgress]   = useLocalStorage('bl_progress',  INIT_PROGRESS)
  const [finance,    setFinance]    = useLocalStorage('bl_finance',   INIT_FINANCE)
  const [tasks,      setTasks]      = useLocalStorage('bl_tasks',     INIT_TASKS)
  const [documents,  setDocuments]  = useLocalStorage('bl_documents', INIT_DOCUMENTS)

  // ── Load from Supabase on mount (only when authenticated) ───────────────────
  useEffect(() => {
    if (!authenticated || !SUPABASE_CONFIGURED) return
    flushSyncQueue().catch(console.warn)
    loadTransactionsFromCloud()
      .then(rows => {
        if (!rows || rows.length === 0) return
        const mapped = rows.map(r => ({
          id:               r.id,
          date:             r.date,
          type:             r.type,
          amount:           parseFloat(r.amount) || 0,
          category:         r.category,
          description:      r.description,
          supplierPayee:    r.supplier_payee || '',
          paymentMethod:    r.payment_method || 'EFT',
          notes:            r.notes || '',
          invoiceNumber:    r.invoice_number || '',
          vatAmount:        parseFloat(r.vat_amount) || 0,
          source:           r.source || 'manual',
          sourceFile:       r.source_file || '',
          sourceDocumentId: r.source_document_id || null,
          sourceDocId:      r.source_document_id || null,
        }))
        setFinance(mapped)
      })
      .catch(e => console.warn('[App] Supabase txn load:', e.message))

    loadDocumentsFromCloud()
      .then(rows => {
        if (!rows || rows.length === 0) return
        const mapped = rows.map(r => ({
          id:              r.id,
          supabaseId:      r.id,
          name:            r.file_name,
          fileName:        r.file_name,
          fileType:        r.file_type,
          fileSize:        r.file_size_display || '',
          fileSizeBytes:   r.file_size_bytes || 0,
          category:        r.category || 'General',
          dateUploaded:    r.date_uploaded || r.created_at?.split('T')[0] || '',
          notes:           r.notes || '',
          supplier:        r.supplier_name || '',
          storagePath:     r.storage_path,
          publicUrl:       r.public_url,
          linkedTransactionId: r.linked_transaction_id || null,
          hasFile:         true,
          storageBackend:  'supabase',
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

  const allData = { suppliers:safeSuppliers, products:safeProducts, progress:safeProgress, finance:safeFinance, tasks:safeTasks, documents:safeDocuments }

  const onRestore = useCallback(d => {
    try {
      if (!d || typeof d !== 'object') throw new Error('Invalid backup data')
      if (Array.isArray(d.suppliers)  && d.suppliers.length  >= 0) setSuppliers(d.suppliers)
      if (Array.isArray(d.products)   && d.products.length   >= 0) setProducts(d.products)
      if (Array.isArray(d.progress)   && d.progress.length   >= 0) setProgress(d.progress)
      if (Array.isArray(d.finance)    && d.finance.length    >= 0) setFinance(d.finance)
      if (Array.isArray(d.tasks)      && d.tasks.length      >= 0) setTasks(d.tasks)
      if (Array.isArray(d.documents)  && d.documents.length  >= 0) setDocuments(d.documents)
    } catch (err) { console.error('[Botanica] Restore failed:', err); alert('Restore failed: ' + err.message) }
  }, [setSuppliers, setProducts, setProgress, setFinance, setTasks, setDocuments])

  const navigate = useCallback(p => { setPage(p); setMobileOpen(false) }, [])

  // ── Login gate ──────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <ErrorBoundary>
        <LoginScreen onAuthenticated={handleAuthenticated} />
      </ErrorBoundary>
    )
  }

  // ── Main app ────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <style>{css}</style>
      <div className="app">
        <Sidebar page={page} setPage={navigate} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onLogout={handleLogout} />
        <main className="main">
          <PageBoundary pageName={page}>
            {page === 'dashboard'  && <Dashboard         suppliers={safeSuppliers} products={safeProducts} finance={safeFinance} tasks={safeTasks} documents={safeDocuments} setPage={navigate} />}
            {page === 'progress'   && <BusinessProgress  progress={safeProgress}   setProgress={setProgress} />}
            {page === 'finance'    && <FinanceCentre      finance={safeFinance}     setFinance={setFinance} />}
            {page === 'actions'    && <ActionCentre       tasks={safeTasks}         setTasks={setTasks} />}
            {page === 'documents'  && <BusinessDocuments  documents={safeDocuments} setDocuments={setDocuments} finance={safeFinance} />}
            {page === 'suppliers'  && <Suppliers          suppliers={safeSuppliers} setSuppliers={setSuppliers} />}
            {page === 'products'   && <Products           products={safeProducts}   setProducts={setProducts} suppliers={safeSuppliers} />}
            {page === 'calculator' && <Calculator />}
            {page === 'checkers'   && <CheckersHyper />}
            {page === 'founders'   && <FoundersCollection products={safeProducts} />}
            {page === 'strategy'   && <Strategy />}
            {page === 'settings'   && <Settings           allData={allData}         onRestore={onRestore} onLogout={handleLogout} />}
          </PageBoundary>
        </main>
      </div>
    </ErrorBoundary>
  )
}
