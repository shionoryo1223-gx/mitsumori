import type { AppData } from '../domain/types'
import { emptyData } from '../domain/workflow'

export interface KeyValueStorage {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export const STORAGE_KEY = 'mitsumori:v1'

export type LoadResult = { status: 'ok'; data: AppData } | { status: 'corrupted' }

function isFiniteNumber(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v)
}

function isAppData(v: unknown): v is AppData {
  if (typeof v !== 'object' || v === null) return false
  const d = v as Record<string, unknown>
  const c = d.counters as Record<string, unknown> | null | undefined
  return (
    d.version === 1 &&
    Array.isArray(d.quotes) &&
    Array.isArray(d.invoices) &&
    typeof c === 'object' &&
    c !== null &&
    isFiniteNumber(c.quote) &&
    isFiniteNumber(c.invoice)
  )
}

export function loadData(s: KeyValueStorage): LoadResult {
  try {
    const raw = s.getItem(STORAGE_KEY)
    if (raw === null) return { status: 'ok', data: emptyData() }
    const parsed: unknown = JSON.parse(raw)
    return isAppData(parsed) ? { status: 'ok', data: parsed } : { status: 'corrupted' }
  } catch {
    return { status: 'corrupted' }
  }
}

export function saveData(s: KeyValueStorage, d: AppData): boolean {
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(d))
    return true
  } catch {
    return false
  }
}

export function resetData(s: KeyValueStorage): void {
  try {
    s.removeItem(STORAGE_KEY)
  } catch {
    // Nothing more can be done if storage is unavailable.
  }
}

export function resolveStorage(get: () => KeyValueStorage): KeyValueStorage {
  try {
    return get()
  } catch {
    const fail = (): never => {
      throw new Error('storage unavailable')
    }
    return { getItem: fail, setItem: fail, removeItem: fail }
  }
}
