import { useContext } from 'react'
import { TaxContext } from './taxContextObject'

export function useTax() {
  return useContext(TaxContext)
}
