import type { Locator, Page } from '@playwright/test'
import { BasePage } from './BasePage.ts'

export class NotFoundPage extends BasePage {
  readonly message: Locator

  constructor(page: Page) {
    super(page)
    this.message = page.getByText('見つかりません', { exact: true })
  }
}
