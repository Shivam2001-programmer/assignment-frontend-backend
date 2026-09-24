import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { activity } from '../test/utils'
import { ActivityTimeline } from './ActivityTimeline'

describe('ActivityTimeline', () => {
  it('renders one entry per activity in the given order', () => {
    render(
      <ActivityTimeline
        activities={[
          activity({ type: 'STATUS_CHANGED', actor: 'user:shivam', changes: { status: { from: 'NEW', to: 'CONTACTED' } } }),
          activity({ type: 'LEAD_CREATED' }),
        ]}
      />,
    )
    const items = within(screen.getByRole('list', { name: 'Activity timeline' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Status changed')
    expect(items[0]).toHaveTextContent('by shivam')
    expect(items[1]).toHaveTextContent('Lead created')
    expect(items[1]).toHaveTextContent('by Meta webhook')
  })

  it('shows the from/to statuses and the note for a status change', () => {
    render(
      <ActivityTimeline
        activities={[
          activity({
            type: 'STATUS_CHANGED',
            changes: { status: { from: 'QUALIFIED', to: 'CONVERTED' } },
            metadata: { note: 'Signed a 12-month plan' },
          }),
        ]}
      />,
    )
    expect(screen.getByText('Qualified')).toBeInTheDocument()
    expect(screen.getByText('Converted')).toBeInTheDocument()
    expect(screen.getByText('Signed a 12-month plan')).toBeInTheDocument()
  })

  it('lists field-level changes for an update', () => {
    render(
      <ActivityTimeline
        activities={[
          activity({ type: 'LEAD_UPDATED', changes: { email: { from: 'old@x.com', to: 'new@x.com' }, phone: { from: null, to: '+91' } } }),
        ]}
      />,
    )
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('old@x.com')).toBeInTheDocument()
    expect(screen.getByText('new@x.com')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('handles an empty timeline', () => {
    render(<ActivityTimeline activities={[]} />)
    expect(screen.getByText('No activity yet.')).toBeInTheDocument()
  })
})
