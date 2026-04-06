import { parseGenericTradeCsv } from './genericTradeCsv.js'

export const HEADERS_SIGNATURE = ['date', 'type', 'token']

export function parse(text) {
  return parseGenericTradeCsv(text, 'MetaMask')
}
