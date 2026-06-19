import { useState } from 'react'
import css from './utils/css.js'
import useLocalStorage from './hooks/useLocalStorage.js'
import { INIT_SUPPLIERS, INIT_PRODUCTS, INIT_PROGRESS, INIT_FINANCE, INIT_TASKS, INIT_DOCUMENTS } from './utils/data.js'

import Sidebar           from './components/Sidebar.jsx'
import Dashboard         from './pages/Dashboard.jsx'
import BusinessProgress  from './pages/BusinessProgress.jsx'
import FinanceCentre     from './pages/FinanceCentre.jsx'
import ActionCentre      from './pages/ActionCentre.jsx'
import BusinessDocuments from './pages/BusinessDocuments.jsx'
import Suppliers         from './pages/Suppliers.jsx'
import Products          from './pages/Products.jsx'
import Settings          from './pages/Settings.jsx'
import { Calculator, CheckersHyper, FoundersCollection, Strategy } from './pages/OtherPages.jsx'

export default function App() {
  const [page,       setPage]       = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  const [suppliers,  setSuppliers]  = useLocalStorage('bl_suppliers', INIT_SUPPLIERS)
  const [products,   setProducts]   = useLocalStorage('bl_products',  INIT_PRODUCTS)
  const [progress,   setProgress]   = useLocalStorage('bl_progress',  INIT_PROGRESS)
  const [finance,    setFinance]    = useLocalStorage('bl_finance',   INIT_FINANCE)
  const [tasks,      setTasks]      = useLocalStorage('bl_tasks',     INIT_TASKS)
  const [documents,  setDocuments]  = useLocalStorage('bl_documents', INIT_DOCUMENTS)

  const allData  = { suppliers, products, progress, finance, tasks, documents }
  const onRestore = d => {
    if (d.suppliers)  setSuppliers(d.suppliers)
    if (d.products)   setProducts(d.products)
    if (d.progress)   setProgress(d.progress)
    if (d.finance)    setFinance(d.finance)
    if (d.tasks)      setTasks(d.tasks)
    if (d.documents)  setDocuments(d.documents)
  }

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <Sidebar page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="main">
          {page === 'dashboard'  && <Dashboard         suppliers={suppliers} products={products} finance={finance} tasks={tasks} documents={documents} setPage={setPage} />}
          {page === 'progress'   && <BusinessProgress  progress={progress}   setProgress={setProgress} />}
          {page === 'finance'    && <FinanceCentre      finance={finance}     setFinance={setFinance} />}
          {page === 'actions'    && <ActionCentre       tasks={tasks}         setTasks={setTasks} />}
          {page === 'documents'  && <BusinessDocuments  documents={documents} setDocuments={setDocuments} finance={finance} />}
          {page === 'suppliers'  && <Suppliers          suppliers={suppliers} setSuppliers={setSuppliers} />}
          {page === 'products'   && <Products           products={products}   setProducts={setProducts} suppliers={suppliers} />}
          {page === 'calculator' && <Calculator />}
          {page === 'checkers'   && <CheckersHyper />}
          {page === 'founders'   && <FoundersCollection products={products} />}
          {page === 'strategy'   && <Strategy />}
          {page === 'settings'   && <Settings           allData={allData}    onRestore={onRestore} />}
        </main>
      </div>
    </>
  )
}
