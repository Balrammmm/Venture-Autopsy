'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell, useSession } from '@/components/AppShell'
import { VentureCard, type VentureSummary } from '@/components/VentureCard'
import {
  Button,
  Chip,
  EmptyState,
  ErrorNote,
  IconArrow,
  IconPlus,
  Skeleton,
  Spinner,
  Textarea,
} from '@/components/ui/kit'
import { EXAMPLE_IDEAS } from '@/lib/demo-atlas'
import { ApiError, api, del, post } from '@/lib/client'

export default function VenturesPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()

  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [ventures, setVentures] = useState<VentureSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const [composing, setComposing] = useState(false)
  const [idea, setIdea] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<ApiError | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<{ ventures: VentureSummary[] }>(`/api/ventures?status=${tab}`)
      setVentures(data.ventures)
    } catch (err) {
      setError(err as ApiError)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  async function archive(id: string, archived: boolean) {
    await post(`/api/ventures/${id}/archive`, { archived })
    await load()
  }

  async function remove(id: string) {
    await del(`/api/ventures/${id}`)
    await load()
  }

  async function create() {
    if (idea.trim().length < 40) {
      setCreateError(new ApiError('Give the idea at least 40 characters.', 422, 'A fragment produces a generic analysis.'))
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const { venture } = await post<{ venture: { id: string } }>('/api/ventures', { rawIdea: idea.trim() })
      router.push(`/venture/${venture.id}?analyze=1`)
    } catch (err) {
      setCreateError(err as ApiError)
      setCreating(false)
    }
  }

  const showSkeleton = sessionLoading || (loading && !ventures)

  return (
    <AppShell
      user={user}
      breadcrumb={<span className="text-[14px] text-paper-dim">Ventures</span>}
      actions={
        !composing && (
          <Button variant="primary" size="sm" onClick={() => setComposing(true)}>
            <IconPlus size={14} />
            <span className="hidden sm:inline">New venture</span>
          </Button>
        )
      }
    >
      <div className="py-10 md:py-14">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div>
            <h1 className="display text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.0] text-paper">
              {user ? `${user.name.split(' ')[0]}'s ventures` : 'Ventures'}
            </h1>
            <p className="mt-2.5 max-w-measure text-[14px] text-paper-faint">
              Every idea you have put through the lab. Open one to return to its atlas.
            </p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="Venture status">
            <Chip active={tab === 'active'} onClick={() => setTab('active')}>
              Active
            </Chip>
            <Chip active={tab === 'archived'} onClick={() => setTab('archived')}>
              Archived
            </Chip>
          </div>
        </header>

        {/* Composer */}
        {composing && (
          <section className="mb-10 rounded-[3px] border border-[rgb(var(--paper)/0.14)] p-5">
            <label htmlFor="new-idea" className="label mb-2 block">
              The idea
            </label>
            <Textarea
              id="new-idea"
              rows={5}
              autoFocus
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Who is it for, what goes wrong for them today, and how would money actually arrive?"
            />
            <p className="mt-2 text-[12.5px] text-paper-faint" aria-live="polite">
              <span className="num font-mono text-paper-sub">{idea.trim().length}</span> characters
              {idea.trim().length > 0 && idea.trim().length < 40 && <span className="text-risk"> · 40 minimum</span>}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_IDEAS.map((ex) => (
                <Chip key={ex.label} onClick={() => setIdea(ex.idea)} title={ex.idea}>
                  {ex.label}
                </Chip>
              ))}
            </div>

            {createError && <ErrorNote className="mt-4" message={createError.message} hint={createError.hint} />}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="primary" size="md" onClick={create} disabled={creating}>
                {creating ? <Spinner /> : null}
                {creating ? 'Creating' : 'Build the atlas'}
                {!creating && <IconArrow size={15} />}
              </Button>
              <Button
                variant="quiet"
                size="md"
                onClick={() => {
                  setComposing(false)
                  setIdea('')
                  setCreateError(null)
                }}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
          </section>
        )}

        {/* States */}
        {showSkeleton ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading ventures">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-5 rounded-[3px] border border-[rgb(var(--paper)/0.1)] p-5">
                <Skeleton className="h-[76px] w-[76px] shrink-0 rounded-full md:h-[92px] md:w-[92px]" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="h-6 w-2/5" />
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3.5 w-3/5" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorNote message={error.message} hint={error.hint} onRetry={load} />
        ) : !ventures?.length ? (
          <EmptyState
            title={tab === 'archived' ? 'Nothing archived' : 'No ventures yet'}
            body={
              tab === 'archived'
                ? 'Archived ventures are kept here so you can bring one back without losing its atlas.'
                : 'Paste an idea and the lab will build an atlas around it — assumptions, failure modes, pivots, a business model and a plan for the next seven days.'
            }
            action={
              tab === 'active' && !composing ? (
                <Button variant="primary" size="md" onClick={() => setComposing(true)}>
                  <IconPlus size={15} />
                  Start a venture
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {ventures.map((v, i) => (
              <VentureCard key={v.id} venture={v} index={i} onArchive={archive} onDelete={remove} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
