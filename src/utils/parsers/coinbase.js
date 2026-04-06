import { parseGenericTradeCsv } from './genericTradeCsv.js'

export const HEADERS_SIGNATURE = ['timestamp', 'transaction type']

export function parse(text) {
  return parseGenericTradeCsv(text, 'Coinbase')
}
