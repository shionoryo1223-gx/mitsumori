import { expect, test } from '@playwright/test'
import { advanceTo, createIssuedQuote, openFromList, setNow, startDraft } from './helpers.ts'
import { InvoicePage } from './pages/InvoicePage.ts'
import { QuoteEditPage } from './pages/QuoteEditPage.ts'
import { QuoteListPage } from './pages/QuoteListPage.ts'

const RECIPIENT = 'テスト商会（架空）'

// Buttons and fields that must not exist on a read-only quote screen.
async function expectNoEditingButtons(edit: QuoteEditPage): Promise<void> {
  await expect(edit.issueButton).toHaveCount(0)
  await expect(edit.deleteButton).toHaveCount(0)
  await expect(edit.addLineButton).toHaveCount(0)
  await expect(edit.addDiscountButton).toHaveCount(0)
  await expect(edit.deleteLineButtons).toHaveCount(0)
}

// The screen must offer exactly the links "一覧に戻る", "テスト資料" and the header app name (order does not matter).
async function expectLinks(edit: QuoteEditPage): Promise<void> {
  await expect.soft
    .poll(async () => (await edit.links().allInnerTexts()).sort())
    .toEqual(['mitsumori（仮称）', '一覧に戻る', 'テスト資料'].sort())
}

// No button or link that returns the quote to an earlier state (cancel issue, back to draft, cancel invoice).
async function expectNoRevertControl(edit: QuoteEditPage): Promise<void> {
  const revert = /取り消|取消|下書きに戻|戻す|元に戻/
  await expect(edit.buttons().filter({ hasText: revert })).toHaveCount(0)
  await expect(edit.links().filter({ hasText: revert })).toHaveCount(0)
}

test('TC-ST-012 画面：下書きで出るボタンと入力欄', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  await expect(edit.recipientInput).toBeVisible()
  await expect(edit.subjectInput).toBeVisible()
  await expect(edit.line(0).nameInput).toBeVisible()
  await expect(edit.line(0).quantityInput).toBeVisible()
  await expect(edit.line(0).unitPriceInput).toBeVisible()
  await expect(edit.line(0).taxRateSelect).toBeVisible()
  await expect(edit.addLineButton).toBeVisible()
  await expect(edit.addDiscountButton).toBeVisible()
  await expect(edit.deleteLineButtons).toHaveCount(1)
  await expect(edit.issueButton).toBeVisible()
  await expect(edit.issueButton).toBeDisabled()
  await expect(edit.deleteButton).toBeVisible()
  await expect(edit.invoiceButton).toHaveCount(0)
  await expect(edit.viewInvoiceButton).toHaveCount(0)
})

test('TC-ST-013 画面：発行済み（期限内）で出るボタン', async ({ page }) => {
  await setNow(page, '2026-11-21T12:00:00+09:00')
  await createIssuedQuote(page)
  await page.reload()
  await new QuoteListPage(page).goto()
  const edit = await openFromList(page, RECIPIENT)

  await expect(edit.statusCell).toHaveText('発行済み')
  await expect(edit.invoiceButton).toBeEnabled()
  await expectNoEditingButtons(edit)
  await expect(edit.viewInvoiceButton).toHaveCount(0)
  await expect(page.getByText(RECIPIENT, { exact: true })).toBeVisible()
  await expect(page.getByText('作業', { exact: true })).toBeVisible()
  await expect(edit.editableControls()).toHaveCount(0)
})

test('TC-ST-014 画面：期限切れで出るボタン', async ({ page }) => {
  await setNow(page, '2026-11-01T12:00:00+09:00')
  await createIssuedQuote(page)
  await advanceTo(page, '2026-12-02T00:00:00+09:00')
  const edit = await openFromList(page, RECIPIENT)

  await expect(edit.statusCell).toHaveText('期限切れ')
  await expect(edit.invoiceButton).toBeDisabled()
  await expect(edit.invoiceDisabledReason).toBeVisible()
  await expectNoEditingButtons(edit)
  await expect(edit.viewInvoiceButton).toHaveCount(0)
  await expect(edit.editableControls()).toHaveCount(0)
})

test('TC-ST-015 画面：請求済みで出るボタン', async ({ page }) => {
  await setNow(page, '2026-11-01T12:00:00+09:00')
  await createIssuedQuote(page)
  await advanceTo(page, '2026-11-02T12:00:00+09:00')
  const issued = new QuoteEditPage(page)
  await issued.toInvoice()
  await new InvoicePage(page).heading.waitFor()
  await advanceTo(page, '2026-12-02T12:00:00+09:00')
  await new QuoteListPage(page).goto()
  const edit = await openFromList(page, RECIPIENT)

  await expect(edit.statusCell).toHaveText('請求済み')
  await expect(edit.viewInvoiceButton).toBeVisible()
  await expectNoEditingButtons(edit)
  await expect(edit.invoiceButton).toHaveCount(0)
  await expect(edit.editableControls()).toHaveCount(0)
})

test('TC-ST-016 削除：確認で OK すると一覧に戻り、その見積もりはなくなる', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  const message = await edit.delete('accept')

  expect(message).toBe('この下書きを削除しますか？')
  await expect(page).toHaveURL(/#\/$/)
  const list = new QuoteListPage(page)
  await expect(list.heading).toBeVisible()
  await expect(list.rows).toHaveCount(0)
})

test('TC-ST-017 削除：確認でキャンセルすると何も変わらない', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)
  await edit.fillRecipient(RECIPIENT)
  const quoteUrl = page.url()

  await edit.delete('dismiss')

  await expect(page).toHaveURL(quoteUrl)
  await expect(edit.recipientInput).toHaveValue(RECIPIENT)
  await edit.backToList()
  await expect(new QuoteListPage(page).rows).toHaveCount(1)
})

test('TC-ST-018 「発行」を押すと同じ画面で発行済みになる', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)
  await edit.fillValidDraft({ quantity: '1' })
  const quoteUrl = page.url()

  await edit.issue()

  await expect(page).toHaveURL(quoteUrl)
  await expect(edit.statusCell).toHaveText('発行済み')
  await expect(edit.quoteNumber).toHaveText('Q-0001')
  await expect(edit.issuedOn).toHaveText('2026/11/21')
  await expect(edit.validUntil).toHaveText('2026/12/21')
})

test('TC-ST-019 「請求書にする」を押すと請求書の画面に移る', async ({ page }) => {
  await setNow(page, '2026-11-21T12:00:00+09:00')
  const edit = await createIssuedQuote(page)
  await advanceTo(page, '2026-11-25T12:00:00+09:00')

  await edit.toInvoice()

  await expect(page).toHaveURL(/#\/invoices\/.+/)
  const invoice = new InvoicePage(page)
  await expect(invoice.invoiceNumber).toHaveText('INV-0001')
  await expect(invoice.invoicedOn).toHaveText('2026/11/25')
  await expect(invoice.dueOn).toHaveText('2026/12/31')
})

test('TC-ST-020 「発行」「請求書にする」を素早く 2 回押す', async ({ page }) => {
  await setNow(page, '2026-11-21T12:00:00+09:00')

  // (1) Press "発行" twice quickly on a valid draft.
  const draft = await startDraft(page)
  await draft.fillValidDraft()
  await draft.issueByRapidClicks()
  await expect(draft.statusCell).toHaveText('発行済み')
  await draft.backToList()
  const list = new QuoteListPage(page)
  await expect(list.rows).toHaveCount(1)
  await expect(list.cell(list.row(0), 'quote-number')).toHaveText('Q-0001')

  // (2) A second issued quote: press "請求書にする" twice quickly.
  const second = await createIssuedQuote(page, { recipient: '乙社（架空）' })
  await expect(second.quoteNumber).toHaveText('Q-0002')
  await advanceTo(page, '2026-11-25T12:00:00+09:00')
  await second.toInvoiceByRapidClicks()
  await expect(page).toHaveURL(/#\/invoices\/.+/)
  const invoice = new InvoicePage(page)
  await expect(invoice.invoiceNumber).toHaveText('INV-0001')

  // Invoice the first quote: the invoice number advances by one only (INV-0002).
  await invoice.backToList()
  await list.openByRecipient(RECIPIENT)
  const first = new QuoteEditPage(page)
  await first.toInvoice()
  await expect(invoice.invoiceNumber).toHaveText('INV-0002')
})

test('TC-ST-021 状態を戻す操作が画面にない', async ({ page }) => {
  await setNow(page, '2026-11-01T12:00:00+09:00')
  await createIssuedQuote(page, { recipient: '乙社（架空）' })
  await createIssuedQuote(page, { recipient: '丙社（架空）' })
  await advanceTo(page, '2026-11-02T12:00:00+09:00')
  const list = new QuoteListPage(page)
  await list.goto()
  await list.openByRecipient('丙社（架空）')
  const heiEdit = new QuoteEditPage(page)
  await heiEdit.toInvoice()
  await new InvoicePage(page).heading.waitFor()
  await advanceTo(page, '2026-11-21T12:00:00+09:00')
  await createIssuedQuote(page, { recipient: '甲社（架空）' })
  await advanceTo(page, '2026-12-02T12:00:00+09:00')

  const edit = new QuoteEditPage(page)
  await list.goto()
  await list.openByRecipient('甲社（架空）')
  await expect(edit.statusCell).toHaveText('発行済み')
  await expect(edit.buttons()).toHaveText(['請求書にする'])
  await expect(edit.invoiceButton).toBeEnabled()
  await expectLinks(edit)
  await expectNoRevertControl(edit)

  await edit.backToList()
  await list.openByRecipient('乙社（架空）')
  await expect(edit.statusCell).toHaveText('期限切れ')
  await expect(edit.buttons()).toHaveText(['請求書にする'])
  await expect(edit.invoiceButton).toBeDisabled()
  await expectLinks(edit)
  await expectNoRevertControl(edit)

  await edit.backToList()
  await list.openByRecipient('丙社（架空）')
  await expect(edit.statusCell).toHaveText('請求済み')
  await expect(edit.buttons()).toHaveText(['請求書を見る'])
  await expectLinks(edit)
  await expectNoRevertControl(edit)
})

test('TC-ST-022 状態・番号・日付は読み込み直しても残る', async ({ page }) => {
  await setNow(page, '2026-11-21T12:00:00+09:00')
  const edit = await createIssuedQuote(page)
  await advanceTo(page, '2026-11-25T12:00:00+09:00')
  await edit.toInvoice()
  await new InvoicePage(page).heading.waitFor()

  await page.reload()
  await new QuoteListPage(page).goto()
  const reopened = await openFromList(page, RECIPIENT)

  await expect(reopened.statusCell).toHaveText('請求済み')
  await expect(reopened.quoteNumber).toHaveText('Q-0001')
  await expect(reopened.issuedOn).toHaveText('2026/11/21')
  await expect(reopened.validUntil).toHaveText('2026/12/21')
})

test('TC-ST-023 「請求書を見る」で請求書の画面へ', async ({ page }) => {
  await setNow(page, '2026-11-21T12:00:00+09:00')
  const edit = await createIssuedQuote(page)
  await advanceTo(page, '2026-11-25T12:00:00+09:00')
  await edit.toInvoice()
  await new InvoicePage(page).heading.waitFor()

  await page.reload()
  await new QuoteListPage(page).goto()
  const reopened = await openFromList(page, RECIPIENT)
  await reopened.viewInvoice()

  await expect(page).toHaveURL(/#\/invoices\/.+/)
  await expect(new InvoicePage(page).invoiceNumber).toHaveText('INV-0001')
})

test('TC-ST-025 「発行」をダブルクリックしても「請求書にする」は押されない', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)
  await edit.fillValidDraft()

  await edit.issueButton.dblclick()

  await expect(edit.statusCell).toHaveText('発行済み')
  await expect(edit.quoteNumber).toHaveText('Q-0001')
  await expect(page).toHaveURL(/#\/quotes\/.+/)
  await expect(page).not.toHaveURL(/#\/invoices\//)

  await edit.backToList()
  const list = new QuoteListPage(page)
  await expect(list.rows).toHaveCount(1)
  await expect(list.cell(list.row(0), 'status')).toHaveText('発行済み')
  await expect(list.cell(list.row(0), 'quote-number')).toHaveText('Q-0001')
  await expect(page.getByText(/INV-\d+/)).toHaveCount(0)
})
