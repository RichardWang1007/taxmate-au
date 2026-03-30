import { NavLink } from 'react-router-dom'
import './Sidebar.css'

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    path: '/crypto-tax',
    label: 'Crypto Tax',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 5.5h2.5c.8 0 1.5.6 1.5 1.5s-.7 1.5-1.5 1.5H6m0-3v5m0-5V5m0 5.5H8.8c.9 0 1.7-.7 1.7-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="8" y1="4" x2="8" y2="5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="8" y1="10.5" x2="8" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    path: '/deductions',
    label: 'Deductions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="12.5" cy="11.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M11.5 11.5h2M12.5 10.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    path: '/income',
    label: 'Income & Docs',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2.5" y="1.5" width="9" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 5.5h4M5 8h4M5 10.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M11.5 6l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/lodgement',
    label: 'Lodgement Prep',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 11v1.5A1.5 1.5 0 003.5 14h9A1.5 1.5 0 0014 12.5V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-mark">T</span>
        <span className="logo-text">TaxMate<span className="logo-au"> AU</span></span>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Navigation</span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `nav-item${isActive ? ' nav-item--active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="fy-badge">
          <span className="fy-dot" />
          <span>FY 2024–25</span>
        </div>
      </div>
    </aside>
  )
}
