import { parseCsv } from './csv'

export type CaseMethod = '自動-単体' | '自動-画面' | '手動'
export type CasePriority = '高' | '中' | '低'

export interface TestCase {
  id: string
  specRef: string
  viewpoint: string
  technique: string
  precondition: string
  steps: string
  expected: string
  method: CaseMethod
  priority: CasePriority
  manualResult: string
}

const HEADER = ['ID', '仕様の項目', '観点', '技法', '前提', '手順', '期待結果', '実施方法', '優先度', '手動の結果']
const METHODS: readonly string[] = ['自動-単体', '自動-画面', '手動']
const PRIORITIES: readonly string[] = ['高', '中', '低']

export function parseCases(text: string): TestCase[] {
  const rows = parseCsv(text)
  const header = rows[0] ?? []
  if (header.length !== HEADER.length || header.some((h, i) => h !== HEADER[i])) {
    throw new Error(`cases.csv header mismatch (見出しが違います): expected "${HEADER.join(',')}" but got "${header.join(',')}"`)
  }
  return rows.slice(1).map((r, index) => {
    const rowNumber = index + 2 // 1-based, header is row 1
    if (r.length !== HEADER.length) {
      throw new Error(`cases.csv row ${rowNumber}: expected ${HEADER.length} fields but got ${r.length}`)
    }
    const [id = '', specRef = '', viewpoint = '', technique = '', precondition = '', steps = '', expected = '', method = '', priority = '', manualResult = ''] = r
    if (!METHODS.includes(method)) {
      throw new Error(`cases.csv ${id}: invalid 実施方法 "${method}"`)
    }
    if (!PRIORITIES.includes(priority)) {
      throw new Error(`cases.csv ${id}: invalid 優先度 "${priority}"`)
    }
    return {
      id, specRef, viewpoint, technique, precondition, steps, expected,
      method: method as CaseMethod,
      priority: priority as CasePriority,
      manualResult,
    }
  })
}
