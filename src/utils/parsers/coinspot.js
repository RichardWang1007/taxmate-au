export const HEADERS_SIGNATURE = ['Transaction Id', 'Type', 'Market']

/**
 * Parse a date string in "DD/MM/YYYY HH:MM:SS" format into a JS Date.
 * @param {string} str
 * @returns {Date}
 */
function parseCoinSpotDate(str) {
  const [datePart, timePart] = str.trim().split(' ')
  const [day, month, year] = datePart.split('/')
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
 * Parse a CoinSpot transaction history CSV export.
 *
 * Expected header:
 *   Transaction Id,Type,Market,Amount,Rate (AUD),Rate (BTC),Fee,Total (AUD),Created,Completed
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
 *   source: 'CoinSpot'
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
    if (cols.length < 9) continue

    const rawId = cols[0].trim()
    const rawType = cols[1].trim().toLowerCase()
    const market = cols[2].trim() // e.g. "BTC/AUD"
    const amount = parseFloat(cols[3])
    const rateAUD = parseFloat(cols[4])
    const feeAUD = parseFloat(cols[6])
    const totalAUD = parseFloat(cols[7])
    const dateStr = cols[8].trim() // "Created" column

    if (rawType !== 'buy' && rawType !== 'sell') continue
    if (isNaN(amount) || isNaN(rateAUD)) continue

    const asset = market.split('/')[0].trim()
    const id = rawId || `coinspot-${i}`

    results.push({
      id,
      date: parseCoinSpotDate(dateStr),
      asset,
      type: rawType,
      amount,
      costPerUnitAUD: rateAUD,
      feeAUD: isNaN(feeAUD) ? 0 : feeAUD,
      totalAUD: isNaN(totalAUD) ? amount * rateAUD : Math.abs(totalAUD),
      source: 'CoinSpot',
    })
  }

  return results
}
