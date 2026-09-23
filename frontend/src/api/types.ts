export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export type ActivityType = 'LEAD_CREATED' | 'LEAD_UPDATED' | 'STATUS_CHANGED'

export type FieldChanges = Record<string, { from: unknown; to: unknown }>

export interface LeadActivity {
  id: string
  leadId: string
  type: ActivityType
  actor: string
  changes: FieldChanges | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface LeadSummary {
  id: string
  source: string
  externalId: string
  fullName: string | null
  email: string | null
  phone: string | null
  campaignId: string | null
  formId: string | null
  status: LeadStatus
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LeadDetail extends LeadSummary {
  pageId: string | null
  adId: string | null
  adsetId: string | null
  customFields: Record<string, string | string[]>
  version: number
  activities: LeadActivity[]
  allowedTransitions: LeadStatus[]
}

export interface Paginated<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface ListLeadsParams {
  page: number
  limit: number
  status?: LeadStatus
  search?: string
}

export interface UpdateStatusInput {
  status: LeadStatus
  note?: string
  expectedVersion?: number
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown; requestId?: string }
}
