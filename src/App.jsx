import { useState, useEffect } from 'react'
import css from './global.js'
import Sidebar from './Sidebar.jsx'
import Dashboard from './Dashboard.jsx'
import BusinessProgress from './BusinessProgress.jsx'
import Suppliers from './Suppliers.jsx'
import Products from './Products.jsx'
import Calculator from './Calculator.jsx'
import CheckersHyper from './CheckersHyper.jsx'
import FoundersCollection from './FoundersCollection.jsx'
import Strategy from './Strategy.jsx'

const INIT_SUPPLIERS = [
  { id: 1, name: 'Frank / Dongyi', contact: 'Frank Chen', country: 'China', email: 'frank@dongyi.cn', whatsapp: '+86 138 0000 1234', terms: 'FOB', notes: 'Primary supplier. Fast samples. Excellent quality on Olive & Ficus range.', status: 'Active' },
  { id: 2, name: 'Campion / Trustfloral', contact: 'Sarah Campion', country: 'China', email: 'sarah@trustfloral.com', whatsapp: '+86 755 0000 5678', terms: 'EXW', notes: 'Specialist in hanging greenery and boxwood panels. Good for design range.', status: 'Active' },
]

const INIT_PRODUCTS = [
  { id: 1, name: 'Premium Olive Tree 180cm', category: 'Trees', supplier: 'Frank / Dongyi', sku: 'DON-OLV-180', height: '180cm', moq: 50, exwPrice: 28, fobPrice: 31, cifPrice: 34, sampleCost: 85, leadTime: '45 days', assembly: true,  foundersCollection: true,  sampleStatus: 'Received' },
  { id: 2, name: 'Ficus Tree 180cm',         category: 'Trees', supplier: 'Frank / Dongyi', sku: 'DON-FIC-180', height: '180cm', moq: 50, exwPrice: 24, fobPrice: 27, cifPrice: 30, sampleCost: 75, leadTime: '45 days', assembly: true,  foundersCollection: true,  sampleStatus: 'Received' },
  { id: 3, name: 'Palm Tree 180cm',          category: 'Trees', supplier: 'Frank / Dongyi', sku: 'DON-PLM-180', height: '180cm', moq: 50, exwPrice: 22, fobPrice: 25, cifPrice: 28, sampleCost: 70, leadTime: '50 days', assembly: true,  foundersCollection: false, sampleStatus: 'Ordered'  },
  { id: 4, name: 'Designer Pot Plant',        category: 'Pot Plants', supplier: 'Frank / Dongyi', sku: 'DON-POT-DES', height: '60cm', moq: 100, exwPrice: 12, fobPrice: 14, cifPrice: 16, sampleCost: 45, leadTime: '35 days', assembly: false, foundersCollection: true,  sampleStatus: 'Received' },
  { id: 5, name: 'Hanging Greenery',          category: 'Hanging', supplier: 'Campion / Trustfloral', sku: 'TRF-HNG-001', height: '90cm drop', moq: 200, exwPrice: 6, fobPrice: 7.5, cifPrice: 8.5, sampleCost: 30, leadTime: '30 days', assembly: false, foundersCollection: false, sampleStatus: 'Pending'  },
  { id: 6, name: 'Boxwood Panel 60×60',       category: 'Panels', supplier: 'Campion / Trustfloral', sku: 'TRF-BOX-6060', height: '60×60cm', moq: 100, exwPrice: 18, fobPrice: 20.5, cifPrice: 22, sampleCost: 55, leadTime: '40 days', assembly: false, foundersCollection: true,  sampleStatus: 'Received' },
]

function useLS(key, init) {
  const [val, setVal] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init } catch { return init } })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)) }, [key, val])
  return [val, setVal]
}

export default function App() {
  const [page, setPage]           = useState('dashboard')
  const [suppliers, setSuppliers] = useLS('bl_suppliers', INIT_SUPPLIERS)
  const [products,  setProducts]  = useLS('bl_products',  INIT_PRODUCTS)

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <Sidebar page={page} setPage={setPage} />
        <main className="main">
          {page === 'dashboard'  && <Dashboard          suppliers={suppliers} products={products} />}
          {page === 'progress'   && <BusinessProgress />}
          {page === 'suppliers'  && <Suppliers          suppliers={suppliers} setSuppliers={setSuppliers} />}
          {page === 'products'   && <Products           products={products}   setProducts={setProducts} suppliers={suppliers} />}
          {page === 'calculator' && <Calculator />}
          {page === 'checkers'   && <CheckersHyper />}
          {page === 'founders'   && <FoundersCollection products={products} />}
          {page === 'strategy'   && <Strategy />}
        </main>
      </div>
    </>
  )
}
