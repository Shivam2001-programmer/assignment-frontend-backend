import type { LeadStatus } from '../api/types'
import { STATUS_LABELS } from '../lib/format'
import styles from './StatusBadge.module.css'

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={styles.badge} data-status={status}>
      {STATUS_LABELS[status]}
    </span>
  )
}
