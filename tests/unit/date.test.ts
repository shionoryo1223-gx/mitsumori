import { describe, expect, test } from 'vitest'
import { addDays, endOfNextMonth, todayJst, VALID_DAYS } from '@/domain/dates'
import { allowedActions, createInvoice, displayStatus, issueQuote } from '@/domain/workflow'
import {
  addValidDraft,
  dataWith,
  findQuote,
  idGen,
  issuedQuote,
  unwrap,
  withTimeZone,
} from './helpers'

describe('日付（DATE）', () => {
  test('TC-DATE-001 有効期限は発行日の 30 日後（30 日の月）', () => {
    expect(addDays('2026-11-01', VALID_DAYS)).toBe('2026-12-01')
  })

  test('TC-DATE-002 有効期限：年またぎの境目', () => {
    expect(addDays('2026-12-01', VALID_DAYS)).toBe('2026-12-31')
    expect(addDays('2026-12-02', VALID_DAYS)).toBe('2027-01-01')
  })

  test('TC-DATE-003 有効期限：平年の 2 月をまたぐ', () => {
    expect(addDays('2027-01-31', VALID_DAYS)).toBe('2027-03-02')
  })

  test('TC-DATE-004 有効期限：うるう年の 2 月', () => {
    expect(addDays('2028-01-30', VALID_DAYS)).toBe('2028-02-29')
    expect(addDays('2028-01-31', VALID_DAYS)).toBe('2028-03-01')
    expect(addDays('2028-02-29', VALID_DAYS)).toBe('2028-03-30')
  })

  test('TC-DATE-005 支払期限は請求日の翌月の末日（月の初日）', () => {
    expect(endOfNextMonth('2026-11-01')).toBe('2026-12-31')
  })

  test('TC-DATE-006 支払期限：平年の 2 月', () => {
    expect(endOfNextMonth('2027-01-31')).toBe('2027-02-28')
  })

  test('TC-DATE-007 支払期限：うるう年の 2 月とうるう日', () => {
    expect(endOfNextMonth('2028-01-31')).toBe('2028-02-29')
    expect(endOfNextMonth('2028-02-29')).toBe('2028-03-31')
  })

  test('TC-DATE-008 支払期限：31 日の月から 30 日の月', () => {
    expect(endOfNextMonth('2027-03-31')).toBe('2027-04-30')
  })

  test('TC-DATE-009 支払期限：12 月の請求は翌年の 1 月末', () => {
    expect(endOfNextMonth('2026-12-15')).toBe('2027-01-31')
    expect(endOfNextMonth('2026-12-31')).toBe('2027-01-31')
  })

  test('TC-DATE-010 日本時間の日付が変わる前後の 1 秒（発行日）', () => {
    withTimeZone('Asia/Tokyo', () => {
      const newId = idGen()
      const { data, id } = addValidDraft(dataWith(), newId)
      // (1) 日本時間 2026-11-20 23:59:59
      const r1 = unwrap(issueQuote(data, id, todayJst(new Date('2026-11-20T23:59:59+09:00'))))
      expect(findQuote(r1.data, id).issuedOn).toBe('2026-11-20')
      // (2) 日本時間 2026-11-21 00:00:00
      const r2 = unwrap(issueQuote(data, id, todayJst(new Date('2026-11-21T00:00:00+09:00'))))
      expect(findQuote(r2.data, id).issuedOn).toBe('2026-11-21')
    })
  })

  test('TC-DATE-011 端末が UTC でも「今日」は日本時間', () => {
    withTimeZone('UTC', () => {
      const { data, id } = addValidDraft(dataWith(), idGen())
      const today = todayJst(new Date('2026-11-20T15:00:00Z'))
      const r = unwrap(issueQuote(data, id, today))
      const q = findQuote(r.data, id)
      expect(q.issuedOn).toBe('2026-11-21')
      expect(q.validUntil).toBe('2026-12-21')
    })
  })

  test('TC-DATE-012 端末が UTC でも請求日は日本時間で決まる', () => {
    withTimeZone('UTC', () => {
      const q = issuedQuote('2026-11-21', '2026-12-21')
      const data = dataWith([q], { quote: 1, invoice: 0 })
      const today = todayJst(new Date('2026-11-30T15:00:00Z'))
      const r = unwrap(createInvoice(data, q.id, today, idGen()))
      const inv = r.data.invoices.find((i) => i.id === r.id)
      expect(inv?.invoicedOn).toBe('2026-12-01')
      expect(inv?.dueOn).toBe('2027-01-31')
    })
  })

  test('TC-DATE-013 有効期限の当日の最後の 1 秒は請求書にできる', () => {
    withTimeZone('Asia/Tokyo', () => {
      const q = issuedQuote('2026-11-01', '2026-12-01')
      const today = todayJst(new Date('2026-12-01T23:59:59+09:00'))
      expect(displayStatus(q, today)).toBe('issued')
      expect(allowedActions(q, today).invoice).toBe(true)
    })
  })

  test('TC-DATE-014 有効期限の翌日の最初の 1 秒から期限切れ', () => {
    withTimeZone('Asia/Tokyo', () => {
      const q = issuedQuote('2026-11-01', '2026-12-01')
      const today = todayJst(new Date('2026-12-02T00:00:00+09:00'))
      expect(displayStatus(q, today)).toBe('expired')
      expect(allowedActions(q, today).invoice).toBe(false)
    })
  })

  test('TC-DATE-015 端末が UTC のとき、日本時間の翌日 0 時から期限切れ', () => {
    withTimeZone('UTC', () => {
      const q = issuedQuote('2026-11-01', '2026-12-01')
      const today = todayJst(new Date('2026-12-01T15:00:00Z'))
      expect(displayStatus(q, today)).toBe('expired')
    })
  })

  test('TC-DATE-016 端末が日本より進んだ時刻帯でも期限当日は期限内', () => {
    withTimeZone('Pacific/Auckland', () => {
      const q = issuedQuote('2026-11-01', '2026-12-01')
      const today = todayJst(new Date('2026-12-01T23:59:59+09:00'))
      expect(displayStatus(q, today)).toBe('issued')
      expect(allowedActions(q, today).invoice).toBe(true)
    })
  })
})
