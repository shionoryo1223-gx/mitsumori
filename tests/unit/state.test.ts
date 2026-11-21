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
  invoicedQuote,
  issuedQuote,
  quote,
  unwrap,
} from './helpers'

describe('状態（ST）', () => {
  test('TC-ST-001 状態ごとの操作：下書き', () => {
    const q = quote()
    // 編集できる（行の追加は編集に含まれる）・削除できる・発行できる・請求書にできない
    expect(allowedActions(q, '2026-11-21')).toEqual({
      edit: true,
      delete: true,
      issue: true,
      invoice: false,
    })
    // 「請求書を見る」はない：請求書へのひも付きがない
    expect(q.invoiceId).toBeNull()
  })

  test('TC-ST-002 状態ごとの操作：発行済み（期限内）', () => {
    const q = issuedQuote('2026-11-01', '2026-12-01')
    expect(allowedActions(q, '2026-11-21')).toEqual({
      edit: false,
      delete: false,
      issue: false,
      invoice: true,
    })
    expect(q.invoiceId).toBeNull()
  })

  test('TC-ST-003 状態ごとの操作：期限切れ', () => {
    const q = issuedQuote('2026-11-01', '2026-12-01')
    // 理由の文言「有効期限を過ぎたため、請求書にできません」は画面の文言で、単体では確かめられない
    expect(allowedActions(q, '2026-12-02')).toEqual({
      edit: false,
      delete: false,
      issue: false,
      invoice: false,
    })
  })

  test('TC-ST-004 状態ごとの操作：請求済み', () => {
    const q = invoicedQuote('2026-11-01', '2026-12-01')
    expect(allowedActions(q, '2026-12-02')).toEqual({
      edit: false,
      delete: false,
      issue: false,
      invoice: false,
    })
    // 「請求書を見る」が使える：請求書へのひも付きがある
    expect(q.invoiceId).not.toBeNull()
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
    const expired = issuedQuote('2026-11-01', '2026-12-01', { id: 'q-exp' })
    const invoiced = invoicedQuote('2026-11-01', '2026-12-01', { id: 'q-inv', number: 'Q-0002' })
    const data = dataWith([expired, invoiced], { quote: 2, invoice: 1 })
    const r1 = createInvoice(data, 'q-exp', '2026-12-02', idGen())
    const r2 = createInvoice(data, 'q-inv', '2026-12-02', idGen())
    for (const r of [r1, r2]) {
      expect(r.ok).toBe(false)
    }
    // 成功扱いで返ってきても、データが変わっていないことを確かめる
    for (const r of [r1, r2]) {
      const after = r.ok ? r.data : data
      expect(after.invoices).toHaveLength(data.invoices.length)
    }
    expect(findQuote(data, 'q-exp').status).toBe('issued')
    expect(findQuote(data, 'q-inv').status).toBe('invoiced')
  })
})
