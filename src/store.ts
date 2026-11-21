import { reactive } from 'vue'
import { systemClock } from './domain/clock'
import { todayJst } from './domain/dates'
import type { AppData, IsoDate, Quote } from './domain/types'
import * as workflow from './domain/workflow'
import { loadData, resetData, resolveStorage, saveData } from './storage/repository'
import { buildSampleData } from './storage/sampleData'

interface State {
  data: AppData
  loadStatus: 'ok' | 'corrupted'
  saveFailed: boolean
}

let state: State | null = null

function getState(): State {
  if (state === null) {
    const loaded = loadData(storage())
    state = reactive<State>({
      data: loaded.status === 'ok' ? loaded.data : workflow.emptyData(),
      loadStatus: loaded.status,
      saveFailed: false,
    })
  }
  return state
}

const storage = () => resolveStorage(() => window.localStorage)
const newId = (): string => crypto.randomUUID()
const today = (): IsoDate => todayJst(systemClock.now())

function persist(s: State): void {
  if (!saveData(storage(), s.data)) s.saveFailed = true
}

function apply(result: workflow.WorkflowResult): string | null {
  if (!result.ok) return null
  const s = getState()
  s.data = result.data
  persist(s)
  return result.id
}

export function useStore() {
  const s = getState()
  return {
    state: s,
    today,
    createDraft(): string {
      return apply(workflow.createDraft(s.data, newId)) ?? ''
    },
    updateDraft(id: string, update: (q: Quote) => Quote): void {
      apply(workflow.updateDraft(s.data, id, update))
    },
    deleteDraft(id: string): void {
      apply(workflow.deleteDraft(s.data, id))
    },
    issue(id: string): boolean {
      return apply(workflow.issueQuote(s.data, id, today())) !== null
    },
    invoice(id: string): string | null {
      return apply(workflow.createInvoice(s.data, id, today(), newId))
    },
    loadSample(): void {
      s.data = buildSampleData(today(), newId)
      persist(s)
    },
    reset(): void {
      resetData(storage())
      s.data = workflow.emptyData()
      s.loadStatus = 'ok'
      s.saveFailed = false
    },
  }
}
