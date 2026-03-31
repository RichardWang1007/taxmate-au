import { useState, useRef } from 'react'
import '../styles/pages.css'
import { parsePayslipCSV } from '../utils/parsers/payslip'
import { calculateIncomeTax } from '../utils/taxCalculator'
import { INCOME_FY } from '../data/sampleIncome'
import { useTax } from '../context/useTax'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OTHER_INCOME_TYPES = [
  { id: 'interest',    label: 'Bank Interest' },
  { id: 'dividends',   label: 'Dividends' },
  { id: 'rental',      label: 'Rental Income' },
  { id: 'freelance',   label: 'Freelance / Contracting' },
  { id: 'government',  label: 'Government Payments' },
  { id: 'foreign',     label: 'Foreign Income' },
  { id: 'other',       label: 'Other' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAUD(n) {
  if (n === 0) return '$0'
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(date) {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMonthYear(date) {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

/** Group an array by a key function, returning a Map preserving insertion order. */
function groupBy(arr, keyFn) {
  const map = new Map()
  for (const item of arr) {
    const key = keyFn(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return map
}

/** Check if two payslips are exact duplicates (same periodEnd + employer + grossEarnings). */
function isDuplicate(existing, incoming) {
  return existing.some(
    p =>
      p.employer === incoming.employer &&
      p.grossEarnings === incoming.grossEarnings &&
      p.periodEnd instanceof Date &&
      incoming.periodEnd instanceof Date &&
      p.periodEnd.getTime() === incoming.periodEnd.getTime()
  )
}

function otherIncomeTypeLabel(typeId) {
  return OTHER_INCOME_TYPES.find(t => t.id === typeId)?.label ?? typeId
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPills({ totalGross, totalTaxWithheld, totalSuper, sourceCount }) {
  return (
    <div className="stat-pills">
      <div className="stat-pill">
        <div className="stat-pill-label">Total Gross Income</div>
        <div className={`stat-pill-value${totalGross > 0 ? ' accent' : ''}`}>
          {totalGross > 0 ? formatAUD(totalGross) : '—'}
        </div>
      </div>
      <div className="stat-pill">
        <div className="stat-pill-label">Total Tax Withheld</div>
        <div className="stat-pill-value">
          {totalTaxWithheld > 0 ? formatAUD(totalTaxWithheld) : '—'}
        </div>
      </div>
      <div className="stat-pill">
        <div className="stat-pill-label">Total Super (SGC)</div>
        <div className="stat-pill-value">
          {totalSuper > 0 ? formatAUD(totalSuper) : '—'}
        </div>
      </div>
      <div className="stat-pill">
        <div className="stat-pill-label">Income Sources</div>
        <div className="stat-pill-value">{sourceCount}</div>
      </div>
    </div>
  )
}

function UploadZone({ isDragging, onDragOver, onDragLeave, onDrop, onClick, fileInputRef, onFileChange }) {
  return (
    <div
      className={`upload-zone${isDragging ? ' upload-zone--dragging' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
    >
      <div className="upload-zone-inner">
        <div className="upload-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="upload-title">Drop payslip CSV here</div>
        <div className="upload-sub">Supports exports from Xero Payroll, MYOB, Employment Hero</div>
        <button className="upload-btn" type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>
          Choose file
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Payslips tab
// ---------------------------------------------------------------------------

function PayslipsTab({ payslips, setPayslips, isDragging, setIsDragging, setError, showForm, setShowForm }) {
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    periodEnd: '', employer: '', grossEarnings: '', taxWithheld: '', super: '', netPay: ''
  })
  const [formError, setFormError] = useState(null)

  function handleDragOver(e) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function processFile(file) {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = parsePayslipCSV(e.target.result)
        if (parsed.length === 0) {
          setError('No payslip rows found in CSV. Check the file format.')
          return
        }
        setPayslips(prev => {
          const toAdd = parsed.filter(p => !isDuplicate(prev, p))
          const skippedCount = parsed.length - toAdd.length
          if (skippedCount > 0) {
            setError(
              skippedCount === parsed.length
                ? 'Duplicate upload detected: all payslips in this file were already added.'
                : `Skipped ${skippedCount} duplicate payslip${skippedCount !== 1 ? 's' : ''}.`
            )
          }
          // Re-index ids to avoid collisions
          const reindexed = toAdd.map((p, i) => ({ ...p, id: `payslip-${prev.length + i}` }))
          return [...prev, ...reindexed]
        })
      } catch {
        setError('Could not parse payslip CSV. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }

  function handleFormChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    const gross = parseFloat(form.grossEarnings)
    if (!gross || gross <= 0) {
      setFormError('Gross earnings must be greater than 0.')
      return
    }
    if (!form.periodEnd) {
      setFormError('Please enter a pay period end date.')
      return
    }
    setFormError(null)
    const newPayslip = {
      id: `payslip-manual-${Date.now()}`,
      periodEnd: new Date(form.periodEnd),
      employer: form.employer.trim() || 'Unknown Employer',
      grossEarnings: parseFloat(form.grossEarnings) || 0,
      taxWithheld: parseFloat(form.taxWithheld) || 0,
      super: parseFloat(form.super) || 0,
      netPay: parseFloat(form.netPay) || 0,
    }
    setPayslips(prev => [...prev, newPayslip])
    setForm({ periodEnd: '', employer: '', grossEarnings: '', taxWithheld: '', super: '', netPay: '' })
    setShowForm(false)
  }

  function removePayslip(id) {
    setPayslips(prev => prev.filter(p => p.id !== id))
  }

  const grouped = groupBy(payslips, p => p.employer)

  return (
    <div>
      <UploadZone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
      />

      {!showForm && (
        <button className="btn-add-manual" type="button" onClick={() => setShowForm(true)}>
          + Add payslip manually
        </button>
      )}

      {showForm && (
        <div className="manual-form">
          <div className="manual-form-title">Add Payslip</div>
          {formError && <div className="error-banner">{formError}</div>}
          <form onSubmit={handleFormSubmit}>
            <div className="manual-form-grid">
              <div className="form-field">
                <label className="form-label">Pay Period End</label>
                <input
                  className="form-input"
                  type="date"
                  name="periodEnd"
                  value={form.periodEnd}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Employer</label>
                <input
                  className="form-input"
                  type="text"
                  name="employer"
                  value={form.employer}
                  placeholder="e.g. Acme Pty Ltd"
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Gross Earnings ($)</label>
                <input
                  className="form-input"
                  type="number"
                  name="grossEarnings"
                  value={form.grossEarnings}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">Tax Withheld ($)</label>
                <input
                  className="form-input"
                  type="number"
                  name="taxWithheld"
                  value={form.taxWithheld}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Super ($)</label>
                <input
                  className="form-input"
                  type="number"
                  name="super"
                  value={form.super}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Net Pay ($)</label>
                <input
                  className="form-input"
                  type="number"
                  name="netPay"
                  value={form.netPay}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <div className="manual-form-actions">
              <button className="btn-primary" type="submit">Add Payslip</button>
              <button className="btn-ghost" type="button" onClick={() => { setShowForm(false); setFormError(null) }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {payslips.length === 0 ? (
        <div className="empty-state">No payslips yet — upload a CSV or add manually</div>
      ) : (
        Array.from(grouped.entries()).map(([employer, slips]) => (
          <div className="payslip-group" key={employer}>
            <div className="payslip-group-heading">{employer}</div>
            {slips.map(slip => (
              <div className="payslip-card txn-row" key={slip.id}>
                <div className="payslip-field">
                  <span className="payslip-field-label">Period End</span>
                  <span className="payslip-field-value">{formatDate(slip.periodEnd)}</span>
                </div>
                <div className="payslip-field">
                  <span className="payslip-field-label">Gross</span>
                  <span className="payslip-field-value">{formatAUD(slip.grossEarnings)}</span>
                </div>
                <div className="payslip-field">
                  <span className="payslip-field-label">Tax</span>
                  <span className="payslip-field-value">{formatAUD(slip.taxWithheld)}</span>
                </div>
                <div className="payslip-field">
                  <span className="payslip-field-label">Super</span>
                  <span className="payslip-field-value">{formatAUD(slip.super)}</span>
                </div>
                <div className="payslip-field">
                  <span className="payslip-field-label">Net</span>
                  <span className="payslip-field-value">{formatAUD(slip.netPay)}</span>
                </div>
                <button className="txn-delete" type="button" onClick={() => removePayslip(slip.id)} title="Remove">×</button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Other Income tab
// ---------------------------------------------------------------------------

function OtherIncomeTab({ otherIncome, setOtherIncome, showForm, setShowForm }) {
  const [form, setForm] = useState({
    type: 'interest', description: '', amount: '', taxWithheld: '', date: ''
  })
  const [formError, setFormError] = useState(null)

  function handleFormChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      setFormError('Amount must be greater than 0.')
      return
    }
    if (!form.date) {
      setFormError('Please enter a date received.')
      return
    }
    setFormError(null)
    const newItem = {
      id: `other-${Date.now()}`,
      type: form.type,
      description: form.description.trim(),
      amount: parseFloat(form.amount) || 0,
      taxWithheld: parseFloat(form.taxWithheld) || 0,
      date: new Date(form.date),
    }
    setOtherIncome(prev => [...prev, newItem])
    setForm({ type: 'interest', description: '', amount: '', taxWithheld: '', date: '' })
    setShowForm(false)
  }

  function removeItem(id) {
    setOtherIncome(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div>
      {!showForm && (
        <button className="btn-add-manual" type="button" onClick={() => setShowForm(true)}>
          + Add income source
        </button>
      )}

      {showForm && (
        <div className="manual-form">
          <div className="manual-form-title">Add Other Income</div>
          {formError && <div className="error-banner">{formError}</div>}
          <form onSubmit={handleFormSubmit}>
            <div className="manual-form-grid">
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Type</label>
                <select className="form-input" name="type" value={form.type} onChange={handleFormChange}>
                  {OTHER_INCOME_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  type="text"
                  name="description"
                  value={form.description}
                  placeholder="e.g. CommBank savings account interest"
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Amount (AUD)</label>
                <input
                  className="form-input"
                  type="number"
                  name="amount"
                  value={form.amount}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">Tax Withheld (AUD)</label>
                <input
                  className="form-input"
                  type="number"
                  name="taxWithheld"
                  value={form.taxWithheld}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Date Received</label>
                <input
                  className="form-input"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>
            <div className="manual-form-actions">
              <button className="btn-primary" type="submit">Add Income</button>
              <button className="btn-ghost" type="button" onClick={() => { setShowForm(false); setFormError(null) }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {otherIncome.length === 0 ? (
        <div className="empty-state">No other income added yet</div>
      ) : (
        <div>
          {otherIncome.map(item => (
            <div className="other-income-card txn-row" key={item.id}>
              <span className="income-type-badge">{otherIncomeTypeLabel(item.type)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {formatDate(item.date)}
              </span>
              <span className="other-income-desc">{item.description || '—'}</span>
              <span className="other-income-amount">+{formatAUD(item.amount)}</span>
              {item.taxWithheld > 0 && (
                <span className="other-income-tax">Tax: {formatAUD(item.taxWithheld)}</span>
              )}
              <button className="txn-delete" type="button" onClick={() => removeItem(item.id)} title="Remove">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary tab
// ---------------------------------------------------------------------------

function SummaryTab({ payslips, otherIncome }) {
  // Build employer rows
  const grouped = groupBy(payslips, p => p.employer)
  const employerRows = Array.from(grouped.entries()).map(([employer, slips]) => {
    const gross = slips.reduce((s, p) => s + p.grossEarnings, 0)
    const tax = slips.reduce((s, p) => s + p.taxWithheld, 0)
    const dates = slips.map(p => p.periodEnd).filter(Boolean).sort((a, b) => a - b)
    const dateRange = dates.length > 0
      ? `${formatMonthYear(dates[0])} – ${formatMonthYear(dates[dates.length - 1])}`
      : '—'
    return { source: employer, type: 'Employment', period: dateRange, gross, tax }
  })

  const otherRows = otherIncome.map(o => ({
    source: otherIncomeTypeLabel(o.type),
    type: 'Other',
    period: formatDate(o.date),
    gross: o.amount,
    tax: o.taxWithheld,
  }))

  const allRows = [...employerRows, ...otherRows]

  const totalGross = allRows.reduce((s, r) => s + r.gross, 0)
  const totalTax = allRows.reduce((s, r) => s + r.tax, 0)

  const { grossTax, lito, netTax } = calculateIncomeTax(totalGross)
  const refund = totalTax - netTax
  const isRefund = refund >= 0

  return (
    <div>
      <div className="section-heading">
        <h2>Income breakdown</h2>
        <span className="section-sub">FY {INCOME_FY}</span>
      </div>

      {allRows.length === 0 ? (
        <div className="empty-state">No income data — add payslips or other income first</div>
      ) : (
        <table className="summary-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Type</th>
              <th>Period / Date</th>
              <th style={{ textAlign: 'right' }}>Gross</th>
              <th style={{ textAlign: 'right' }}>Tax Withheld</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => (
              <tr key={i}>
                <td>{row.source}</td>
                <td>{row.type}</td>
                <td>{row.period}</td>
                <td style={{ textAlign: 'right' }}>{formatAUD(row.gross)}</td>
                <td style={{ textAlign: 'right' }}>{formatAUD(row.tax)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={3}><strong>Total</strong></td>
              <td style={{ textAlign: 'right' }}>
                <span className="gross-total">{formatAUD(totalGross)}</span>
              </td>
              <td style={{ textAlign: 'right' }}>{formatAUD(totalTax)}</td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="payg-card">
        <div className="payg-card-title">PAYG Estimate</div>
        <div className="payg-card-note">
          Estimate only — does not include deductions, offsets, or Medicare levy
        </div>

        <div className="payg-rows">
          <div className="payg-row">
            <span className="payg-row-label">Gross Income</span>
            <span className="payg-row-value">{formatAUD(totalGross)}</span>
          </div>
          <div className="payg-row">
            <span className="payg-row-label">Estimated Tax (before offsets)</span>
            <span className="payg-row-value">{formatAUD(grossTax)}</span>
          </div>
          <div className="payg-row">
            <span className="payg-row-label">Low Income Tax Offset (LITO)</span>
            <span className="payg-row-value">{lito > 0 ? `−${formatAUD(lito)}` : '$0'}</span>
          </div>
          <div className="payg-row">
            <span className="payg-row-label">Estimated Tax Payable</span>
            <span className="payg-row-value">{formatAUD(netTax)}</span>
          </div>
          <hr className="payg-divider" />
          <div className="payg-row">
            <span className="payg-row-label">Less: Tax Withheld</span>
            <span className="payg-row-value">−{formatAUD(totalTax)}</span>
          </div>
        </div>

        <div className="payg-result">
          <span className="payg-result-label">
            {isRefund ? 'Estimated Refund' : 'Estimated Liability'}
          </span>
          <span className={`payg-result-value${isRefund ? ' payg-result-value--refund' : ' payg-result-value--liability'}`}>
            {isRefund ? formatAUD(refund) : formatAUD(Math.abs(refund))}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function Income() {
  const { payslips, setPayslips, otherIncome, setOtherIncome } = useTax()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('payslips')
  const [showPayslipForm, setShowPayslipForm] = useState(false)
  const [showOtherForm, setShowOtherForm] = useState(false)

  // Derived values
  const totalGross = payslips.reduce((s, p) => s + p.grossEarnings, 0) + otherIncome.reduce((s, o) => s + o.amount, 0)
  const totalTaxWithheld = payslips.reduce((s, p) => s + p.taxWithheld, 0) + otherIncome.reduce((s, o) => s + o.taxWithheld, 0)
  const totalSuper = payslips.reduce((s, p) => s + p.super, 0)

  const uniqueEmployers = new Set(payslips.map(p => p.employer)).size
  const sourceCount = uniqueEmployers + otherIncome.length

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Income &amp; Docs</h1>
        <p>Track your income sources for FY {INCOME_FY} — payslips, PAYG summaries, and other income.</p>
      </div>

      <StatPills
        totalGross={totalGross}
        totalTaxWithheld={totalTaxWithheld}
        totalSuper={totalSuper}
        sourceCount={sourceCount}
      />

      {error && (
        <div className="error-banner">{error}</div>
      )}

      <div className="tab-toggle">
        {[
          { id: 'payslips', label: 'Payslips' },
          { id: 'other',    label: 'Other Income' },
          { id: 'summary',  label: 'Summary' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn${activeTab === tab.id ? ' tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'payslips' && (
        <PayslipsTab
          payslips={payslips}
          setPayslips={setPayslips}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          setError={setError}
          showForm={showPayslipForm}
          setShowForm={setShowPayslipForm}
        />
      )}

      {activeTab === 'other' && (
        <OtherIncomeTab
          otherIncome={otherIncome}
          setOtherIncome={setOtherIncome}
          showForm={showOtherForm}
          setShowForm={setShowOtherForm}
        />
      )}

      {activeTab === 'summary' && (
        <SummaryTab payslips={payslips} otherIncome={otherIncome} />
      )}
    </div>
  )
}
