import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseCases } from './cases'

const HEADER = 'ID,仕様の項目,観点,技法,前提,手順,期待結果,実施方法,優先度,手動の結果'
const ROW = 'TC-X-001,S-1,観点,境界値分析,前提,"手順1,2",期待,自動-単体,高,'

describe('parseCases', () => {
  it('maps columns to fields', () => {
    expect(parseCases(`${HEADER}\n${ROW}\n`)).toEqual([
      {
        id: 'TC-X-001',
        specRef: 'S-1',
        viewpoint: '観点',
        technique: '境界値分析',
        precondition: '前提',
        steps: '手順1,2',
        expected: '期待',
        method: '自動-単体',
        priority: '高',
        manualResult: '',
      },
    ])
  })

  it('throws when the header differs', () => {
    expect(() => parseCases('ID,観点\nTC-X-001,a\n')).toThrow(/見出し|header/i)
  })

  it('throws with the row number when a row has the wrong number of fields', () => {
    expect(() => parseCases(`${HEADER}\n${ROW}\nTC-X-002,only\n`)).toThrow(/3/)
  })

  it('throws with the ID when method or priority is invalid', () => {
    expect(() => parseCases(`${HEADER}\n${ROW.replace('自動-単体', '半自動')}\n`)).toThrow(/TC-X-001/)
    expect(() => parseCases(`${HEADER}\n${ROW.replace(',高,', ',最高,')}\n`)).toThrow(/TC-X-001/)
  })

  it('parses the real tests/cases.csv', () => {
    const text = readFileSync('tests/cases.csv', 'utf8')
    expect(parseCases(text).length).toBeGreaterThan(0)
  })
})
