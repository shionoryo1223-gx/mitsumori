import { describe, expect, it } from 'vitest'
import { parseInteger, textLength } from './parse'

describe('parseInteger', () => {
  it.each([
    ['12', 12],
    ['１２', 12],
    ['1,000', 1000],
    ['１，０００', 1000],
    [' 5 ', 5],
    ['　5　', 5],
    ['007', 7],
    ['0', 0],
  ])('reads %j as %d', (input, expected) => {
    expect(parseInteger(input)).toBe(expected)
  })

  it.each(['', '  ', '1.5', '-1', '+5', '1e3', 'abc', '12a'])('returns null for %j', (input) => {
    expect(parseInteger(input)).toBeNull()
  })
})

describe('textLength', () => {
  it('ignores surrounding whitespace', () => {
    expect(textLength('  あいう  ')).toBe(3)
    expect(textLength('　あ　')).toBe(1)
  })

  it('returns 0 for whitespace only', () => {
    expect(textLength('   ')).toBe(0)
  })

  it('counts an emoji sequence as one character', () => {
    expect(textLength('👨‍👩‍👧')).toBe(1)
  })

  it('counts plain characters one by one', () => {
    expect(textLength('あ'.repeat(50))).toBe(50)
  })
})
