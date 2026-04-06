export const HEADERS_SIGNATURE = ['date(utc)', 'side']

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

function splitCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function extractBaseAsset(pairRaw) {
  if (!pairRaw) return ''
  const pair = pairRaw.replace(/["\s]/g, '').toUpperCase()
  if (!pair) return ''

  if (pair.includes('/')) return pair.split('/')[0]
  if (pair.includes('_')) return pair.split('_')[0]
  if (pair.includes('-')) return pair.split('-')[0]

  const knownQuotes = [
    'AUD', 'USDT', 'USDC', 'BUSD', 'FDUSD',
    'BTC', 'ETH', 'BNB', 'EUR', 'GBP',
  ]
  for (const q of knownQuotes) {
    if (pair.endsWith(q) && pair.length > q.length) {
      return pair.slice(0, -q.length)
    }
  }
  return pair
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
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []

  const headerCols = splitCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim().toLowerCase())
  const idx = {
    date: headerCols.findIndex(h => h.includes('date')),
    pair: headerCols.findIndex(h => h.includes('pair') || h.includes('market') || h.includes('symbol')),
    side: headerCols.findIndex(h => h.includes('side') || h === 'type'),
    price: headerCols.findIndex(h => h.includes('price')),
    executed: headerCols.findIndex(h => h.includes('executed') || h.includes('filled')),
    amount: headerCols.findIndex(h => h === 'amount' || h.includes('quote amount') || h.includes('total')),
    fee: headerCols.findIndex(h => h.includes('fee')),
    feeCoin: headerCols.findIndex(h => h.includes('fee coin') || h === 'fee asset'),
  }

  if (idx.date < 0 || idx.side < 0 || idx.pair < 0) return []

  const results = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = splitCSVLine(line).map(c => c.replace(/"/g, '').trim())
    const dateStr = idx.date >= 0 ? cols[idx.date] : ''
    const pair = idx.pair >= 0 ? cols[idx.pair] : ''
    const side = idx.side >= 0 ? cols[idx.side] : ''
    const price = parseFloat(idx.price >= 0 ? cols[idx.price] : '')
    const executed = idx.executed >= 0 ? cols[idx.executed] : ''
    const amount = idx.amount >= 0 ? cols[idx.amount] : ''
    const fee = idx.fee >= 0 ? cols[idx.fee] : ''
    const feeCoin = idx.feeCoin >= 0 ? (cols[idx.feeCoin] || '').toUpperCase() : ''

    const rawType = side.toLowerCase()
    if (rawType !== 'buy' && rawType !== 'sell') continue

    const asset = extractBaseAsset(pair)
    if (!asset) continue

    const execAmount = executed ? parseNumericPrefix(executed) : parseNumericPrefix(amount)
    const totalAUD = parseNumericPrefix(amount)

    const feeText = fee.toUpperCase()
    const isAudFee = feeText.includes('AUD') || feeCoin === 'AUD'
    const feeAUD = isAudFee ? parseNumericPrefix(fee) : 0

    if (!dateStr || !execAmount || execAmount <= 0) continue

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
