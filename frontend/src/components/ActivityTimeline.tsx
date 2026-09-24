import type { FieldChanges, LeadActivity, LeadStatus } from '../api/types'
import { fieldLabel, formatActor, formatDateTime, formatRelative, formatValue } from '../lib/format'
import styles from './ActivityTimeline.module.css'
import { StatusBadge } from './StatusBadge'

const TITLES: Record<LeadActivity['type'], string> = {
  LEAD_CREATED: 'Lead created',
  LEAD_UPDATED: 'Lead updated',
  STATUS_CHANGED: 'Status changed',
}

function ChangeList({ changes }: { changes: FieldChanges }) {
  return (
    <dl className={styles.changes}>
      {Object.entries(changes).map(([field, { from, to }]) => (
        <div key={field} className={styles.change}>
          <dt>{fieldLabel(field)}</dt>
          <dd>
            <span className={styles.from}>{formatValue(from)}</span>
            <span aria-label="changed to"> → </span>
            <span>{formatValue(to)}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ActivityBody({ activity }: { activity: LeadActivity }) {
  const { type, changes, metadata } = activity

  if (type === 'STATUS_CHANGED' && changes?.status) {
    return (
      <>
        <div className={styles.statusChange}>
          <StatusBadge status={changes.status.from as LeadStatus} />
          <span aria-label="changed to">→</span>
          <StatusBadge status={changes.status.to as LeadStatus} />
        </div>
        {typeof metadata?.note === 'string' && <blockquote className={styles.note}>{metadata.note}</blockquote>}
      </>
    )
  }

  if (type === 'LEAD_UPDATED' && changes) return <ChangeList changes={changes} />

  if (type === 'LEAD_CREATED') {
    const ids = (['formId', 'adId', 'campaignId'] as const).filter((k) => metadata?.[k])
    return (
      <p className={styles.meta}>
        Received via {String(metadata?.source ?? 'webhook')}
        {ids.map((k) => (
          <span key={k}>
            {' · '}
            {fieldLabel(k)} <span className="mono">{String(metadata?.[k])}</span>
          </span>
        ))}
      </p>
    )
  }

  return null
}

export function ActivityTimeline({ activities }: { activities: LeadActivity[] }) {
  if (activities.length === 0) return <p className="muted">No activity yet.</p>

  return (
    <ol className={styles.timeline} aria-label="Activity timeline">
      {activities.map((a) => (
        <li key={a.id} className={styles.item} data-type={a.type}>
          <span className={styles.dot} aria-hidden="true" />
          <div className={styles.content}>
            <div className={styles.header}>
              <strong>{TITLES[a.type]}</strong>
              <span className="muted">by {formatActor(a.actor)}</span>
              <time className={`muted ${styles.time}`} dateTime={a.createdAt} title={formatDateTime(a.createdAt)}>
                {formatRelative(a.createdAt)}
              </time>
            </div>
            <ActivityBody activity={a} />
          </div>
        </li>
      ))}
    </ol>
  )
}
