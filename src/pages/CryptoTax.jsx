import { useState, useRef, useCallback } from 'react'
import '../styles/pages.css'
import { detectAndParse } from '../utils/parsers/index.js'
import { calculateCGT } from '../utils/cgtCalculator'
import { useTax } from '../context/useTax'

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

function fmtAmount(val) {
  if (val == null) return '—'
  // up to 8 dp, trim trailing zeros
  return parseFloat(val.toFixed(8)).toString()
}

const EMPTY_MANUAL_FORM = {
  date: '',
  asset: '',
  type: 'buy',
  amount: '',
  costPerUnitAUD: '',
  feeAUD: '',
}

// FY helpers — Australian financial year runs 1 Jul – 30 Jun
const FY_OPTIONS = [
  { value: 'all', label: 'All years' },
  { value: '2024-25', label: 'FY 2024–25', start: new Date('2024-07-01'), end: new Date('2025-06-30T23:59:59.999') },
  { value: '2023-24', label: 'FY 2023–24', start: new Date('2023-07-01'), end: new Date('2024-06-30T23:59:59.999') },
  { value: '2022-23', label: 'FY 2022–23', start: new Date('2022-07-01'), end: new Date('2023-06-30T23:59:59.999') },
]

// Helper: merge sources, sort, run CGT
function runCGT(sources) {
  const all = sources.flatMap(s => s.transactions).sort((a, b) => a.date - b.date)
  if (all.length === 0) return null
  return calculateCGT(all)
}

export default function CryptoTax() {
  const { cryptoSources: sources, setCryptoSources: setSources, cgtResult, setCgtResult } = useTax()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM)
  const [fyFilter, setFyFilter] = useState('2024-25')
  const [activeTab, setActiveTab] = useState('cgt')

  const fileInputRef = useRef(null)

  // Merge all sources, sort by date, run CGT
  const recalculate = useCallback((updatedSources) => {
    const result = runCGT(updatedSources)
    setCgtResult(result)
  }, [setCgtResult])

  const processFile = useCallback((file) => {
    if (!file) return
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const { exchange, transactions } = detectAndParse(text)
        if (transactions.length === 0) {
          setError('No valid transactions found in the CSV.')
          return
        }
        const newSource = {
          id: Date.now(),
          exchange,
          fileName: file.name,
          transactions,
        }
        setSources(prev => {
          const updated = [...prev, newSource]
          recalculate(updated)
          return updated
        })
      } catch (err) {
        setError(err.message || 'Failed to parse CSV file.')
      }
    }
    reader.readAsText(file)
  }, [recalculate, setSources])

  const removeSource = useCallback((id) => {
    setSources(prev => {
      const updated = prev.filter(s => s.id !== id)
      recalculate(updated)
      return updated
    })
  }, [recalculate, setSources])

  const removeTransaction = useCallback((txId) => {
    setSources(prev => {
      const updated = prev
        .map(s => ({
          ...s,
          transactions: s.transactions.filter(tx => tx.id !== txId),
        }))
        .filter(s => s.transactions.length > 0)
      recalculate(updated)
      return updated
    })
  }, [recalculate, setSources])

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
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      Array.from(files).forEach(processFile)
    }
  }

  const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      Array.from(files).forEach(processFile)
    }
    e.target.value = ''
  }

  const handleZoneClick = () => {
    fileInputRef.current?.click()
  }

  const handleManualFormChange = (e) => {
    const { name, value } = e.target
    setManualForm(prev => ({ ...prev, [name]: value }))
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const { date, asset, type, amount, costPerUnitAUD, feeAUD } = manualForm

    if (!date || !asset.trim() || !amount || !costPerUnitAUD) {
      setError('Please fill in Date, Asset, Amount, and Price per unit.')
      return
    }

    setError(null)

    const parsedAmount = parseFloat(amount)
    const parsedPrice = parseFloat(costPerUnitAUD)
    const parsedFee = parseFloat(feeAUD) || 0

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Price per unit must be a non-negative number.')
      return
    }

    const tx = {
      id: `manual-${Date.now()}`,
      date: new Date(date),
      asset: asset.trim().toUpperCase(),
      type,
      amount: parsedAmount,
      costPerUnitAUD: parsedPrice,
      feeAUD: parsedFee,
      totalAUD: parsedAmount * parsedPrice,
      source: 'Manual',
    }

    setSources(prev => {
      // Find existing manual source or create one
      const manualIdx = prev.findIndex(s => s.exchange === 'Manual')
      let updated
      if (manualIdx >= 0) {
        updated = prev.map((s, idx) =>
          idx === manualIdx
            ? { ...s, transactions: [...s.transactions, tx] }
            : s
        )
      } else {
        updated = [...prev, {
          id: Date.now(),
          exchange: 'Manual',
          fileName: 'Manual entries',
          transactions: [tx],
        }]
      }
      recalculate(updated)
      return updated
    })

    setManualForm(EMPTY_MANUAL_FORM)
    setShowManualForm(false)
  }

  const handleExport = () => {
    if (!cgtResult) return
    const headers = ['Date', 'Asset', 'Source', 'Type', 'Proceeds (AUD)', 'Cost Base (AUD)', 'Gain/Loss (AUD)', 'Discount Eligible', 'Net Gain (AUD)']
    const rows = sortedEvents.map((ev) => [
      fmtDate(ev.date),
      ev.asset,
      ev.source || '',
      ev.type,
      ev.proceedsAUD.toFixed(2),
      ev.costBaseAUD.toFixed(2),
      ev.gainLoss.toFixed(2),
      ev.isDiscountEligible ? '50%' : '',
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

  // All events sorted
  const sortedEvents = cgtResult
    ? [...cgtResult.events].sort((a, b) =>
        sortAsc ? a.date - b.date : b.date - a.date
      )
    : []

  // FY-filtered events
  const selectedFY = FY_OPTIONS.find(o => o.value === fyFilter)
  const filteredEvents = fyFilter === 'all' || !selectedFY
    ? sortedEvents
    : sortedEvents.filter(ev => ev.date >= selectedFY.start && ev.date <= selectedFY.end)

  // All transactions merged and sorted
  const allTransactions = sources
    .flatMap(s => s.transactions.map(tx => ({ ...tx, _sourceExchange: s.exchange })))
    .sort((a, b) => sortAsc ? a.date - b.date : b.date - a.date)

  // Zero cost base warning
  const zeroCostBaseSells = allTransactions.filter(
    tx => tx.type === 'sell' && (tx.costPerUnitAUD === 0 || tx.costPerUnitAUD == null)
  )

  const toggleSort = () => setSortAsc((v) => !v)

  const totalTransactionCount = sources.reduce((sum, s) => sum + s.transactions.length, 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Crypto Tax</h1>
        <p>Upload transaction history from CoinSpot, Binance, CoinJar, or Kraken to calculate CGT events under ATO rules. Your data never leaves your device.</p>
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
            {isDragging ? 'Drop your CSV(s) here' : 'Drag & drop exchange CSV files'}
          </p>
          <p className="upload-sub">
            CoinSpot, Binance, CoinJar, Kraken — your data never leaves your device
          </p>
          <button
            className="upload-btn"
            onClick={(e) => { e.stopPropagation(); handleZoneClick() }}
            type="button"
          >
            Browse files
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Error */}
      {error && (
        <div className="error-banner">{error}</div>
      )}

      {/* Sources list */}
      {sources.length > 0 && (
        <div className="sources-list">
          {sources.map(s => (
            <div key={s.id} className="source-chip">
              <span className="source-chip-exchange">{s.exchange}</span>
              <span className="source-chip-name" title={s.fileName}>{s.fileName}</span>
              <span className="source-chip-count">{s.transactions.length} txns</span>
              <button
                className="source-chip-remove"
                onClick={() => removeSource(s.id)}
                type="button"
                title="Remove this source"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Manual entry toggle */}
      {!showManualForm && (
        <button
          className="btn-add-manual"
          onClick={() => { setShowManualForm(true); setError(null) }}
          type="button"
        >
          <span>+</span> Add manual transaction
        </button>
      )}

      {/* Manual entry form */}
      {showManualForm && (
        <div className="manual-form">
          <div className="manual-form-title">Add Manual Transaction</div>
          <form onSubmit={handleManualSubmit}>
            <div className="manual-form-grid">
              <div className="form-field">
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  name="date"
                  value={manualForm.date}
                  onChange={handleManualFormChange}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">Asset</label>
                <input
                  className="form-input"
                  type="text"
                  name="asset"
                  placeholder="e.g. BTC"
                  value={manualForm.asset}
                  onChange={handleManualFormChange}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  name="type"
                  value={manualForm.type}
                  onChange={handleManualFormChange}
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Amount (units)</label>
                <input
                  className="form-input"
                  type="number"
                  name="amount"
                  placeholder="0.00"
                  min="0"
                  step="any"
                  value={manualForm.amount}
                  onChange={handleManualFormChange}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">Price per unit (AUD)</label>
                <input
                  className="form-input"
                  type="number"
                  name="costPerUnitAUD"
                  placeholder="0.00"
                  min="0"
                  step="any"
                  value={manualForm.costPerUnitAUD}
                  onChange={handleManualFormChange}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">Fee AUD (optional)</label>
                <input
                  className="form-input"
                  type="number"
                  name="feeAUD"
                  placeholder="0.00"
                  min="0"
                  step="any"
                  value={manualForm.feeAUD}
                  onChange={handleManualFormChange}
                />
              </div>
            </div>
            <div className="manual-form-actions">
              <button className="btn-primary" type="submit">Add Transaction</button>
              <button
                className="btn-ghost"
                type="button"
                onClick={() => { setShowManualForm(false); setManualForm(EMPTY_MANUAL_FORM); setError(null) }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Zero cost base warning */}
      {zeroCostBaseSells.length > 0 && (
        <div className="warning-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5L1 14.5h14L8 1.5z" stroke="#f0a040" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(240,160,64,0.1)"/>
            <path d="M8 6v4" stroke="#f0a040" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="8" cy="12" r="0.7" fill="#f0a040"/>
          </svg>
          <span>
            <strong>{zeroCostBaseSells.length}</strong> sell transaction{zeroCostBaseSells.length !== 1 ? 's' : ''} have no AUD cost base (often from Kraken or incomplete CoinJar exports). CGT calculations for these events may be inaccurate — add the missing cost base via manual entry.
          </span>
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

      {/* Tab toggle */}
      <div className="tab-toggle">
        <button
          className={`tab-btn${activeTab === 'cgt' ? ' tab-btn--active' : ''}`}
          onClick={() => setActiveTab('cgt')}
          type="button"
        >
          CGT Events
        </button>
        <button
          className={`tab-btn${activeTab === 'txns' ? ' tab-btn--active' : ''}`}
          onClick={() => setActiveTab('txns')}
          type="button"
        >
          All Transactions
        </button>
      </div>

      {/* CGT Events tab */}
      {activeTab === 'cgt' && (
        <>
          {/* Section heading with FY filter */}
          <div className="table-controls">
            <div className="section-heading" style={{ marginBottom: 0 }}>
              <h2>CGT Events</h2>
              {cgtResult && (
                <span className="section-sub">{filteredEvents.length} disposal{filteredEvents.length !== 1 ? 's' : ''}{fyFilter !== 'all' ? ` in ${selectedFY?.label}` : ''}</span>
              )}
              {sources.length > 0 && totalTransactionCount > 0 && (
                <span className="section-sub">{totalTransactionCount} total transactions across {sources.length} source{sources.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <select
              className="form-input fy-select"
              value={fyFilter}
              onChange={e => setFyFilter(e.target.value)}
            >
              {FY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Filter meta */}
          {fyFilter !== 'all' && cgtResult && (
            <div className="filter-meta">
              Showing {filteredEvents.length} of {sortedEvents.length} total events
            </div>
          )}

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
                  <th>Source</th>
                  <th>Type</th>
                  <th>Proceeds</th>
                  <th>Cost Base</th>
                  <th>Gain / Loss</th>
                  <th>Discount</th>
                  <th>Net Gain</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="cgt-table-empty">
                        {sortedEvents.length === 0
                          ? 'No transactions yet — upload a CSV or add a manual entry to begin'
                          : `No CGT events found in ${selectedFY?.label || 'selected period'}`}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev, idx) => (
                    <tr key={idx}>
                      <td>{fmtDate(ev.date)}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ev.asset}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{ev.source || '—'}</td>
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
        </>
      )}

      {/* All Transactions tab */}
      {activeTab === 'txns' && (
        <>
          <div className="section-heading">
            <h2>All Transactions</h2>
            {allTransactions.length > 0 && (
              <span className="section-sub">{allTransactions.length} transaction{allTransactions.length !== 1 ? 's' : ''} across {sources.length} source{sources.length !== 1 ? 's' : ''}</span>
            )}
            <button
              className="tab-btn"
              style={{ marginLeft: 'auto' }}
              onClick={toggleSort}
              type="button"
            >
              Date {sortAsc ? '↑' : '↓'}
            </button>
          </div>

          <div className="cgt-table-wrap">
            <table className="cgt-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exchange</th>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Price (AUD)</th>
                  <th>Total (AUD)</th>
                  <th>Fee (AUD)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="cgt-table-empty">
                        No transactions loaded yet
                      </div>
                    </td>
                  </tr>
                ) : (
                  allTransactions.map((tx) => (
                    <tr key={tx.id} className="txn-row">
                      <td>{fmtDate(tx.date)}</td>
                      <td>
                        <span className="source-chip-exchange" style={{ fontSize: '11px' }}>
                          {tx._sourceExchange || tx.source || '—'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{tx.asset}</td>
                      <td style={{ color: tx.type === 'buy' ? '#6fcf97' : '#f08080', fontWeight: 500, textTransform: 'capitalize' }}>
                        {tx.type === 'buy' ? 'Buy' : 'Sell'}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtAmount(tx.amount)}</td>
                      <td>{tx.costPerUnitAUD != null ? fmtAUD(tx.costPerUnitAUD) : '—'}</td>
                      <td>{tx.totalAUD != null ? fmtAUD(tx.totalAUD) : '—'}</td>
                      <td>{tx.feeAUD != null && tx.feeAUD > 0 ? fmtAUD(tx.feeAUD) : '—'}</td>
                      <td>
                        <button
                          className="txn-delete"
                          type="button"
                          title="Remove this transaction"
                          onClick={() => removeTransaction(tx.id)}
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
