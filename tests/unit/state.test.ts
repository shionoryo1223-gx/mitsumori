import { describe, expect, test } from 'vitest'
import type { Invoice } from '@/domain/types'
import {
  allowedActions,
  createInvoice,
  displayStatus,
  emptyData,
  issueQuote,
} from '@/domain/workflow'
import {
  addValidDraft,
  dataWith,
  findQuote,
  idGen,
  issuedQuote,
  quote,
  unwrap,
} from './helpers'

// displayStatus depends only on status and dates, so a plain invoiced quote is enough here.
function invoicedQuote(issuedOn: string, validUntil: string) {
  return quote({ status: 'invoiced', number: 'Q-0001', issuedOn, validUntil })
}

describe('状態（ST）', () => {
  // 「請求書を見る」「行の追加」は画面の操作で、TC-ST-012〜015 で確かめる。
  // ここでは allowedActions と、アプリの操作でできた状態・ひも付きを確かめる。
  test('TC-ST-001 状態ごとの操作：下書き', () => {
    const { data, id } = addValidDraft(emptyData(), idGen())
    const q = findQuote(data, id)
    expect(q.status).toBe('draft')
    expect(allowedActions(q, '2026-11-21')).toEqual({
      edit: true,
      delete: true,
      issue: true,
      invoice: false,
    })
    expect(q.invoiceId).toBeNull()
  })

  test('TC-ST-002 状態ごとの操作：発行済み（期限内）', () => {
    const d = addValidDraft(emptyData(), idGen())
    const r = unwrap(issueQuote(d.data, d.id, '2026-11-01'))
    const q = findQuote(r.data, d.id)
    expect(q.validUntil).toBe('2026-12-01')
    expect(allowedActions(q, '2026-11-21')).toEqual({
      edit: false,
      delete: false,
      issue: false,
      invoice: true,
    })
    expect(q.invoiceId).toBeNull()
  })

  test('TC-ST-003 状態ごとの操作：期限切れ', () => {
    const d = addValidDraft(emptyData(), idGen())
    const r = unwrap(issueQuote(d.data, d.id, '2026-11-01'))
    const q = findQuote(r.data, d.id)
    // 理由の文言「有効期限を過ぎたため、請求書にできません」は画面の文言で、TC-ST-012〜015 側で確かめる
    expect(allowedActions(q, '2026-12-02')).toEqual({
      edit: false,
      delete: false,
      issue: false,
      invoice: false,
    })
    expect(createInvoice(r.data, d.id, '2026-12-02', idGen())).toEqual({
      ok: false,
      error: 'expired',
    })
  })

  test('TC-ST-004 状態ごとの操作：請求済み', () => {
    const newId = idGen()
    const d = addValidDraft(emptyData(), newId)
    const issued = unwrap(issueQuote(d.data, d.id, '2026-11-01'))
    const r = unwrap(createInvoice(issued.data, d.id, '2026-11-02', newId))
    const q = findQuote(r.data, d.id)
    expect(q.status).toBe('invoiced')
    expect(allowedActions(q, '2026-12-02')).toEqual({
      edit: false,
      delete: false,
      issue: false,
      invoice: false,
    })
    // 「請求書を見る」が使える：できた請求書へのひも付きがある
    expect(q.invoiceId).toBe(r.id)
  })

  test('TC-ST-005 表示する状態の判定（5 通り）', () => {
    const today = '2026-11-21'
    expect(displayStatus(quote(), today)).toBe('draft')
    expect(displayStatus(issuedQuote('2026-11-01', '2026-11-21'), today)).toBe('issued')
    expect(displayStatus(issuedQuote('2026-11-01', '2026-11-20'), today)).toBe('expired')
    expect(displayStatus(invoicedQuote('2026-11-01', '2026-11-21'), today)).toBe('invoiced')
    expect(displayStatus(invoicedQuote('2026-11-01', '2026-11-20'), today)).toBe('invoiced')
  })

  test('TC-ST-006 発行で状態・番号・日付が付く', () => {
    const { data, id } = addValidDraft(emptyData(), idGen())
    const r = unwrap(issueQuote(data, id, '2026-11-21'))
    const q = findQuote(r.data, id)
    expect(q.status).toBe('issued')
    expect(q.number).toBe('Q-0001')
    expect(q.issuedOn).toBe('2026-11-21')
    expect(q.validUntil).toBe('2026-12-21')
  })

  test('TC-ST-007 請求書にすると請求書ができて状態が進む', () => {
    const q = issuedQuote('2026-11-21', '2026-12-21')
    const data = dataWith([q], { quote: 1, invoice: 0 })
    const r = unwrap(createInvoice(data, q.id, '2026-11-25', idGen()))
    expect(findQuote(r.data, q.id).status).toBe('invoiced')
    expect(r.data.invoices).toHaveLength(1)
    const inv = r.data.invoices[0] as Invoice
    expect(inv.number).toBe('INV-0001')
    expect(inv.invoicedOn).toBe('2026-11-25')
    expect(inv.dueOn).toBe('2026-12-31')
  })

  test('TC-ST-008 誤りのある下書きは発行しても変わらない', () => {
    const newId = idGen()
    const bad = quote({ id: 'bad', recipient: '' })
    const data = dataWith([bad])
    const r = issueQuote(data, 'bad', '2026-11-21')
    expect(r.ok).toBe(false)
    const after = findQuote(data, 'bad')
    expect(after.status).toBe('draft')
    expect(after.number).toBeNull()
    expect(after.issuedOn).toBeNull()
    expect(after.validUntil).toBeNull()
    // 次に発行する見積もりの番号は Q-0001
    const next = addValidDraft(data, newId)
    const issued = unwrap(issueQuote(next.data, next.id, '2026-11-21'))
    expect(findQuote(issued.data, next.id).number).toBe('Q-0001')
  })

  test('TC-ST-009 発行を続けて何度行っても番号は 1 つだけ進む', () => {
    const newId = idGen()
    const first = addValidDraft(emptyData(), newId)
    const r1 = unwrap(issueQuote(first.data, first.id, '2026-11-21'))
    const r2 = issueQuote(r1.data, first.id, '2026-11-21')
    const afterData = r2.ok ? r2.data : r1.data
    expect(findQuote(afterData, first.id).number).toBe('Q-0001')
    const other = addValidDraft(afterData, newId)
    const r3 = unwrap(issueQuote(other.data, other.id, '2026-11-21'))
    expect(findQuote(r3.data, other.id).number).toBe('Q-0002')
  })

  test('TC-ST-010 請求書にするを続けて何度行っても請求書は 1 枚', () => {
    const newId = idGen()
    const q = issuedQuote('2026-11-21', '2026-12-21')
    const q2 = issuedQuote('2026-11-21', '2026-12-21', { id: 'q-2', number: 'Q-0002' })
    const data = dataWith([q, q2], { quote: 2, invoice: 0 })
    const r1 = unwrap(createInvoice(data, q.id, '2026-11-25', newId))
    const r2 = createInvoice(r1.data, q.id, '2026-11-25', newId)
    const afterData = r2.ok ? r2.data : r1.data
    expect(afterData.invoices).toHaveLength(1)
    expect(afterData.invoices[0]?.number).toBe('INV-0001')
    const r3 = unwrap(createInvoice(afterData, q2.id, '2026-11-25', newId))
    expect(r3.data.invoices.find((i) => i.id === r3.id)?.number).toBe('INV-0002')
  })

  test('TC-ST-011 期限切れ・請求済みでは請求書にできない', () => {
    const newId = idGen()
    // (1) 2026-11-01 に発行済み（期限切れになる）
    const d1 = addValidDraft(emptyData(), newId)
    const i1 = unwrap(issueQuote(d1.data, d1.id, '2026-11-01'))
    // (2) 2026-11-01 に発行、2026-11-02 に請求した請求済み
    const d2 = addValidDraft(i1.data, newId)
    const i2 = unwrap(issueQuote(d2.data, d2.id, '2026-11-01'))
    const inv = unwrap(createInvoice(i2.data, d2.id, '2026-11-02', newId))
    const data = inv.data
    const before = structuredClone(data)
    expect(data.invoices).toHaveLength(1)
    expect(data.counters).toEqual({ quote: 2, invoice: 1 })

    expect(createInvoice(data, d1.id, '2026-12-02', newId)).toEqual({ ok: false, error: 'expired' })
    expect(createInvoice(data, d2.id, '2026-12-02', newId)).toEqual({
      ok: false,
      error: 'not-issued',
    })
    expect(data).toEqual(before)
    expect(findQuote(data, d1.id).status).toBe('issued')
    expect(findQuote(data, d2.id).status).toBe('invoiced')
  })
})
