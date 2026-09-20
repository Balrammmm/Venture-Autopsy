'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApiError, post } from '@/lib/client'
import { Button, ErrorNote, Spinner } from '@/components/ui/kit'

export default function DemoPage() {
  const router = useRouter()
  const started = useRef(false)
  const [error, setError] = useState<ApiError | null>(null)
  const open = useCallback(async () => {
    setError(null)
    try { const res = await post<{ ventureId: string }>('/api/demo'); router.replace(`/venture/${res.ventureId}`) }
    catch (err) { setError(err as ApiError) }
  }, [router])
  useEffect(() => { if (!started.current) { started.current = true; void open() } }, [open])
  return <main id="main" className="mx-auto max-w-xl px-6 py-24"><span className="label">THE WORKED EXAMPLE</span><h1 className="display mt-5 text-5xl">Opening the case file.</h1><p className="mt-4 text-paper-faint">Entering the demo workspace with its existing example analysis.</p>{error ? <ErrorNote className="mt-8" message={error.message} hint={error.hint} onRetry={open} /> : <div role="status" className="mt-8 flex items-center gap-3"><Spinner /> Loading the example</div>}<Link href="/ventures" className="mt-8 inline-block text-sm text-action-text">Go to ventures ↗</Link></main>
}
