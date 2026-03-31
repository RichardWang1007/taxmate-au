/**
 * FY2024-25 ATO income tax calculator.
 * Brackets sourced from ATO: https://www.ato.gov.au/tax-rates-and-codes/tax-rates-individuals
 */

/**
 * Calculate the Low Income Tax Offset (LITO) for FY2024-25.
 * Maximum offset: $700
 * Phase-out 1: $37,500 – $45,000  → reduces by 5c per $1 over $37,500
 * Phase-out 2: $45,000 – $66,667  → reduces by 1.5c per $1 over $45,000
 *
 * @param {number} taxableIncome
 * @returns {number} LITO amount (never negative)
 */
export function calculateLITO(taxableIncome) {
  if (taxableIncome <= 37500) {
    return 700
  }
  if (taxableIncome <= 45000) {
    return Math.max(0, 700 - (taxableIncome - 37500) * 0.05)
  }
  if (taxableIncome <= 66667) {
    // At $45,000 the offset remaining after phase-out 1: 700 - 7500*0.05 = 700 - 375 = 325
    return Math.max(0, 325 - (taxableIncome - 45000) * 0.015)
  }
  return 0
}

/**
 * Calculate income tax for FY2024-25 using ATO resident individual tax brackets.
 *
 * Brackets:
 *   $0        – $18,200  → 0%
 *   $18,201   – $45,000  → 19c per $1 over $18,200
 *   $45,001   – $120,000 → $5,092 + 32.5c per $1 over $45,000
 *   $120,001  – $180,000 → $29,467 + 37c per $1 over $120,000
 *   $180,001+ →           $51,667 + 45c per $1 over $180,000
 *
 * @param {number} taxableIncome - Total taxable income in AUD
 * @returns {{ grossTax: number, lito: number, netTax: number }}
 */
export function calculateIncomeTax(taxableIncome) {
  if (taxableIncome <= 0) {
    return { grossTax: 0, lito: 0, netTax: 0 }
  }

  let grossTax = 0

  if (taxableIncome <= 18200) {
    grossTax = 0
  } else if (taxableIncome <= 45000) {
    grossTax = (taxableIncome - 18200) * 0.19
  } else if (taxableIncome <= 120000) {
    grossTax = 5092 + (taxableIncome - 45000) * 0.325
  } else if (taxableIncome <= 180000) {
    grossTax = 29467 + (taxableIncome - 120000) * 0.37
  } else {
    grossTax = 51667 + (taxableIncome - 180000) * 0.45
  }

  const lito = calculateLITO(taxableIncome)
  const netTax = Math.max(0, grossTax - lito)

  return { grossTax, lito, netTax }
}
