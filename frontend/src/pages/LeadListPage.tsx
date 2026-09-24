import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useLeads } from '../api/leads'
import { LEAD_STATUSES, type LeadStatus } from '../api/types'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorState, Loading } from '../components/StateViews'
import { StatusBadge } from '../components/StatusBadge'
import { STATUS_LABELS, formatDateTime, formatRelative } from '../lib/format'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import styles from './LeadListPage.module.css'

const PAGE_SIZE = 20

const isStatus = (v: string | null): v is LeadStatus => LEAD_STATUSES.includes(v as LeadStatus)

export function LeadListPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const statusParam = params.get('status')
  const status = isStatus(statusParam) ? statusParam : undefined

  const [searchInput, setSearchInput] = useState(params.get('search') ?? '')
  const search = useDebouncedValue(searchInput.trim())

  const update = (next: Record<string, string | undefined>) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(next)) {
          if (v) p.set(k, v)
          else p.delete(k)
        }
        return p
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if ((params.get('search') ?? '') !== search) update({ search: search || undefined, page: undefined })
  }, [search])

  const { data, error, isPending, isFetching, refetch } = useLeads({ page, limit: PAGE_SIZE, status, search })
  const navigate = useNavigate()
  const filtered = Boolean(status || search)

  return (
    <section>
      <div className={styles.titleRow}>
        <div>
          <h1>Leads</h1>
          <p className="muted">Leads received from Meta Ads, newest first.</p>
        </div>
        {isFetching && !isPending && <span className="muted">Refreshing…</span>}
      </div>

      <div className={`card ${styles.panel}`}>
        <div className={styles.filters}>
          <label className={styles.search}>
            <span className="visually-hidden">Search leads</span>
            <input
              type="search"
              placeholder="Search name, email, phone or lead ID"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          <label>
            <span className="visually-hidden">Filter by status</span>
            <select value={status ?? ''} onChange={(e) => update({ status: e.target.value || undefined, page: undefined })}>
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isPending ? (
          <Loading label="Loading leads…" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : data.data.length === 0 ? (
          <EmptyState title={filtered ? 'No leads match these filters' : 'No leads yet'}>
            {filtered
              ? 'Try a different search or status.'
              : 'Leads appear here as soon as the Meta webhook delivers them.'}
          </EmptyState>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Campaign</th>
                    <th scope="col">Status</th>
                    <th scope="col">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((lead) => (
                    <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} className={styles.row}>
                      <td>
                        <Link to={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()} className={styles.name}>
                          {lead.fullName ?? 'Unnamed lead'}
                        </Link>
                        <div className={`muted mono ${styles.sub}`}>{lead.externalId}</div>
                      </td>
                      <td>
                        <div>{lead.email ?? '—'}</div>
                        <div className={`muted ${styles.sub}`}>{lead.phone ?? ''}</div>
                      </td>
                      <td className="mono">{lead.campaignId ?? '—'}</td>
                      <td>
                        <StatusBadge status={lead.status} />
                      </td>
                      <td title={formatDateTime(lead.createdAt)}>{formatRelative(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onChange={(p) => update({ page: p > 1 ? String(p) : undefined })}
            />
          </>
        )}
      </div>
    </section>
  )
}
