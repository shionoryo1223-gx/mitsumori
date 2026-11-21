import { describe, expect, it } from 'vitest'
import { parseCsv } from './csv'

describe('parseCsv', () => {
  it('strips a BOM and reads quoted fields with commas and escaped quotes', () => {
    expect(parseCsv('\uFEFFa,b\r\n"x,1","say ""hi"""\n')).toEqual([
      ['a', 'b'],
      ['x,1', 'say "hi"'],
    ])
  })

  it('keeps newlines inside quotes as part of the value', () => {
    expect(parseCsv('a,b\n"line1\nline2",c\n')).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'c'],
    ])
    expect(parseCsv('"l1\r\nl2",c')).toEqual([['l1\r\nl2', 'c']])
  })

  it('accepts LF and CRLF and ignores a trailing newline', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
    expect(parseCsv('a,b\r\nc,d\r\n')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('skips empty lines at the end only', () => {
    expect(parseCsv('a\n\nb\n\n\n')).toEqual([['a'], [''], ['b']])
  })

  it('keeps empty fields', () => {
    expect(parseCsv('a,,c\n,,\n')).toEqual([['a', '', 'c'], ['', '', '']])
  })

  it('returns no rows for empty input', () => {
    expect(parseCsv('')).toEqual([])
  })
})
