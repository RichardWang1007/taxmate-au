/**
 * Non-destructive snapshot of a CSV for troubleshooting failed imports.
 * Does not persist; used only in-memory for the Import diagnostics UI.
 */

export function buildCsvSnapshot(text) {
  if (text == null || text === '') {
    return {
      headerLine: '(empty file)',
      firstDataLine: '—',
      lineCount: 0,
      charCount: 0,
      looksLikeCsv: false,
    }
  }

  const normalized = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const charCount = normalized.length
  const rawLines = normalized.split('\n')
  const lineCount = rawLines.length

  const nonEmpty = rawLines.map((l) => l.trim()).filter((l) => l.length > 0)
  const headerLine = nonEmpty[0] ?? '(no header row found)'
  const firstDataLine = nonEmpty.length > 1 ? nonEmpty[1] : '—'

  const looksLikeCsv =
    headerLine.includes(',') || headerLine.includes(';') || headerLine.includes('\t')

  return {
    headerLine,
    firstDataLine,
    lineCount,
    charCount,
    looksLikeCsv,
  }
}

export function buildImportDebugReport({
  platform,
  fileName,
  message,
  snapshot,
  reason,
}) {
  const lines = [
    'TaxMate AU — Import diagnostics (local only, not uploaded)',
    '================================',
    `Platform selected: ${platform}`,
    `File name: ${fileName || '—'}`,
    `Outcome: ${message}`,
    reason ? `Likely cause: ${reason}` : null,
    '',
    `Characters: ${snapshot.charCount}`,
    `Lines (raw): ${snapshot.lineCount}`,
    `Looks like CSV (commas/semicolon/tab in header): ${snapshot.looksLikeCsv ? 'yes' : 'no'}`,
    '',
    'First non-empty line (header):',
    snapshot.headerLine,
    '',
    'Second non-empty line (sample row):',
    snapshot.firstDataLine,
    '',
    'Tip: If the header does not match your exchange export, pick the correct platform or report the format.',
  ].filter(Boolean)

  return lines.join('\n')
}
