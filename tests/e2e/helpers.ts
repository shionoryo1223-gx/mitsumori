import type { Page } from '@playwright/test'
import { QuoteEditPage } from './pages/QuoteEditPage.ts'
import { QuoteListPage } from './pages/QuoteListPage.ts'

export const STORAGE_KEY = 'mitsumori:v1'

// Default "now" for every test: 2026-11-21 10:00 JST.
export const DEFAULT_NOW = '2026-11-21T10:00:00+09:00'

// Fixes the browser clock. Call at the start of each test, before navigating.
export async function setNow(page: Page, iso: string = DEFAULT_NOW): Promise<void> {
  await page.clock.setFixedTime(new Date(iso))
}

// Moves the fixed clock to a later instant and reloads, as a user would open the app later.
export async function advanceTo(page: Page, iso: string): Promise<void> {
  await setNow(page, iso)
  await page.reload()
}

// Puts raw text into localStorage before the app starts (only for states the UI cannot make).
export async function seedStorage(page: Page, raw: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value)
    },
    { key: STORAGE_KEY, value: raw },
  )
}

// Opens the list, creates a new draft through the UI and returns its edit page.
export async function startDraft(page: Page): Promise<QuoteEditPage> {
  const list = new QuoteListPage(page)
  await list.goto()
  await list.newQuote()
  const edit = new QuoteEditPage(page)
  await edit.heading.waitFor()
  return edit
}

// Creates and issues a valid quote through the UI; leaves the page on the (issued) quote.
export async function createIssuedQuote(
  page: Page,
  values: { recipient?: string; name?: string; unitPrice?: string } = {},
): Promise<QuoteEditPage> {
  const edit = await startDraft(page)
  await edit.fillValidDraft(values)
  await edit.issue()
  await edit.statusCell.waitFor()
  return edit
}

// Opens a quote from the list by its recipient link (as the cases describe).
export async function openFromList(page: Page, recipient: string): Promise<QuoteEditPage> {
  const list = new QuoteListPage(page)
  await list.goto()
  await list.openByRecipient(recipient)
  const edit = new QuoteEditPage(page)
  await edit.heading.waitFor()
  return edit
}
