import { describe, expect, it } from 'vitest'
import { addDays, endOfNextMonth, todayJst } from './dates'

describe('todayJst', () => {
  it('uses the JST date, not UTC', () => {
    expect(todayJst(new Date('2026-11-30T14:59:59Z'))).toBe('2026-11-30')
    expect(todayJst(new Date('2026-11-30T15:00:00Z'))).toBe('2026-12-01')
  })
})

describe('addDays', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-01', 30)).toBe('2026-12-01')
    expect(addDays('2026-12-15', 30)).toBe('2027-01-14')
  })

  it('handles month ends in leap and non-leap years', () => {
    expect(addDays('2028-01-31', 30)).toBe('2028-03-01')
    expect(addDays('2027-01-31', 30)).toBe('2027-03-02')
  })
})

describe('endOfNextMonth', () => {
  it('returns the last day of the following month', () => {
    expect(endOfNextMonth('2026-01-31')).toBe('2026-02-28')
    expect(endOfNextMonth('2028-01-15')).toBe('2028-02-29')
    expect(endOfNextMonth('2026-12-15')).toBe('2027-01-31')
    expect(endOfNextMonth('2026-11-30')).toBe('2026-12-31')
    expect(endOfNextMonth('2026-02-28')).toBe('2026-03-31')
  })
})
