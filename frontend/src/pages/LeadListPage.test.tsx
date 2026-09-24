import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { LeadSummary, Paginated } from '../api/types'
import { leadDetail, mockFetch, renderRoute } from '../test/utils'
import { LeadListPage } from './LeadListPage'

const page = (data: LeadSummary[], total = data.length): Paginated<LeadSummary> => ({
  data,
  meta: { page: 1, limit: 20, total, totalPages: Math.max(1, Math.ceil(total / 20)) },
})

describe('LeadListPage', () => {
  it('lists leads with a link to each detail page', async () => {
    mockFetch({ 'GET /leads': () => [200, page([leadDetail(), leadDetail({ id: 'lead-2', fullName: null })])] })
    renderRoute(<LeadListPage />, { url: '/leads', path: '/leads' })

    expect(await screen.findByRole('link', { name: 'Asha Rao' })).toHaveAttribute('href', '/leads/lead-1')
    expect(screen.getByRole('link', { name: 'Unnamed lead' })).toHaveAttribute('href', '/leads/lead-2')
    expect(screen.getByText('2 leads · page 1 of 1')).toBeInTheDocument()
  })

  it('passes the status filter to the API', async () => {
    const fetch = mockFetch({ 'GET /leads': () => [200, page([])] })
    const user = userEvent.setup()
    renderRoute(<LeadListPage />, { url: '/leads', path: '/leads' })

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filter by status' }), 'QUALIFIED')

    await waitFor(() => expect(String(fetch.mock.lastCall?.[0])).toContain('status=QUALIFIED'))
    expect(await screen.findByText('No leads match these filters')).toBeInTheDocument()
  })

  it('shows an empty state explaining where leads come from', async () => {
    mockFetch({ 'GET /leads': () => [200, page([])] })
    renderRoute(<LeadListPage />, { url: '/leads', path: '/leads' })
    expect(await screen.findByText('No leads yet')).toBeInTheDocument()
  })

  it('shows an error state with retry', async () => {
    mockFetch({ 'GET /leads': () => [500, { error: { code: 'INTERNAL_ERROR', message: 'Database unavailable' } }] })
    renderRoute(<LeadListPage />, { url: '/leads', path: '/leads' })
    expect(await screen.findByText('Database unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
