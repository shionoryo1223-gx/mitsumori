import { addDiscountLine, addItemLine } from '../domain/lines'
import type { AppData, IsoDate, Line, Quote, TaxRate } from '../domain/types'
import { createDraft, createInvoice, emptyData, issueQuote, updateDraft } from '../domain/workflow'

type Spec = {
  recipient: string
  subject: string
  items: { name: string; quantity: string; unitPrice: string; taxRate: TaxRate }[]
  discount?: string
}

function fill(spec: Spec, newId: () => string) {
  return (q: Quote): Quote => {
    let next: Quote = { ...q, recipient: spec.recipient, subject: spec.subject, lines: [] }
    for (const item of spec.items) {
      next = addItemLine(next, newId())
      const last = next.lines[next.lines.length - 1]
      next = { ...next, lines: [...next.lines.slice(0, -1), { ...last, ...item } as Line] }
    }
    if (spec.discount) {
      next = addDiscountLine(next, newId())
      const last = next.lines[next.lines.length - 1]
      next = { ...next, lines: [...next.lines.slice(0, -1), { ...last, amount: spec.discount } as Line] }
    }
    return next
  }
}

function must(result: ReturnType<typeof createDraft>): { data: AppData; id: string } {
  if (!result.ok) throw new Error(`sample data failed: ${result.error}`)
  return result
}

function addQuote(data: AppData, spec: Spec, newId: () => string) {
  const created = must(createDraft(data, newId))
  return must(updateDraft(created.data, created.id, fill(spec, newId)))
}

export function buildSampleData(today: IsoDate, newId: () => string): AppData {
  // Created oldest first: createDraft prepends, so the draft ends up first in the list.
  const invoicedSpec: Spec = {
    recipient: 'さくら工房（架空）',
    subject: '店舗用品の納品',
    items: [
      { name: '包装紙', quantity: '10', unitPrice: '800', taxRate: 10 },
      { name: 'ミネラルウォーター', quantity: '24', unitPrice: '120', taxRate: 8 },
    ],
    discount: '500',
  }
  const issuedSpec: Spec = {
    recipient: '架空商事株式会社（架空）',
    subject: '会議室の飲料手配',
    items: [
      { name: 'お茶 500ml', quantity: '48', unitPrice: '110', taxRate: 8 },
      { name: '紙コップ', quantity: '5', unitPrice: '300', taxRate: 10 },
    ],
  }
  const draftSpec: Spec = {
    recipient: 'みどり文具店（架空）',
    subject: '事務用品一式',
    items: [
      { name: 'コピー用紙 A4', quantity: '20', unitPrice: '550', taxRate: 10 },
      { name: 'ボールペン', quantity: '30', unitPrice: '90', taxRate: 10 },
    ],
  }

  let step = addQuote(emptyData(), invoicedSpec, newId)
  step = must(issueQuote(step.data, step.id, today))
  step = must(createInvoice(step.data, step.id, today, newId))
  const afterInvoice = step.data

  let issued = addQuote(afterInvoice, issuedSpec, newId)
  issued = must(issueQuote(issued.data, issued.id, today))

  return addQuote(issued.data, draftSpec, newId).data
}
