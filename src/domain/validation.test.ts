import { describe, expect, it } from 'vitest'
import { MAX_LINES, countErrors, validateQuote } from './validation'
import type { DiscountLine, ItemLine, Line, Quote, TaxRate } from './types'

const item = (over: Partial<ItemLine> = {}): ItemLine => ({
  id: 'i1',
  kind: 'item',
  name: '作業',
  quantity: '1',
  unitPrice: '1000',
  taxRate: 10,
  ...over,
})
const discount = (amount: string, taxRate: TaxRate, id = 'd1'): DiscountLine => ({
  id,
  kind: 'discount',
  amount,
  taxRate,
})
const quote = (over: Partial<Quote> = {}): Quote => ({
  id: 'q1',
  status: 'draft',
  number: null,
  recipient: '株式会社テスト',
  subject: '件名',
  lines: [item()],
  issuedOn: null,
  validUntil: null,
  invoiceId: null,
  ...over,
})
const withItem = (over: Partial<ItemLine>) => quote({ lines: [item(over)] })

describe('validateQuote', () => {
  it('accepts a valid quote', () => {
    expect(validateQuote(quote())).toEqual({ ok: true, fields: {}, lines: {}, form: [] })
  })

  describe('recipient', () => {
    it.each(['', '   '])('rejects empty %j', (recipient) => {
      const r = validateQuote(quote({ recipient }))
      expect(r.ok).toBe(false)
      expect(r.fields.recipient).toBe('宛先を入力してください')
    })
    it('accepts 50 chars and rejects 51', () => {
      expect(validateQuote(quote({ recipient: 'あ'.repeat(50) })).ok).toBe(true)
      expect(validateQuote(quote({ recipient: 'あ'.repeat(51) })).fields.recipient).toBe(
        '宛先は50文字以内にしてください',
      )
    })
    it('counts a family emoji as one character', () => {
      expect(validateQuote(quote({ recipient: 'あ'.repeat(49) + '👨‍👩‍👧' })).ok).toBe(true)
    })
  })

  describe('subject', () => {
    it('may be empty', () => {
      expect(validateQuote(quote({ subject: '' })).ok).toBe(true)
    })
    it('rejects 51 chars', () => {
      const r = validateQuote(quote({ subject: 'あ'.repeat(51) }))
      expect(r.ok).toBe(false)
      expect(r.fields.subject).toBe('件名は50文字以内にしてください')
    })
  })

  describe('item name', () => {
    it('rejects empty', () => {
      const r = validateQuote(withItem({ name: '' }))
      expect(r.ok).toBe(false)
      expect(r.lines.i1).toEqual({ name: '品名を入力してください' })
    })
    it('accepts 40 and rejects 41', () => {
      expect(validateQuote(withItem({ name: 'あ'.repeat(40) })).ok).toBe(true)
      expect(validateQuote(withItem({ name: 'あ'.repeat(41) })).lines.i1?.name).toBe(
        '品名は40文字以内にしてください',
      )
    })
  })

  describe('quantity', () => {
    it.each(['0', '10000', '1.5', '', '-1'])('rejects %j', (quantity) => {
      const r = validateQuote(withItem({ quantity }))
      expect(r.ok).toBe(false)
      expect(r.lines.i1).toEqual({ quantity: '数量は1〜9,999の整数で入力してください' })
    })
    it.each(['1', '9999', '１２'])('accepts %j', (quantity) => {
      expect(validateQuote(withItem({ quantity })).ok).toBe(true)
    })
  })

  describe('unit price', () => {
    it.each(['0', '9,999,999'])('accepts %j', (unitPrice) => {
      expect(validateQuote(withItem({ unitPrice })).ok).toBe(true)
    })
    it.each(['10000000', '', 'abc'])('rejects %j', (unitPrice) => {
      expect(validateQuote(withItem({ unitPrice })).lines.i1).toEqual({
        unitPrice: '単価は0〜9,999,999の整数で入力してください',
      })
    })
  })

  describe('discount amount', () => {
    const q = (amount: string) => quote({ lines: [item(), discount(amount, 10)] })
    it('rejects 0', () => {
      const r = validateQuote(q('0'))
      expect(r.ok).toBe(false)
      expect(r.lines.d1).toEqual({ amount: '値引き額は1〜9,999,999の整数で入力してください' })
    })
    it('accepts 1', () => {
      expect(validateQuote(q('1')).ok).toBe(true)
    })
    it('rejects 10000000', () => {
      expect(validateQuote(q('10000000')).lines.d1?.amount).toBe(
        '値引き額は1〜9,999,999の整数で入力してください',
      )
    })
  })

  describe('row count', () => {
    it('requires at least one line', () => {
      const r = validateQuote(quote({ lines: [] }))
      expect(r.ok).toBe(false)
      expect(r.form).toEqual(['明細は1行以上入れてください'])
    })
    it('allows 20 lines and rejects 21', () => {
      const many = (n: number): Line[] =>
        Array.from({ length: n }, (_, i) => item({ id: `i${i}` }))
      expect(MAX_LINES).toBe(20)
      expect(validateQuote(quote({ lines: many(20) })).ok).toBe(true)
      const r = validateQuote(quote({ lines: many(21) }))
      expect(r.ok).toBe(false)
      expect(r.form).toEqual(['明細は20行までです'])
    })
  })

  describe('discount overflow', () => {
    const q = (amount: string, rate: TaxRate) =>
      quote({ lines: [item({ unitPrice: '100', taxRate: 8 }), discount(amount, rate)] })
    it('rejects a discount above the 8% items', () => {
      const r = validateQuote(q('101', 8))
      expect(r.ok).toBe(false)
      expect(r.form).toEqual(['8%の値引きが、8%の明細の合計を超えています'])
    })
    it('accepts an equal discount', () => {
      expect(validateQuote(q('100', 8)).ok).toBe(true)
    })
    it('rejects a discount above the 10% items', () => {
      const r = validateQuote(
        quote({ lines: [item({ unitPrice: '100' }), discount('101', 10)] }),
      )
      expect(r.form).toEqual(['10%の値引きが、10%の明細の合計を超えています'])
    })
    it('does not offset across rates', () => {
      const r = validateQuote(q('1', 10))
      expect(r.form).toEqual(['10%の値引きが、10%の明細の合計を超えています'])
    })
    it('lists 10% before 8% after the row-count error', () => {
      const r = validateQuote(
        quote({ lines: [discount('1', 8, 'a'), discount('1', 10, 'b')] }),
      )
      expect(r.form).toEqual([
        '10%の値引きが、10%の明細の合計を超えています',
        '8%の値引きが、8%の明細の合計を超えています',
      ])
    })
  })

  it('reports only lines that have errors', () => {
    const r = validateQuote(
      quote({ lines: [item({ id: 'a' }), item({ id: 'b', name: '' })] }),
    )
    expect(Object.keys(r.lines)).toEqual(['b'])
  })
})

describe('countErrors', () => {
  it('counts 3 for a new draft (S-INP-35)', () => {
    const r = validateQuote(
      quote({
        recipient: '',
        subject: '',
        lines: [item({ name: '', quantity: '1', unitPrice: '', taxRate: 10 })],
      }),
    )
    expect(countErrors(r)).toBe(3)
    expect(Object.keys(r.fields)).toEqual(['recipient'])
  })
  it('counts fields, line messages and form messages', () => {
    const r = validateQuote(
      quote({ recipient: '', lines: [item({ name: '', quantity: '0' }), discount('1', 8)] }),
    )
    expect(countErrors(r)).toBe(1 + 2 + 1)
  })
  it('is 0 when valid', () => {
    expect(countErrors(validateQuote(quote()))).toBe(0)
  })
})
