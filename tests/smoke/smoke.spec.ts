import { expect, test } from '@playwright/test'
import { setNow } from '../e2e/helpers.ts'
import { InvoicePage } from '../e2e/pages/InvoicePage.ts'
import { QuoteEditPage } from '../e2e/pages/QuoteEditPage.ts'
import { QuoteListPage } from '../e2e/pages/QuoteListPage.ts'

test('TC-SMOKE-001 公開 URL で見本から請求書まで進める', async ({ page }) => {
  await setNow(page)
  const list = new QuoteListPage(page)
  await list.goto()
  await expect(list.heading).toBeVisible()

  await list.addSamples()
  const issued = list.rows.filter({ has: page.getByTestId('status').filter({ hasText: /^発行済み$/ }) }).first()
  await list.recipientLink(issued).click()

  const edit = new QuoteEditPage(page)
  await edit.toInvoice()

  const invoice = new InvoicePage(page)
  await expect(page).toHaveURL(/#\/invoices\//)
  await expect(invoice.invoiceNumber).toHaveText(/^INV-/)
})
