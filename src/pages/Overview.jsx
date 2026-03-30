import { Link } from 'react-router-dom'
import '../styles/pages.css'

const STAT_PILLS = [
  { label: 'Est. Refund', value: '—', accent: true },
  { label: 'CGT Events', value: '0' },
  { label: 'Deductions', value: '$0' },
  { label: 'Income Sources', value: '0' },
]

const MODULES = [
  {
    label: 'Module 01',
    title: 'Crypto Tax',
    desc: 'Upload exchange CSVs to detect CGT events, calculate cost base using FIFO, and apply the 50% discount for assets held over 12 months.',
    path: '/crypto-tax',
    status: 'Not started',
    progress: 0,
  },
  {
    label: 'Module 02',
    title: 'Deductions',
    desc: 'Connect your bank statements and let the AI identify ATO-claimable work-related expenses for your review and approval.',
    path: '/deductions',
    status: 'Not started',
    progress: 0,
  },
  {
    label: 'Module 03',
    title: 'Income & Docs',
    desc: 'Upload payslips, PAYG summaries, and payment documents to build a complete picture of your income for the financial year.',
    path: '/income',
    status: 'Not started',
    progress: 0,
  },
  {
    label: 'Module 04',
    title: 'Lodgement Prep',
    desc: 'Generate a full return summary across all modules, ready to export for your accountant or import directly into myGov.',
    path: '/lodgement',
    status: 'Not started',
    progress: 0,
  },
]

function getStatusClass(status) {
  if (status === 'In progress') return 'module-status module-status--in-progress'
  if (status === 'Complete') return 'module-status module-status--complete'
  return 'module-status'
}

export default function Overview() {
  return (
    <div className="page-container">
      {/* Hero refund banner */}
      <div className="refund-hero">
        <div className="refund-hero-left">
          <div className="refund-hero-label">Estimated Refund / Liability</div>
          <div className="refund-hero-value refund-hero-value--muted">—</div>
          <p className="refund-hero-sub">Complete all modules to calculate your return</p>
        </div>
        <div className="refund-hero-right">FY 2024–25</div>
      </div>

      {/* Stat pills */}
      <div className="stat-pills">
        {STAT_PILLS.map((pill) => (
          <div className="stat-pill" key={pill.label}>
            <div className="stat-pill-label">{pill.label}</div>
            <div className={`stat-pill-value${pill.accent ? ' accent' : ''}`}>{pill.value}</div>
          </div>
        ))}
      </div>

      <div className="section-heading">
        <h2>Modules</h2>
        <span className="section-sub">Complete each module to build your return</span>
      </div>

      <div className="module-grid">
        {MODULES.map((mod) => (
          <Link to={mod.path} className="module-card" key={mod.title}>
            <div className="module-card-top">
              <div className="module-card-top-left">
                <span className="module-label">{mod.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={getStatusClass(mod.status)}>{mod.status}</span>
                <span className="module-arrow">→</span>
              </div>
            </div>
            <div className="module-card-body">
              <h3 className="module-title">{mod.title}</h3>
              <p className="module-desc">{mod.desc}</p>
            </div>
            <div className="module-progress-track">
              <div className="module-progress-fill" style={{ width: `${mod.progress}%` }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
