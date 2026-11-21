import { describe, expect, test } from 'vitest'
import { calculateTotals } from '@/domain/calc'
import { discount, item, items } from './helpers'

describe('計算（CALC）', () => {
  test('TC-CALC-001 端数は税率ごとに 1 回だけ切り捨てる（10%）', () => {
    const t = calculateTotals([
      item('l-1', { unitPrice: '19' }),
      item('l-2', { unitPrice: '19' }),
    ])
    expect(t.byRate[0]).toEqual({ rate: 10, base: 38, tax: 3 })
    expect(t.byRate[1]).toEqual({ rate: 8, base: 0, tax: 0 })
    expect(t.total).toBe(41)
  })

  test('TC-CALC-002 端数は税率ごとに 1 回だけ切り捨てる（8%）', () => {
    const t = calculateTotals([
      item('l-1', { unitPrice: '12', taxRate: 8 }),
      item('l-2', { unitPrice: '12', taxRate: 8 }),
    ])
    expect(t.byRate[1]).toEqual({ rate: 8, base: 24, tax: 1 })
    expect(t.byRate[0]).toEqual({ rate: 10, base: 0, tax: 0 })
    expect(t.total).toBe(25)
  })

  test('TC-CALC-003 税率ごとに別々に切り捨てて合計する', () => {
    const t = calculateTotals([
      item('l-1', { unitPrice: '19', taxRate: 10 }),
      item('l-2', { unitPrice: '12', taxRate: 8 }),
    ])
    expect(t.byRate[0]).toEqual({ rate: 10, base: 19, tax: 1 })
    expect(t.byRate[1]).toEqual({ rate: 8, base: 12, tax: 0 })
    expect(t.total).toBe(32)
  })

  test('TC-CALC-004 値引きを引いてから税額を出す', () => {
    const t = calculateTotals([item('l-1', { unitPrice: '1000' }), discount('d-1', { amount: '1' })])
    expect(t.byRate[0]).toEqual({ rate: 10, base: 999, tax: 99 })
    expect(t.total).toBe(1098)
  })

  test('TC-CALC-005 値引きは同じ税率の対象額から引く', () => {
    const t = calculateTotals([
      item('l-1', { unitPrice: '1000', taxRate: 10 }),
      item('l-2', { unitPrice: '1000', taxRate: 8 }),
      discount('d-1', { amount: '500', taxRate: 8 }),
    ])
    expect(t.byRate[0]).toEqual({ rate: 10, base: 1000, tax: 100 })
    expect(t.byRate[1]).toEqual({ rate: 8, base: 500, tax: 40 })
    expect(t.total).toBe(1640)
  })

  test('TC-CALC-006 入力した単価は税抜として扱う', () => {
    const t = calculateTotals([item('l-1', { unitPrice: '1000' })])
    expect(t.total).toBe(1100)
  })

  test('TC-CALC-007 値引きの超過で対象額がマイナスになるとき、税額は 0', () => {
    const t = calculateTotals([item('l-1', { unitPrice: '100' }), discount('d-1', { amount: '150' })])
    expect(t.byRate[0].base).toBe(-50)
    expect(t.byRate[0].tax).toBe(0)
    expect(t.total).toBe(-50)
  })

  test('TC-CALC-008 対象額が 0 のとき、税額は 0', () => {
    const t = calculateTotals([item('l-1', { unitPrice: '1000' }), discount('d-1', { amount: '1000' })])
    expect(t.byRate[0].base).toBe(0)
    expect(t.byRate[0].tax).toBe(0)
    expect(t.total).toBe(0)
  })

  test('TC-CALC-009 誤りの数量は 0 として数える', () => {
    // 「行の金額」は公開関数に出てこないため、合計側で 0 円になることを確かめる
    const t = calculateTotals([item('l-1', { quantity: 'abc', unitPrice: '1000' })])
    expect(t.byRate[0]).toEqual({ rate: 10, base: 0, tax: 0 })
    expect(t.total).toBe(0)
  })

  test('TC-CALC-010 空の単価・空の値引き額は 0 として数える', () => {
    const t1 = calculateTotals([item('l-1', { quantity: '5', unitPrice: '' })])
    expect(t1.byRate[0]).toEqual({ rate: 10, base: 0, tax: 0 })
    expect(t1.total).toBe(0)

    const t2 = calculateTotals([
      item('l-1', { quantity: '1', unitPrice: '1000' }),
      discount('d-1', { amount: '' }),
    ])
    expect(t2.byRate[0]).toEqual({ rate: 10, base: 1000, tax: 100 })
    expect(t2.total).toBe(1100)
  })

  test('TC-CALC-011 最大の入力（10%）が 1 円もずれない', () => {
    const t = calculateTotals(items(20, { quantity: '9999', unitPrice: '9999999', taxRate: 10 }))
    expect(t.byRate[0].base).toBe(1999799800020)
    expect(t.byRate[0].tax).toBe(199979980002)
    expect(t.total).toBe(2199779780022)
  })

  test('TC-CALC-012 最大の入力（8%）が 1 円もずれない', () => {
    const t = calculateTotals(items(20, { quantity: '9999', unitPrice: '9999999', taxRate: 8 }))
    expect(t.byRate[1].base).toBe(1999799800020)
    expect(t.byRate[1].tax).toBe(159983984001)
    expect(t.total).toBe(2159783784021)
  })
})
