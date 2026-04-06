import { parseGenericTradeCsv } from './genericTradeCsv.js'

export const HEADERS_SIGNATURE = ['date', 'type', 'asset']

export function parse(text) {
  return parseGenericTradeCsv(text, 'Base Wallet')
}
