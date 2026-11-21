import { parseInteger } from './parse'
import type { Line, RateTotal, TaxRate, Totals } from './types'

export function taxFor(base: number, rate: TaxRate): number {
  return base > 0 ? Math.floor((base * rate) / 100) : 0
}

function amountOf(line: Line): number {
  if (line.kind === 'discount') return -(parseInteger(line.amount) ?? 0)
  return (parseInteger(line.quantity) ?? 0) * (parseInteger(line.unitPrice) ?? 0)
}

export function calculateTotals(lines: Line[]): Totals {
  const bases: Record<TaxRate, number> = { 10: 0, 8: 0 }
  for (const line of lines) bases[line.taxRate] += amountOf(line)

  const toRateTotal = (rate: TaxRate): RateTotal => ({
    rate,
    base: bases[rate],
    tax: taxFor(bases[rate], rate),
  })
  const byRate: [RateTotal, RateTotal] = [toRateTotal(10), toRateTotal(8)]
  const total = byRate.reduce((sum, r) => sum + r.base + r.tax, 0)
  return { byRate, total }
}
