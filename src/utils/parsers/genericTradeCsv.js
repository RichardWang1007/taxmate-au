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

function getValue(cols, index) {
  if (index < 0 || index >= cols.length) return ''
  return (cols[index] || '').replace(/"/g, '').trim()
}

function parseNumber(val) {
  if (!val) return 0
  const cleaned = String(val).replace(/[$,\s]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function parseDate(value) {
  if (!value) return null

  // dd/mm/yyyy style
  if (value.includes('/')) {
    const [dPart, tPart = '00:00:00'] = value.split(' ')
    const [day, month, year] = dPart.split('/')
    if (day && month && year) {
      const [h = '0', m = '0', s = '0'] = tPart.split(':')
      const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(h), Number(m), Number(s))
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function firstMatchIndex(headers, patterns) {
  return headers.findIndex((h) => patterns.some((p) => h.includes(p)))
}

function assetFromMarket(market) {
  if (!market) return ''
  const clean = market.toUpperCase().replace(/\s/g, '')
  if (clean.includes('/')) return clean.split('/')[0]
  if (clean.includes('_')) return clean.split('_')[0]
  if (clean.includes('-')) return clean.split('-')[0]

  const quotes = ['AUD', 'USDT', 'USDC', 'BUSD', 'BTC', 'ETH', 'EUR', 'GBP']
  for (const q of quotes) {
    if (clean.endsWith(q) && clean.length > q.length) {
      return clean.slice(0, -q.length)
    }
  }
  return clean
}

function normaliseType(raw) {
  const v = (raw || '').toLowerCase()
  if (!v) return null
  if (v.includes('buy')) return 'buy'
  if (v.includes('sell')) return 'sell'
  if (v.includes('deposit') || v.includes('receive')) return null
  if (v.includes('withdraw') || v.includes('send')) return null
  return null
}

export function parseGenericTradeCsv(text, sourceName) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = splitCSVLine(lines[0]).map((h) => h.replace(/"/g, '').trim().toLowerCase())
  const idx = {
    date: firstMatchIndex(headers, ['date', 'time', 'timestamp', 'created']),
    type: firstMatchIndex(headers, ['side', 'type', 'action', 'transaction type']),
    asset: firstMatchIndex(headers, ['asset', 'currency', 'token', 'coin']),
    market: firstMatchIndex(headers, ['pair', 'market', 'symbol']),
    amount: firstMatchIndex(headers, ['amount', 'quantity', 'size', 'filled', 'executed']),
    price: firstMatchIndex(headers, ['price', 'rate']),
    total: firstMatchIndex(headers, ['total', 'subtotal', 'quote amount', 'proceeds']),
    fee: firstMatchIndex(headers, ['fee', 'trading fee', 'network fee']),
  }

  if (idx.date < 0 || idx.type < 0 || (idx.asset < 0 && idx.market < 0) || idx.amount < 0) {
    return []
  }

  const results = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i])
    const rawDate = getValue(cols, idx.date)
    const rawType = getValue(cols, idx.type)
    const parsedType = normaliseType(rawType)
    if (!parsedType) continue

    const date = parseDate(rawDate)
    if (!date) continue

    const amount = Math.abs(parseNumber(getValue(cols, idx.amount)))
    if (amount <= 0) continue

    const rawAsset = getValue(cols, idx.asset)
    const rawMarket = getValue(cols, idx.market)
    const asset = (rawAsset ? rawAsset.toUpperCase() : assetFromMarket(rawMarket)).trim()
    if (!asset) continue

    const costPerUnitAUD = Math.abs(parseNumber(getValue(cols, idx.price)))
    const totalAUD = Math.abs(parseNumber(getValue(cols, idx.total)))
    const feeAUD = Math.abs(parseNumber(getValue(cols, idx.fee)))

    results.push({
      id: `${sourceName.toLowerCase().replace(/\s+/g, '-')}-${i}`,
      date,
      asset,
      type: parsedType,
      amount,
      costPerUnitAUD,
      feeAUD,
      totalAUD,
      source: sourceName,
    })
  }

  return results
}
