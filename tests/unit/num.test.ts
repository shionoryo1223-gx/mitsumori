import { describe, expect, test } from 'vitest'
import { buildSampleData } from '@/storage/sampleData'
import { createDraft, createInvoice, deleteDraft, emptyData, issueQuote } from '@/domain/workflow'
import type { AppData } from '@/domain/types'
import { addValidDraft, dataWith, findQuote, idGen, issuedQuote, unwrap } from './helpers'

function issue(data: AppData, id: string, today = '2026-11-21'): AppData {
  return unwrap(issueQuote(data, id, today)).data
}

describe('番号（NUM）', () => {
  test('TC-NUM-001 番号は 1 から順に付き、見積もりと請求書は別に数える', () => {
    const newId = idGen()
    let data = emptyData()
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const d = addValidDraft(data, newId)
      data = d.data
      ids.push(d.id)
    }
    for (const id of ids) data = issue(data, id)
    expect(ids.map((id) => findQuote(data, id).number)).toEqual(['Q-0001', 'Q-0002', 'Q-0003'])

    const invoiceNumbers: string[] = []
    for (const id of ids.slice(0, 2)) {
      const r = unwrap(createInvoice(data, id, '2026-11-25', newId))
      data = r.data
      invoiceNumbers.push(data.invoices.find((i) => i.id === r.id)!.number)
    }
    expect(invoiceNumbers).toEqual(['INV-0001', 'INV-0002'])
  })

  test('TC-NUM-002 下書きには見積もり番号を付けない', () => {
    const r = unwrap(createDraft(emptyData(), idGen()))
    const q = findQuote(r.data, r.id)
    // 「付いていない（空）」: null または空文字のどちらも空として扱う
    expect([null, '']).toContain(q.number)
  })

  test('TC-NUM-003 下書きを削除しても欠番は出ない', () => {
    const newId = idGen()
    const a = addValidDraft(emptyData(), newId)
    const b = addValidDraft(a.data, newId)
    const afterDelete = unwrap(deleteDraft(b.data, a.id)).data
    const issued = issue(afterDelete, b.id)
    expect(findQuote(issued, b.id).number).toBe('Q-0001')
  })

  test('TC-NUM-004 見積もりの番号と請求書の番号は一緒に数えない', () => {
    const newId = idGen()
    const a = addValidDraft(emptyData(), newId)
    const b = addValidDraft(a.data, newId)
    let data = issue(b.data, a.id)
    data = issue(data, b.id)
    const r = unwrap(createInvoice(data, a.id, '2026-11-25', newId))
    expect(r.data.invoices.find((i) => i.id === r.id)?.number).toBe('INV-0001')
  })

  test('TC-NUM-005 見積もり番号の桁：9999 から 10000', () => {
    const newId = idGen()
    const a = addValidDraft(dataWith([], { quote: 9998, invoice: 0 }), newId)
    const b = addValidDraft(a.data, newId)
    const d1 = issue(b.data, a.id)
    const d2 = issue(d1, b.id)
    expect(findQuote(d2, a.id).number).toBe('Q-9999')
    expect(findQuote(d2, b.id).number).toBe('Q-10000')
  })

  test('TC-NUM-006 請求書番号の桁：9999 から 10000', () => {
    const newId = idGen()
    const q1 = issuedQuote('2026-11-21', '2026-12-21', { id: 'q-1', number: 'Q-0001' })
    const q2 = issuedQuote('2026-11-21', '2026-12-21', { id: 'q-2', number: 'Q-0002' })
    const data = dataWith([q1, q2], { quote: 2, invoice: 9998 })
    const r1 = unwrap(createInvoice(data, 'q-1', '2026-11-25', newId))
    const r2 = unwrap(createInvoice(r1.data, 'q-2', '2026-11-25', newId))
    expect(r2.data.invoices.find((i) => i.id === r1.id)?.number).toBe('INV-9999')
    expect(r2.data.invoices.find((i) => i.id === r2.id)?.number).toBe('INV-10000')
  })

  test('TC-NUM-009 見本を入れたあとの新しい番号は見本の番号とぶつからない', () => {
    const newId = idGen()
    const today = '2026-11-21'
    const sample = buildSampleData(today, newId)
    const sampleQuoteNumbers = sample.quotes.map((q) => q.number).filter((n) => n !== null)
    const sampleInvoiceNumbers = sample.invoices.map((i) => i.number)

    const d = addValidDraft(sample, newId)
    const issued = issue(d.data, d.id, today)
    const inv = unwrap(createInvoice(issued, d.id, today, newId))

    const quoteNumbers = inv.data.quotes.map((q) => q.number).filter((n) => n !== null)
    const invoiceNumbers = inv.data.invoices.map((i) => i.number)
    expect(new Set(quoteNumbers).size).toBe(quoteNumbers.length)
    expect(new Set(invoiceNumbers).size).toBe(invoiceNumbers.length)

    const newQuoteNumber = findQuote(inv.data, d.id).number
    expect(sampleQuoteNumbers).not.toContain(newQuoteNumber)
    const newInvoiceNumber = inv.data.invoices.find((i) => i.id === inv.id)?.number
    expect(sampleInvoiceNumbers).not.toContain(newInvoiceNumber)
  })
})
