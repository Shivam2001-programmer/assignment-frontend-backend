import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { activity, leadDetail, mockFetch, renderRoute } from '../test/utils'
import { LeadDetailPage } from './LeadDetailPage'

const renderDetail = () => renderRoute(<LeadDetailPage />, { path: '/leads/:id', url: '/leads/lead-1' })

describe('LeadDetailPage', () => {
  it('shows lead details, form answers and the timeline', async () => {
    mockFetch({ 'GET /leads/lead-1': () => [200, leadDetail()] })
    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument()
    expect(screen.getByText('asha@example.com')).toBeInTheDocument()
    expect(screen.getByText('Pune')).toBeInTheDocument()
    expect(screen.getByText('Lead created')).toBeInTheDocument()
  })

  it('offers only allowed transitions and sends expectedVersion with the change', async () => {
    const updated = leadDetail({
      status: 'CONTACTED',
      version: 2,
      allowedTransitions: ['QUALIFIED', 'LOST'],
      activities: [
        activity({ type: 'STATUS_CHANGED', actor: 'user:anonymous', changes: { status: { from: 'NEW', to: 'CONTACTED' } } }),
        ...leadDetail().activities,
      ],
    })
    let sent: unknown
    mockFetch({
      'GET /leads/lead-1': () => [200, leadDetail()],
      'PATCH /leads/lead-1/status': (init) => {
        sent = JSON.parse(String(init?.body))
        return [200, updated]
      },
    })
    const user = userEvent.setup()
    renderDetail()

    const select = await screen.findByRole('combobox', { name: 'Move to' })
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value).filter(Boolean)
    expect(options).toEqual(['CONTACTED', 'QUALIFIED', 'LOST'])

    await user.selectOptions(select, 'CONTACTED')
    await user.type(screen.getByRole('textbox', { name: /note/i }), 'Called')
    await user.click(screen.getByRole('button', { name: 'Update status' }))

    expect(await screen.findByText('Status changed')).toBeInTheDocument()
    expect(sent).toEqual({ status: 'CONTACTED', note: 'Called', expectedVersion: 1 })
  })

  it('explains a version conflict', async () => {
    mockFetch({
      'GET /leads/lead-1': () => [200, leadDetail()],
      'PATCH /leads/lead-1/status': () => [409, { error: { code: 'CONFLICT', message: 'stale' } }],
    })
    const user = userEvent.setup()
    renderDetail()

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Move to' }), 'LOST')
    await user.click(screen.getByRole('button', { name: 'Update status' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/changed by someone else/i))
  })

  it('shows a not-found state for an unknown lead', async () => {
    mockFetch({})
    renderDetail()
    expect(await screen.findByText('Lead not found')).toBeInTheDocument()
  })

  it('marks CONVERTED as final', async () => {
    mockFetch({ 'GET /leads/lead-1': () => [200, leadDetail({ status: 'CONVERTED', allowedTransitions: [] })] })
    renderDetail()
    expect(await screen.findByText(/final status/i)).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
