import { expect, test } from '@playwright/test'
import { breakStorageWrites, seedStorage, setNow, startDraft } from './helpers.ts'
import { QuoteEditPage } from './pages/QuoteEditPage.ts'
import { QuoteListPage } from './pages/QuoteListPage.ts'

const RECIPIENT = 'テスト商会（架空）'

test('TC-STO-001 保存データがない状態で一覧を開く', async ({ page }) => {
  await setNow(page)
  const list = new QuoteListPage(page)
  await list.goto()

  await expect(list.emptyMessage).toBeVisible()
  await expect(list.rows).toHaveCount(0)
  await expect(list.sampleButton).toBeVisible()
})

test('TC-STO-002 入力のたびに自動保存され、保存ボタンはない', async ({ page }) => {
  await setNow(page)
  const edit = await startDraft(page)
  await edit.fillRecipient(RECIPIENT)
  await edit.fillSubject('4月分')

  await expect(edit.saveButtons).toHaveCount(0)

  await page.reload()
  const list = new QuoteListPage(page)
  await list.goto()
  await list.openByRecipient(RECIPIENT)

  await expect(edit.recipientInput).toHaveValue(RECIPIENT)
  await expect(edit.subjectInput).toHaveValue('4月分')
})

test('TC-STO-004 保存に失敗しても画面は止まらず、入力が残り、帯が出る', async ({ page }) => {
  await setNow(page)
  await breakStorageWrites(page)
  const edit = await startDraft(page)

  await edit.fillRecipient(RECIPIENT)

  await expect(edit.saveFailedAlert).toHaveText('保存できませんでした。')
  await expect(edit.recipientInput).toHaveValue(RECIPIENT)
  // The screen is still usable.
  await edit.fillSubject('4月分')
  await expect(edit.subjectInput).toHaveValue('4月分')
})

test('TC-STO-005 保存失敗の帯は消えずに出し続ける', async ({ page }) => {
  await setNow(page)
  await breakStorageWrites(page)
  const edit = await startDraft(page)
  await edit.fillRecipient(RECIPIENT)
  await expect(edit.saveFailedAlert).toHaveText('保存できませんでした。')

  await edit.fillSubject('4月分')

  await expect(edit.subjectInput).toHaveValue('4月分')
  await expect(edit.saveFailedAlert).toHaveText('保存できませんでした。')
})

test('TC-STO-007 壊れた保存データでは文言とボタンが出る', async ({ page }) => {
  await setNow(page)
  await seedStorage(page, '{壊れたデータ')
  const list = new QuoteListPage(page)
  await list.goto()

  await expect(list.corruptedMessage).toBeVisible()
  await expect(list.resetButton).toBeVisible()
})

test('TC-STO-008 「データを消して初めからやり直す」で空になり番号も戻る', async ({ page }) => {
  await setNow(page)
  await seedStorage(page, '{壊れたデータ')
  const list = new QuoteListPage(page)
  await list.goto()
  await list.resetData()

  await expect(list.emptyMessage).toBeVisible()

  await list.newQuote()
  const edit = new QuoteEditPage(page)
  await edit.fillValidDraft()
  await edit.issue()

  await expect(edit.quoteNumber).toHaveText('Q-0001')
})

test('TC-STO-010 「見本を入れる」で一覧に 3 件入る', async ({ page }) => {
  await setNow(page, '2026-11-21T10:00:00+09:00')
  const list = new QuoteListPage(page)
  await list.goto()
  await list.addSamples()

  await expect(list.rows).toHaveCount(3)
  const statuses = await list.rows.getByTestId('status').allTextContents()
  expect([...statuses].sort()).toEqual(['下書き', '発行済み', '請求済み'].sort())
  const recipients = await list.rows.getByRole('link').allTextContents()
  expect(recipients).toHaveLength(3)
  for (const recipient of recipients) {
    expect(recipient.endsWith('（架空）')).toBe(true)
  }
})
