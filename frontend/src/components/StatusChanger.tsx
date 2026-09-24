import { useState } from 'react'
import { ApiError } from '../api/client'
import { useUpdateLeadStatus } from '../api/leads'
import type { LeadDetail, LeadStatus } from '../api/types'
import { STATUS_LABELS } from '../lib/format'
import styles from './StatusChanger.module.css'

function errorMessage(error: Error) {
  if (error instanceof ApiError && error.status === 409) {
    return 'This lead was changed by someone else. The latest version has been loaded — please try again.'
  }
  return error.message
}

export function StatusChanger({ lead }: { lead: LeadDetail }) {
  const [next, setNext] = useState<LeadStatus | ''>('')
  const [note, setNote] = useState('')
  const mutation = useUpdateLeadStatus(lead.id)

  if (lead.allowedTransitions.length === 0) {
    return <p className="muted">{STATUS_LABELS[lead.status]} is a final status — no further changes.</p>
  }

  const selected = next && lead.allowedTransitions.includes(next) ? next : ''

  const submit = (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!selected) return
    mutation.mutate(
      { status: selected, note: note.trim() || undefined, expectedVersion: lead.version },
      {
        onSuccess: () => {
          setNext('')
          setNote('')
        },
      },
    )
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span>Move to</span>
        <select value={selected} onChange={(e) => setNext(e.target.value as LeadStatus)} required>
          <option value="" disabled>
            Select status…
          </option>
          {lead.allowedTransitions.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>
          Note <span className="muted">(optional)</span>
        </span>
        <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {mutation.error && (
        <p className={styles.error} role="alert">
          {errorMessage(mutation.error)}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={!selected || mutation.isPending}>
        {mutation.isPending ? 'Updating…' : 'Update status'}
      </button>
    </form>
  )
}
