import type { IsoDate } from './types'

export const VALID_DAYS = 30

const jstFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const pad = (n: number): string => String(n).padStart(2, '0')

const toIsoDate = (date: Date): IsoDate =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`

const parseIsoDate = (date: IsoDate): Date => {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function todayJst(now: Date): IsoDate {
  const parts = jstFormatter.formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(date)
  return toIsoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days)))
}

export function endOfNextMonth(date: IsoDate): IsoDate {
  const d = parseIsoDate(date)
  return toIsoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 0)))
}
