import type { Quote } from './types'
import { MAX_LINES } from './validation'

export function addItemLine(q: Quote, id: string): Quote {
  if (q.lines.length >= MAX_LINES) return q
  return {
    ...q,
    lines: [...q.lines, { id, kind: 'item', name: '', quantity: '1', unitPrice: '', taxRate: 10 }],
  }
}

export function addDiscountLine(q: Quote, id: string): Quote {
  if (q.lines.length >= MAX_LINES) return q
  return { ...q, lines: [...q.lines, { id, kind: 'discount', amount: '', taxRate: 10 }] }
}

export function removeLine(q: Quote, lineId: string): Quote {
  return { ...q, lines: q.lines.filter((line) => line.id !== lineId) }
}
