export const HEADERS_SIGNATURE = ['txid', 'refid', 'time', 'type']

/**
 * Map Kraken asset codes to common symbols.
 * @param {string} asset
 * @returns {string}
 */
const KRAKEN_ASSET_MAP = {
  XXBT: 'BTC',
  XETH: 'ETH',
  XLTC: 'LTC',
}

function normaliseKrakenAsset(asset) {
  if (KRAKEN_ASSET_MAP[asset]) return KRAKEN_ASSET_MAP[asset]
  // Strip leading 'X' for other crypto assets
  if (asset.startsWith('X') && asset.length > 1) return asset.slice(1)
  return asset
}

/**
 * Parse a date string in "YYYY-MM-DD HH:MM:SS" format into a JS Date.
 * @param {string} str
 * @returns {Date}
 */
function parseKrakenDate(str) {
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
 * Parse a Kraken trade ledger CSV export.
 *
 * Expected header (with quotes):
 *   "txid","refid","time","type","subtype","aclass","asset","amount","fee","balance"
 *
 * Notes:
 * - Only processes rows where type = 'trade'
 * - Skips fiat rows (asset starts with 'Z') and KFEE rows
 * - totalAUD and costPerUnitAUD are 0 (fiat pair not available)
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
 *   source: 'Kraken'
 * }>}
 */
export function parse(text) {
  const lines = text.split(/\r?\n/)
  if (lines.length < 2) return []

  const results = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Strip surrounding quotes from each field
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim())
    if (cols.length < 9) continue

    const txid = cols[0]
    // cols[1] = refid, cols[2] = time, cols[3] = type
    const timeStr = cols[2]
    const type = cols[3].toLowerCase()
    // cols[4] = subtype, cols[5] = aclass
    const asset = cols[6]
    const amountRaw = parseFloat(cols[7])
    // cols[8] = fee (native asset), cols[9] = balance

    // Only process trade rows
    if (type !== 'trade') continue

    // Skip fiat rows (Z prefix) and KFEE rows
    if (asset.startsWith('Z') || asset === 'KFEE') continue

    if (isNaN(amountRaw)) continue

    const txType = amountRaw > 0 ? 'buy' : 'sell'
    const normalisedAsset = normaliseKrakenAsset(asset)

    results.push({
      id: txid || `kraken-${i}`,
      date: parseKrakenDate(timeStr),
      asset: normalisedAsset,
      type: txType,
      amount: Math.abs(amountRaw),
      costPerUnitAUD: 0, // Not determinable without fiat pair
      feeAUD: 0,         // Fee is in native asset
      totalAUD: 0,       // Not determinable without fiat pair
      source: 'Kraken',
    })
  }

  return results
}
