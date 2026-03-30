import '../styles/pages.css'

const DOC_TYPES = [
  { title: 'Payslips', desc: 'Upload payslips from each employer to track gross income and tax withheld throughout the year.' },
  { title: 'PAYG Payment Summaries', desc: 'End-of-year summaries (group certificates) showing total income and tax withheld.' },
  { title: 'Payment Summaries — Other', desc: 'Government payments, employment termination payments, and foreign income.' },
  { title: 'Interest & Dividends', desc: 'Bank interest statements and dividend notices from shares or ETFs.' },
  { title: 'Rental Income', desc: 'Rental statements and property income documentation for investment properties.' },
]

export default function Income() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Income & Docs</h1>
        <p>Consolidate your payslips, PAYG summaries, and other income documents in one place.</p>
      </div>

      <div className="income-summary-row">
        <div className="income-summary-card">
          <div className="status-card-label">Total Gross Income</div>
          <div className="status-card-value">—</div>
        </div>
        <div className="income-summary-card">
          <div className="status-card-label">Total Tax Withheld</div>
          <div className="status-card-value">—</div>
        </div>
        <div className="income-summary-card">
          <div className="status-card-label">Documents Uploaded</div>
          <div className="status-card-value">0</div>
        </div>
      </div>

      <hr className="divider" />

      <div className="section-heading">
        <h2>Document types</h2>
        <span className="section-sub">Upload documents in any order — we'll match them automatically</span>
      </div>

      <div className="placeholder-grid">
        {DOC_TYPES.map((doc) => (
          <div className="placeholder-card" key={doc.title}>
            <div className="placeholder-card-title">{doc.title}</div>
            <p className="placeholder-card-desc">{doc.desc}</p>
            <button className="upload-btn upload-btn--small" disabled>Upload</button>
          </div>
        ))}
      </div>
    </div>
  )
}
