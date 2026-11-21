import type { DisplayStatus, IsoDate } from './domain/types'

export function formatYen(n: number): string {
  return n.toLocaleString('ja-JP') + '円'
}

export function formatDate(d: IsoDate): string {
  return d.replace(/-/g, '/')
}

const STATUS_LABELS: Record<DisplayStatus, string> = {
  draft: '下書き',
  issued: '発行済み',
  expired: '期限切れ',
  invoiced: '請求済み',
}

export function statusLabel(status: DisplayStatus): string {
  return STATUS_LABELS[status]
}
