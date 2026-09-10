import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { GeminiError } from './gemini'
import { Unauthorized } from './auth'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400, hint?: string) {
  return NextResponse.json({ error: message, hint }, { status })
}

/**
 * One error shape for every route: { error, hint }. The client renders `hint`
 * as the recovery line, so failures always say what to do next.
 */
export function handle(err: unknown) {
  if (err instanceof Unauthorized) return fail('You need to sign in.', 401, 'Open the app and use the demo sign-in.')
  if (err instanceof GeminiError) return fail(err.message, err.status, err.hint)
  if (err instanceof ZodError) {
    const first = err.errors[0]
    return fail(first ? `${first.path.join('.')}: ${first.message}` : 'Invalid request.', 422)
  }
  if (err instanceof Error && err.name === 'NotFound') {
    return fail('Not found.', 404, 'It may have been deleted from this device.')
  }
  console.error('[api]', err)
  return fail('Something went wrong on the server.', 500, 'Check the server logs for detail.')
}

/** Analysis rows store JSON strings; this keeps the parsing in one place. */
export function parseData<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
