import { parse as parseCoinSpot, HEADERS_SIGNATURE as CS_SIG } from './coinspot.js'
import { parse as parseBinance, HEADERS_SIGNATURE as BN_SIG } from './binance.js'
import { parse as parseCoinJar, HEADERS_SIGNATURE as CJ_SIG } from './coinjar.js'
import { parse as parseKraken, HEADERS_SIGNATURE as KR_SIG } from './kraken.js'
import { parse as parseCoinbase, HEADERS_SIGNATURE as CB_SIG } from './coinbase.js'
import { parse as parseBaseWallet, HEADERS_SIGNATURE as BW_SIG } from './basewallet.js'
import { parse as parseMetaMask, HEADERS_SIGNATURE as MM_SIG } from './metamask.js'
import { parse as parseUniswap, HEADERS_SIGNATURE as UNI_SIG } from './uniswap.js'

const PARSERS = [
  { name: 'CoinSpot', sig: CS_SIG, parse: parseCoinSpot },
  { name: 'Binance',  sig: BN_SIG, parse: parseBinance },
  { name: 'CoinJar',  sig: CJ_SIG, parse: parseCoinJar },
  { name: 'Kraken',   sig: KR_SIG, parse: parseKraken },
  { name: 'Coinbase', sig: CB_SIG, parse: parseCoinbase },
  { name: 'Base Wallet', sig: BW_SIG, parse: parseBaseWallet },
  { name: 'MetaMask', sig: MM_SIG, parse: parseMetaMask },
  { name: 'Uniswap', sig: UNI_SIG, parse: parseUniswap },
]

/**
 * Detect the exchange format from the CSV header line, then parse.
 * @param {string} text - Raw CSV text content.
 * @returns {{ exchange: string, transactions: Array }}
 * @throws {Error} if format is unrecognised
 */
export function detectAndParse(text) {
  const firstLine = text.split('\n')[0].replace(/"/g, '').toLowerCase()
  for (const p of PARSERS) {
    if (p.sig.every(h => firstLine.includes(h.toLowerCase()))) {
      return { exchange: p.name, transactions: p.parse(text) }
    }
  }
  throw new Error('Unrecognised CSV format. Supported exchanges: Coinbase, Base Wallet, Binance, Kraken, CoinSpot, MetaMask, Uniswap.')
}

export function parseForExchange(exchangeName, text) {
  const parser = PARSERS.find((p) => p.name === exchangeName)
  if (!parser) {
    throw new Error(`Unsupported exchange "${exchangeName}".`)
  }
  return parser.parse(text)
}
