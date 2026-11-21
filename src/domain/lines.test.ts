import { describe, expect, it } from 'vitest'
import { addDiscountLine, addItemLine, removeLine } from './lines'
import type { Quote } from './types'
import { MAX_LINES } from './validation'

const quote = (lineCount: number): Quote => ({
  id: 'q1',
  status: 'draft',
  number: null,
  recipient: '',
  subject: '',
  lines: Array.from({ length: lineCount }, (_, i) => ({
    id: `l${i}`,
    kind: 'item' as const,
    name: '',
    quantity: '1',
    unitPrice: '',
    taxRate: 10 as const,
  })),
  issuedOn: null,
  validUntil: null,
  invoiceId: null,
})

describe('addItemLine / addDiscountLine', () => {
  it('appends an empty item line', () => {
    const q = addItemLine(quote(1), 'new')
    expect(q.lines).toHaveLength(2)
    expect(q.lines[1]).toEqual({
      id: 'new',
      kind: 'item',
      name: '',
      quantity: '1',
      unitPrice: '',
      taxRate: 10,
    })
  })

  it('appends an empty discount line', () => {
    const q = addDiscountLine(quote(1), 'd')
    expect(q.lines[1]).toEqual({ id: 'd', kind: 'discount', amount: '', taxRate: 10 })
  })

  it('does not exceed MAX_LINES', () => {
    const full = quote(MAX_LINES)
    expect(addItemLine(full, 'x')).toBe(full)
    expect(addDiscountLine(full, 'x')).toBe(full)
    expect(addItemLine(full, 'x').lines).toHaveLength(MAX_LINES)
  })
})

describe('removeLine', () => {
  it('removes only the given line', () => {
    const q = removeLine(quote(3), 'l1')
    expect(q.lines.map((l) => l.id)).toEqual(['l0', 'l2'])
  })

  it('allows removing the last line', () => {
    expect(removeLine(quote(1), 'l0').lines).toEqual([])
  })
})
