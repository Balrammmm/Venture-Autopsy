'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export class ApiError extends Error {
  status: number
  hint?: string
  constructor(message: string, status: number, hint?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.hint = hint
  }
}

/** Every call funnels through here, so failures always carry a recovery hint. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    })
  } catch {
    throw new ApiError('Could not reach the server.', 0, 'Check that the dev server is still running.')
  }

  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }

  if (!res.ok) {
    const e = body as { error?: string; hint?: string } | null
    throw new ApiError(e?.error || `Request failed (${res.status}).`, res.status, e?.hint)
  }
  return body as T
}

export const post = <T,>(path: string, data?: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) })
export const patch = <T,>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) })
export const put = <T,>(path: string, data: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(data) })
export const del = <T,>(path: string) => api<T>(path, { method: 'DELETE' })

/** Small fetch hook: loading, error and refetch without pulling in a data library. */
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState<ApiError | null>(null)
  const alive = useRef(true)

  const load = useCallback(async () => {
    if (!path) return
    setLoading(true)
    setError(null)
    try {
      const result = await api<T>(path)
      if (alive.current) setData(result)
    } catch (err) {
      if (alive.current) setError(err as ApiError)
    } finally {
      if (alive.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  useEffect(() => {
    alive.current = true
    load()
    return () => {
      alive.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])

  return { data, loading, error, reload: load, setData }
}
