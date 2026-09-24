import { Link, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useLead } from '../api/leads'
import type { LeadDetail } from '../api/types'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { EmptyState, ErrorState, Loading } from '../components/StateViews'
import { StatusBadge } from '../components/StatusBadge'
import { StatusChanger } from '../components/StatusChanger'
import { fieldLabel, formatDateTime, formatValue } from '../lib/format'
import styles from './LeadDetailPage.module.css'

function Field({ label, value, mono }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined}>{formatValue(value)}</dd>
    </div>
  )
}

function LeadInfo({ lead }: { lead: LeadDetail }) {
  const answers = Object.entries(lead.customFields)
  return (
    <>
      <section className={`card ${styles.section}`}>
        <h2>Contact</h2>
        <dl className={styles.grid}>
          <Field label="Name" value={lead.fullName} />
          <Field label="Email" value={lead.email} />
          <Field label="Phone" value={lead.phone} />
          <Field label="Submitted" value={lead.submittedAt} />
        </dl>
      </section>

      {answers.length > 0 && (
        <section className={`card ${styles.section}`}>
          <h2>Form answers</h2>
          <dl className={styles.grid}>
            {answers.map(([k, v]) => (
              <Field key={k} label={fieldLabel(k)} value={v} />
            ))}
          </dl>
        </section>
      )}

      <section className={`card ${styles.section}`}>
        <h2>Attribution</h2>
        <dl className={styles.grid}>
          <Field label="Source" value={lead.source} />
          <Field label="Lead ID" value={lead.externalId} mono />
          <Field label="Campaign ID" value={lead.campaignId} mono />
          <Field label="Ad set ID" value={lead.adsetId} mono />
          <Field label="Ad ID" value={lead.adId} mono />
          <Field label="Form ID" value={lead.formId} mono />
          <Field label="Page ID" value={lead.pageId} mono />
        </dl>
      </section>
    </>
  )
}

export function LeadDetailPage() {
  const { id = '' } = useParams()
  const { data: lead, error, isPending, refetch } = useLead(id)

  if (isPending) return <Loading label="Loading lead…" />
  if (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return (
        <EmptyState title="Lead not found">
          <Link to="/leads">Back to all leads</Link>
        </EmptyState>
      )
    }
    return <ErrorState error={error} onRetry={() => refetch()} />
  }

  return (
    <article>
      <Link to="/leads" className={styles.back}>
        ← All leads
      </Link>

      <header className={styles.header}>
        <div>
          <h1>{lead.fullName ?? 'Unnamed lead'}</h1>
          <p className="muted">
            Received {formatDateTime(lead.createdAt)} · last updated {formatDateTime(lead.updatedAt)}
          </p>
        </div>
        <StatusBadge status={lead.status} />
      </header>

      <div className={styles.layout}>
        <div className={styles.column}>
          <LeadInfo lead={lead} />
        </div>

        <div className={styles.column}>
          <section className={`card ${styles.section}`}>
            <h2>Update status</h2>
            <StatusChanger lead={lead} />
          </section>

          <section className={`card ${styles.section}`}>
            <h2>Activity</h2>
            <ActivityTimeline activities={lead.activities} />
          </section>
        </div>
      </div>
    </article>
  )
}
