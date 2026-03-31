import { useEffect, useState } from 'react'
import { TaxContext } from './taxContextObject'
const STORAGE_KEY = 'taxmate-au.tax-state.v1'

function toDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function hydrateStoredState(raw) {
  if (!raw || typeof raw !== 'object') return null

  const cryptoSources = Array.isArray(raw.cryptoSources)
    ? raw.cryptoSources.map((source) => ({
        ...source,
        transactions: Array.isArray(source.transactions)
          ? source.transactions.map((tx) => ({
              ...tx,
              date: toDate(tx.date) || new Date(),
            }))
          : [],
      }))
    : []

  const cgtResult = raw.cgtResult
    ? {
        ...raw.cgtResult,
        events: Array.isArray(raw.cgtResult.events)
          ? raw.cgtResult.events.map((ev) => ({
              ...ev,
              date: toDate(ev.date) || new Date(),
            }))
          : [],
      }
    : null

  const deductionItems = Array.isArray(raw.deductionItems)
    ? raw.deductionItems.map((item) => ({
        ...item,
        date: toDate(item.date) || new Date(),
      }))
    : []

  const payslips = Array.isArray(raw.payslips)
    ? raw.payslips.map((p) => ({
        ...p,
        periodEnd: toDate(p.periodEnd) || new Date(),
      }))
    : []

  const otherIncome = Array.isArray(raw.otherIncome)
    ? raw.otherIncome.map((o) => ({
        ...o,
        date: toDate(o.date) || new Date(),
      }))
    : []

  return { cryptoSources, cgtResult, deductionItems, payslips, otherIncome }
}

function loadInitialState() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return hydrateStoredState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function TaxProvider({ children }) {
  const [initialState] = useState(() => loadInitialState())

  // Crypto Tax
  const [cryptoSources, setCryptoSources] = useState(initialState?.cryptoSources ?? [])
  const [cgtResult, setCgtResult] = useState(initialState?.cgtResult ?? null)

  // Deductions
  const [deductionItems, setDeductionItems] = useState(initialState?.deductionItems ?? []) // all flagged items with status

  // Income
  const [payslips, setPayslips] = useState(initialState?.payslips ?? [])
  const [otherIncome, setOtherIncome] = useState(initialState?.otherIncome ?? [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const snapshot = { cryptoSources, cgtResult, deductionItems, payslips, otherIncome }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  }, [cryptoSources, cgtResult, deductionItems, payslips, otherIncome])

  return (
    <TaxContext.Provider value={{
      cryptoSources, setCryptoSources,
      cgtResult, setCgtResult,
      deductionItems, setDeductionItems,
      payslips, setPayslips,
      otherIncome, setOtherIncome,
    }}>
      {children}
    </TaxContext.Provider>
  )
}

