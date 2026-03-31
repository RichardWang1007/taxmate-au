import { useState, useRef, useCallback } from 'react'
import '../styles/pages.css'
import {
  parseBankCSV,
  classifyTransaction,
  DEDUCTION_CATEGORIES,
} from '../utils/parsers/bankStatement.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return '—'
  return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAUD(amount) {
  return `$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ---------------------------------------------------------------------------
// DeductionCard
// ---------------------------------------------------------------------------

function DeductionCard({ item, onApprove, onReject, onUndo }) {
  const isApproved = item.status === 'approved'
  const isRejected = item.status === 'rejected'

  const catColor = item.category?.color ?? '#888'

  return (
    <div
      className={[
        'deduction-card',
        isApproved ? 'deduction-card--approved' : '',
        isRejected ? 'deduction-card--rejected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="deduction-card-top">
        <div className="deduction-card-left">
          {/* Category badge */}
          <span
            className="category-badge"
            style={{
              background: `${catColor}1a`,
              border: `1px solid ${catColor}55`,
              color: catColor,
            }}
          >
            {item.category?.label ?? 'Uncategorised'}
          </span>

          {/* Status badge */}
          {isApproved && (
            <span className="status-badge status-badge--approved">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Approved
            </span>
          )}
          {isRejected && (
            <span className="status-badge status-badge--rejected">Rejected</span>
          )}
        </div>

        <div className="deduction-card-right">
          <span className="deduction-date">{formatDate(item.date)}</span>
          <span className="deduction-amount">{formatAUD(item.amountAUD)}</span>
        </div>
      </div>

      <p className="deduction-description">{item.description}</p>

      <div className="deduction-card-actions">
        {item.status === 'pending' && (
          <>
            <button className="btn-ghost" onClick={() => onReject(item.id)}>
              Reject
            </button>
            <button className="btn-primary" onClick={() => onApprove(item.id)}>
              ✓ Approve
            </button>
          </>
        )}
        {isRejected && (
          <button className="btn-ghost" onClick={() => onUndo(item.id)}>
            Undo
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manual entry form
// ---------------------------------------------------------------------------

const EMPTY_FORM = { date: '', description: '', amount: '', categoryId: DEDUCTION_CATEGORIES[0].id }

function ManualForm({ onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM)

  function handleSubmit(e) {
    e.preventDefault()
    const category = DEDUCTION_CATEGORIES.find(c => c.id === form.categoryId)
    const [year, month, day] = form.date.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    const amountAUD = Math.abs(parseFloat(form.amount))
    if (!form.description || isNaN(amountAUD) || amountAUD === 0) return
    onAdd({ date, description: form.description.trim(), amountAUD, category })
    setForm(EMPTY_FORM)
  }

  return (
    <div className="manual-form">
      <div className="manual-form-title">Add expense manually</div>
      <form onSubmit={handleSubmit}>
        <div className="manual-form-grid">
          <div className="form-field">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
            />
          </div>
          <div className="form-field" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Officeworks — desk lamp"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">Amount (AUD)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">Category</label>
            <select
              className="form-input"
              value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
            >
              {DEDUCTION_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="manual-form-actions">
          <button type="submit" className="btn-primary">Add expense</button>
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Deductions() {
  const [sources, setSources] = useState([])
  const [flagged, setFlagged] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [infoMsg, setInfoMsg] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showManualForm, setShowManualForm] = useState(false)

  const fileInputRef = useRef(null)
  const dragCounter = useRef(0)

  // ---- File processing ----

  const processFile = useCallback((file) => {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file.')
      return
    }
    setError(null)
    setInfoMsg(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const transactions = parseBankCSV(text)

        const debits = transactions.filter(t => t.type === 'debit')
        const newFlagged = []

        for (const txn of debits) {
          const category = classifyTransaction(txn.description)
          if (category) {
            newFlagged.push({ ...txn, category, status: 'pending', sourceId: file.name })
          }
        }

        if (newFlagged.length === 0) {
          setInfoMsg(
            'No claimable expenses were detected in this statement. You can still add expenses manually.'
          )
        }

        const sourceId = file.name
        setSources(prev => {
          // Replace source if file name already exists
          const exists = prev.find(s => s.id === sourceId)
          if (exists) return prev
          return [...prev, { id: sourceId, fileName: file.name, count: newFlagged.length }]
        })

        setFlagged(prev => {
          // Remove any old entries from the same file before adding new
          const withoutOld = prev.filter(f => f.sourceId !== sourceId)
          return [...withoutOld, ...newFlagged]
        })
      } catch (err) {
        setError(`Failed to parse file: ${err.message}`)
      }
    }
    reader.readAsText(file)
  }, [])

  // ---- Drag and drop ----

  function handleDragEnter(e) {
    e.preventDefault()
    dragCounter.current++
    setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  function handleDrop(e) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  // ---- Remove source ----

  function removeSource(sourceId) {
    setSources(prev => prev.filter(s => s.id !== sourceId))
    setFlagged(prev => prev.filter(f => f.sourceId !== sourceId))
  }

  // ---- Approve / Reject / Undo ----

  function approveTransaction(id) {
    setFlagged(prev => prev.map(f => f.id === id ? { ...f, status: 'approved' } : f))
  }

  function rejectTransaction(id) {
    setFlagged(prev => prev.map(f => f.id === id ? { ...f, status: 'rejected' } : f))
  }

  function undoTransaction(id) {
    setFlagged(prev => prev.map(f => f.id === id ? { ...f, status: 'pending' } : f))
  }

  // ---- Manual add ----

  function handleManualAdd({ date, description, amountAUD, category }) {
    const id = `manual-${Date.now()}`
    setFlagged(prev => [...prev, { id, date, description, amountAUD, category, status: 'pending', sourceId: 'Manual' }])
    // Add manual source if not present
    setSources(prev => {
      if (prev.find(s => s.id === 'Manual')) return prev
      return [...prev, { id: 'Manual', fileName: 'Manual', count: 0 }]
    })
    setShowManualForm(false)
  }

  // ---- Derived stats ----

  const pendingItems = flagged.filter(f => f.status === 'pending')
  const approvedItems = flagged.filter(f => f.status === 'approved')
  const rejectedItems = flagged.filter(f => f.status === 'rejected')
  const totalClaimable = approvedItems.reduce((sum, f) => sum + f.amountAUD, 0)

  // Tab → item set
  const tabItems = {
    pending: pendingItems,
    approved: approvedItems,
    rejected: rejectedItems,
    all: flagged,
  }[activeTab]

  // Category pills — only show categories that exist in tabItems
  const activeCategoryIds = new Set(tabItems.map(f => f.category?.id).filter(Boolean))
  const visibleCategories = DEDUCTION_CATEGORIES.filter(c => activeCategoryIds.has(c.id))

  // Apply category filter
  const visibleItems =
    categoryFilter === 'all'
      ? tabItems
      : tabItems.filter(f => f.category?.id === categoryFilter)

  // Empty state messages
  const emptyMessages = {
    pending: 'All caught up — no expenses pending review',
    approved: 'No approved expenses yet',
    rejected: 'No rejected expenses',
    all: 'No transactions yet — upload a bank statement to get started',
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Deductions</h1>
        <p>
          Upload your bank statements and let the app flag ATO-claimable work-related expenses for
          your review.
        </p>
      </div>

      {/* Upload zone */}
      <div
        className={`upload-zone${isDragging ? ' upload-zone--dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ cursor: 'pointer', marginBottom: 16 }}
      >
        <div className="upload-zone-inner">
          <div className="upload-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M14 4v14M8 10l6-6 6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 20v1.5A2.5 2.5 0 006.5 24h15a2.5 2.5 0 002.5-2.5V20"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="upload-title">
            {isDragging ? 'Drop to upload' : 'Upload bank statement'}
          </p>
          <p className="upload-sub">CSV — Commonwealth, ANZ, Westpac, NAB formats supported</p>
          <button
            className="upload-btn"
            onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
          >
            Choose file
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Error / info banners */}
      {error && <div className="error-banner">{error}</div>}
      {infoMsg && (
        <div className="warning-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {infoMsg}
        </div>
      )}

      {/* Sources chips */}
      {sources.length > 0 && (
        <div className="sources-list">
          {sources.map(src => {
            const count = flagged.filter(f => f.sourceId === src.id).length
            return (
              <div className="source-chip" key={src.id}>
                <span className="source-chip-exchange">
                  {src.id === 'Manual' ? 'Manual' : 'Bank'}
                </span>
                <span className="source-chip-name">{src.fileName}</span>
                <span className="source-chip-count">{count} flagged</span>
                <button
                  className="source-chip-remove"
                  onClick={() => removeSource(src.id)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary bar */}
      {flagged.length > 0 && (
        <div className="stat-pills" style={{ marginBottom: 24 }}>
          <div className="stat-pill">
            <div className="stat-pill-label">Pending Review</div>
            <div className="stat-pill-value">{pendingItems.length}</div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill-label">Approved</div>
            <div className="stat-pill-value">
              {approvedItems.length}
              {approvedItems.length > 0 && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginLeft: 6 }}>
                  {formatAUD(totalClaimable)}
                </span>
              )}
            </div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill-label">Rejected</div>
            <div className="stat-pill-value">{rejectedItems.length}</div>
          </div>
          <div className="stat-pill">
            <div className="stat-pill-label">Total Claimable</div>
            <div className="stat-pill-value accent">{formatAUD(totalClaimable)}</div>
          </div>
        </div>
      )}

      {/* Main content (only render when there are flagged items or manual form is open) */}
      {(flagged.length > 0 || showManualForm) && (
        <>
          <hr className="divider" style={{ marginTop: 0 }} />

          {/* Tab toggle */}
          <div className="tab-toggle">
            {['pending', 'approved', 'rejected', 'all'].map(tab => (
              <button
                key={tab}
                className={`tab-btn${activeTab === tab ? ' tab-btn--active' : ''}`}
                onClick={() => { setActiveTab(tab); setCategoryFilter('all') }}
              >
                {tab === 'pending' && `Pending (${pendingItems.length})`}
                {tab === 'approved' && `Approved (${approvedItems.length})`}
                {tab === 'rejected' && `Rejected (${rejectedItems.length})`}
                {tab === 'all' && `All (${flagged.length})`}
              </button>
            ))}
          </div>

          {/* Category filter pills */}
          {visibleCategories.length > 0 && (
            <div className="category-filters">
              <button
                className={`category-filter-pill${categoryFilter === 'all' ? ' category-filter-pill--active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                All
              </button>
              {visibleCategories.map(cat => (
                <button
                  key={cat.id}
                  className={`category-filter-pill${categoryFilter === cat.id ? ' category-filter-pill--active' : ''}`}
                  onClick={() => setCategoryFilter(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Transaction list */}
          {visibleItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 18h12M18 12v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                </svg>
              </div>
              {emptyMessages[activeTab]}
            </div>
          ) : (
            <div className="deduction-list">
              {visibleItems.map(item => (
                <DeductionCard
                  key={item.id}
                  item={item}
                  onApprove={approveTransaction}
                  onReject={rejectTransaction}
                  onUndo={undoTransaction}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Manual add form / button */}
      <div style={{ marginTop: 24 }}>
        {showManualForm ? (
          <ManualForm onAdd={handleManualAdd} onCancel={() => setShowManualForm(false)} />
        ) : (
          <button
            className="btn-add-manual"
            onClick={() => setShowManualForm(true)}
          >
            + Add expense manually
          </button>
        )}
      </div>
    </div>
  )
}
