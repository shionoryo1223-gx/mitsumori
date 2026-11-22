import type { Locator, Page } from '@playwright/test'
import { BasePage } from './BasePage.ts'

export type TotalsTexts = {
  base10: string | null
  tax10: string | null
  base8: string | null
  tax8: string | null
  total: string | null
}

// One row of the line table (an item row or a discount row).
export class LineRow {
  readonly row: Locator
  readonly nameInput: Locator
  readonly quantityInput: Locator
  readonly unitPriceInput: Locator
  readonly discountAmountInput: Locator
  readonly taxRateSelect: Locator
  // Read-only views: first cell is the item name or "値引き", last cell is the amount.
  readonly labelCell: Locator
  readonly amountCell: Locator

  constructor(page: Page, index: number) {
    this.row = page.getByTestId('line-row').nth(index)
    this.nameInput = this.row.getByLabel('品名')
    this.quantityInput = this.row.getByLabel('数量')
    this.unitPriceInput = this.row.getByLabel('単価')
    this.discountAmountInput = this.row.getByLabel('値引き額')
    this.taxRateSelect = this.row.getByLabel('税率')
    this.labelCell = this.row.getByRole('cell').first()
    this.amountCell = this.row.getByRole('cell').last()
  }

  async fillName(value: string): Promise<void> {
    await this.nameInput.fill(value)
  }

  async fillQuantity(value: string): Promise<void> {
    await this.quantityInput.fill(value)
  }

  async fillUnitPrice(value: string): Promise<void> {
    await this.unitPriceInput.fill(value)
  }

  async fillDiscountAmount(value: string): Promise<void> {
    await this.discountAmountInput.fill(value)
  }

  async selectTaxRate(label: '10%' | '8%'): Promise<void> {
    await this.taxRateSelect.selectOption({ label })
  }

  async remove(): Promise<void> {
    await this.row.getByRole('button', { name: '行を削除', exact: true }).click()
  }
}

export class QuoteEditPage extends BasePage {
  readonly heading: Locator
  readonly recipientInput: Locator
  readonly subjectInput: Locator
  readonly lineRows: Locator
  readonly addLineButton: Locator
  readonly addDiscountButton: Locator
  readonly deleteLineButtons: Locator
  readonly issueButton: Locator
  readonly deleteButton: Locator
  readonly invoiceButton: Locator
  readonly viewInvoiceButton: Locator
  readonly statusCell: Locator
  readonly quoteNumber: Locator
  readonly issuedOn: Locator
  readonly validUntil: Locator
  readonly errorSummary: Locator
  readonly invoiceDisabledReason: Locator
  readonly saveFailedAlert: Locator
  readonly saveButtons: Locator

  constructor(page: Page) {
    super(page)
    this.heading = page.getByRole('heading', { name: '見積もり', level: 1, exact: true })
    this.recipientInput = page.getByLabel('宛先', { exact: true })
    this.subjectInput = page.getByLabel('件名', { exact: true })
    this.lineRows = page.getByTestId('line-row')
    this.addLineButton = page.getByRole('button', { name: '明細を追加', exact: true })
    this.addDiscountButton = page.getByRole('button', { name: '値引きを追加', exact: true })
    this.deleteLineButtons = page.getByRole('button', { name: '行を削除', exact: true })
    this.issueButton = page.getByRole('button', { name: '発行', exact: true })
    this.deleteButton = page.getByRole('button', { name: '削除', exact: true })
    this.invoiceButton = page.getByRole('button', { name: '請求書にする', exact: true })
    this.viewInvoiceButton = page.getByRole('button', { name: '請求書を見る', exact: true })
    this.statusCell = page.getByTestId('status')
    this.quoteNumber = page.getByTestId('quote-number')
    this.issuedOn = page.getByTestId('issued-on')
    this.validUntil = page.getByTestId('valid-until')
    this.errorSummary = page.getByText(/入力の誤りが/)
    this.invoiceDisabledReason = page.getByText('有効期限を過ぎたため、請求書にできません', {
      exact: true,
    })
    this.saveButtons = page.getByRole('button', { name: /保存/ })
    this.saveFailedAlert = page.getByRole('alert').filter({ hasText: '保存できませんでした。' })
  }

  async goto(quoteId: string): Promise<void> {
    await this.open(`/#/quotes/${quoteId}`)
  }

  // The id is the last segment of `#/quotes/:id`.
  quoteId(): string {
    return this.page.url().split('#/quotes/')[1] ?? ''
  }

  line(index: number): LineRow {
    return new LineRow(this.page, index)
  }

  async fillRecipient(value: string): Promise<void> {
    await this.recipientInput.fill(value)
  }

  async fillSubject(value: string): Promise<void> {
    await this.subjectInput.fill(value)
  }

  // Touch a field and leave it without typing (focus, then blur).
  async touchAndLeave(field: Locator): Promise<void> {
    await field.focus()
    await field.blur()
  }

  async addLine(): Promise<void> {
    await this.addLineButton.click()
  }

  async addDiscountLine(): Promise<void> {
    await this.addDiscountButton.click()
  }

  async issue(): Promise<void> {
    await this.issueButton.click()
  }

  // Two clicks fired back to back on the same button, before the screen can update.
  async issueByRapidClicks(): Promise<void> {
    await this.issueButton.evaluate((button: HTMLElement) => {
      button.click()
      button.click()
    })
  }

  // A real double click (two clicks in quick succession) on "発行".
  async issueByDoubleClick(): Promise<void> {
    await this.issueButton.dblclick()
  }

  async toInvoice(): Promise<void> {
    await this.invoiceButton.click()
  }

  async toInvoiceByRapidClicks(): Promise<void> {
    await this.invoiceButton.evaluate((button: HTMLElement) => {
      button.click()
      button.click()
    })
  }

  async viewInvoice(): Promise<void> {
    await this.viewInvoiceButton.click()
  }

  // Presses "削除", answers the confirm dialog, and returns the dialog message.
  async delete(answer: 'accept' | 'dismiss' = 'accept'): Promise<string> {
    const message = new Promise<string>((resolve) => {
      this.page.once('dialog', async (dialog) => {
        const text = dialog.message()
        if (answer === 'accept') {
          await dialog.accept()
        } else {
          await dialog.dismiss()
        }
        resolve(text)
      })
    })
    await this.deleteButton.click()
    return message
  }

  // Fills the standard valid draft used by many cases (one item line).
  async fillValidDraft(
    values: { recipient?: string; name?: string; unitPrice?: string; quantity?: string } = {},
  ): Promise<void> {
    const { recipient = 'テスト商会（架空）', name = '作業', unitPrice = '1000', quantity } = values
    await this.fillRecipient(recipient)
    await this.line(0).fillName(name)
    if (quantity !== undefined) await this.line(0).fillQuantity(quantity)
    await this.line(0).fillUnitPrice(unitPrice)
  }

  totalsLocators(): Record<keyof TotalsTexts, Locator> {
    return {
      base10: this.page.getByTestId('base-10'),
      tax10: this.page.getByTestId('tax-10'),
      base8: this.page.getByTestId('base-8'),
      tax8: this.page.getByTestId('tax-8'),
      total: this.page.getByTestId('total'),
    }
  }

  // Texts of the calculation result cells.
  async totals(): Promise<TotalsTexts> {
    const t = this.totalsLocators()
    return {
      base10: await t.base10.textContent(),
      tax10: await t.tax10.textContent(),
      base8: await t.base8.textContent(),
      tax8: await t.tax8.textContent(),
      total: await t.total.textContent(),
    }
  }

  // Controls that accept typing or choosing (none exist when the quote is read-only).
  editableControls(): Locator {
    return this.page.getByRole('textbox').or(this.page.getByRole('combobox'))
  }

  buttons(): Locator {
    return this.page.getByRole('button')
  }

  links(): Locator {
    return this.page.getByRole('link')
  }

  fieldError(message: string): Locator {
    return this.page.getByText(message, { exact: true })
  }
}
