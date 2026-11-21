import { describe, expect, it } from 'vitest'
import { calculateTotals, taxFor } from './calc'
import type { DiscountLine, ItemLine, TaxRate } from './types'

let seq = 0
const item = (quantity: string, unitPrice: string, taxRate: TaxRate): ItemLine => ({
  id: `i${seq++}`,
  kind: 'item',
  name: 'x',
  quantity,
  unitPrice,
  taxRate,
})
const discount = (amount: string, taxRate: TaxRate): DiscountLine => ({
  id: `d${seq++}`,
  kind: 'discount',
  amount,
  taxRate,
})

describe('taxFor', () => {
  it('floors the tax', () => {
    expect(taxFor(38, 10)).toBe(3)
    expect(taxFor(2940, 8)).toBe(235)
  })

  it('is 0 for zero or negative base', () => {
    expect(taxFor(0, 10)).toBe(0)
    expect(taxFor(-200, 8)).toBe(0)
  })
})

describe('calculateTotals', () => {
  it('returns zeros for no lines', () => {
    expect(calculateTotals([])).toEqual({
      byRate: [
        { rate: 10, base: 0, tax: 0 },
        { rate: 8, base: 0, tax: 0 },
      ],
      total: 0,
    })
  })

  it('calculates a single line', () => {
    const t = calculateTotals([item('2', '1,000', 10)])
    expect(t.byRate[0]).toEqual({ rate: 10, base: 2000, tax: 200 })
    expect(t.total).toBe(2200)
  })

  it('rounds the tax once per rate', () => {
    const t = calculateTotals([item('1', '19', 10), item('1', '19', 10)])
    expect(t.byRate[0].tax).toBe(3)
    expect(t.total).toBe(41)
  })

  it('handles mixed rates and discounts', () => {
    const t = calculateTotals([item('3', '980', 8), item('1', '5000', 10), discount('500', 10)])
    expect(t.byRate[0]).toEqual({ rate: 10, base: 4500, tax: 450 })
    expect(t.byRate[1]).toEqual({ rate: 8, base: 2940, tax: 235 })
    expect(t.total).toBe(8125)
  })

  it('stays exact at the maximum size', () => {
    const lines = Array.from({ length: 20 }, () => item('9,999', '9,999,999', 10))
    const t = calculateTotals(lines)
    expect(t.byRate[0].base).toBe(1_999_799_800_020)
    expect(t.byRate[0].tax).toBe(199_979_980_002)
    expect(t.total).toBe(2_199_779_780_022)
  })

  it('treats invalid values as 0', () => {
    expect(calculateTotals([item('abc', '100', 10)]).total).toBe(0)
    expect(calculateTotals([item('1', '', 10)]).total).toBe(0)
    expect(calculateTotals([discount('x', 10)]).total).toBe(0)
  })

  it('keeps a negative base with zero tax', () => {
    const t = calculateTotals([item('1', '100', 8), discount('300', 8)])
    expect(t.byRate[1]).toEqual({ rate: 8, base: -200, tax: 0 })
    expect(t.total).toBe(-200)
  })
})
