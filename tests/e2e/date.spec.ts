import { expect, test } from '@playwright/test'
import { advanceTo, createIssuedQuote, openFromList, setNow } from './helpers.ts'

const RECIPIENT = 'テスト商会（架空）'

test('TC-DATE-017 画面：有効期限の当日は「請求書にする」を押せる', async ({ page }) => {
  await setNow(page, '2026-11-01T12:00:00+09:00')
  await createIssuedQuote(page)
  await advanceTo(page, '2026-12-01T23:59:59+09:00')

  const edit = await openFromList(page, RECIPIENT)

  await expect(edit.statusCell).toHaveText('発行済み')
  await expect(edit.validUntil).toHaveText('2026/12/01')
  await expect(edit.invoiceButton).toBeEnabled()
})

test('TC-DATE-018 画面：有効期限の翌日は期限切れになり押せない', async ({ page }) => {
  await setNow(page, '2026-11-01T12:00:00+09:00')
  await createIssuedQuote(page)
  await advanceTo(page, '2026-12-02T00:00:00+09:00')

  const edit = await openFromList(page, RECIPIENT)

  await expect(edit.statusCell).toHaveText('期限切れ')
  await expect(edit.invoiceButton).toBeDisabled()
  await expect(edit.invoiceDisabledReason).toBeVisible()
})

test.describe('端末の時刻帯が日本以外', () => {
  test.use({ timezoneId: 'America/Los_Angeles' })

  test('TC-DATE-019 画面：端末が米国西海岸の時刻帯でも日本時間で日付が決まる', async ({ page }) => {
    // JST 2026-12-01 00:30:00 = UTC 2026-11-30 15:30:00 = Los Angeles 2026-11-30 07:30.
    await setNow(page, '2026-12-01T00:30:00+09:00')
    const edit = await createIssuedQuote(page)

    await expect(edit.statusCell).toHaveText('発行済み')
    await expect(edit.issuedOn).toHaveText('2026/12/01')
    await expect(edit.validUntil).toHaveText('2026/12/31')
  })
})
