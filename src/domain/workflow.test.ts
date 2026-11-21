import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { calculateTotals } from './calc'
import { endOfNextMonth } from './dates'
import type { AppData, Quote } from './types'
import { validateQuote } from './validation'
import {
  allowedActions,
  createDraft,
  createInvoice,
  deleteDraft,
  displayStatus,
  emptyData,
  issueQuote,
  updateDraft,
  type WorkflowResult,
} from './workflow'

const idGen = () => {
  let n = 0
  return () => 'id-' + ++n
}

function ok(result: WorkflowResult): { data: AppData; id: string } {
  if (!result.ok) throw new Error('expected ok, got ' + result.error)
  return result
}

const fill = (q: Quote): Quote => ({
  ...q,
  recipient: '株式会社テスト',
  lines: [
    { id: 'a', kind: 'item', name: '品物', quantity: '2', unitPrice: '1000', taxRate: 10 },
    { id: 'b', kind: 'item', name: '食品', quantity: '1', unitPrice: '500', taxRate: 8 },
  ],
})

function draftWithValid(newId = idGen()) {
  const created = ok(createDraft(emptyData(), newId))
  const filled = ok(updateDraft(created.data, created.id, fill))
  return { data: filled.data, id: created.id, newId }
}

function issued(today = '2026-11-21') {
  const d = draftWithValid()
  const r = ok(issueQuote(d.data, d.id, today))
  return { data: r.data, id: d.id, newId: d.newId }
}

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

const find = (data: AppData, id: string) => data.quotes.find((q) => q.id === id)!

describe('createDraft', () => {
  it('creates a draft with one default item line, prepended', () => {
    const newId = idGen()
    const a = ok(createDraft(emptyData(), newId))
    const b = ok(createDraft(a.data, newId))
    expect(b.data.quotes.map((q) => q.id)).toEqual([b.id, a.id])
    const q = find(b.data, b.id)
    expect(q.status).toBe('draft')
    expect(q.number).toBeNull()
    expect(q.recipient).toBe('')
    expect(q.issuedOn).toBeNull()
    expect(q.validUntil).toBeNull()
    expect(q.invoiceId).toBeNull()
    expect(q.lines).toHaveLength(1)
    expect(q.lines[0]).toMatchObject({ kind: 'item', quantity: '1', unitPrice: '', taxRate: 10 })
  })
})

describe('updateDraft / deleteDraft', () => {
  it('keeps id and status even if update changes them', () => {
    const { data, id } = draftWithValid()
    const r = ok(updateDraft(data, id, (q) => ({ ...q, id: 'x', status: 'issued', subject: 's' })))
    const q = find(r.data, id)
    expect(q.id).toBe(id)
    expect(q.status).toBe('draft')
    expect(q.subject).toBe('s')
  })

  it('reports not-found', () => {
    expect(updateDraft(emptyData(), 'nope', (q) => q)).toEqual({ ok: false, error: 'not-found' })
    expect(deleteDraft(emptyData(), 'nope')).toEqual({ ok: false, error: 'not-found' })
  })

  it('rejects issued quotes', () => {
    const { data, id } = issued()
    expect(updateDraft(data, id, (q) => q)).toEqual({ ok: false, error: 'not-draft' })
    expect(deleteDraft(data, id)).toEqual({ ok: false, error: 'not-draft' })
  })

  it('deletes a draft without touching counters', () => {
    const { data, id } = draftWithValid()
    const r = ok(deleteDraft(data, id))
    expect(r.data.quotes).toEqual([])
    expect(r.data.counters).toEqual(data.counters)
  })
})

describe('issueQuote', () => {
  it('issues a valid draft', () => {
    const { data, id } = draftWithValid()
    const r = ok(issueQuote(data, id, '2026-11-21'))
    const q = find(r.data, id)
    expect(q.status).toBe('issued')
    expect(q.number).toBe('Q-0001')
    expect(q.issuedOn).toBe('2026-11-21')
    expect(q.validUntil).toBe('2026-12-21')
    expect(r.data.counters.quote).toBe(1)
  })

  it('returns invalid and leaves data unchanged for an invalid draft', () => {
    const created = ok(createDraft(emptyData(), idGen()))
    const before = structuredClone(created.data)
    expect(issueQuote(created.data, created.id, '2026-11-21')).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(created.data).toEqual(before)
  })

  it('reports not-found', () => {
    expect(issueQuote(emptyData(), 'nope', '2026-11-21')).toEqual({ ok: false, error: 'not-found' })
  })

  it('rejects a second issue and keeps the counter', () => {
    const { data, id } = issued()
    expect(issueQuote(data, id, '2026-11-21')).toEqual({ ok: false, error: 'not-draft' })
    expect(data.counters.quote).toBe(1)
  })

  it('leaves no gap when an earlier draft is deleted', () => {
    const newId = idGen()
    const a = ok(createDraft(emptyData(), newId))
    const b = ok(createDraft(a.data, newId))
    const bFilled = ok(updateDraft(b.data, b.id, fill))
    const deleted = ok(deleteDraft(bFilled.data, a.id))
    const r = ok(issueQuote(deleted.data, b.id, '2026-11-21'))
    expect(find(r.data, b.id).number).toBe('Q-0001')
  })
})

describe('createInvoice', () => {
  it('rejects a draft', () => {
    const { data, id } = draftWithValid()
    expect(createInvoice(data, id, '2026-11-21', idGen())).toEqual({
      ok: false,
      error: 'not-issued',
    })
  })

  it('reports not-found', () => {
    expect(createInvoice(emptyData(), 'nope', '2026-11-21', idGen())).toEqual({
      ok: false,
      error: 'not-found',
    })
  })

  it('creates an invoice on the last valid day', () => {
    const { data, id, newId } = issued()
    const today = '2026-12-21'
    const r = ok(createInvoice(data, id, today, newId))
    const invoice = r.data.invoices.find((i) => i.id === r.id)!
    const q = find(r.data, id)
    expect(invoice.number).toBe('INV-0001')
    expect(invoice.quoteId).toBe(id)
    expect(invoice.quoteNumber).toBe('Q-0001')
    expect(invoice.invoicedOn).toBe(today)
    expect(invoice.dueOn).toBe(endOfNextMonth(today))
    expect(invoice.totals).toEqual(calculateTotals(q.lines))
    expect(invoice.lines).toEqual(q.lines)
    expect(invoice.lines).not.toBe(q.lines)
    expect(q.status).toBe('invoiced')
    expect(q.invoiceId).toBe(invoice.id)
    expect(r.data.counters.invoice).toBe(1)
  })

  it('copies lines even when the data is a Vue reactive proxy (as in the store)', () => {
    const { data, id, newId } = issued()
    const r = ok(createInvoice(reactive(data), id, '2026-11-22', newId))
    const invoice = r.data.invoices.find((i) => i.id === r.id)!
    expect(invoice.lines).toEqual(find(r.data, id).lines)
  })

  it('rejects the day after validUntil', () => {
    const { data, id, newId } = issued()
    expect(createInvoice(data, id, '2026-12-22', newId)).toEqual({ ok: false, error: 'expired' })
  })

  it('rejects a second invoice and keeps the counter', () => {
    const { data, id, newId } = issued()
    const first = ok(createInvoice(data, id, '2026-11-22', newId))
    expect(createInvoice(first.data, id, '2026-11-22', newId)).toEqual({
      ok: false,
      error: 'not-issued',
    })
    expect(first.data.counters.invoice).toBe(1)
    expect(first.data.invoices).toHaveLength(1)
  })
})

describe('displayStatus', () => {
  it('shows expired for an issued quote past validUntil', () => {
    const { data, id } = issued()
    const q = find(data, id)
    expect(displayStatus(q, '2026-12-21')).toBe('issued')
    expect(displayStatus(q, '2026-12-22')).toBe('expired')
  })

  it('keeps invoiced regardless of date', () => {
    const { data, id, newId } = issued()
    const r = ok(createInvoice(data, id, '2026-11-22', newId))
    expect(displayStatus(find(r.data, id), '2030-01-01')).toBe('invoiced')
  })

  it('shows draft for drafts', () => {
    const { data, id } = draftWithValid()
    expect(displayStatus(find(data, id), '2030-01-01')).toBe('draft')
  })
})

describe('allowedActions', () => {
  const none = { edit: false, delete: false, issue: false, invoice: false }

  it('draft: edit and delete, issue only when valid', () => {
    const valid = draftWithValid()
    expect(allowedActions(find(valid.data, valid.id), '2026-11-21')).toEqual({
      edit: true,
      delete: true,
      issue: true,
      invoice: false,
    })
    const blank = ok(createDraft(emptyData(), idGen()))
    const q = find(blank.data, blank.id)
    expect(validateQuote(q).ok).toBe(false)
    expect(allowedActions(q, '2026-11-21')).toEqual({
      edit: true,
      delete: true,
      issue: false,
      invoice: false,
    })
  })

  it('issued within validity: invoice only', () => {
    const { data, id } = issued()
    expect(allowedActions(find(data, id), '2026-12-21')).toEqual({ ...none, invoice: true })
  })

  it('expired: nothing', () => {
    const { data, id } = issued()
    expect(allowedActions(find(data, id), '2026-12-22')).toEqual(none)
  })

  it('invoiced: nothing', () => {
    const { data, id, newId } = issued()
    const r = ok(createInvoice(data, id, '2026-11-22', newId))
    expect(allowedActions(find(r.data, id), '2026-11-22')).toEqual(none)
  })
})

describe('purity', () => {
  it('never mutates its input', () => {
    const { data, id, newId } = draftWithValid()
    const issuedData = ok(issueQuote(data, id, '2026-11-21')).data
    const cases: Array<[AppData, () => WorkflowResult]> = [
      [data, () => createDraft(data, idGen())],
      [data, () => updateDraft(data, id, (q) => ({ ...q, subject: 'changed' }))],
      [data, () => deleteDraft(data, id)],
      [data, () => issueQuote(data, id, '2026-11-21')],
      [issuedData, () => createInvoice(issuedData, id, '2026-11-22', newId)],
    ]
    for (const [input, run] of cases) {
      const before = structuredClone(input)
      deepFreeze(input)
      expect(run).not.toThrow()
      expect(input).toEqual(before)
    }
  })
})
