import { useState, useRef, useCallback } from 'react'
import '../styles/pages.css'
import { parseCoinSpotCSV } from '../utils/csvParser'
import { calculateCGT } from '../utils/cgtCalculator'

function fmtAUD(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function fmtDate(date) {
  return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CryptoTax() {
  const [transactions, setTransactions] = useState([])
  const [cgtResult, setCgtResult] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [sortAsc, setSortAsc] = useState(true)

  const fileInputRef = useRef(null)

  const processFile = useCallback((file) => {
    if (!file) return
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const parsed = parseCoinSpotCSV(text)
        if (parsed.length === 0) {
          setError('No valid transactions found in the CSV. Make sure this is a CoinSpot transaction history export.')
          return
        }
        const result = calculateCGT(parsed)
        setTransactions(parsed)
        setCgtResult(result)
        setFileName(file.name)
      } catch (err) {
        setError(err.message || 'Failed to parse CSV file.')
        setTransactions([])
        setCgtResult(null)
        setFileName(null)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  const handleZoneClick = () => {
    fileInputRef.current?.click()
  }

  const handleExport = () => {
    if (!cgtResult) return
    const headers = ['Date', 'Asset', 'Type', 'Proceeds (AUD)', 'Cost Base (AUD)', 'Gain/Loss (AUD)', 'Discount Eligible', 'Net Gain (AUD)']
    const rows = sortedEvents.map((ev) => [
      fmtDate(ev.date),
      ev.asset,
      ev.type,
      ev.proceedsAUD.toFixed(2),
      ev.costBaseAUD.toFixed(2),
      ev.gainLoss.toFixed(2),
      ev.isDiscountEligible ? '50%' : '—',
      ev.discountedGain.toFixed(2),
    ])
    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cgt-events.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const sortedEvents = cgtResult
    ? [...cgtResult.events].sort((a, b) =>
        sortAsc ? a.date - b.date : b.date - a.date
      )
    : []

  const toggleSort = () => setSortAsc((v) => !v)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Crypto Tax</h1>
        <p>Upload your CoinSpot transaction history to calculate CGT events and cost base under ATO rules.</p>
      </div>

      {/* Upload zone */}
      <div
        className={`upload-zone${isDragging ? ' upload-zone--dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ marginBottom: '20px' }}
      >
        <div className="upload-zone-inner" onClick={handleZoneClick}>
          <div className="upload-icon">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 6v18M10 14l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 26v2.5A2.5 2.5 0 007.5 31h21a2.5 2.5 0 002.5-2.5V26" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="upload-title">
            {isDragging ? 'Drop your CSV here' : 'Drag & drop your CoinSpot CSV'}
          </p>
          <p className="upload-sub">
            Transaction history export — your data never leaves your device
          </p>
          <button
            className="upload-btn"
            onClick={(e) => { e.stopPropagation(); handleZoneClick() }}
            type="button"
          >
            Browse file
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Error */}
      {error && (
        <div className="error-banner">{error}</div>
      )}

      {/* File loaded indicator */}
      {fileName && cgtResult && (
        <div className="file-loaded-bar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--accent)', flexShrink: 0 }}>
            <path d="M2 9l4 4 8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="file-loaded-name">{fileName}</span>
          <span className="file-loaded-meta">{transactions.length} transactions loaded</span>
        </div>
      )}

      {/* Summary pills */}
      {cgtResult && (
        <div className="stat-pills" style={{ marginBottom: '20px' }}>
          <div className="stat-pill">
            <div className="stat-pill-label">CGT Events</div>
            <div className="stat-pill-value">{cgtResult.summary.eventCount}</div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill-label">Total Gain</div>
            <div className="stat-pill-value" style={{ fontSize: '18px', color: cgtResult.summary.totalGain > 0 ? '#6fcf97' : 'var(--text-primary)' }}>
              {fmtAUD(cgtResult.summary.totalGain)}
            </div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill-label">Total Loss</div>
            <div className="stat-pill-value" style={{ fontSize: '18px', color: cgtResult.summary.totalLoss < 0 ? '#f08080' : 'var(--text-primary)' }}>
              {fmtAUD(cgtResult.summary.totalLoss)}
            </div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill-label">Net CGT (after discount)</div>
            <div
              className="stat-pill-value"
              style={{
                fontSize: '18px',
                color: cgtResult.summary.netCGT > 0
                  ? '#f08080'
                  : cgtResult.summary.netCGT < 0
                  ? '#6fcf97'
                  : 'var(--text-primary)',
              }}
            >
              {fmtAUD(cgtResult.summary.netCGT)}
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      <div className="section-heading">
        <h2>CGT Events</h2>
        {cgtResult && (
          <span className="section-sub">{cgtResult.summary.eventCount} disposal{cgtResult.summary.eventCount !== 1 ? 's' : ''} found</span>
        )}
      </div>

      <div className="cgt-table-wrap">
        <table className="cgt-table">
          <thead>
            <tr>
              <th
                className="sortable"
                onClick={toggleSort}
                title="Sort by date"
              >
                Date {sortAsc ? '↑' : '↓'}
              </th>
              <th>Asset</th>
              <th>Type</th>
              <th>Proceeds</th>
              <th>Cost Base</th>
              <th>Gain / Loss</th>
              <th>Discount</th>
              <th>Net Gain</th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="cgt-table-empty">
                    No transactions yet — upload a CSV to begin
                  </div>
                </td>
              </tr>
            ) : (
              sortedEvents.map((ev, idx) => (
                <tr key={idx}>
                  <td>{fmtDate(ev.date)}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ev.asset}</td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{ev.type}</td>
                  <td>{fmtAUD(ev.proceedsAUD)}</td>
                  <td>{fmtAUD(ev.costBaseAUD)}</td>
                  <td style={{ color: ev.gainLoss >= 0 ? '#6fcf97' : '#f08080', fontWeight: 500 }}>
                    {ev.gainLoss >= 0 ? '+' : ''}{fmtAUD(ev.gainLoss)}
                  </td>
                  <td>
                    {ev.isDiscountEligible
                      ? <span className="discount-badge">50%</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td style={{ color: ev.discountedGain >= 0 ? '#6fcf97' : '#f08080', fontWeight: 500 }}>
                    {ev.discountedGain >= 0 ? '+' : ''}{fmtAUD(ev.discountedGain)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Export */}
      {cgtResult && cgtResult.summary.eventCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="export-btn" onClick={handleExport} type="button">
            Export CSV
          </button>
        </div>
      )}
    </div>
  )
}
