import { describe, expect, it } from 'vitest'
import { onSingleClick } from './clicks'

describe('onSingleClick', () => {
  it('runs the action for a single click (detail 1)', () => {
    let n = 0
    onSingleClick(() => n++)(new MouseEvent('click', { detail: 1 }))
    expect(n).toBe(1)
  })
  it('runs the action for keyboard activation (detail 0)', () => {
    let n = 0
    onSingleClick(() => n++)(new MouseEvent('click', { detail: 0 }))
    expect(n).toBe(1)
  })
  it('ignores the second click of a double-click (detail 2)', () => {
    let n = 0
    onSingleClick(() => n++)(new MouseEvent('click', { detail: 2 }))
    expect(n).toBe(0)
  })
})
