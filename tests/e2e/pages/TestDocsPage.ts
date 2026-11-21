import type { Locator, Page } from '@playwright/test'
import { BasePage } from './BasePage.ts'

export class TestDocsPage extends BasePage {
  readonly heading: Locator

  constructor(page: Page) {
    super(page)
    this.heading = page.getByRole('heading', { name: 'テスト資料', level: 1 })
  }
}
