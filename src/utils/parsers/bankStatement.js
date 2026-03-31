/**
 * Australian bank statement CSV parser.
 * Handles two common formats:
 *   Format A: Date,Amount,Description
 *   Format B: Date,Description,Debit,Credit,Balance
 */

/**
 * Parse a DD/MM/YYYY string into a JS Date.
 * @param {string} str
 * @returns {Date}
 */
function parseDateAU(str) {
  const [day, month, year] = str.trim().split('/')
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
}

/**
 * Parse a raw CSV text from an Australian bank statement.
 * @param {string} text
 * @returns {Array<{ id: string, date: Date, description: string, amountAUD: number, type: 'debit'|'credit' }>}
 */
export function parseBankCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const header = lines[0].replace(/"/g, '').toLowerCase()
  const dataLines = lines.slice(1)

  // Detect format by inspecting the header
  const isFormatB =
    header.includes('debit') && header.includes('credit') && header.includes('balance')

  const results = []
  let idx = 0

  for (const line of dataLines) {
    // Simple CSV split that handles quoted fields
    const cols = splitCSVLine(line)

    if (isFormatB) {
      // Format B: Date, Description, Debit, Credit, Balance
      const date = parseDateAU(cols[0] ?? '')
      const description = (cols[1] ?? '').replace(/"/g, '').trim()
      const debitRaw = (cols[2] ?? '').replace(/"/g, '').trim()
      const creditRaw = (cols[3] ?? '').replace(/"/g, '').trim()

      if (!description) continue

      if (debitRaw && parseFloat(debitRaw) !== 0) {
        const amountAUD = Math.abs(parseFloat(debitRaw))
        if (amountAUD === 0) continue
        results.push({ id: `txn-${idx++}`, date, description, amountAUD, type: 'debit' })
      } else if (creditRaw && parseFloat(creditRaw) !== 0) {
        const amountAUD = Math.abs(parseFloat(creditRaw))
        if (amountAUD === 0) continue
        results.push({ id: `txn-${idx++}`, date, description, amountAUD, type: 'credit' })
      }
    } else {
      // Format A: Date, Amount, Description
      const date = parseDateAU(cols[0] ?? '')
      const amountRaw = (cols[1] ?? '').replace(/"/g, '').trim()
      const description = (cols[2] ?? '').replace(/"/g, '').trim()

      if (!description) continue

      const amount = parseFloat(amountRaw)
      if (isNaN(amount) || amount === 0) continue

      const amountAUD = Math.abs(amount)
      const type = amount < 0 ? 'debit' : 'credit'
      results.push({ id: `txn-${idx++}`, date, description, amountAUD, type })
    }
  }

  return results
}

/**
 * Minimal CSV line splitter (handles double-quoted fields with commas).
 * @param {string} line
 * @returns {string[]}
 */
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

// ---------------------------------------------------------------------------
// Deduction categories
// ---------------------------------------------------------------------------

export const DEDUCTION_CATEGORIES = [
  {
    id: 'work-travel',
    label: 'Work-Related Travel',
    color: '#7eb8f7',
    keywords: [
      'uber', 'ola', 'didi', 'taxi', 'cabcharge', 'translink', 'opal', 'myki', 'ptv',
      'manly ferry', 'parking', 'toll', 'linkt', 'eastlink', 'citylink',
      'qantas', 'jetstar', 'virgin australia', 'rex airlines', 'tigerair',
    ],
  },
  {
    id: 'home-office',
    label: 'Home Office',
    color: '#a78bfa',
    keywords: [
      'officeworks', 'harvey norman', 'jb hi-fi', 'apple store', 'microsoft',
      'adobe', 'amazon web', 'google workspace', 'dropbox', 'zoom',
      'telstra', 'optus', 'tpg', 'aussie broadband', 'tangerine', 'belong',
    ],
  },
  {
    id: 'self-education',
    label: 'Self-Education',
    color: '#f0a040',
    keywords: [
      'udemy', 'coursera', 'linkedin learning', 'pluralsight', 'skillshare',
      'acloud', 'a cloud guru', 'book', 'amazon', 'angus robertson', 'dymocks',
      'booktopia', 'textbook',
    ],
  },
  {
    id: 'tools-equipment',
    label: 'Tools & Equipment',
    color: '#6fcf97',
    keywords: [
      'bunnings', 'total tools', 'sydney tools', 'machinery house',
      'tool kit depot', 'tools warehouse',
    ],
  },
  {
    id: 'professional',
    label: 'Professional Fees',
    color: '#c8f060',
    keywords: [
      'ahpra', 'ato', 'asic', 'law society', 'cpaa', 'icaa', 'cpa australia',
      'institute of', 'association', 'membership', 'registration', 'licence', 'license',
    ],
  },
  {
    id: 'phone',
    label: 'Phone & Internet',
    color: '#f7b2b2',
    keywords: [
      'telstra', 'optus', 'vodafone', 'amaysim', 'boost mobile',
      'woolworths mobile', 'tpg', 'iinet', 'aussie broadband',
    ],
  },
  {
    id: 'subscriptions',
    label: 'Work Subscriptions',
    color: '#b2e0f7',
    keywords: [
      'github', 'atlassian', 'jira', 'confluence', 'slack', 'notion', 'figma',
      'canva', 'grammarly', 'chatgpt', 'anthropic', 'openai', 'vercel', 'netlify',
      'digitalocean', 'aws', 'azure', 'google cloud',
    ],
  },
]

/**
 * Classify a transaction description into a deduction category.
 * @param {string} description
 * @returns {{ id: string, label: string, color: string, keywords: string[] } | null}
 */
export function classifyTransaction(description) {
  const lower = description.toLowerCase()
  for (const cat of DEDUCTION_CATEGORIES) {
    if (cat.keywords.some(kw => lower.includes(kw))) {
      return cat
    }
  }
  return null
}
