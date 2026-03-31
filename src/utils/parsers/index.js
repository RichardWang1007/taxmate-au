import { parse as parseCoinSpot, HEADERS_SIGNATURE as CS_SIG } from './coinspot.js'
import { parse as parseBinance, HEADERS_SIGNATURE as BN_SIG } from './binance.js'
import { parse as parseCoinJar, HEADERS_SIGNATURE as CJ_SIG } from './coinjar.js'
import { parse as parseKraken, HEADERS_SIGNATURE as KR_SIG } from './kraken.js'

const PARSERS = [
  { name: 'CoinSpot', sig: CS_SIG, parse: parseCoinSpot },
  { name: 'Binance',  sig: BN_SIG, parse: parseBinance },
  { name: 'CoinJar',  sig: CJ_SIG, parse: parseCoinJar },
  { name: 'Kraken',   sig: KR_SIG, parse: parseKraken },
]

/**
 * Detect the exchange format from the CSV header line, then parse.
 * @param {string} text - Raw CSV text content.
 * @returns {{ exchange: string, transactions: Array }}
 * @throws {Error} if format is unrecognised
 */
export function detectAndParse(text) {
  const firstLine = text.split('\n')[0].replace(/"/g, '')
  for (const p of PARSERS) {
    if (p.sig.every(h => firstLine.includes(h))) {
      return { exchange: p.name, transactions: p.parse(text) }
    }
  }
  throw new Error('Unrecognised CSV format. Supported exchanges: CoinSpot, Binance, CoinJar, Kraken.')
}
