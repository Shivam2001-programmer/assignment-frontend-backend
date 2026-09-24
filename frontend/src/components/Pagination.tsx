import styles from './Pagination.module.css'

interface Props {
  page: number
  totalPages: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, onChange }: Props) {
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <span className="muted">
        {total} lead{total === 1 ? '' : 's'} · page {page} of {totalPages}
      </span>
      <div className={styles.buttons}>
        <button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ← Previous
        </button>
        <button className="btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next →
        </button>
      </div>
    </nav>
  )
}
