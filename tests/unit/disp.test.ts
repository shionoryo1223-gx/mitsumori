import { describe, expect, test } from 'vitest'
import { formatDate, formatYen } from '@/format'

describe('表示（DISP）', () => {
  test('TC-DISP-001 金額の表示の形', () => {
    expect([0, 999, 1000, 999999, 1000000, 2199779780022].map(formatYen)).toEqual([
      '0円',
      '999円',
      '1,000円',
      '999,999円',
      '1,000,000円',
      '2,199,779,780,022円',
    ])
  })

  test('TC-DISP-002 日付の表示の形', () => {
    expect(formatDate('2026-11-21')).toBe('2026/11/21')
    expect(formatDate('2027-01-01')).toBe('2027/01/01')
  })

  test('TC-DISP-003 マイナスの金額の表示の形', () => {
    expect([-50, -200, -1000].map(formatYen)).toEqual(['-50円', '-200円', '-1,000円'])
  })
})
