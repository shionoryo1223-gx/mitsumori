// Minimal RFC 4180 CSV reader: quoted fields, "" escapes, CR/LF/CRLF, newlines inside quotes.
export function parseCsv(text: string): string[][] {
  const src = text.startsWith('\uFEFF') ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < src.length) {
    const ch = src.charAt(i)
    if (inQuotes) {
      if (ch === '"') {
        if (src.charAt(i + 1) === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
      } else {
        field += ch
      }
      i += 1
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src.charAt(i + 1) === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
    i += 1
  }
  // Last row without a trailing newline.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Drop fully empty lines at the end only.
  while (rows.length > 0) {
    const last = rows[rows.length - 1]
    if (last && last.length === 1 && last[0] === '') rows.pop()
    else break
  }
  return rows
}
