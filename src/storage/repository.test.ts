import { describe, expect, it } from 'vitest'
import { emptyData } from '../domain/workflow'
import type { AppData } from '../domain/types'
import { loadData, resetData, saveData, STORAGE_KEY, type KeyValueStorage } from './repository'

function fakeStorage(initial?: string): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  if (initial !== undefined) map.set(STORAGE_KEY, initial)
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

const throwing = (): never => {
  throw new Error('denied')
}

describe('loadData', () => {
  it('returns empty data when nothing is stored', () => {
    expect(loadData(fakeStorage())).toEqual({ status: 'ok', data: emptyData() })
  })

  it('reports corrupted for invalid JSON', () => {
    expect(loadData(fakeStorage('not json'))).toEqual({ status: 'corrupted' })
  })

  it('reports corrupted for a wrong version or shape', () => {
    expect(loadData(fakeStorage('{"version":2}'))).toEqual({ status: 'corrupted' })
    expect(loadData(fakeStorage('null'))).toEqual({ status: 'corrupted' })
    expect(
      loadData(fakeStorage('{"version":1,"quotes":{},"invoices":[],"counters":{"quote":0,"invoice":0}}')),
    ).toEqual({ status: 'corrupted' })
    expect(
      loadData(fakeStorage('{"version":1,"quotes":[],"invoices":[],"counters":{"quote":"1","invoice":0}}')),
    ).toEqual({ status: 'corrupted' })
    expect(loadData(fakeStorage('{"version":1,"quotes":[],"invoices":[]}'))).toEqual({
      status: 'corrupted',
    })
  })

  it('reports corrupted when getItem throws', () => {
    const s: KeyValueStorage = { getItem: throwing, setItem: throwing, removeItem: throwing }
    expect(loadData(s)).toEqual({ status: 'corrupted' })
  })
})

describe('saveData', () => {
  it('round-trips data under the public key', () => {
    const s = fakeStorage()
    const data: AppData = { ...emptyData(), counters: { quote: 3, invoice: 1 } }
    expect(saveData(s, data)).toBe(true)
    expect(s.map.has('mitsumori:v1')).toBe(true)
    expect(loadData(s)).toEqual({ status: 'ok', data })
  })

  it('returns false when setItem throws', () => {
    const s: KeyValueStorage = {
      getItem: () => null,
      setItem: throwing,
      removeItem: () => undefined,
    }
    expect(saveData(s, emptyData())).toBe(false)
  })
})

describe('resetData', () => {
  it('removes the stored value', () => {
    const s = fakeStorage('{}')
    resetData(s)
    expect(s.map.size).toBe(0)
  })

  it('ignores errors from removeItem', () => {
    const s: KeyValueStorage = { getItem: () => null, setItem: throwing, removeItem: throwing }
    expect(() => resetData(s)).not.toThrow()
  })
})
