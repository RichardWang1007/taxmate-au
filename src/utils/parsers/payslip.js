/**
 * Payslip CSV parser for Australian payroll exports.
 * Handles formats from Xero Payroll, MYOB, and Employment Hero.
 *
 * Expected CSV header:
 *   Pay Period End,Gross Earnings,Tax Withheld,Super,Net Pay,Employer
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

/**
 * Parse a payslip CSV export into normalised payslip objects.
 * @param {string} text - Raw CSV text
 * @returns {Array<{
 *   id: string,
 *   periodEnd: Date,
 *   grossEarnings: number,
 *   taxWithheld: number,
 *   super: number,
 *   netPay: number,
 *   employer: string
 * }>}
 */
export function parsePayslipCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  // Parse header to find column indices (case-insensitive)
  const headerCols = splitCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim().toLowerCase())

  const idx = {
    periodEnd: headerCols.findIndex(h => h.includes('period end') || h === 'pay period end'),
    grossEarnings: headerCols.findIndex(h => h.includes('gross')),
    taxWithheld: headerCols.findIndex(h => h.includes('tax')),
    super: headerCols.findIndex(h => h.includes('super')),
    netPay: headerCols.findIndex(h => h.includes('net')),
    employer: headerCols.findIndex(h => h.includes('employer')),
  }

  const results = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]).map(c => c.replace(/"/g, '').trim())

    // Skip rows that are entirely empty
    if (cols.every(c => c === '')) continue

    const periodEndRaw = idx.periodEnd >= 0 ? cols[idx.periodEnd] : ''
    if (!periodEndRaw) continue

    const periodEnd = parseDateAU(periodEndRaw)
    if (isNaN(periodEnd.getTime())) continue

    const grossEarnings = parseFloat(cols[idx.grossEarnings] ?? '0') || 0
    const taxWithheld = parseFloat(cols[idx.taxWithheld] ?? '0') || 0
    const superAmount = parseFloat(cols[idx.super] ?? '0') || 0
    const netPay = parseFloat(cols[idx.netPay] ?? '0') || 0
    const employer = (idx.employer >= 0 && cols[idx.employer]) ? cols[idx.employer] : 'Unknown Employer'

    results.push({
      id: `payslip-${i - 1}`,
      periodEnd,
      grossEarnings,
      taxWithheld,
      super: superAmount,
      netPay,
      employer,
    })
  }

  return results
}

/**
 * Fields used for manual payslip entry forms.
 */
export const PAYSLIP_FIELDS = ['periodEnd', 'grossEarnings', 'taxWithheld', 'super', 'netPay', 'employer']
