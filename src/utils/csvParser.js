// Legacy re-export — use src/utils/parsers/ directly for new code
export { detectAndParse } from './parsers/index.js'
export function parseCoinSpotCSV(text) {
  const { transactions } = detectAndParse(text)
  return transactions
}
