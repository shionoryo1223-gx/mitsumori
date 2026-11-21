import { calculateTotals } from './calc'
import { parseInteger, textLength } from './parse'
import type { Quote } from './types'

export interface LineErrors {
  name?: string
  quantity?: string
  unitPrice?: string
  amount?: string
}
export interface ValidationResult {
  ok: boolean
  fields: { recipient?: string; subject?: string }
  lines: Record<string, LineErrors>
  form: string[]
}

export const MAX_LINES = 20

function inRange(input: string, min: number, max: number): boolean {
  const n = parseInteger(input)
  return n !== null && n >= min && n <= max
}

export function validateQuote(quote: Quote): ValidationResult {
  const fields: ValidationResult['fields'] = {}
  const lines: Record<string, LineErrors> = {}
  const form: string[] = []

  const recipientLength = textLength(quote.recipient)
  if (recipientLength === 0) fields.recipient = '宛先を入力してください'
  else if (recipientLength > 50) fields.recipient = '宛先は50文字以内にしてください'
  if (textLength(quote.subject) > 50) fields.subject = '件名は50文字以内にしてください'

  for (const line of quote.lines) {
    const errors: LineErrors = {}
    if (line.kind === 'item') {
      const nameLength = textLength(line.name)
      if (nameLength === 0) errors.name = '品名を入力してください'
      else if (nameLength > 40) errors.name = '品名は40文字以内にしてください'
      if (!inRange(line.quantity, 1, 9999)) errors.quantity = '数量は1〜9,999の整数で入力してください'
      if (!inRange(line.unitPrice, 0, 9999999))
        errors.unitPrice = '単価は0〜9,999,999の整数で入力してください'
    } else if (!inRange(line.amount, 1, 9999999)) {
      errors.amount = '値引き額は1〜9,999,999の整数で入力してください'
    }
    if (Object.keys(errors).length > 0) lines[line.id] = errors
  }

  if (quote.lines.length === 0) form.push('明細は1行以上入れてください')
  else if (quote.lines.length > MAX_LINES) form.push('明細は20行までです')

  for (const { rate, base } of calculateTotals(quote.lines).byRate) {
    if (base < 0) form.push(`${rate}%の値引きが、${rate}%の明細の合計を超えています`)
  }

  const ok = Object.keys(fields).length === 0 && Object.keys(lines).length === 0 && form.length === 0
  return { ok, fields, lines, form }
}

export function countErrors(result: ValidationResult): number {
  const lineMessages = Object.values(result.lines).reduce(
    (sum, errors) => sum + Object.keys(errors).length,
    0,
  )
  return Object.keys(result.fields).length + lineMessages + result.form.length
}
