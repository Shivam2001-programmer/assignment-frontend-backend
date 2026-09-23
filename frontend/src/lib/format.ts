import type { LeadStatus } from '../api/types'

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CONVERTED: 'Converted',
  LOST: 'Lost',
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Name',
  email: 'Email',
  phone: 'Phone',
  pageId: 'Page ID',
  formId: 'Form ID',
  adId: 'Ad ID',
  adsetId: 'Ad set ID',
  campaignId: 'Campaign ID',
  customFields: 'Form answers',
  submittedAt: 'Submitted at',
  status: 'Status',
}

export const fieldLabel = (field: string) =>
  FIELD_LABELS[field] ?? field.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function formatRelative(iso: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${fieldLabel(k)}: ${formatValue(v)}`)
      .join('; ')
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value)
  return String(value)
}

export function formatActor(actor: string) {
  const [kind, name = ''] = actor.split(':')
  if (kind === 'system') return name === 'meta-webhook' ? 'Meta webhook' : `System (${name})`
  return name === 'anonymous' ? 'Anonymous user' : name
}
