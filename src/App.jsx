import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Overview from './pages/Overview'
import CryptoTax from './pages/CryptoTax'
import Deductions from './pages/Deductions'
import Income from './pages/Income'
import Lodgement from './pages/Lodgement'
import { TaxProvider } from './context/TaxContext'
import './App.css'

function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/crypto-tax" element={<CryptoTax />} />
            <Route path="/deductions" element={<Deductions />} />
            <Route path="/income" element={<Income />} />
            <Route path="/lodgement" element={<Lodgement />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <TaxProvider>
        <Layout />
      </TaxProvider>
    </BrowserRouter>
  )
}
