import { describe, expect, test } from 'vitest'
import { calculateTotals } from '@/domain/calc'
import { removeLine } from '@/domain/lines'
import { parseInteger } from '@/domain/parse'
import { countErrors, validateQuote } from '@/domain/validation'
import type { Line, Quote } from '@/domain/types'
import { createDraft, allowedActions, emptyData, updateDraft } from '@/domain/workflow'
import { MSG, discount, idGen, item, items, quote, unwrap } from './helpers'

const TODAY = '2026-11-21'
const A = 'あ'

function itemErr(
  field: 'name' | 'quantity' | 'unitPrice',
  value: string,
): string | undefined {
  const q = quote({ lines: [item('l-1', { [field]: value })] })
  return validateQuote(q).lines['l-1']?.[field]
}

function discountErr(value: string): string | undefined {
  const q = quote({
    lines: [item('l-1', { quantity: '2', unitPrice: '9999999' }), discount('d-1', { amount: value })],
  })
  return validateQuote(q).lines['d-1']?.amount
}

function recipientErr(value: string): string | undefined {
  return validateQuote(quote({ recipient: value })).fields.recipient
}

describe('入力（INP）', () => {
  test('TC-INP-001 数量の範囲（1〜9,999）の境目', () => {
    expect(itemErr('quantity', '0')).toBe(MSG.quantity)
    expect(itemErr('quantity', '1')).toBeUndefined()
    expect(itemErr('quantity', '9999')).toBeUndefined()
    expect(itemErr('quantity', '10000')).toBe(MSG.quantity)
  })

  test('TC-INP-002 単価の範囲（0〜9,999,999）の境目', () => {
    expect(itemErr('unitPrice', '-1')).toBe(MSG.unitPrice)
    expect(itemErr('unitPrice', '0')).toBeUndefined()
    expect(itemErr('unitPrice', '9999999')).toBeUndefined()
    expect(itemErr('unitPrice', '10000000')).toBe(MSG.unitPrice)
  })

  test('TC-INP-003 値引き額の範囲（1〜9,999,999）の境目', () => {
    expect(discountErr('0')).toBe(MSG.amount)
    expect(discountErr('1')).toBeUndefined()
    expect(discountErr('9999999')).toBeUndefined()
    expect(discountErr('10000000')).toBe(MSG.amount)
  })

  test('TC-INP-004 宛先の文字数（1〜50）の境目', () => {
    expect(recipientErr('')).toBe(MSG.recipientEmpty)
    expect(recipientErr(A.repeat(1))).toBeUndefined()
    expect(recipientErr(A.repeat(50))).toBeUndefined()
    expect(recipientErr(A.repeat(51))).toBe(MSG.recipientLong)
  })

  test('TC-INP-005 件名の文字数（0〜50）の境目', () => {
    const subjectErr = (s: string) => validateQuote(quote({ subject: s })).fields.subject
    expect(subjectErr('')).toBeUndefined()
    expect(subjectErr(A.repeat(50))).toBeUndefined()
    expect(subjectErr(A.repeat(51))).toBe(MSG.subjectLong)
  })

  test('TC-INP-006 品名の文字数（1〜40）の境目', () => {
    expect(itemErr('name', '')).toBe(MSG.nameEmpty)
    expect(itemErr('name', A.repeat(1))).toBeUndefined()
    expect(itemErr('name', A.repeat(40))).toBeUndefined()
    expect(itemErr('name', A.repeat(41))).toBe(MSG.nameLong)
  })

  test('TC-INP-007 明細の行数（1〜20）の境目', () => {
    const r0 = validateQuote(quote({ lines: [] }))
    expect(r0.form).toEqual([MSG.linesEmpty])
    const r1 = validateQuote(quote({ lines: items(1) }))
    expect(r1.ok).toBe(true)
    expect(r1.form).toEqual([])
    const r20 = validateQuote(quote({ lines: items(20) }))
    expect(r20.ok).toBe(true)
    expect(r20.form).toEqual([])
    const r21 = validateQuote(quote({ lines: items(21) }))
    expect(r21.form).toEqual([MSG.linesTooMany])
  })

  test('TC-INP-008 値引き行も明細の行数に数える', () => {
    const ok = validateQuote(quote({ lines: [...items(19), discount('d-1', { amount: '1' })] }))
    expect(ok.ok).toBe(true)
    expect(ok.form).toEqual([])
    const ng = validateQuote(quote({ lines: [...items(20), discount('d-1', { amount: '1' })] }))
    expect(ng.form).toEqual([MSG.linesTooMany])
  })

  test('TC-INP-009 数値の読み取り：受け付ける形', () => {
    const inputs = ['12', '１２', '1,000', '１，０００', ' 5 ', '　5　', '007', '1,,0']
    const expected = [12, 12, 1000, 1000, 5, 5, 7, 10]
    expect(inputs.map((s) => parseInteger(s))).toEqual(expected)
    expect(inputs.map((s) => itemErr('quantity', s))).toEqual(inputs.map(() => undefined))
    expect(inputs.map((s) => itemErr('unitPrice', s))).toEqual(inputs.map(() => undefined))
    expect(inputs.map((s) => discountErr(s))).toEqual(inputs.map(() => undefined))
  })

  test('TC-INP-010 数値の読み取り：符号・小数・指数の形は誤り', () => {
    const inputs = ['1.5', '-1', '+5', '1e3']
    expect(inputs.map((s) => parseInteger(s))).toEqual(inputs.map(() => null))
    expect(inputs.map((s) => itemErr('quantity', s))).toEqual(inputs.map(() => MSG.quantity))
    expect(inputs.map((s) => itemErr('unitPrice', s))).toEqual(inputs.map(() => MSG.unitPrice))
    expect(inputs.map((s) => discountErr(s))).toEqual(inputs.map(() => MSG.amount))
  })

  test('TC-INP-011 数値の読み取り：空・空白・数字以外・中の空白は誤り', () => {
    const inputs = ['1 000', '', '   ', '100円']
    expect(inputs.map((s) => parseInteger(s))).toEqual(inputs.map(() => null))
    expect(inputs.map((s) => itemErr('quantity', s))).toEqual(inputs.map(() => MSG.quantity))
    expect(inputs.map((s) => itemErr('unitPrice', s))).toEqual(inputs.map(() => MSG.unitPrice))
    expect(inputs.map((s) => discountErr(s))).toEqual(inputs.map(() => MSG.amount))
  })

  test('TC-INP-012 文字数は前後の空白（半角・全角）を取り除いて数える', () => {
    expect(recipientErr(` ${A.repeat(50)} `)).toBeUndefined()
    expect(recipientErr(`　${A.repeat(50)}　`)).toBeUndefined()
  })

  test('TC-INP-013 空白だけの宛先は空として扱う', () => {
    expect(recipientErr(' ')).toBe(MSG.recipientEmpty)
    expect(recipientErr('　')).toBe(MSG.recipientEmpty)
  })

  test('TC-INP-014 文字数：𠮷 を見た目の 1 文字と数える（宛先）', () => {
    expect(recipientErr('𠮷'.repeat(50))).toBeUndefined()
    expect(recipientErr('𠮷'.repeat(51))).toBe(MSG.recipientLong)
  })

  test('TC-INP-015 文字数：家族の絵文字を見た目の 1 文字と数える（宛先）', () => {
    const family = '👨‍👩‍👧'
    expect(recipientErr(family.repeat(50))).toBeUndefined()
    expect(recipientErr(family.repeat(51))).toBe(MSG.recipientLong)
  })

  test('TC-INP-016 文字数：𠮷 を見た目の 1 文字と数える（品名、上限 40）', () => {
    expect(itemErr('name', '𠮷'.repeat(40))).toBeUndefined()
    expect(itemErr('name', '𠮷'.repeat(41))).toBe(MSG.nameLong)
  })

  test('TC-INP-017 値引きの上限：10% の値引きが明細の合計と同額', () => {
    const q = quote({
      lines: [item('l-1', { unitPrice: '1000' }), discount('d-1', { amount: '1000' })],
    })
    const r = validateQuote(q)
    expect(r.form).not.toContain(MSG.excess10)
    expect(r.ok).toBe(true)
    const t = calculateTotals(q.lines)
    expect(t.byRate[0].base).toBe(0)
    expect(t.byRate[0].tax).toBe(0)
  })

  test('TC-INP-018 値引きの上限：10% の値引きが明細の合計を 1 円超える', () => {
    const q = quote({
      lines: [item('l-1', { unitPrice: '1000' }), discount('d-1', { amount: '1001' })],
    })
    expect(validateQuote(q).form).toEqual([MSG.excess10])
  })

  test('TC-INP-019 値引きの上限：同じ税率の明細がなければ 0 円として比べる', () => {
    const q = quote({
      lines: [item('l-1', { unitPrice: '1000' }), discount('d-1', { amount: '1', taxRate: 8 })],
    })
    expect(validateQuote(q).form).toEqual([MSG.excess8])
  })

  test('TC-INP-020 値引きの上限：単価が空の明細は 0 円として数える', () => {
    const q = quote({
      lines: [item('l-1', { unitPrice: '' }), discount('d-1', { amount: '1' })],
    })
    const r = validateQuote(q)
    expect(r.lines['l-1']?.unitPrice).toBe(MSG.unitPrice)
    expect(r.form).toEqual([MSG.excess10])
    expect(countErrors(r)).toBe(2)
  })

  test('TC-INP-021 誤りの件数：新しい下書き', () => {
    const created = unwrap(createDraft(emptyData(), idGen()))
    const draft = created.data.quotes.find((x) => x.id === created.id) as Quote
    const r = validateQuote(draft)
    expect(countErrors(r)).toBe(3)
    expect(r.fields.recipient).toBe(MSG.recipientEmpty)
    const line = draft.lines[0] as Line
    expect(r.lines[line.id]?.name).toBe(MSG.nameEmpty)
    expect(r.lines[line.id]?.unitPrice).toBe(MSG.unitPrice)
  })

  test('TC-INP-022 誤りの件数：誤りがなくなると 0', () => {
    const created = unwrap(createDraft(emptyData(), idGen()))
    const updated = unwrap(
      updateDraft(created.data, created.id, (q) => ({
        ...q,
        recipient: 'テスト商会（架空）',
        lines: q.lines.map((l) =>
          l.kind === 'item' ? { ...l, name: '作業', unitPrice: '1000' } : l,
        ),
      })),
    )
    const draft = updated.data.quotes.find((x) => x.id === created.id) as Quote
    const r = validateQuote(draft)
    expect(countErrors(r)).toBe(0)
    expect(r.ok).toBe(true)
    expect(allowedActions(draft, TODAY).issue).toBe(true)
  })

  test('TC-INP-042 誤りの件数：同じ行の数量と単価が両方誤り', () => {
    const q = quote({ lines: [item('l-1', { quantity: 'abc', unitPrice: 'x' })] })
    expect(countErrors(validateQuote(q))).toBe(2)
  })

  test('TC-INP-023 誤りの件数：宛先が空で明細が 0 行', () => {
    const created = unwrap(createDraft(emptyData(), idGen()))
    const draft = created.data.quotes.find((x) => x.id === created.id) as Quote
    const lineId = (draft.lines[0] as Line).id
    // 削除前：宛先、品名、単価の 3 件
    expect(countErrors(validateQuote(draft))).toBe(3)

    const removed = removeLine(draft, lineId)
    expect(removed.lines).toEqual([])
    const r = validateQuote(removed)
    expect(countErrors(r)).toBe(2)
    expect(r.fields.recipient).toBe(MSG.recipientEmpty)
    expect(r.form).toEqual([MSG.linesEmpty])
    // 削除した行の誤りは数えない
    expect(r.lines[lineId]).toBeUndefined()
    expect(Object.keys(r.lines)).toEqual([])
  })

  test('TC-INP-024 誤りの件数：宛先が空で 10% の値引きが超過', () => {
    const q = quote({
      recipient: '',
      lines: [item('l-1', { unitPrice: '1000' }), discount('d-1', { amount: '1001' })],
    })
    expect(countErrors(validateQuote(q))).toBe(2)
  })

  test('TC-INP-025 誤りの件数：10% と 8% の両方で値引きが超過', () => {
    const q = quote({
      lines: [
        item('l-1', { unitPrice: '1000', taxRate: 10 }),
        item('l-2', { unitPrice: '1000', taxRate: 8 }),
        discount('d-1', { amount: '1001', taxRate: 10 }),
        discount('d-2', { amount: '1001', taxRate: 8 }),
      ],
    })
    const r = validateQuote(q)
    expect(countErrors(r)).toBe(2)
    expect(r.form).toContain(MSG.excess10)
    expect(r.form).toContain(MSG.excess8)
  })

  test('TC-INP-026 誤りの件数：値引き額が空', () => {
    const q = quote({
      lines: [item('l-1', { unitPrice: '1000' }), discount('d-1', { amount: '', taxRate: 10 })],
    })
    const r = validateQuote(q)
    expect(countErrors(r)).toBe(1)
    expect(r.lines['d-1']?.amount).toBe(MSG.amount)
    expect(r.form).toEqual([])
  })

  test('TC-INP-027 発行できるか：すべて正しい（R1）', () => {
    const q = quote()
    expect(validateQuote(q).ok).toBe(true)
    expect(allowedActions(q, TODAY).issue).toBe(true)
  })

  test('TC-INP-028 発行できるか：項目の誤りだけある（R2）', () => {
    const q = quote({ recipient: '' })
    expect(validateQuote(q).ok).toBe(false)
    expect(allowedActions(q, TODAY).issue).toBe(false)
  })

  test('TC-INP-029 発行できるか：明細が 0 行だけ誤り（R3）', () => {
    const q = quote({ lines: [] })
    expect(validateQuote(q).ok).toBe(false)
    expect(allowedActions(q, TODAY).issue).toBe(false)
  })

  test('TC-INP-030 発行できるか：値引きの超過だけ誤り（R4）', () => {
    const q = quote({
      lines: [item('l-1', { unitPrice: '1000' }), discount('d-1', { amount: '1001' })],
    })
    expect(validateQuote(q).ok).toBe(false)
    expect(allowedActions(q, TODAY).issue).toBe(false)
  })

  test('TC-INP-031 発行できるか：項目の誤りと値引きの超過が重なる（R6）', () => {
    const q = quote({
      recipient: '',
      lines: [item('l-1', { unitPrice: '1000' }), discount('d-1', { amount: '1001' })],
    })
    const r = validateQuote(q)
    expect(r.ok).toBe(false)
    expect(allowedActions(q, TODAY).issue).toBe(false)
    expect(countErrors(r)).toBe(2)
  })
})
