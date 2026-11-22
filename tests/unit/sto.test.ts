import { describe, expect, test } from 'vitest'
import { loadData, saveData, STORAGE_KEY, type KeyValueStorage } from '@/storage/repository'
import { buildSampleData } from '@/storage/sampleData'
import { createDraft, emptyData, updateDraft } from '@/domain/workflow'
import { idGen, item, findQuote, unwrap } from './helpers'

function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => {
      m.set(k, v)
    },
    removeItem: (k) => {
      m.delete(k)
    },
  }
}

describe('保存（STO）', () => {
  test('TC-STO-003 誤りのある下書きも保存される', () => {
    const created = unwrap(createDraft(emptyData(), idGen()))
    const edited = unwrap(
      updateDraft(created.data, created.id, (q) => ({
        ...q,
        recipient: '',
        lines: [item('l-1', { quantity: 'abc' })],
      })),
    )
    const storage = memoryStorage()
    expect(saveData(storage, edited.data)).toBe(true)

    const loaded = loadData(storage)
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') return
    const q = findQuote(loaded.data, created.id)
    expect(q.recipient).toBe('')
    const line = q.lines[0]
    expect(line?.kind === 'item' ? line.quantity : undefined).toBe('abc')
    expect(loaded.data).toEqual(edited.data)
  })

  test('TC-STO-013 保存に失敗しても saveData は例外を投げず false を返す', () => {
    const failing: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
    }
    let result: boolean | undefined
    expect(() => {
      result = saveData(failing, emptyData())
    }).not.toThrow()
    expect(result).toBe(false)
  })

  test('TC-STO-014 保存データがないとき loadData は空のデータで ok を返す', () => {
    const loaded = loadData(memoryStorage())
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') return
    expect(loaded.data.version).toBe(1)
    expect(loaded.data.quotes).toEqual([])
    expect(loaded.data.invoices).toEqual([])
    expect(loaded.data.counters).toEqual({ quote: 0, invoice: 0 })
  })

  test('TC-STO-006 壊れた保存データを読めないと判定する', () => {
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, '{壊れたデータ')
    let result: ReturnType<typeof loadData> | undefined
    expect(() => {
      result = loadData(storage)
    }).not.toThrow()
    expect(result).toEqual({ status: 'corrupted' })
  })

  test('TC-STO-009 見本データの中身', () => {
    const today = '2026-11-21'
    const sample = buildSampleData(today, idGen())
    expect(sample.quotes).toHaveLength(3)
    const byStatus = (s: string) => sample.quotes.filter((q) => q.status === s)
    expect(byStatus('draft')).toHaveLength(1)
    expect(byStatus('issued')).toHaveLength(1)
    expect(byStatus('invoiced')).toHaveLength(1)

    expect(byStatus('issued')[0]?.issuedOn).toBe(today)
    const invoicedQuote = byStatus('invoiced')[0]
    expect(invoicedQuote?.issuedOn).toBe(today)
    const invoice = sample.invoices.find((i) => i.id === invoicedQuote?.invoiceId)
    expect(invoice).toBeDefined()
    expect(invoice?.invoicedOn).toBe(today)

    for (const q of sample.quotes) expect(q.recipient.endsWith('（架空）')).toBe(true)

    const lines = sample.quotes.flatMap((q) => q.lines)
    expect(lines.some((l) => l.kind === 'item' && l.taxRate === 10)).toBe(true)
    expect(lines.some((l) => l.kind === 'item' && l.taxRate === 8)).toBe(true)
    expect(lines.some((l) => l.kind === 'discount')).toBe(true)
  })
})
