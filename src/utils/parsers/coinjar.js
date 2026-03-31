export const HEADERS_SIGNATURE = ['ID', 'Created at', 'Type']

/**
 * Parse a CoinJar trade history CSV export.
 *
 * Expected header:
 *   ID,Created at,Type,Description,Amount,Balance,Currency
 *
 * @param {string} text - Raw CSV text content.
 * @returns {Array<{
 *   id: string,
 *   date: Date,
 *   asset: string,
 *   type: 'buy' | 'sell',
 *   amount: number,
 *   costPerUnitAUD: number,
 *   feeAUD: number,
 *   totalAUD: number,
 *   source: 'CoinJar'
 * }>}
 */
export function parse(text) {
  const lines = text.split(/\r?\n/)
  if (lines.length < 2) return []

  const results = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted fields (Description may contain commas)
    const cols = parseCSVLine(line)
    if (cols.length < 7) continue

    const rawId = cols[0].trim()
    const createdAt = cols[1].trim()
    const type = cols[2].trim().toLowerCase()
    const description = cols[3].trim()
    const amountRaw = parseFloat(cols[4])
    // cols[5] = Balance (ignored)
    const currency = cols[6].trim()

    // Only process trade rows
    if (type !== 'trade') continue
    if (isNaN(amountRaw)) continue

    const txType = amountRaw > 0 ? 'buy' : 'sell'
    const amount = Math.abs(amountRaw)

    // Try to extract AUD amount from Description, e.g. "Bought 0.05 BTC at AUD 50000"
    const audMatch = description.match(/AUD\s*([\d,.]+)/i)
    const totalAUD = audMatch ? parseFloat(audMatch[1].replace(/,/g, '')) : 0

    const costPerUnitAUD = totalAUD > 0 && amount > 0 ? totalAUD / amount : 0

    results.push({
      id: rawId || `coinjar-${i}`,
      date: new Date(createdAt),
      asset: currency,
      type: txType,
      amount,
      costPerUnitAUD,
      feeAUD: 0,
      totalAUD,
      source: 'CoinJar',
    })
  }

  return results
}

/**
 * Simple CSV line parser that handles double-quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const cols = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cols.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cols.push(current)
  return cols
}
