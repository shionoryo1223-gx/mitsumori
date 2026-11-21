export type IsoDate = string // 'YYYY-MM-DD'
export type TaxRate = 10 | 8

// Input values are kept as strings so invalid input can still be saved and shown.
export interface ItemLine {
  id: string
  kind: 'item'
  name: string
  quantity: string
  unitPrice: string
  taxRate: TaxRate
}
export interface DiscountLine {
  id: string
  kind: 'discount'
  amount: string
  taxRate: TaxRate
}
export type Line = ItemLine | DiscountLine

export type QuoteStatus = 'draft' | 'issued' | 'invoiced'
export type DisplayStatus = QuoteStatus | 'expired'

export interface Quote {
  id: string
  status: QuoteStatus
  number: string | null
  recipient: string
  subject: string
  lines: Line[]
  issuedOn: IsoDate | null
  validUntil: IsoDate | null
  invoiceId: string | null
}

export interface RateTotal {
  rate: TaxRate
  base: number
  tax: number
}
export interface Totals {
  byRate: [RateTotal, RateTotal] // [0] = 10%, [1] = 8%
  total: number
}

export interface Invoice {
  id: string
  number: string
  quoteId: string
  quoteNumber: string
  recipient: string
  subject: string
  lines: Line[]
  totals: Totals
  invoicedOn: IsoDate
  dueOn: IsoDate
}

export interface AppData {
  version: 1
  quotes: Quote[]
  invoices: Invoice[]
  counters: { quote: number; invoice: number }
}
