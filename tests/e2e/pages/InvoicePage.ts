import type { Locator, Page } from '@playwright/test'
import { BasePage } from './BasePage.ts'

export class InvoicePage extends BasePage {
  readonly heading: Locator
  readonly invoiceNumber: Locator
  readonly quoteNumber: Locator
  readonly invoicedOn: Locator
  readonly dueOn: Locator
  readonly lineRows: Locator
  readonly base10: Locator
  readonly tax10: Locator
  readonly base8: Locator
  readonly tax8: Locator
  readonly total: Locator

  constructor(page: Page) {
    super(page)
    this.heading = page.getByRole('heading', { name: '請求書', level: 1 })
    this.invoiceNumber = page.getByTestId('invoice-number')
    this.quoteNumber = page.getByTestId('quote-number')
    this.invoicedOn = page.getByTestId('invoiced-on')
    this.dueOn = page.getByTestId('due-on')
    this.lineRows = page.getByTestId('line-row')
    this.base10 = page.getByTestId('base-10')
    this.tax10 = page.getByTestId('tax-10')
    this.base8 = page.getByTestId('base-8')
    this.tax8 = page.getByTestId('tax-8')
    this.total = page.getByTestId('total')
  }

  async goto(invoiceId: string): Promise<void> {
    await this.open(`/#/invoices/${invoiceId}`)
  }

  // The id is the last segment of `#/invoices/:id`.
  invoiceId(): string {
    return this.page.url().split('#/invoices/')[1] ?? ''
  }

  // Controls that would allow editing the invoice.
  editableControls(): Locator {
    return this.page.getByRole('textbox').or(this.page.getByRole('combobox'))
  }

  buttons(): Locator {
    return this.page.getByRole('button')
  }

  // Read-only views: first cell is the item name or "値引き", last cell is the amount.
  lineLabel(index: number): Locator {
    return this.lineRows.nth(index).getByRole('cell').first()
  }

  lineAmount(index: number): Locator {
    return this.lineRows.nth(index).getByRole('cell').last()
  }
}
