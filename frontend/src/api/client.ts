import type { ApiErrorBody } from './types'

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, body: Partial<ApiErrorBody> | null) {
    super(body?.error?.message ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = body?.error?.code ?? 'UNKNOWN'
    this.details = body?.error?.details
  }
}

let actor = ''

export const setActor = (name: string) => {
  actor = name.trim()
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (actor) headers.set('X-Actor', actor)

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  const body = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null

  if (!res.ok) throw new ApiError(res.status, body)
  return body as T
}
