import { describe, expect, it } from 'vitest'
import { formatDate, formatYen } from './format'

describe('formatYen', () => {
  it('adds thousands separators and the yen suffix', () => {
    expect(formatYen(1234)).toBe('1,234円')
  })
  it('formats zero', () => {
    expect(formatYen(0)).toBe('0円')
  })
  it('never prints negative zero', () => {
    expect(formatYen(-0)).toBe('0円')
  })
  it('keeps a half-width minus for negative amounts', () => {
    expect(formatYen(-200)).toBe('-200円')
  })
})

describe('formatDate', () => {
  it('uses slashes', () => {
    expect(formatDate('2026-11-21')).toBe('2026/11/21')
  })
  it('keeps zero-padded month and day', () => {
    expect(formatDate('2027-01-01')).toBe('2027/01/01')
  })
})
