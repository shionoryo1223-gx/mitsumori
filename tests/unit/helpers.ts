import type { AppData, DiscountLine, ItemLine, Line, Quote } from '@/domain/types'
import { createDraft, emptyData, updateDraft } from '@/domain/workflow'

// Deterministic id generator (never random, never clock-based).
export function idGen(prefix = 'id'): () => string {
  let n = 0
  return () => `${prefix}-${++n}`
}

export function item(id: string, o: Partial<ItemLine> = {}): ItemLine {
  return { id, kind: 'item', name: '作業', quantity: '1', unitPrice: '1000', taxRate: 10, ...o }
}

export function discount(id: string, o: Partial<DiscountLine> = {}): DiscountLine {
  return { id, kind: 'discount', amount: '1', taxRate: 10, ...o }
}

// n valid item lines with ids l-1 .. l-n
export function items(n: number, o: Partial<ItemLine> = {}): Line[] {
  return Array.from({ length: n }, (_, i) => item(`l-${i + 1}`, o))
}

// A valid draft by default (recipient set, one valid item line).
export function quote(o: Partial<Quote> = {}): Quote {
  return {
    id: 'q-1',
    status: 'draft',
    number: null,
    recipient: 'テスト商会（架空）',
    subject: '',
    lines: [item('l-1')],
    issuedOn: null,
    validUntil: null,
    invoiceId: null,
    ...o,
  }
}

export function issuedQuote(issuedOn: string, validUntil: string, o: Partial<Quote> = {}): Quote {
  return quote({ status: 'issued', number: 'Q-0001', issuedOn, validUntil, ...o })
}

export function dataWith(
  quotes: Quote[] = [],
  counters: { quote: number; invoice: number } = { quote: 0, invoice: 0 },
): AppData {
  return { ...emptyData(), quotes, counters }
}

// Unwrap a successful workflow result (fails the test loudly otherwise).
export function unwrap<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(`workflow call failed: ${JSON.stringify(r)}`)
  return r as Extract<T, { ok: true }>
}

// Creates a new draft through the public workflow and makes it valid.
export function addValidDraft(
  data: AppData,
  newId: () => string,
): { data: AppData; id: string } {
  const created = unwrap(createDraft(data, newId))
  const updated = unwrap(
    updateDraft(created.data, created.id, (q) => ({
      ...q,
      recipient: 'テスト商会（架空）',
      lines: [item(`line-of-${created.id}`)],
    })),
  )
  return { data: updated.data, id: created.id }
}

export function findQuote(data: AppData, id: string): Quote {
  const q = data.quotes.find((x) => x.id === id)
  if (!q) throw new Error(`quote not found: ${id}`)
  return q
}

// Runs fn with the process time zone set (so device-timezone cases are real).
export function withTimeZone<T>(tz: string, fn: () => T): T {
  const prev = process.env.TZ
  process.env.TZ = tz
  try {
    return fn()
  } finally {
    if (prev === undefined) delete process.env.TZ
    else process.env.TZ = prev
  }
}

export const MSG = {
  recipientEmpty: '宛先を入力してください',
  recipientLong: '宛先は50文字以内にしてください',
  subjectLong: '件名は50文字以内にしてください',
  nameEmpty: '品名を入力してください',
  nameLong: '品名は40文字以内にしてください',
  quantity: '数量は1〜9,999の整数で入力してください',
  unitPrice: '単価は0〜9,999,999の整数で入力してください',
  amount: '値引き額は1〜9,999,999の整数で入力してください',
  linesEmpty: '明細は1行以上入れてください',
  linesTooMany: '明細は20行までです',
  excess10: '10%の値引きが、10%の明細の合計を超えています',
  excess8: '8%の値引きが、8%の明細の合計を超えています',
}
