'use client'

import { use, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AppShell, useSession } from '@/components/AppShell'
import { VentureNav } from '@/components/venture/Chrome'
import { Milo } from '@/components/venture/Milo'
import { useVenture, type ExperimentRow } from '@/components/venture/useVenture'
import {
  Button,
  Chip,
  EmptyState,
  ErrorNote,
  IconCheck,
  IconClose,
  IconFlask,
  IconPlus,
  IconTrash,
  Input,
  ScoreBar,
  Skeleton,
  Spinner,
  Textarea,
} from '@/components/ui/kit'

const STATUSES = ['planned', 'running', 'passed', 'failed', 'inconclusive'] as const
const KINDS = ['interview', 'fake_door', 'landing_page', 'concierge', 'survey', 'prototype'] as const

const STATUS_TONE: Record<string, string> = {
  planned: 'text-paper-faint',
  running: 'text-paper',
  passed: 'text-action-text',
  failed: 'text-risk',
  inconclusive: 'text-paper-dim',
}

const FILL: Record<string, number> = { planned: 0.12, running: 0.55, passed: 1, failed: 0.85, inconclusive: 0.4 }

/** A test tube whose fill and colour carry the experiment's state. */
function Tube({ status, kind }: { status: string; kind: string }) {
  const reduce = useReducedMotion()
  const fill = FILL[status] ?? 0.1
  const color = status === 'failed' ? 'rgb(var(--risk))' : status === 'passed' ? 'rgb(var(--action-text))' : 'rgb(var(--action-text))'
  const h = 96 * fill

  return (
    <svg viewBox="0 0 44 120" className="h-[120px] w-11 shrink-0" role="img" aria-label={`${kind} experiment, ${status}`}>
      <defs>
        <clipPath id={`tube-${kind}-${status}`}>
          <path d="M13 10h18v78a9 9 0 0 1-18 0V10Z" />
        </clipPath>
      </defs>
      <path d="M10 6h24" stroke="rgb(var(--paper)/0.42)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M13 10h18v78a9 9 0 0 1-18 0V10Z"
        fill="rgb(var(--paper)/0.03)"
        stroke="rgb(var(--paper)/0.3)"
        strokeWidth="1.2"
      />
      <g clipPath={`url(#tube-${kind}-${status})`}>
        <motion.rect
          x="13"
          width="18"
          initial={reduce ? false : { y: 106, height: 0 }}
          animate={{ y: 106 - h, height: h }}
          transition={{ duration: reduce ? 0 : 0.7, ease: [0.23, 1, 0.32, 1] }}
          fill={color}
          fillOpacity={status === 'planned' ? 0.25 : 0.55}
        />
        {status === 'failed' && (
          <path d="M13 46 L31 62 M31 46 L13 62" stroke="rgb(var(--risk))" strokeWidth="1.6" opacity="0.9" />
        )}
      </g>
      {[30, 50, 70, 90].map((y) => (
        <line key={y} x1="26" y1={y} x2="31" y2={y} stroke="rgb(var(--paper)/0.28)" strokeWidth="1" />
      ))}
      {status === 'passed' && <path d="M16 100 l4 4 8-9" stroke="rgb(var(--ink-800))" strokeWidth="2.4" fill="none" strokeLinecap="round" />}
    </svg>
  )
}

function ValidatePage({ id }: { id: string }) {
  const { user } = useSession()
  const v = useVenture(id)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<ExperimentRow>>({})
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newHypothesis, setNewHypothesis] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const experiments = v.data?.experiments ?? []
  const assumptions = v.data?.assumptions ?? []

  const filtered = useMemo(
    () => (filter === 'all' ? experiments : experiments.filter((e) => e.status === filter)),
    [experiments, filter],
  )

  const byId = useMemo(() => Object.fromEntries(assumptions.map((a) => [a.id, a])), [assumptions])

  if (v.loading) {
    return (
      <AppShell user={user} wide breadcrumb={<Skeleton className="h-4 w-40" />}>
        <div className="space-y-6 py-12" aria-busy="true">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </AppShell>
    )
  }

  if (v.error || !v.data) {
    return (
      <AppShell user={user} wide>
        <div className="py-16">
          <ErrorNote message={v.error?.message ?? 'Not found.'} hint={v.error?.hint} onRetry={v.reload} />
        </div>
      </AppShell>
    )
  }

  const { venture } = v.data
  const passed = experiments.filter((e) => e.status === 'passed').length
  const failed = experiments.filter((e) => e.status === 'failed').length

  return (
    <AppShell user={user} wide breadcrumb={<span className="truncate text-[14px] text-paper-dim">{venture.title}</span>}>
      <div className="rule-b sticky top-[57px] z-30 bg-ink-800/85 pt-6 backdrop-blur-xl">
        <VentureNav id={id} />
      </div>

      {v.actionError && (
        <ErrorNote className="mt-6" message={v.actionError.message} hint={v.actionError.hint} onRetry={v.clearActionError} />
      )}

      <section className="py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="display text-[clamp(1.9rem,4vw,2.9rem)] leading-[1.02] text-paper">Validation Lab</h1>
            <p className="mt-2 max-w-measure text-[13.5px] text-paper-faint">
              Every experiment names what would make it pass and what would kill it. Concluding one moves its
              assumption with it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="num font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-sub">
              <span className="text-action-text">{passed}</span> passed · <span className="text-risk">{failed}</span> failed ·{' '}
              {experiments.length} total
            </span>
            <Button variant="primary" size="sm" onClick={() => setAdding((a) => !a)} className="no-print">
              {adding ? <IconClose size={13} /> : <IconPlus size={13} />}
              {adding ? 'Cancel' : 'New experiment'}
            </Button>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-1.5">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </Chip>
          {STATUSES.map((s) => (
            <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
              {s}
            </Chip>
          ))}
        </div>

        {adding && (
          <div className="mb-10 rounded-[3px] border border-[rgb(var(--paper)/0.14)] p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="new-exp-name" className="label mb-1.5 block">
                  Name
                </label>
                <Input
                  id="new-exp-name"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="The Supply Call-Round"
                />
              </div>
              <div>
                <label htmlFor="new-exp-hyp" className="label mb-1.5 block">
                  Hypothesis
                </label>
                <Input
                  id="new-exp-hyp"
                  value={newHypothesis}
                  onChange={(e) => setNewHypothesis(e.target.value)}
                  placeholder="Five of fifteen trades will accept dispatch at a workable margin."
                />
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              disabled={newName.trim().length < 2 || newHypothesis.trim().length < 5}
              onClick={async () => {
                const okDone = await v.createExperiment({
                  name: newName.trim(),
                  hypothesis: newHypothesis.trim(),
                  kind: 'interview',
                })
                if (okDone) {
                  setNewName('')
                  setNewHypothesis('')
                  setAdding(false)
                }
              }}
            >
              <IconCheck size={13} />
              Create experiment
            </Button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            title={experiments.length ? `Nothing ${filter}` : 'No experiments yet'}
            body={
              experiments.length
                ? 'Change the filter to see the rest.'
                : 'Build the atlas and three experiments will be designed against your riskiest assumptions — or add your own.'
            }
            action={
              !experiments.length ? (
                <Button variant="primary" size="md" onClick={() => v.analyse(false)} disabled={v.analysing}>
                  {v.analysing ? <Spinner /> : null}
                  Build the atlas
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-5">
            {filtered.map((e) => {
              const isEditing = editing === e.id
              const assumption = e.assumptionId ? byId[e.assumptionId] : null
              return (
                <article
                  key={e.id}
                  className="rounded-[3px] border border-[rgb(var(--paper)/0.12)] bg-[rgb(var(--paper)/0.02)] p-5"
                >
                  <div className="flex flex-col gap-5 md:flex-row">
                    <Tube status={e.status} kind={e.kind} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <IconFlask size={15} className="text-paper-sub" />
                        <h3 className="display text-[1.4rem] leading-tight text-paper">{e.name}</h3>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-sub">
                          {e.kind.replace('_', ' ')}
                        </span>
                        <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${STATUS_TONE[e.status]}`}>
                          {e.status}
                        </span>
                      </div>

                      <p className="mt-2.5 max-w-measure text-[14px] leading-[1.62] text-paper-dim">{e.hypothesis}</p>

                      {assumption && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 border-l-2 border-[rgb(var(--paper)/0.2)] pl-3.5">
                          <p className="max-w-measure text-[12.5px] leading-[1.5] text-paper-faint">
                            Tests: {assumption.claim}
                          </p>
                          <ScoreBar value={assumption.impact} label="Impact" tone="ember" />
                        </div>
                      )}

                      {e.method && (
                        <div className="mt-4">
                          <p className="label mb-1">Method</p>
                          <p className="max-w-measure text-[13.5px] leading-[1.6] text-paper-dim">{e.method}</p>
                        </div>
                      )}

                      {e.script.length > 0 && (
                        <div className="mt-4">
                          <p className="label mb-2">Script</p>
                          <ol className="space-y-1.5">
                            {e.script.map((q, i) => (
                              <li key={i} className="flex gap-3 text-[13.5px] leading-[1.55] text-paper-dim">
                                <span aria-hidden="true" className="num mt-[2px] shrink-0 font-mono text-[10.5px] text-action-text">
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                {q}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="border-l-2 border-action pl-3.5">
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-action-text">Passes if</p>
                          <p className="mt-1 text-[13px] leading-[1.55] text-paper-dim">{e.successThreshold}</p>
                        </div>
                        <div className="border-l-2 border-risk pl-3.5">
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-risk">Fails if</p>
                          <p className="mt-1 text-[13px] leading-[1.55] text-paper-dim">{e.failThreshold}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[11px] text-paper-faint">
                        {e.sampleSize && <span className="num">{e.sampleSize}</span>}
                        {e.duration && <span className="num">{e.duration}</span>}
                        {e.cost && <span className="num">{e.cost}</span>}
                      </div>

                      {/* Recording the result */}
                      {isEditing ? (
                        <div className="mt-5 space-y-3">
                          <div>
                            <label htmlFor={`res-${e.id}`} className="label mb-1.5 block">
                              What actually happened
                            </label>
                            <Textarea
                              id={`res-${e.id}`}
                              rows={4}
                              value={draft.result ?? ''}
                              onChange={(ev) => setDraft((d) => ({ ...d, result: ev.target.value }))}
                              placeholder="Eleven of fifteen answered. Four would accept dispatch at 12%. Two asked to be listed only."
                            />
                          </div>
                          <div>
                            <label htmlFor={`url-${e.id}`} className="label mb-1.5 block">
                              Evidence link <span className="normal-case tracking-normal text-paper-sub">optional</span>
                            </label>
                            <Input
                              id={`url-${e.id}`}
                              value={draft.evidenceUrl ?? ''}
                              onChange={(ev) => setDraft((d) => ({ ...d, evidenceUrl: ev.target.value }))}
                              placeholder="https://"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={async () => {
                                await v.updateExperiment(e.id, {
                                  result: draft.result ?? '',
                                  evidenceUrl: draft.evidenceUrl ?? '',
                                })
                                setEditing(null)
                              }}
                            >
                              <IconCheck size={13} />
                              Save result
                            </Button>
                            <Button variant="quiet" size="sm" onClick={() => setEditing(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        e.result && (
                          <div className="mt-5 rounded-[3px] border border-[rgb(var(--paper)/0.12)] p-4">
                            <p className="label mb-1.5">Result</p>
                            <p className="max-w-measure whitespace-pre-wrap text-[13.5px] leading-[1.6] text-paper-dim">
                              {e.result}
                            </p>
                            {e.evidenceUrl && (
                              <a
                                href={e.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block break-all text-[12.5px] text-action-text underline decoration-action/40"
                              >
                                {e.evidenceUrl}
                              </a>
                            )}
                          </div>
                        )
                      )}

                      {/* Controls */}
                      <div className="no-print mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {STATUSES.map((s) => (
                            <Chip key={s} active={e.status === s} onClick={() => v.updateExperiment(e.id, { status: s })}>
                              {s}
                            </Chip>
                          ))}
                        </div>
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => {
                            setDraft({ result: e.result ?? '', evidenceUrl: e.evidenceUrl ?? '' })
                            setEditing(isEditing ? null : e.id)
                          }}
                        >
                          {e.result ? 'Edit result' : 'Record result'}
                        </Button>
                        <Button variant="quiet" size="sm" onClick={() => v.deleteExperiment(e.id)} aria-label={`Delete ${e.name}`}>
                          <IconTrash size={13} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <div className="pb-24" />
      <Milo ventureId={id} context="validate" mood={failed > 0 ? 'wary' : passed > 0 ? 'pleased' : 'idle'} />
    </AppShell>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ValidatePage id={id} />
}
