import { expect, test } from '@playwright/test'
import { seedStorage, setNow, startDraft } from './helpers.ts'
import { QuoteEditPage } from './pages/QuoteEditPage.ts'

test('TC-INP-032 項目の誤りの文言は、触れて離れたあとに出る', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  await expect(edit.fieldError('宛先を入力してください')).toHaveCount(0)

  await edit.touchAndLeave(edit.recipientInput)
  await expect(edit.fieldError('宛先を入力してください')).toBeVisible()
})

test('TC-INP-033 項目に属さない誤りは、触れなくても常に出る', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  await edit.line(0).fillName('作業')
  await edit.line(0).fillUnitPrice('1000')
  await edit.addDiscountLine()
  // fill() types into the field without leaving it (no blur).
  await edit.line(1).fillDiscountAmount('1001')

  await expect(edit.line(1).discountAmountInput).toBeFocused()
  await expect(edit.fieldError('10%の値引きが、10%の明細の合計を超えています')).toBeVisible()
})

test('TC-INP-034 「入力の誤りが N 件あります」は触れる前から出て、誤りがなくなると消える', async ({
  page,
}) => {
  await setNow(page)
  const edit = await startDraft(page)

  await expect(edit.errorSummary).toHaveText('入力の誤りが 3 件あります')
  await expect(edit.issueButton).toBeDisabled()

  await edit.fillValidDraft()

  await expect(edit.errorSummary).toHaveCount(0)
  await expect(edit.issueButton).toBeEnabled()
})

test('TC-INP-035 追加ボタンは 20 行で押せなくなる', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  for (let i = 0; i < 18; i++) await edit.addLine()
  await expect(edit.lineRows).toHaveCount(19)
  await expect(edit.addLineButton).toBeEnabled()
  await expect(edit.addDiscountButton).toBeEnabled()

  await edit.addLine()
  await expect(edit.lineRows).toHaveCount(20)
  await expect(edit.addLineButton).toBeDisabled()
  await expect(edit.addDiscountButton).toBeDisabled()
})

test('TC-INP-036 値引き行も数えて追加ボタンが押せなくなる', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  for (let i = 0; i < 18; i++) await edit.addLine()
  await expect(edit.lineRows).toHaveCount(19)
  await edit.addDiscountLine()
  await expect(edit.lineRows).toHaveCount(20)

  await expect(edit.addLineButton).toBeDisabled()
  await expect(edit.addDiscountButton).toBeDisabled()
})

test('TC-INP-037 追加した行の初めの値', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  await edit.addLine()
  await edit.addDiscountLine()
  await expect(edit.lineRows).toHaveCount(3)

  // Row 0 is the initial item row; rows 1 and 2 are the added ones.
  const added = edit.line(1)
  await expect(added.quantityInput).toHaveValue('1')
  await expect(added.taxRateSelect.locator('option:checked')).toHaveText('10%')
  await expect(added.nameInput).toHaveValue('')
  await expect(added.unitPriceInput).toHaveValue('')

  const discount = edit.line(2)
  await expect(discount.taxRateSelect.locator('option:checked')).toHaveText('10%')
  await expect(discount.discountAmountInput).toHaveValue('')
})

test('TC-INP-038 保存データに明細が 21 行あるときの文言', async ({ page }) => {
  await setNow(page)
  const lines = Array.from({ length: 21 }, (_, i) => ({
    id: `line-${i + 1}`,
    kind: 'item',
    name: `品目${i + 1}`,
    quantity: '1',
    unitPrice: '1000',
    taxRate: 10,
  }))
  const data = {
    version: 1,
    quotes: [
      {
        id: 'seed-21-lines',
        status: 'draft',
        number: null,
        recipient: 'テスト商会（架空）',
        subject: '',
        lines,
        issuedOn: null,
        validUntil: null,
        invoiceId: null,
      },
    ],
    invoices: [],
    counters: { quote: 0, invoice: 0 },
  }
  await seedStorage(page, JSON.stringify(data))

  const edit = new QuoteEditPage(page)
  await edit.goto('seed-21-lines')

  await expect(edit.heading).toBeVisible()
  await expect(edit.lineRows).toHaveCount(21)
  await expect(edit.fieldError('明細は20行までです')).toBeVisible()
  await expect(edit.issueButton).toBeDisabled()
})

test('TC-INP-039 最後の 1 行も削除でき、0 行の誤りになる', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)

  await expect(edit.lineRows).toHaveCount(1)
  await edit.line(0).remove()

  await expect(edit.lineRows).toHaveCount(0)
  await expect(edit.fieldError('明細は1行以上入れてください')).toBeVisible()
})
