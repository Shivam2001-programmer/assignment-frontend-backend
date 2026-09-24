import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import type { LeadActivity, LeadDetail } from '../api/types'

export function renderRoute(ui: ReactElement, { path = '/', url = '/' } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export function mockFetch(routes: Record<string, (init?: RequestInit) => [number, unknown]>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost')
    const key = `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api/, '')}`
    const handler = routes[key]
    if (!handler) return json(404, { error: { code: 'NOT_MOCKED', message: key } })
    const [status, body] = handler(init)
    return json(status, body)
  })
}

export const activity = (o: Partial<LeadActivity>): LeadActivity => ({
  id: crypto.randomUUID(),
  leadId: 'lead-1',
  type: 'LEAD_CREATED',
  actor: 'system:meta-webhook',
  changes: null,
  metadata: null,
  createdAt: new Date().toISOString(),
  ...o,
})

export const leadDetail = (o: Partial<LeadDetail> = {}): LeadDetail => ({
  id: 'lead-1',
  source: 'meta',
  externalId: 'lg_1',
  fullName: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+919876543210',
  campaignId: 'cmp_1',
  formId: 'form_1',
  pageId: 'page_1',
  adId: 'ad_1',
  adsetId: 'adset_1',
  customFields: { city: 'Pune' },
  status: 'NEW',
  version: 1,
  submittedAt: '2026-09-20T10:00:00.000Z',
  createdAt: '2026-09-20T10:00:05.000Z',
  updatedAt: '2026-09-20T10:00:05.000Z',
  allowedTransitions: ['CONTACTED', 'QUALIFIED', 'LOST'],
  activities: [activity({ metadata: { source: 'meta', formId: 'form_1' } })],
  ...o,
})
