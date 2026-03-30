import { useLocation } from 'react-router-dom'
import './Topbar.css'

const PAGE_META = {
  '/': { title: 'Overview', subtitle: 'Your tax year at a glance' },
  '/crypto-tax': { title: 'Crypto Tax', subtitle: 'CGT events & cost base tracking' },
  '/deductions': { title: 'Deductions', subtitle: 'Work-related expense finder' },
  '/income': { title: 'Income & Docs', subtitle: 'Payslips, PAYG & payment summaries' },
  '/lodgement': { title: 'Lodgement Prep', subtitle: 'Return summary & export' },
}

export default function Topbar() {
  const location = useLocation()
  const meta = PAGE_META[location.pathname] ?? PAGE_META['/']

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-title">{meta.title}</h2>
        <span className="topbar-subtitle">{meta.subtitle}</span>
      </div>
      <div className="topbar-right">
        <div className="fy-chip">
          <span className="fy-chip-dot" />
          <span>FY 2024–25</span>
        </div>
        <div className="topbar-ato-badge">ATO</div>
      </div>
    </header>
  )
}
