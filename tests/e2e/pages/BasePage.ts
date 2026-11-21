import type { Locator, Page } from '@playwright/test'

// Elements shared by every screen (header link, notice, "back to list" link).
export class BasePage {
  readonly notice: Locator
  readonly testDocsLink: Locator
  readonly backToListLink: Locator

  constructor(readonly page: Page) {
    this.notice = page.getByText('ポートフォリオ用の練習アプリです。実際の取引には使えません。', {
      exact: true,
    })
    this.testDocsLink = page.getByRole('link', { name: 'テスト資料', exact: true })
    this.backToListLink = page.getByRole('link', { name: '一覧に戻る', exact: true })
  }

  async open(path: string): Promise<void> {
    await this.page.goto(path)
  }

  async openTestDocsFromHeader(): Promise<void> {
    await this.testDocsLink.click()
  }

  async backToList(): Promise<void> {
    await this.backToListLink.click()
  }
}
