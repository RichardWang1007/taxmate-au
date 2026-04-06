import { parseGenericTradeCsv } from './genericTradeCsv.js'

export const HEADERS_SIGNATURE = ['timestamp', 'type', 'token']

export function parse(text) {
  return parseGenericTradeCsv(text, 'Uniswap')
}
