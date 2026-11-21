export function parseInteger(input: string): number | null {
  const text = input.normalize('NFKC').trim().replace(/,/g, '')
  return /^\d+$/.test(text) ? Number(text) : null
}

const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' })

export function textLength(input: string): number {
  let count = 0
  for (const _ of segmenter.segment(input.trim())) count++
  return count
}
