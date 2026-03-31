import { createContext, useContext, useState } from 'react'

const TaxContext = createContext(null)

export function TaxProvider({ children }) {
  // Crypto Tax
  const [cryptoSources, setCryptoSources] = useState([])
  const [cgtResult, setCgtResult] = useState(null)

  // Deductions
  const [deductionItems, setDeductionItems] = useState([]) // all flagged items with status

  // Income
  const [payslips, setPayslips] = useState([])
  const [otherIncome, setOtherIncome] = useState([])

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

export function useTax() {
  return useContext(TaxContext)
}
