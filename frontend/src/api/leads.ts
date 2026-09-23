import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { LeadDetail, LeadSummary, ListLeadsParams, Paginated, UpdateStatusInput } from './types'

export const leadKeys = {
  all: ['leads'] as const,
  list: (params: ListLeadsParams) => ['leads', 'list', params] as const,
  detail: (id: string) => ['leads', 'detail', id] as const,
}

function toQuery(params: ListLeadsParams) {
  const qs = new URLSearchParams({ page: String(params.page), limit: String(params.limit) })
  if (params.status) qs.set('status', params.status)
  if (params.search) qs.set('search', params.search)
  return qs.toString()
}

export function useLeads(params: ListLeadsParams) {
  return useQuery({
    queryKey: leadKeys.list(params),
    queryFn: ({ signal }) => apiFetch<Paginated<LeadSummary>>(`/leads?${toQuery(params)}`, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: ({ signal }) => apiFetch<LeadDetail>(`/leads/${id}`, { signal }),
    refetchInterval: 30_000,
  })
}

export function useUpdateLeadStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateStatusInput) =>
      apiFetch<LeadDetail>(`/leads/${id}/status`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: (lead) => {
      qc.setQueryData(leadKeys.detail(id), lead)
      qc.invalidateQueries({ queryKey: ['leads', 'list'] })
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) })
    },
  })
}
