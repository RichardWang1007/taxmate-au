/**
 * Detect the exchange format from the first CSV line (header row).
 * @param {string} headerLine - The raw first line of the CSV.
 * @returns {'coinspot' | 'unknown'}
 */
export function detectExchangeFormat(headerLine) {
  const lower = headerLine.toLowerCase()
  if (
    lower.includes('transaction id') &&
    lower.includes('market') &&
    lower.includes('rate (aud)')
  ) {
    return 'coinspot'
  }
  return 'unknown'
}

/**
 * Parse a date string in "DD/MM/YYYY HH:MM:SS" format into a JS Date.
 * @param {string} str
 * @returns {Date}
 */
function parseCoinSpotDate(str) {
  // e.g. "01/07/2023 10:00:00"
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
 *   type: 'buy' | 'sell',
 *   asset: string,
 *   amount: number,
 *   rateAUD: number,
 *   feeAUD: number,
 *   totalAUD: number,
 *   date: Date
 * }>}
 */
export function parseCoinSpotCSV(text) {
  const lines = text.split(/\r?\n/)
  if (lines.length < 2) return []

  const headerLine = lines[0]
  const format = detectExchangeFormat(headerLine)
  if (format !== 'coinspot') {
    throw new Error(`Unrecognised CSV format. Expected CoinSpot export but got: "${headerLine.slice(0, 80)}"`)
  }

  const results = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV split — CoinSpot fields don't contain commas or quotes
    const cols = line.split(',')
    if (cols.length < 9) continue

    const id = cols[0].trim()
    const rawType = cols[1].trim().toLowerCase()
    const market = cols[2].trim() // e.g. "BTC/AUD"
    const amount = parseFloat(cols[3])
    const rateAUD = parseFloat(cols[4])
    const feeAUD = parseFloat(cols[6])
    const totalAUD = parseFloat(cols[7])
    const dateStr = cols[8].trim() // "Created" column

    if (!id || (rawType !== 'buy' && rawType !== 'sell')) continue
    if (isNaN(amount) || isNaN(rateAUD)) continue

    // Extract the base asset from "BTC/AUD" → "BTC"
    const asset = market.split('/')[0].trim()

    results.push({
      id,
      type: rawType,
      asset,
      amount,
      rateAUD,
      feeAUD: isNaN(feeAUD) ? 0 : feeAUD,
      totalAUD: isNaN(totalAUD) ? amount * rateAUD : totalAUD,
      date: parseCoinSpotDate(dateStr),
    })
  }

  return results
}
