import type { Locator, Page } from '@playwright/test'
import { BasePage } from './BasePage.ts'

export class QuoteListPage extends BasePage {
  readonly heading: Locator
  readonly newQuoteButton: Locator
  readonly emptyMessage: Locator
  readonly sampleButton: Locator
  readonly resetButton: Locator
  readonly corruptedMessage: Locator
  readonly rows: Locator
  readonly columnHeaders: Locator

  constructor(page: Page) {
    super(page)
    this.heading = page.getByRole('heading', { name: '見積もり一覧', level: 1 })
    this.newQuoteButton = page.getByRole('button', { name: '新しい見積もり', exact: true })
    this.emptyMessage = page.getByText('見積もりはまだありません', { exact: true })
    this.sampleButton = page.getByRole('button', { name: '見本を入れる', exact: true })
    this.resetButton = page.getByRole('button', {
      name: 'データを消して初めからやり直す',
      exact: true,
    })
    this.corruptedMessage = page.getByText('保存データを読み込めませんでした。', { exact: true })
    this.rows = page.getByTestId('quote-row')
    this.columnHeaders = page.getByRole('columnheader')
  }

  async goto(): Promise<void> {
    await this.open('/#/')
  }

  async newQuote(): Promise<void> {
    await this.newQuoteButton.click()
  }

  async addSamples(): Promise<void> {
    await this.sampleButton.click()
  }

  async resetData(): Promise<void> {
    await this.resetButton.click()
  }

  row(index: number): Locator {
    return this.rows.nth(index)
  }

  rowByRecipient(recipient: string): Locator {
    return this.rows.filter({ has: this.page.getByRole('link', { name: recipient, exact: true }) })
  }

  recipientLink(row: Locator): Locator {
    return row.getByRole('link')
  }

  async openByRecipient(recipient: string): Promise<void> {
    await this.rowByRecipient(recipient).getByRole('link', { name: recipient, exact: true }).click()
  }

  cell(row: Locator, testId: 'status' | 'quote-number' | 'issued-on' | 'valid-until'): Locator {
    return row.getByTestId(testId)
  }

  // "Total (tax included)" has no test id; it is the 4th cell of the row.
  totalCell(row: Locator): Locator {
    return row.getByRole('cell').nth(3)
  }
}
