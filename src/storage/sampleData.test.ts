import { describe, expect, it } from 'vitest'
import { validateQuote } from '../domain/validation'
import { buildSampleData } from './sampleData'

function build() {
  let n = 0
  return buildSampleData('2026-11-21', () => `id-${++n}`)
}

describe('buildSampleData', () => {
  it('has one draft, one issued and one invoiced quote', () => {
    const data = build()
    expect(data.quotes.map((q) => q.status).sort()).toEqual(['draft', 'invoiced', 'issued'])
    expect(data.invoices).toHaveLength(1)
    expect(data.counters).toEqual({ quote: 2, invoice: 1 })
  })

  it('marks every recipient as fictional', () => {
    for (const q of build().quotes) expect(q.recipient.endsWith('（架空）')).toBe(true)
  })

  it('covers 10%, 8% and discount lines', () => {
    const lines = build().quotes.flatMap((q) => q.lines)
    expect(lines.some((l) => l.kind === 'item' && l.taxRate === 10)).toBe(true)
    expect(lines.some((l) => l.kind === 'item' && l.taxRate === 8)).toBe(true)
    expect(lines.some((l) => l.kind === 'discount')).toBe(true)
  })

  it('keeps issued and invoiced quotes valid and issued today', () => {
    for (const q of build().quotes.filter((x) => x.status !== 'draft')) {
      expect(validateQuote(q).ok).toBe(true)
      expect(q.issuedOn).toBe('2026-11-21')
    }
  })
})
