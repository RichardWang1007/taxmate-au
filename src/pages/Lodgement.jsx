import '../styles/pages.css'

const CHECKLIST = [
  { label: 'Crypto CGT events calculated', done: false },
  { label: 'Deductions reviewed and approved', done: false },
  { label: 'Income documents uploaded', done: false },
  { label: 'PAYG summaries confirmed', done: false },
  { label: 'Medicare levy surcharge assessed', done: false },
  { label: 'Private health insurance details added', done: false },
]

export default function Lodgement() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Lodgement Prep</h1>
        <p>Review your complete return summary and export it for your accountant or myGov lodgement.</p>
      </div>

      <div className="lodge-refund-hero">
        <div className="lodge-refund-label">Estimated Refund / Liability</div>
        <div className="lodge-refund-value">Complete all modules to calculate</div>
      </div>

      <hr className="divider" />

      <div className="section-heading">
        <h2>Pre-lodgement checklist</h2>
        <span className="section-sub">Complete every item before exporting</span>
      </div>

      <div className="checklist">
        {CHECKLIST.map((item) => (
          <div className="checklist-item" key={item.label}>
            <span className={`check-box${item.done ? ' check-box--done' : ''}`}>
              {item.done && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span className="checklist-label">{item.label}</span>
          </div>
        ))}
      </div>

      <hr className="divider" />

      <div className="section-heading">
        <h2>Export options</h2>
        <span className="section-sub">Available once all checklist items are complete</span>
      </div>

      <div className="export-grid">
        <div className="export-card">
          <div className="placeholder-card-title">Accountant PDF</div>
          <p className="placeholder-card-desc">Full summary with supporting schedules, formatted for your tax agent.</p>
          <button className="export-btn" disabled>Export PDF</button>
        </div>
        <div className="export-card">
          <div className="placeholder-card-title">myGov Import</div>
          <p className="placeholder-card-desc">Pre-filled data package compatible with ATO myTax lodgement.</p>
          <button className="export-btn" disabled>Export for myGov</button>
        </div>
      </div>
    </div>
  )
}
