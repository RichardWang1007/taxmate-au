import { Link } from 'react-router-dom'
import '../styles/pages.css'
import { useTax } from '../context/useTax'
import { calculateIncomeTax } from '../utils/taxCalculator'

function formatAUD(n) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function getStatusClass(status) {
  if (status === 'In progress') return 'module-status module-status--in-progress'
  if (status === 'Complete') return 'module-status module-status--complete'
  return 'module-status'
}

function moduleStatus(key, { cgtResult, deductionItems, payslips, otherIncome }) {
  switch (key) {
    case 'crypto': return cgtResult ? 'Complete' : 'Not started'
    case 'deductions': {
      if (deductionItems.length === 0) return 'Not started'
      const pending = deductionItems.filter(d => d.status === 'pending').length
      return pending === 0 ? 'Complete' : 'In progress'
    }
    case 'income': return (payslips.length > 0 || otherIncome.length > 0)
      ? (payslips.length > 0 ? 'Complete' : 'In progress')
      : 'Not started'
    case 'lodgement': {
      const hasIncome = payslips.length > 0 || otherIncome.length > 0
      const hasCrypto = !!cgtResult
      const hasDeductions = deductionItems.length > 0
      const pendingDeductions = deductionItems.filter(d => d.status === 'pending').length
      const deductionsReviewed = hasDeductions && pendingDeductions === 0

      if (hasIncome && hasCrypto && deductionsReviewed) return 'Complete'
      if (hasIncome || hasCrypto || hasDeductions) return 'In progress'
      return 'Not started'
    }
    default: return 'Not started'
  }
}

const MODULE_DEFS = [
  {
    key: 'crypto',
    label: 'Module 01',
    title: 'Crypto Tax',
    desc: 'Upload exchange CSVs to detect CGT events, calculate cost base using FIFO, and apply the 50% discount for assets held over 12 months.',
    path: '/crypto-tax',
  },
  {
    key: 'deductions',
    label: 'Module 02',
    title: 'Deductions',
    desc: 'Connect your bank statements and let the AI identify ATO-claimable work-related expenses for your review and approval.',
    path: '/deductions',
  },
  {
    key: 'income',
    label: 'Module 03',
    title: 'Income & Docs',
    desc: 'Upload payslips, PAYG summaries, and payment documents to build a complete picture of your income for the financial year.',
    path: '/income',
  },
  {
    key: 'lodgement',
    label: 'Module 04',
    title: 'Lodgement Prep',
    desc: 'Generate a full return summary across all modules, ready to export for your accountant or import directly into myGov.',
    path: '/lodgement',
  },
]

export default function Overview() {
  const { cgtResult, deductionItems, payslips, otherIncome } = useTax()

  const totalGross = payslips.reduce((s, p) => s + p.grossEarnings, 0)
    + otherIncome.reduce((s, o) => s + o.amount, 0)
  const totalTaxWithheld = payslips.reduce((s, p) => s + p.taxWithheld, 0)
  const totalDeductions = deductionItems.filter(d => d.status === 'approved').reduce((s, d) => s + d.amountAUD, 0)
  const taxableIncome = Math.max(0, totalGross - totalDeductions)
  const { netTax } = totalGross > 0 ? calculateIncomeTax(taxableIncome) : { netTax: 0 }
  const netCGT = cgtResult?.summary?.netCGT ?? 0
  const totalTaxPayable = netTax + Math.max(0, netCGT)
  const estimatedRefund = totalGross > 0 ? (totalTaxWithheld - totalTaxPayable) : null

  const STATUS_CARDS = [
    {
      label: 'Est. Refund',
      value: estimatedRefund !== null ? formatAUD(Math.abs(estimatedRefund)) : '—',
      subLabel: estimatedRefund !== null ? (estimatedRefund >= 0 ? 'refund' : 'liability') : null,
      accent: estimatedRefund !== null && estimatedRefund >= 0,
    },
    { label: 'CGT Events', value: cgtResult ? String(cgtResult.summary.eventCount) : '0' },
    { label: 'Deductions', value: totalDeductions > 0 ? formatAUD(totalDeductions) : '$0' },
    { label: 'Income Sources', value: String(new Set(payslips.map(p => p.employer)).size + otherIncome.length) },
  ]

  const contextData = { cgtResult, deductionItems, payslips, otherIncome }

  return (
    <div className="page-container">
      {/* Hero refund banner */}
      <div className="refund-hero">
        <div className="refund-hero-left">
          <div className="refund-hero-label">Estimated Refund / Liability</div>
          {estimatedRefund !== null ? (
            <>
              <div className={`refund-hero-value${estimatedRefund < 0 ? '' : ''}`} style={{
                color: estimatedRefund >= 0 ? 'var(--accent)' : '#f0a040'
              }}>
                {formatAUD(Math.abs(estimatedRefund))}
              </div>
              <p className="refund-hero-sub">
                {estimatedRefund >= 0 ? 'Estimated refund' : 'Estimated liability'} — estimate only
              </p>
            </>
          ) : (
            <>
              <div className="refund-hero-value refund-hero-value--muted">—</div>
              <p className="refund-hero-sub">Complete all modules to calculate your return</p>
            </>
          )}
        </div>
        <div className="refund-hero-right">FY 2024–25</div>
      </div>

      {/* Stat pills */}
      <div className="stat-pills">
        {STATUS_CARDS.map((pill) => (
          <div className="stat-pill" key={pill.label}>
            <div className="stat-pill-label">{pill.label}</div>
            <div className={`stat-pill-value${pill.accent ? ' accent' : ''}`}>{pill.value}</div>
            {pill.subLabel && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pill.subLabel}</div>
            )}
          </div>
        ))}
      </div>

      <div className="section-heading">
        <h2>Modules</h2>
        <span className="section-sub">Complete each module to build your return</span>
      </div>

      <div className="module-grid">
        {MODULE_DEFS.map((mod) => {
          const status = moduleStatus(mod.key, contextData)
          const progress = status === 'Complete' ? 100 : status === 'In progress' ? 50 : 0
          return (
            <Link to={mod.path} className="module-card" key={mod.title}>
              <div className="module-card-top">
                <div className="module-card-top-left">
                  <span className="module-label">{mod.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={getStatusClass(status)}>{status}</span>
                  <span className="module-arrow">→</span>
                </div>
              </div>
              <div className="module-card-body">
                <h3 className="module-title">{mod.title}</h3>
                <p className="module-desc">{mod.desc}</p>
              </div>
              <div className="module-progress-track">
                <div className="module-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
