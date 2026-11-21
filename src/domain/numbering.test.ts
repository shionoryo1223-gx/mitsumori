import { describe, expect, it } from 'vitest'
import { formatInvoiceNumber, formatQuoteNumber } from './numbering'

describe('numbering', () => {
  it('formats quote numbers', () => {
    expect(formatQuoteNumber(1)).toBe('Q-0001')
    expect(formatQuoteNumber(9999)).toBe('Q-9999')
    expect(formatQuoteNumber(10000)).toBe('Q-10000')
  })

  it('formats invoice numbers', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-0001')
  })
})
