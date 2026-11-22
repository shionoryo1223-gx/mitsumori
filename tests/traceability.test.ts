import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const ID_PATTERN = /TC-[A-Z]+-\d{3}/g
// Test titles: test('…') / it('…') / test.skip('…') etc., with ', " or ` quotes.
const TITLE_PATTERN = /\b(?:test|it)(?:\.\w+)?\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g

function listFiles(dir: string, suffix: string): string[] {
  const absolute = join(root, dir)
  const found: string[] = []
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.name.endsWith(suffix)) found.push(path)
    }
  }
  walk(absolute)
  return found
}

// IDs are taken from test titles only, so IDs mentioned in comments do not count.
function idsInTitles(files: string[]): Set<string> {
  const ids = new Set<string>()
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    for (const title of source.matchAll(TITLE_PATTERN)) {
      for (const id of title[2]!.match(ID_PATTERN) ?? []) ids.add(id)
    }
  }
  return ids
}

// cases.csv fields can contain commas and newlines inside quotes, so the first column
// is read with a small quote-aware scanner instead of a plain split.
function readCases(): { id: string; method: string }[] {
  const text = readFileSync(join(root, 'tests/cases.csv'), 'utf8').replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else field += ch
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  const [header, ...body] = rows
  const idIndex = header!.indexOf('ID')
  const methodIndex = header!.indexOf('実施方法')
  if (idIndex < 0 || methodIndex < 0) throw new Error('cases.csv header lacks ID or 実施方法')
  return body
    .filter((r) => r.some((f) => f.trim() !== ''))
    .map((r) => ({ id: r[idIndex]!, method: r[methodIndex]! }))
}

const cases = readCases()
const methodOf = new Map(cases.map((c) => [c.id, c.method]))
const unitIds = idsInTitles(listFiles('tests/unit', '.test.ts'))
const screenIds = idsInTitles([
  ...listFiles('tests/e2e', '.spec.ts'),
  ...listFiles('tests/smoke', '.spec.ts'),
])

function casesBy(method: string): string[] {
  return cases.filter((c) => c.method === method).map((c) => c.id)
}

describe('traceability between tests/cases.csv and test code', () => {
  it('has no duplicate IDs in cases.csv', () => {
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const { id } of cases) {
      if (seen.has(id)) duplicates.add(id)
      seen.add(id)
    }
    expect([...duplicates], `Duplicate IDs: ${[...duplicates].join(', ')}`).toEqual([])
  })

  it('has every 自動-単体 case in tests/unit', () => {
    const missing = casesBy('自動-単体').filter((id) => !unitIds.has(id))
    expect(missing, `Missing in tests/unit: ${missing.join(', ')}`).toEqual([])
  })

  it('has every 自動-画面 case in tests/e2e or tests/smoke', () => {
    const missing = casesBy('自動-画面').filter((id) => !screenIds.has(id))
    expect(missing, `Missing in tests/e2e or tests/smoke: ${missing.join(', ')}`).toEqual([])
  })

  it('has only IDs in test code that exist in cases.csv with a matching 実施方法', () => {
    const problems: string[] = []
    for (const [ids, expected, where] of [
      [unitIds, '自動-単体', 'tests/unit'],
      [screenIds, '自動-画面', 'tests/e2e|smoke'],
    ] as const) {
      for (const id of ids) {
        const method = methodOf.get(id)
        if (method === undefined) problems.push(`${id} (in ${where}) is not in cases.csv`)
        else if (method !== expected) problems.push(`${id} (in ${where}) is ${method}, expected ${expected}`)
      }
    }
    expect(problems, `Mismatches:\n${problems.join('\n')}`).toEqual([])
  })
})
