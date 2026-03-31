/**
 * CGT calculator — FIFO method, ATO rules.
 *
 * @typedef {{ date: Date, amount: number, costPerUnit: number }} FIFOLot
 *
 * @typedef {{
 *   date: Date,
 *   asset: string,
 *   type: string,
 *   proceedsAUD: number,
 *   costBaseAUD: number,
 *   gainLoss: number,
 *   isDiscountEligible: boolean,
 *   discountedGain: number,
 *   source: string
 * }} CGTEvent
 *
 * @typedef {{
 *   totalGain: number,
 *   totalLoss: number,
 *   discountApplied: number,
 *   netCGT: number,
 *   eventCount: number
 * }} CGTSummary
 */

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

/**
 * Calculate CGT events using FIFO cost base tracking.
 *
 * Accepts normalised transaction shape:
 *   { date, type, asset, amount, costPerUnitAUD, totalAUD, feeAUD, source }
 *
 * Backward-compatible with old shape that used `rateAUD` instead of `costPerUnitAUD`.
 *
 * @param {Array} transactions - Parsed transactions, sorted by date asc.
 * @returns {{ events: CGTEvent[], summary: CGTSummary }}
 */
export function calculateCGT(transactions) {
  // Sort by date ascending to ensure FIFO ordering
  const sorted = [...transactions].sort((a, b) => a.date - b.date)

  // Map of asset → FIFO queue of lots
  /** @type {Map<string, FIFOLot[]>} */
  const queues = new Map()

  /** @type {CGTEvent[]} */
  const events = []

  for (const tx of sorted) {
    const { asset, type, amount, feeAUD, totalAUD, date, source } = tx

    // Support both new `costPerUnitAUD` and legacy `rateAUD` field names
    const costPerUnitAUD = tx.costPerUnitAUD ?? tx.rateAUD ?? 0

    if (type === 'buy') {
      // Cost base per unit: use costPerUnitAUD if available, otherwise derive from totalAUD/amount
      const effectiveCostPerUnit =
        costPerUnitAUD > 0
          ? costPerUnitAUD
          : totalAUD > 0 && amount > 0
          ? totalAUD / amount
          : 0

      // Include fee in cost base
      const totalCost = (effectiveCostPerUnit * amount) + (feeAUD || 0)
      const costPerUnit = amount > 0 ? totalCost / amount : 0

      if (!queues.has(asset)) queues.set(asset, [])
      queues.get(asset).push({ date, amount, costPerUnit })
    } else if (type === 'sell') {
      if (!queues.has(asset) || queues.get(asset).length === 0) {
        // No acquisition history — cost base is 0
        const proceeds = totalAUD - (feeAUD || 0)
        const gainLoss = proceeds
        events.push({
          date,
          asset,
          type: 'sell',
          proceedsAUD: proceeds,
          costBaseAUD: 0,
          gainLoss,
          isDiscountEligible: false,
          discountedGain: gainLoss,
          source: source || 'Unknown',
        })
        continue
      }

      let remainingToSell = amount
      let totalCostBase = 0
      let oldestAcquisitionDate = null

      const queue = queues.get(asset)

      while (remainingToSell > 0 && queue.length > 0) {
        const lot = queue[0]

        if (oldestAcquisitionDate === null) {
          oldestAcquisitionDate = lot.date
        }

        if (lot.amount <= remainingToSell) {
          // Consume this entire lot
          totalCostBase += lot.amount * lot.costPerUnit
          remainingToSell -= lot.amount
          queue.shift()
        } else {
          // Partially consume this lot
          totalCostBase += remainingToSell * lot.costPerUnit
          lot.amount -= remainingToSell
          remainingToSell = 0
        }
      }

      // Net proceeds = total received minus selling fees
      const proceeds = totalAUD - (feeAUD || 0)
      const gainLoss = proceeds - totalCostBase

      // 50% CGT discount: disposal must be > 12 months after oldest acquisition lot
      const isDiscountEligible =
        oldestAcquisitionDate !== null &&
        gainLoss > 0 &&
        date - oldestAcquisitionDate > MS_PER_YEAR

      const discountedGain = isDiscountEligible ? gainLoss * 0.5 : gainLoss

      events.push({
        date,
        asset,
        type: 'sell',
        proceedsAUD: proceeds,
        costBaseAUD: totalCostBase,
        gainLoss,
        isDiscountEligible,
        discountedGain,
        source: source || 'Unknown',
      })
    }
  }

  // Build summary
  let totalGain = 0
  let totalLoss = 0
  let discountApplied = 0

  for (const ev of events) {
    if (ev.gainLoss > 0) {
      totalGain += ev.gainLoss
    } else {
      totalLoss += ev.gainLoss // negative number
    }
    if (ev.isDiscountEligible) {
      discountApplied += ev.gainLoss - ev.discountedGain
    }
  }

  const netCGT = events.reduce((sum, ev) => sum + ev.discountedGain, 0)

  /** @type {CGTSummary} */
  const summary = {
    totalGain,
    totalLoss,
    discountApplied,
    netCGT,
    eventCount: events.length,
  }

  return { events, summary }
}
