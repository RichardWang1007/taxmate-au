import '../styles/pages.css'

const STATUS_CARDS = [
  { label: 'Est. Refund', value: '—', accent: true },
  { label: 'CGT Events', value: '0' },
  { label: 'Deductions Found', value: '$0' },
  { label: 'Income Sources', value: '0' },
]

const MODULES = [
  {
    label: 'Module 01',
    title: 'Crypto Tax',
    desc: 'Upload exchange CSVs to detect CGT events, calculate cost base using FIFO, and apply the 50% discount for assets held over 12 months.',
    path: '/crypto-tax',
    status: 'Not started',
  },
  {
    label: 'Module 02',
    title: 'Deductions',
    desc: 'Connect your bank statements and let the AI identify ATO-claimable work-related expenses for your review and approval.',
    path: '/deductions',
    status: 'Not started',
  },
  {
    label: 'Module 03',
    title: 'Income & Docs',
    desc: 'Upload payslips, PAYG summaries, and payment documents to build a complete picture of your income for the financial year.',
    path: '/income',
    status: 'Not started',
  },
  {
    label: 'Module 04',
    title: 'Lodgement Prep',
    desc: 'Generate a full return summary across all modules, ready to export for your accountant or import directly into myGov.',
    path: '/lodgement',
    status: 'Not started',
  },
]

export default function Overview() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Good evening</h1>
        <p>Here's where your FY 2024–25 return stands.</p>
      </div>

      <div className="status-grid">
        {STATUS_CARDS.map((card) => (
          <div className="status-card" key={card.label}>
            <div className="status-card-label">{card.label}</div>
            <div className={`status-card-value${card.accent ? ' accent' : ''}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <hr className="divider" />

      <div className="section-heading">
        <h2>Modules</h2>
        <span className="section-sub">Complete each module to build your return</span>
      </div>

      <div className="module-grid">
        {MODULES.map((mod) => (
          <div className="module-card" key={mod.title}>
            <div className="module-card-top">
              <span className="module-label">{mod.label}</span>
              <span className="module-status">{mod.status}</span>
            </div>
            <h3 className="module-title">{mod.title}</h3>
            <p className="module-desc">{mod.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
