import { expect, test } from '@playwright/test'
import { createIssuedQuote, setNow, startDraft } from './helpers.ts'
import { InvoicePage } from './pages/InvoicePage.ts'
import { QuoteEditPage } from './pages/QuoteEditPage.ts'
import { QuoteListPage } from './pages/QuoteListPage.ts'

test('TC-NUM-007 画面：下書きを削除してから別の下書きを発行すると Q-0001', async ({ page }) => {
  await setNow(page)
  const draftA = await startDraft(page)
  await draftA.delete('accept')
  await expect(new QuoteListPage(page).rows).toHaveCount(0)

  const draftB = await startDraft(page)
  await draftB.fillValidDraft()
  await draftB.issue()

  await expect(draftB.statusCell).toHaveText('発行済み')
  await expect(draftB.quoteNumber).toHaveText('Q-0001')
})

test('TC-NUM-008 画面：見積もりを 2 件発行してから最初のものを請求すると INV-0001', async ({
  page,
}) => {
  await setNow(page)
  const first = await createIssuedQuote(page, { recipient: '甲社（架空）' })
  await expect(first.quoteNumber).toHaveText('Q-0001')
  await first.backToList()
  const second = await createIssuedQuote(page, { recipient: '乙社（架空）' })
  await expect(second.quoteNumber).toHaveText('Q-0002')
  await second.backToList()

  const list = new QuoteListPage(page)
  await list.openByRecipient('甲社（架空）')
  await new QuoteEditPage(page).toInvoice()

  await expect(new InvoicePage(page).invoiceNumber).toHaveText('INV-0001')
})
