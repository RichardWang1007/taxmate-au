import '../styles/pages.css'

const CATEGORIES = [
  { title: 'Work-Related Travel', desc: 'Logbook mileage, public transport, flights for work purposes.' },
  { title: 'Home Office', desc: 'Fixed rate or actual cost method for working from home expenses.' },
  { title: 'Tools & Equipment', desc: 'Purchases and depreciation for tools used in your occupation.' },
  { title: 'Self-Education', desc: 'Courses, books, and training directly related to your current role.' },
  { title: 'Uniforms & Protective Gear', desc: 'Occupation-specific clothing, safety equipment, and laundering.' },
  { title: 'Other Deductions', desc: 'Union fees, professional memberships, income protection insurance.' },
]

export default function Deductions() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Deductions</h1>
        <p>Upload your bank statements and let the AI flag ATO-claimable work-related expenses for your review.</p>
      </div>

      <div className="upload-zone">
        <div className="upload-zone-inner">
          <div className="upload-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 4v14M8 10l6-6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 20v1.5A2.5 2.5 0 006.5 24h15a2.5 2.5 0 002.5-2.5V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="upload-title">Upload bank statement</p>
          <p className="upload-sub">CSV or OFX — your data never leaves your device</p>
          <button className="upload-btn" disabled>Choose file</button>
        </div>
      </div>

      <hr className="divider" />

      <div className="section-heading">
        <h2>Claimable categories</h2>
        <span className="section-sub">ATO-recognised expense types the AI will look for</span>
      </div>

      <div className="placeholder-grid">
        {CATEGORIES.map((cat) => (
          <div className="placeholder-card" key={cat.title}>
            <div className="placeholder-card-title">{cat.title}</div>
            <p className="placeholder-card-desc">{cat.desc}</p>
            <span className="coming-soon-badge">Auto-detection coming soon</span>
          </div>
        ))}
      </div>
    </div>
  )
}
