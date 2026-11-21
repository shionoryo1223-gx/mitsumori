import { calculateTotals } from './calc'
import { addDays, endOfNextMonth, VALID_DAYS } from './dates'
import { formatInvoiceNumber, formatQuoteNumber } from './numbering'
import type { AppData, DisplayStatus, Invoice, IsoDate, Quote } from './types'
import { validateQuote } from './validation'

export type WorkflowError = 'not-found' | 'not-draft' | 'invalid' | 'not-issued' | 'expired'
export type WorkflowResult =
  | { ok: true; data: AppData; id: string }
  | { ok: false; error: WorkflowError }

const fail = (error: WorkflowError): WorkflowResult => ({ ok: false, error })

export function emptyData(): AppData {
  return { version: 1, quotes: [], invoices: [], counters: { quote: 0, invoice: 0 } }
}

function replaceQuote(data: AppData, quote: Quote): Quote[] {
  return data.quotes.map((q) => (q.id === quote.id ? quote : q))
}

export function createDraft(data: AppData, newId: () => string): WorkflowResult {
  const id = newId()
  const quote: Quote = {
    id,
    status: 'draft',
    number: null,
    recipient: '',
    subject: '',
    lines: [{ id: newId(), kind: 'item', name: '', quantity: '1', unitPrice: '', taxRate: 10 }],
    issuedOn: null,
    validUntil: null,
    invoiceId: null,
  }
  return { ok: true, data: { ...data, quotes: [quote, ...data.quotes] }, id }
}

export function updateDraft(
  data: AppData,
  quoteId: string,
  update: (q: Quote) => Quote,
): WorkflowResult {
  const q = data.quotes.find((x) => x.id === quoteId)
  if (!q) return fail('not-found')
  if (q.status !== 'draft') return fail('not-draft')
  const updated: Quote = { ...update(q), id: q.id, status: q.status }
  return { ok: true, data: { ...data, quotes: replaceQuote(data, updated) }, id: q.id }
}

export function deleteDraft(data: AppData, quoteId: string): WorkflowResult {
  const q = data.quotes.find((x) => x.id === quoteId)
  if (!q) return fail('not-found')
  if (q.status !== 'draft') return fail('not-draft')
  return {
    ok: true,
    data: { ...data, quotes: data.quotes.filter((x) => x.id !== quoteId) },
    id: q.id,
  }
}

export function issueQuote(data: AppData, quoteId: string, today: IsoDate): WorkflowResult {
  const q = data.quotes.find((x) => x.id === quoteId)
  if (!q) return fail('not-found')
  if (q.status !== 'draft') return fail('not-draft')
  if (!validateQuote(q).ok) return fail('invalid')
  const issued: Quote = {
    ...q,
    status: 'issued',
    number: formatQuoteNumber(data.counters.quote + 1),
    issuedOn: today,
    validUntil: addDays(today, VALID_DAYS),
  }
  return {
    ok: true,
    data: {
      ...data,
      quotes: replaceQuote(data, issued),
      counters: { ...data.counters, quote: data.counters.quote + 1 },
    },
    id: q.id,
  }
}

export function createInvoice(
  data: AppData,
  quoteId: string,
  today: IsoDate,
  newId: () => string,
): WorkflowResult {
  const q = data.quotes.find((x) => x.id === quoteId)
  if (!q) return fail('not-found')
  if (q.status !== 'issued' || q.validUntil === null || q.number === null) return fail('not-issued')
  if (today > q.validUntil) return fail('expired')
  const invoice: Invoice = {
    id: newId(),
    number: formatInvoiceNumber(data.counters.invoice + 1),
    quoteId: q.id,
    quoteNumber: q.number,
    recipient: q.recipient,
    subject: q.subject,
    lines: q.lines.map((line) => ({ ...line })),
    totals: calculateTotals(q.lines),
    invoicedOn: today,
    dueOn: endOfNextMonth(today),
  }
  const invoiced: Quote = { ...q, status: 'invoiced', invoiceId: invoice.id }
  return {
    ok: true,
    data: {
      ...data,
      quotes: replaceQuote(data, invoiced),
      invoices: [...data.invoices, invoice],
      counters: { ...data.counters, invoice: data.counters.invoice + 1 },
    },
    id: invoice.id,
  }
}

function isExpired(q: Quote, today: IsoDate): boolean {
  return q.status === 'issued' && q.validUntil !== null && today > q.validUntil
}

export function displayStatus(q: Quote, today: IsoDate): DisplayStatus {
  return isExpired(q, today) ? 'expired' : q.status
}

export function allowedActions(
  q: Quote,
  today: IsoDate,
): { edit: boolean; delete: boolean; issue: boolean; invoice: boolean } {
  if (q.status === 'draft')
    return { edit: true, delete: true, issue: validateQuote(q).ok, invoice: false }
  if (q.status === 'issued' && !isExpired(q, today))
    return { edit: false, delete: false, issue: false, invoice: true }
  return { edit: false, delete: false, issue: false, invoice: false }
}
