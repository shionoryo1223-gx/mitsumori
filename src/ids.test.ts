import { afterEach, describe, expect, it, vi } from 'vitest'
import { newId } from './ids'

describe('newId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns unique non-empty strings', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()))
    expect(ids.size).toBe(100)
    expect([...ids].every((id) => id.length > 0)).toBe(true)
  })

  it('works when crypto.randomUUID is unavailable (insecure context)', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    const a = newId()
    const b = newId()
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(a).not.toBe(b)
  })
})
