import { expect, test, type Page } from '@playwright/test'
import { advanceTo, createIssuedQuote, setNow, startDraft } from './helpers.ts'
import { InvoicePage } from './pages/InvoicePage.ts'
import { NotFoundPage } from './pages/NotFoundPage.ts'
import { QuoteEditPage } from './pages/QuoteEditPage.ts'
import { QuoteListPage } from './pages/QuoteListPage.ts'
import { TestDocsPage } from './pages/TestDocsPage.ts'

const RECIPIENT = 'テスト商会（架空）'

// Creates an issued quote at 2026-11-21 12:00 and invoices it at 2026-11-25 12:00.
async function createInvoicedQuote(
  page: Page,
  values: { recipient?: string; name?: string; unitPrice?: string } = {},
): Promise<{ quote: QuoteEditPage; invoice: InvoicePage }> {
  await setNow(page, '2026-11-21T12:00:00+09:00')
  const quote = await createIssuedQuote(page, values)
  await advanceTo(page, '2026-11-25T12:00:00+09:00')
  await quote.toInvoice()
  const invoice = new InvoicePage(page)
  await invoice.heading.waitFor()
  return { quote, invoice }
}

// The spec 4 case: "April" subject, a 10% line and an 8% line, invoiced on 2026-11-25.
async function createTwoRateInvoice(
  page: Page,
): Promise<InvoicePage> {
  await setNow(page, '2026-11-21T12:00:00+09:00')
  const quote = await startDraft(page)
  await quote.fillValidDraft({ quantity: '2' })
  await quote.fillSubject('4月分')
  await quote.addLine()
  await quote.line(1).fillName('資料')
  await quote.line(1).fillQuantity('1')
  await quote.line(1).fillUnitPrice('500')
  await quote.line(1).selectTaxRate('8%')
  await quote.issue()
  await expect(quote.statusCell).toHaveText('発行済み')
  await advanceTo(page, '2026-11-25T12:00:00+09:00')
  await quote.toInvoice()
  const invoice = new InvoicePage(page)
  await invoice.heading.waitFor()
  return invoice
}

test('TC-FLOW-001 新しい見積もりから請求書までを一続きで行う', async ({ page }) => {
  await setNow(page, '2026-11-21T10:00:00+09:00')
  const list = new QuoteListPage(page)
  await list.goto()
  await list.newQuote()
  const edit = new QuoteEditPage(page)
  await edit.fillValidDraft({ quantity: '2' })

  const totals = edit.totalsLocators()
  await expect(totals.base10).toHaveText('2,000円')
  await expect(totals.tax10).toHaveText('200円')
  await expect(totals.total).toHaveText('2,200円')

  await edit.issue()
  await expect(edit.statusCell).toHaveText('発行済み')
  await expect(edit.quoteNumber).toHaveText('Q-0001')
  await expect(edit.issuedOn).toHaveText('2026/11/21')
  await expect(edit.validUntil).toHaveText('2026/12/21')

  await advanceTo(page, '2026-11-25T10:00:00+09:00')
  await edit.toInvoice()

  const invoice = new InvoicePage(page)
  await expect(page).toHaveURL(/#\/invoices\/.+/)
  await expect(invoice.invoiceNumber).toHaveText('INV-0001')
  await expect(invoice.invoicedOn).toHaveText('2026/11/25')
  await expect(invoice.dueOn).toHaveText('2026/12/31')
  await expect(invoice.total).toHaveText('2,200円')
})

test('TC-FLOW-002 「新しい見積もり」で下書きが 1 件でき、その画面が開く', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  await expect(page).toHaveURL(/#\/quotes\/.+/)
  await expect(edit.statusCell).toHaveText('下書き')
  await edit.backToList()
  await expect(new QuoteListPage(page).rows).toHaveCount(1)
})

test('TC-FLOW-003 新しい下書きの初めの値', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  await expect(edit.recipientInput).toHaveValue('')
  await expect(edit.subjectInput).toHaveValue('')
  await expect(edit.lineRows).toHaveCount(1)
  await expect(edit.line(0).nameInput).toHaveValue('')
  await expect(edit.line(0).quantityInput).toHaveValue('1')
  await expect(edit.line(0).unitPriceInput).toHaveValue('')
  await expect(edit.line(0).taxRateSelect.locator('option:checked')).toHaveText('10%')
  await expect(edit.quoteNumber).toHaveCount(0)
  await expect(edit.issuedOn).toHaveCount(0)
  await expect(edit.validUntil).toHaveCount(0)
})

test('TC-FLOW-004 3 行の真ん中の行を「行を削除」で削除', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)
  await edit.addLine()
  await edit.addLine()
  await expect(edit.lineRows).toHaveCount(3)
  await edit.line(0).fillName('甲')
  await edit.line(1).fillName('乙')
  await edit.line(2).fillName('丙')

  await edit.line(1).remove()

  await expect(edit.lineRows).toHaveCount(2)
  await expect(edit.line(0).nameInput).toHaveValue('甲')
  await expect(edit.line(1).nameInput).toHaveValue('丙')
})

test('TC-FLOW-005 見積もり画面から「一覧に戻る」で一覧に戻る', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  await edit.backToList()

  await expect(page).toHaveURL(/#\/$/)
  await expect(new QuoteListPage(page).heading).toBeVisible()
})

test('TC-FLOW-006 決まっている URL の画面が開く', async ({ page }) => {
  const { quote, invoice } = await createInvoicedQuote(page)
  const invoiceId = invoice.invoiceId()
  await invoice.backToList()
  const list = new QuoteListPage(page)
  await list.openByRecipient(RECIPIENT)
  await expect(quote.heading).toBeVisible()
  const quoteId = quote.quoteId()

  await list.goto()
  await expect(list.heading).toBeVisible()
  await quote.goto(quoteId)
  await expect(quote.heading).toBeVisible()
  await invoice.goto(invoiceId)
  await expect(invoice.heading).toBeVisible()
  const docs = new TestDocsPage(page)
  await docs.open('/#/tests')
  await expect(docs.heading).toBeVisible()
})

test('TC-FLOW-007 存在しない ID の URL', async ({ page }) => {
  await setNow(page)
  const notFound = new NotFoundPage(page)
  const list = new QuoteListPage(page)

  await notFound.open('/#/quotes/xxx')
  await expect(notFound.message).toBeVisible()
  await expect(notFound.backToListLink).toBeVisible()
  await notFound.backToList()
  await expect(list.heading).toBeVisible()

  await notFound.open('/#/invoices/xxx')
  await expect(notFound.message).toBeVisible()
  await expect(notFound.backToListLink).toBeVisible()
  await notFound.backToList()
  await expect(list.heading).toBeVisible()
})

test('TC-FLOW-008 決まっていない hash の URL', async ({ page }) => {
  await setNow(page)
  const notFound = new NotFoundPage(page)

  await notFound.open('/#/foo')

  await expect(notFound.message).toBeVisible()
  await expect(notFound.backToListLink).toBeVisible()
})

test('TC-FLOW-009 hash のない URL は一覧を表示する', async ({ page }) => {
  await setNow(page)
  const list = new QuoteListPage(page)

  await list.open('/')

  await expect(list.heading).toBeVisible()
  await expect(list.emptyMessage).toBeVisible()
})

test('TC-FLOW-010 全画面に注意書きとヘッダーの「テスト資料」リンクがある', async ({ page }) => {
  const { quote, invoice } = await createInvoicedQuote(page)
  const invoiceId = invoice.invoiceId()
  await invoice.backToList()
  const list = new QuoteListPage(page)
  await list.openByRecipient(RECIPIENT)
  const quoteId = quote.quoteId()
  const docs = new TestDocsPage(page)
  const notFound = new NotFoundPage(page)

  await list.goto()
  await expect(list.heading).toBeVisible()
  await expect(list.notice).toBeVisible()
  await expect(list.testDocsLink).toBeVisible()

  await quote.goto(quoteId)
  await expect(quote.heading).toBeVisible()
  await expect(quote.notice).toBeVisible()
  await expect(quote.testDocsLink).toBeVisible()

  await invoice.goto(invoiceId)
  await expect(invoice.heading).toBeVisible()
  await expect(invoice.notice).toBeVisible()
  await expect(invoice.testDocsLink).toBeVisible()

  await docs.open('/#/tests')
  await expect(docs.heading).toBeVisible()
  await expect(docs.notice).toBeVisible()
  await expect(docs.testDocsLink).toBeVisible()

  await notFound.open('/#/foo')
  await expect(notFound.message).toBeVisible()
  await expect(notFound.notice).toBeVisible()
  await expect(notFound.testDocsLink).toBeVisible()

  await notFound.openTestDocsFromHeader()
  await expect(page).toHaveURL(/#\/tests$/)
})

test('TC-FLOW-011 請求書の画面は表示だけで、請求書にした時点の写し', async ({ page }) => {
  const invoice = await createTwoRateInvoice(page)

  await expect(invoice.editableControls()).toHaveCount(0)
  await expect(invoice.buttons()).toHaveCount(0)
  await expect(invoice.base10).toHaveText('2,000円')
  await expect(invoice.tax10).toHaveText('200円')
  await expect(invoice.base8).toHaveText('500円')
  await expect(invoice.tax8).toHaveText('40円')
  await expect(invoice.total).toHaveText('2,740円')

  await advanceTo(page, '2026-12-20T12:00:00+09:00')

  await expect(invoice.invoicedOn).toHaveText('2026/11/25')
  await expect(invoice.dueOn).toHaveText('2026/12/31')
})

test('TC-FLOW-012 請求書の画面の項目', async ({ page }) => {
  const invoice = await createTwoRateInvoice(page)

  await expect(invoice.invoiceNumber).toHaveText('INV-0001')
  await expect(invoice.quoteNumber).toHaveText('Q-0001')
  await expect(page.getByText(RECIPIENT, { exact: true })).toBeVisible()
  await expect(page.getByText('4月分', { exact: true })).toBeVisible()
  await expect(invoice.lineRows).toHaveCount(2)
  await expect(invoice.lineLabel(0)).toHaveText('作業')
  await expect(invoice.lineLabel(1)).toHaveText('資料')
  await expect(invoice.invoicedOn).toHaveText('2026/11/25')
  await expect(invoice.dueOn).toHaveText('2026/12/31')
  await expect(invoice.base10).toHaveText('2,000円')
  await expect(invoice.tax10).toHaveText('200円')
  await expect(invoice.base8).toHaveText('500円')
  await expect(invoice.tax8).toHaveText('40円')
  await expect(invoice.total).toHaveText('2,740円')
})

test('TC-FLOW-013 一覧の列', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)
  await edit.backToList()
  const list = new QuoteListPage(page)

  await expect(list.columnHeaders).toHaveText([
    '状態',
    '見積もり番号',
    '宛先',
    '合計（税込）',
    '発行日',
    '有効期限',
  ])
})

test('TC-FLOW-014 一覧：下書きの行', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)
  await edit.fillValidDraft({ quantity: '1' })
  await edit.backToList()
  const list = new QuoteListPage(page)

  await expect(list.rows).toHaveCount(1)
  const row = list.row(0)
  await expect(list.cell(row, 'status')).toHaveText('下書き')
  await expect(list.cell(row, 'quote-number')).toHaveText('—')
  await expect(list.cell(row, 'issued-on')).toHaveText('—')
  await expect(list.cell(row, 'valid-until')).toHaveText('—')
  await expect(list.recipientLink(row)).toHaveText(RECIPIENT)
  await expect(list.totalCell(row)).toHaveText('1,100円')
})

test('TC-FLOW-015 一覧は新しく作ったものが上', async ({ page }) => {
  await setNow(page)
  const list = new QuoteListPage(page)
  for (const recipient of ['甲社（架空）', '乙社（架空）', '丙社（架空）']) {
    const edit = await startDraft(page)
    await edit.fillRecipient(recipient)
    await edit.backToList()
  }

  await expect(list.rows).toHaveCount(3)
  await expect(list.rows.getByRole('link')).toHaveText(['丙社（架空）', '乙社（架空）', '甲社（架空）'])
})

test('TC-FLOW-016 一覧の状態の列に 4 つの状態が出る', async ({ page }) => {
  await setNow(page, '2026-11-01T12:00:00+09:00')
  await createIssuedQuote(page, { recipient: '乙社（架空）' })
  await new QuoteEditPage(page).backToList()
  await createIssuedQuote(page, { recipient: '丙社（架空）' })
  await new QuoteEditPage(page).backToList()
  await advanceTo(page, '2026-11-02T12:00:00+09:00')
  const list = new QuoteListPage(page)
  await list.openByRecipient('丙社（架空）')
  await new QuoteEditPage(page).toInvoice()
  await new InvoicePage(page).heading.waitFor()
  await advanceTo(page, '2026-11-21T12:00:00+09:00')
  await new InvoicePage(page).backToList()
  await createIssuedQuote(page, { recipient: '甲社（架空）' })
  await new QuoteEditPage(page).backToList()
  const draft = await startDraft(page)
  await draft.fillRecipient('丁社（架空）')
  await advanceTo(page, '2026-12-02T12:00:00+09:00')

  await list.goto()

  await expect(list.rows).toHaveCount(4)
  await expect(list.rows.getByRole('link')).toHaveText([
    '丁社（架空）',
    '甲社（架空）',
    '丙社（架空）',
    '乙社（架空）',
  ])
  await expect(list.rows.getByTestId('status')).toHaveText([
    '下書き',
    '発行済み',
    '請求済み',
    '期限切れ',
  ])
})

test('TC-FLOW-017 画面幅 375px でページ全体が横にスクロールしない', async ({ page }) => {
  await setNow(page, '2026-11-21T12:00:00+09:00')
  await page.setViewportSize({ width: 375, height: 812 })
  const edit = await startDraft(page)
  await edit.fillRecipient(RECIPIENT)
  await edit.line(0).fillName('作業')
  await edit.line(0).fillUnitPrice('1000')
  await edit.addLine()
  await edit.line(1).fillName('資料')
  await edit.line(1).fillUnitPrice('1000')
  await edit.addLine()
  await edit.line(2).fillName('備品')
  await edit.line(2).fillUnitPrice('1000')
  await edit.issue()
  await expect(edit.statusCell).toHaveText('発行済み')
  const quoteUrl = page.url()
  await advanceTo(page, '2026-11-25T12:00:00+09:00')
  await edit.toInvoice()
  const invoice = new InvoicePage(page)
  await expect(invoice.heading).toBeVisible()
  const invoiceUrl = page.url()
  const list = new QuoteListPage(page)

  const pageWidth = () => page.evaluate(() => document.documentElement.scrollWidth)

  await list.goto()
  await expect(list.heading).toBeVisible()
  expect(await pageWidth()).toBeLessThanOrEqual(375)

  await page.goto(quoteUrl)
  await expect(edit.heading).toBeVisible()
  expect(await pageWidth()).toBeLessThanOrEqual(375)

  await page.goto(invoiceUrl)
  await expect(invoice.heading).toBeVisible()
  expect(await pageWidth()).toBeLessThanOrEqual(375)
})
