import { expect, test } from '@playwright/test'
import { advanceTo, setNow, startDraft } from './helpers.ts'
import { InvoicePage } from './pages/InvoicePage.ts'
import { QuoteListPage } from './pages/QuoteListPage.ts'

test('TC-DISP-004 値引き行の表示（見積もり画面と請求書画面）', async ({ page }) => {
  await setNow(page, '2026-11-21T12:00:00+09:00')
  const edit = await startDraft(page)
  await edit.fillValidDraft({ unitPrice: '5000' })
  await edit.addDiscountLine()
  await edit.line(1).fillDiscountAmount('1000')
  await edit.issue()
  await expect(edit.statusCell).toHaveText('発行済み')

  await expect(edit.lineRows).toHaveCount(2)
  await expect(edit.line(1).labelCell).toHaveText('値引き')
  await expect(edit.line(1).amountCell).toHaveText('-1,000円')

  await advanceTo(page, '2026-11-25T12:00:00+09:00')
  await edit.toInvoice()
  const invoice = new InvoicePage(page)
  await expect(invoice.heading).toBeVisible()

  await expect(invoice.lineRows).toHaveCount(2)
  await expect(invoice.lineLabel(1)).toHaveText('値引き')
  await expect(invoice.lineAmount(1)).toHaveText('-1,000円')
})

test('TC-DISP-005 マイナスの対象額・合計の表示（画面）', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)
  await edit.line(0).fillName('作業')
  await edit.line(0).fillUnitPrice('100')
  await edit.addDiscountLine()
  await edit.line(1).fillDiscountAmount('150')

  const totals = edit.totalsLocators()
  await expect(totals.base10).toHaveText('-50円')
  await expect(totals.tax10).toHaveText('0円')
  await expect(totals.total).toHaveText('-50円')
})

test('TC-DISP-006 明細のない税率の欄も 0円 で出る', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)
  await edit.line(0).fillName('作業')
  await edit.line(0).fillUnitPrice('1000')

  const totals = edit.totalsLocators()
  await expect(totals.base10).toHaveText('1,000円')
  await expect(totals.tax10).toHaveText('100円')
  await expect(totals.total).toHaveText('1,100円')
  await expect(totals.base8).toHaveText('0円')
  await expect(totals.tax8).toHaveText('0円')
})

test('TC-DISP-007 新しい下書きの計算結果はすべて 0円', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  const totals = edit.totalsLocators()
  await expect(totals.base10).toHaveText('0円')
  await expect(totals.tax10).toHaveText('0円')
  await expect(totals.base8).toHaveText('0円')
  await expect(totals.tax8).toHaveText('0円')
  await expect(totals.total).toHaveText('0円')

  await edit.backToList()
  const list = new QuoteListPage(page)
  await expect(list.rows).toHaveCount(1)
  await expect(list.totalCell(list.row(0))).toHaveText('0円')
})

test('TC-DISP-008 入力欄のラベルと税率の選択肢', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  await expect(edit.recipientInput).toBeVisible()
  await expect(edit.subjectInput).toBeVisible()
  await expect(edit.line(0).nameInput).toBeVisible()
  await expect(edit.line(0).quantityInput).toBeVisible()
  await expect(edit.line(0).unitPriceInput).toBeVisible()
  await expect(edit.line(0).taxRateSelect).toBeVisible()
  await expect(edit.line(0).taxRateSelect.locator('option')).toHaveText(['10%', '8%'])

  await edit.addDiscountLine()
  await expect(edit.line(1).discountAmountInput).toBeVisible()
})
