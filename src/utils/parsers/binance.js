export const HEADERS_SIGNATURE = ['Date(UTC)', 'Pair', 'Side']

/**
 * Parse a date string in "YYYY-MM-DD HH:MM:SS" format into a JS Date.
 * @param {string} str
 * @returns {Date}
 */
function parseBinanceDate(str) {
  // "2023-07-01 10:00:00"
  const [datePart, timePart] = str.trim().split(' ')
  const [year, month, day] = datePart.split('-')
  const [hour, minute, second] = (timePart || '00:00:00').split(':')
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  )
}

/**
 * Parse a number from a string like "0.05 BTC" or "2500 AUD".
 * @param {string} str
 * @returns {number}
 */
function parseNumericPrefix(str) {
  return parseFloat(str.trim().split(' ')[0]) || 0
}

/**
 * Parse a Binance trade history CSV export.
 *
 * Expected header:
 *   Date(UTC),Pair,Side,Price,Executed,Amount,Fee
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
 *   source: 'Binance'
 * }>}
 */
export function parse(text) {
  const lines = text.split(/\r?\n/)
  if (lines.length < 2) return []

  const results = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = line.split(',')
    if (cols.length < 7) continue

    const dateStr = cols[0].trim()
    const pair = cols[1].trim()       // e.g. "BTCAUD"
    const side = cols[2].trim()       // "BUY" or "SELL"
    const price = parseFloat(cols[3])
    const executed = cols[4].trim()   // e.g. "0.05 BTC"
    const amount = cols[5].trim()     // e.g. "2500 AUD"
    const fee = cols[6].trim()        // e.g. "5 AUD"

    const rawType = side.toLowerCase()
    if (rawType !== 'buy' && rawType !== 'sell') continue

    // Extract asset from pair: BTCAUD → BTC
    const asset = pair.replace(/AUD$/, '').trim()
    if (!asset) continue

    const execAmount = parseNumericPrefix(executed)
    const totalAUD = parseNumericPrefix(amount)

    // Only count fee if AUD-denominated
    const feeAUD = fee.toUpperCase().includes('AUD') ? parseNumericPrefix(fee) : 0

    results.push({
      id: `binance-${i}`,
      date: parseBinanceDate(dateStr),
      asset,
      type: rawType,
      amount: execAmount,
      costPerUnitAUD: isNaN(price) ? 0 : price,
      feeAUD,
      totalAUD,
      source: 'Binance',
    })
  }

  return results
}
