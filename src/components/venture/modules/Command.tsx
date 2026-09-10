'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Button, Chip, IconAlert, IconArrow, IconCheck, IconClose, Input, ScoreBar, Textarea } from '@/components/ui/kit'
import type { FailureExhibit, Genome, Pivot } from '@/lib/atlas-types'
import type { AssumptionRow } from '../useVenture'

const EASE = [0.23, 1, 0.32, 1] as const

/* ================================================================== *
 * Idea Genome — an orbit of the six parts, linked by dependency.
 * ================================================================== */

const KIND_LABEL: Record<string, string> = {
  customer: 'Customer',
  pain: 'Pain',
  solution: 'Solution',
  revenue: 'Revenue',
  distribution: 'Distribution',
  advantage: 'Advantage',
}

const ORDER = ['customer', 'pain', 'solution', 'revenue', 'distribution', 'advantage']

export function IdeaGenome({ genome }: { genome: Genome }) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState<string | null>(genome.nodes[0]?.id ?? null)

  // Weak parts orbit further out, so the shape itself shows what is unresolved.
  const placed = useMemo(() => {
    const sorted = [...genome.nodes].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
    return sorted.map((n, i) => {
      const a = (i / Math.max(1, sorted.length)) * Math.PI * 2 - Math.PI / 2
      const radius = 92 + (5 - Math.min(5, Math.max(1, n.strength))) * 16
      return { ...n, x: 160 + Math.cos(a) * radius, y: 160 + Math.sin(a) * radius }
    })
  }, [genome.nodes])

  const byId = useMemo(() => Object.fromEntries(placed.map((p) => [p.id, p])), [placed])
  const activeNode = placed.find((p) => p.id === active) ?? placed[0]

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-14">
      <div>
        <svg
          viewBox="0 0 320 320"
          className="w-full max-w-[380px]"
          role="img"
          aria-label="The six parts of the idea arranged in an orbit. Each part is listed beside this diagram."
        >
          <circle cx="160" cy="160" r="150" fill="none" stroke="var(--rule)" strokeDasharray="1 8" />
          <circle cx="160" cy="160" r="112" fill="none" stroke="var(--rule)" />

          {genome.links.map((l, i) => {
            const from = byId[l.from]
            const to = byId[l.to]
            if (!from || !to) return null
            const lit = active === l.from || active === l.to
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={lit ? 'rgb(var(--action-text))' : 'rgb(var(--paper)/0.22)'}
                strokeWidth={lit ? 1.5 : 1}
                strokeDasharray={lit ? undefined : '3 5'}
              >
                <title>{l.note}</title>
              </line>
            )
          })}

          <circle cx="160" cy="160" r="26" fill="rgb(var(--action-text))" fillOpacity="0.1" stroke="rgb(var(--action-text))" strokeOpacity="0.4" />
          <text
            x="160"
            y="164"
            textAnchor="middle"
            fontSize="9"
            fontFamily="var(--font-mono), monospace"
            fill="rgb(var(--paper-sub))"
            letterSpacing="1.4"
          >
            IDEA
          </text>

          {placed.map((n) => {
            const on = n.id === active
            const weak = n.strength <= 2
            return (
              <g key={n.id} className="cursor-pointer" onClick={() => setActive(n.id)}>
                <circle cx={n.x} cy={n.y} r={on ? 19 : 15} fill="rgb(var(--ink-800))" stroke={weak ? 'rgb(var(--risk))' : 'rgb(var(--action-text))'} strokeWidth={on ? 2 : 1.2} />
                <circle cx={n.x} cy={n.y} r={on ? 7 : 5} fill={weak ? 'rgb(var(--risk))' : 'rgb(var(--action-text))'} fillOpacity={on ? 1 : 0.65} />
                <text
                  x={n.x}
                  y={n.y + 32}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontFamily="var(--font-mono), monospace"
                  fill={on ? 'rgb(var(--paper))' : 'rgb(var(--paper-sub))'}
                  letterSpacing="1.2"
                >
                  {KIND_LABEL[n.kind]?.toUpperCase()}
                </text>
              </g>
            )
          })}
        </svg>

        <p className="mt-3 max-w-[38ch] text-[12.5px] leading-relaxed text-paper-faint">
          Parts sit further out the less you have established them. An{' '}
          <span className="text-risk">orange</span> node is one the analysis could not find much behind.
        </p>
      </div>

      <div>
        <p className="max-w-measure text-[15.5px] leading-[1.7] text-paper-dim">{genome.summary}</p>

        <div className="rule-t mt-6 pt-5">
          <p className="label mb-1.5">Why now</p>
          <p className="max-w-measure text-[14px] leading-[1.65] text-paper-dim">{genome.whyNow}</p>
        </div>

        {activeNode && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNode.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.24, ease: EASE }}
              className="rule-t mt-6 pt-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-action-text">
                  {KIND_LABEL[activeNode.kind]}
                </p>
                <ScoreBar
                  value={activeNode.strength}
                  label="How established"
                  tone={activeNode.strength <= 2 ? 'ember' : 'lime'}
                />
              </div>
              <p className="display mt-2 text-[1.5rem] leading-tight text-paper">{activeNode.label}</p>
              <p className="mt-2.5 max-w-measure text-[14px] leading-[1.65] text-paper-dim">{activeNode.detail}</p>
              {activeNode.unknowns?.length > 0 && (
                <>
                  <p className="label mb-2 mt-4">Still unknown</p>
                  <ul className="space-y-1.5">
                    {activeNode.unknowns.map((u, i) => (
                      <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.55] text-paper-faint">
                        <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-risk" />
                        {u}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        <div className="mt-8 border-l-2 border-risk pl-5">
          <p className="flex items-center gap-2 text-[14.5px] text-paper">
            <IconAlert size={14} className="text-risk" />
            What you did not say
          </p>
          <ul className="mt-3 space-y-2">
            {genome.missingInformation.map((m, i) => (
              <li key={i} className="flex max-w-measure gap-3 text-[13.5px] leading-[1.6] text-paper-dim">
                <span aria-hidden="true" className="num mt-[2px] shrink-0 font-mono text-[10.5px] text-risk">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== *
 * Assumption Minefield — a terrain of risk nodes, editable in place.
 * ================================================================== */

const STATUS_TONE: Record<string, string> = {
  untested: 'text-paper-faint',
  testing: 'text-paper',
  supported: 'text-action-text',
  refuted: 'text-risk',
}

const STATUSES = ['untested', 'testing', 'supported', 'refuted'] as const

export function AssumptionMinefield({
  assumptions,
  onUpdate,
  onDelete,
  onCreate,
}: {
  assumptions: AssumptionRow[]
  onUpdate: (id: string, body: Partial<AssumptionRow>) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onCreate: (body: Partial<AssumptionRow>) => Promise<boolean>
}) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState<string | null>(assumptions[0]?.id ?? null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<AssumptionRow>>({})
  const [adding, setAdding] = useState(false)
  const [newClaim, setNewClaim] = useState('')

  const sorted = useMemo(
    () => [...assumptions].sort((a, b) => b.impact * b.uncertainty - a.impact * a.uncertainty),
    [assumptions],
  )
  const current = sorted.find((a) => a.id === active) ?? sorted[0] ?? null

  function startEdit() {
    if (!current) return
    setDraft({ ...current })
    setEditing(true)
  }

  async function save() {
    if (!current) return
    await onUpdate(current.id, draft)
    setEditing(false)
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14">
      {/* Terrain */}
      <div>
        <svg
          viewBox="0 0 420 340"
          className="w-full"
          role="img"
          aria-label="Assumptions plotted by uncertainty against impact. Every assumption is also listed beside this chart."
        >
          <defs>
            <radialGradient id="mine-danger" cx="82%" cy="18%" r="62%">
              <stop offset="0%" stopColor="rgb(var(--risk))" stopOpacity="0.16" />
              <stop offset="100%" stopColor="rgb(var(--risk))" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="30" y="20" width="370" height="270" fill="url(#mine-danger)" />

          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line x1={30 + i * 92.5} y1="20" x2={30 + i * 92.5} y2="290" stroke="var(--rule)" />
              <line x1="30" y1={20 + i * 67.5} x2="400" y2={20 + i * 67.5} stroke="var(--rule)" />
            </g>
          ))}

          <text x="215" y="322" textAnchor="middle" fontSize="9" fontFamily="var(--font-mono), monospace" fill="rgb(var(--paper-faint))" letterSpacing="1.6">
            UNCERTAINTY
          </text>
          <text x="12" y="155" textAnchor="middle" fontSize="9" fontFamily="var(--font-mono), monospace" fill="rgb(var(--paper-faint))" letterSpacing="1.6" transform="rotate(-90 12 155)">
            IMPACT
          </text>

          {sorted.map((a) => {
            const cx = 30 + ((a.uncertainty - 1) / 4) * 370
            const cy = 290 - ((a.impact - 1) / 4) * 270
            const on = a.id === active
            // Radius carries impact; colour carries uncertainty.
            const r = 8 + a.impact * 2.6
            const danger = a.impact * a.uncertainty >= 16
            const settled = a.status === 'supported' || a.status === 'refuted'
            const fill = a.status === 'supported' ? 'rgb(var(--action-text))' : danger ? 'rgb(var(--risk))' : 'rgb(var(--action-text))'

            return (
              <g key={a.id} className="cursor-pointer" onClick={() => setActive(a.id)}>
                {on && !reduce && (
                  <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke={fill} strokeOpacity="0.4">
                    <animate attributeName="r" values={`${r + 6};${r + 14};${r + 6}`} dur="2.6s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.5;0.05;0.5" dur="2.6s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={fill}
                  fillOpacity={settled ? 0.16 : on ? 0.6 : 0.34}
                  stroke={fill}
                  strokeWidth={on ? 2 : 1.2}
                  strokeDasharray={a.status === 'refuted' ? '3 3' : undefined}
                />
                <title>{a.claim}</title>
              </g>
            )
          })}
        </svg>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-paper-faint">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-risk opacity-60" />
            High impact and unknown
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-action opacity-60" />
            Lower risk or supported
          </span>
          <span>Node size carries impact.</span>
        </div>
      </div>

      {/* Inspector */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="label">
            {sorted.length} assumption{sorted.length === 1 ? '' : 's'}
          </p>
          <Button variant="quiet" size="sm" onClick={() => setAdding((a) => !a)}>
            {adding ? <IconClose size={13} /> : <IconArrow size={13} />}
            {adding ? 'Cancel' : 'Add one'}
          </Button>
        </div>

        {adding && (
          <div className="mb-5 rounded-[3px] border border-[rgb(var(--paper)/0.14)] p-4">
            <label htmlFor="new-assumption" className="label mb-1.5 block">
              State it as one falsifiable sentence
            </label>
            <Textarea
              id="new-assumption"
              rows={3}
              autoFocus
              value={newClaim}
              onChange={(e) => setNewClaim(e.target.value)}
              placeholder="Landlords will pay monthly for something they use four times a year."
            />
            <Button
              variant="primary"
              size="sm"
              className="mt-3"
              disabled={newClaim.trim().length < 5}
              onClick={async () => {
                const okDone = await onCreate({ claim: newClaim.trim(), category: 'Demand', impact: 3, uncertainty: 3 })
                if (okDone) {
                  setNewClaim('')
                  setAdding(false)
                }
              }}
            >
              <IconCheck size={13} />
              Add assumption
            </Button>
          </div>
        )}

        <ol className="max-h-[340px] overflow-y-auto pr-1">
          {sorted.map((a, i) => (
            <li key={a.id}>
              <button
                onClick={() => {
                  setActive(a.id)
                  setEditing(false)
                }}
                aria-pressed={a.id === active}
                className={`tap flex w-full cursor-pointer items-start gap-3 border-t border-[color:var(--rule)] py-3 text-left transition-colors duration-150 ${
                  a.id === active ? 'text-paper' : 'text-paper-dim hover:text-paper'
                }`}
              >
                <span aria-hidden="true" className="num mt-0.5 shrink-0 font-mono text-[11px] text-paper-sub">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] leading-[1.5]">{a.claim}</span>
                  <span className={`mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] ${STATUS_TONE[a.status]}`}>
                    {a.status}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        {current && (
          <div className="rule-t mt-5 pt-5">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="label mb-1.5 block" htmlFor="edit-claim">
                    Claim
                  </label>
                  <Textarea
                    id="edit-claim"
                    rows={3}
                    value={draft.claim ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, claim: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label mb-1.5 block" htmlFor="edit-impact">
                      Impact 1–5
                    </label>
                    <Input
                      id="edit-impact"
                      type="number"
                      min={1}
                      max={5}
                      value={draft.impact ?? 3}
                      onChange={(e) => setDraft((d) => ({ ...d, impact: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="label mb-1.5 block" htmlFor="edit-unc">
                      Uncertainty 1–5
                    </label>
                    <Input
                      id="edit-unc"
                      type="number"
                      min={1}
                      max={5}
                      value={draft.uncertainty ?? 3}
                      onChange={(e) => setDraft((d) => ({ ...d, uncertainty: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="label mb-1.5 block" htmlFor="edit-test">
                    Cheapest test
                  </label>
                  <Textarea
                    id="edit-test"
                    rows={3}
                    value={draft.cheapestTest ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, cheapestTest: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={save}>
                    <IconCheck size={13} />
                    Save
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[15px] leading-[1.5] text-paper">{current.claim}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-sub">
                    {current.category}
                  </span>
                  <ScoreBar value={current.impact} label="Impact if false" tone="ember" />
                  <ScoreBar value={current.uncertainty} label="Uncertainty" />
                </div>

                <dl className="mt-5 space-y-3.5">
                  <div>
                    <dt className="label mb-1">What breaks if false</dt>
                    <dd className="text-[13.5px] leading-[1.6] text-paper-dim">{current.breaksIfFalse}</dd>
                  </div>
                  <div>
                    <dt className="label mb-1">Proof needed</dt>
                    <dd className="text-[13.5px] leading-[1.6] text-paper-dim">{current.proofNeeded}</dd>
                  </div>
                  <div>
                    <dt className="label mb-1 text-action-text">Cheapest test</dt>
                    <dd className="text-[13.5px] leading-[1.6] text-paper-dim">{current.cheapestTest}</dd>
                    <dd className="mt-1.5 flex gap-4 font-mono text-[11px] text-paper-faint">
                      {current.testCost && <span className="num">{current.testCost}</span>}
                      {current.testDuration && <span className="num">{current.testDuration}</span>}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5">
                  <p className="label mb-2">Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <Chip key={s} active={current.status === s} onClick={() => onUpdate(current.id, { status: s })}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button variant="quiet" size="sm" onClick={startEdit}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(current.id)}>
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================== *
 * Failure Museum — exhibits with plates.
 * ================================================================== */

const LIKELIHOOD_TONE: Record<string, string> = {
  high: 'text-risk',
  moderate: 'text-paper',
  low: 'text-paper-faint',
}

export function FailureMuseum({ failures }: { failures: FailureExhibit[] }) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState<string | null>(failures[0]?.id ?? null)

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {failures.map((f, i) => {
        const isOpen = f.id === open
        return (
          <motion.article
            key={f.id}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
            className="relative overflow-hidden rounded-[2px] border border-[rgb(var(--paper)/0.12)] bg-[rgb(var(--paper)/0.02)]"
          >
            {/* Exhibit plate */}
            <div className="flex items-start justify-between gap-4 border-b border-[color:var(--rule)] px-5 py-3">
              <div className="min-w-0">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-paper-sub">
                  Exhibit {String(i + 1).padStart(2, '0')} · {f.killZone}
                </p>
              </div>
              <p className={`shrink-0 font-mono text-[9.5px] uppercase tracking-[0.16em] ${LIKELIHOOD_TONE[f.likelihood]}`}>
                {f.likelihood}
              </p>
            </div>

            <button
              onClick={() => setOpen(isOpen ? null : f.id)}
              aria-expanded={isOpen}
              className="tap w-full cursor-pointer px-5 pb-4 pt-4 text-left"
            >
              <h3 className="display max-w-[20ch] text-[1.45rem] leading-[1.08] text-paper">{f.title}</h3>
              <p className="mt-2.5 max-w-measure text-[13.5px] leading-[1.65] text-paper-dim">{f.narrative}</p>
            </button>

            <motion.div
              initial={false}
              animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
              transition={{ duration: reduce ? 0.05 : 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="space-y-4 px-5 pb-5">
                <div>
                  <p className="label mb-2">Warning signals</p>
                  <ul className="space-y-1.5">
                    {f.warningSignals.map((w, k) => (
                      <li key={k} className="flex gap-2.5 text-[13px] leading-[1.55] text-paper-dim">
                        <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-risk" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label mb-1">Mitigation</p>
                  <p className="text-[13px] leading-[1.6] text-paper-dim">{f.mitigation}</p>
                </div>
              </div>
            </motion.div>
          </motion.article>
        )
      })}
    </div>
  )
}

/* ================================================================== *
 * Pivot Prism — a rotatable three-faced solid.
 * ================================================================== */

const PIVOT_ORDER: Pivot['kind'][] = ['safer', 'sharper', 'bolder']
const PIVOT_NOTE: Record<string, string> = {
  safer: 'Smaller promise, faster to prove.',
  sharper: 'Narrower, and therefore provable.',
  bolder: 'A different bet entirely.',
}

export function PivotPrism({ pivots }: { pivots: Pivot[] }) {
  const reduce = useReducedMotion()
  const sorted = useMemo(
    () => [...pivots].sort((a, b) => PIVOT_ORDER.indexOf(a.kind) - PIVOT_ORDER.indexOf(b.kind)),
    [pivots],
  )
  const [face, setFace] = useState(0)
  const dragStart = useRef<number | null>(null)
  const current = sorted[face] ?? sorted[0]
  if (!current) return null

  const angle = -face * 120

  function rotate(dir: number) {
    setFace((f) => (f + dir + sorted.length) % sorted.length)
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-14">
      <div>
        {/* The prism. Drag or use the arrow keys to turn it. */}
        <div
          role="group"
          aria-label="Pivot prism. Use the left and right arrow keys to rotate between pivots."
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault()
              rotate(1)
            }
            if (e.key === 'ArrowLeft') {
              e.preventDefault()
              rotate(-1)
            }
          }}
          onPointerDown={(e) => {
            dragStart.current = e.clientX
          }}
          onPointerUp={(e) => {
            if (dragStart.current === null) return
            const dx = e.clientX - dragStart.current
            if (Math.abs(dx) > 40) rotate(dx < 0 ? 1 : -1)
            dragStart.current = null
          }}
          className="relative mx-auto aspect-square w-full max-w-[340px] cursor-grab select-none active:cursor-grabbing"
          style={{ perspective: '1100px' }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: angle }}
            transition={reduce ? { duration: 0.15 } : { type: 'spring', duration: 0.8, bounce: 0.16 }}
          >
            {sorted.map((p, i) => {
              const on = i === face
              const tone = p.kind === 'bolder' ? 'rgb(var(--risk))' : 'rgb(var(--action-text))'
              return (
                <div
                  key={p.id}
                  className="absolute inset-x-[12%] inset-y-[16%] rounded-[2px] border"
                  style={{
                    transform: `rotateY(${i * 120}deg) translateZ(118px)`,
                    borderColor: on ? tone : 'rgb(var(--paper)/0.2)',
                    background: on ? 'rgb(var(--paper)/0.05)' : 'rgb(var(--paper)/0.02)',
                    backfaceVisibility: 'hidden',
                    boxShadow: on ? `0 24px 60px -30px ${tone}` : undefined,
                  }}
                >
                  <div className="flex h-full flex-col justify-between p-5">
                    <p
                      className="font-mono text-[10px] uppercase tracking-[0.2em]"
                      style={{ color: on ? tone : 'rgb(var(--paper-faint))' }}
                    >
                      {p.kind}
                    </p>
                    <div>
                      <p className="display text-[1.5rem] leading-[1.08] text-paper">{p.title}</p>
                      <p className="mt-2 text-[12px] italic text-paper-faint">{PIVOT_NOTE[p.kind]}</p>
                    </div>
                    <dl className="space-y-2">
                      {(
                        [
                          ['Effort', p.effort],
                          ['Ceiling', p.ceiling],
                          ['Speed to proof', p.speedToProof],
                        ] as const
                      ).map(([label, v]) => (
                        <div key={label} className="flex items-center justify-between gap-3">
                          <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-sub">{label}</dt>
                          <dd>
                            <ScoreBar value={v} label={label} tone={p.kind === 'bolder' ? 'ember' : 'lime'} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )
            })}
          </motion.div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="quiet" size="sm" onClick={() => rotate(-1)} aria-label="Previous pivot">
            ←
          </Button>
          {sorted.map((p, i) => (
            <Chip key={p.id} active={i === face} onClick={() => setFace(i)}>
              {p.kind}
            </Chip>
          ))}
          <Button variant="quiet" size="sm" onClick={() => rotate(1)} aria-label="Next pivot">
            →
          </Button>
        </div>
      </div>

      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
          >
            <h3 className="display text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.06] text-paper">{current.title}</h3>
            <p className="mt-3 max-w-measure text-[14.5px] leading-[1.68] text-paper-dim">{current.description}</p>

            <dl className="mt-6 space-y-5">
              <div className="rule-t pt-4">
                <dt className="label mb-1">What changes</dt>
                <dd className="max-w-measure text-[13.5px] leading-[1.62] text-paper-dim">{current.whatChanges}</dd>
              </div>
              <div className="rule-t pt-4">
                <dt className="label mb-1">Who it serves</dt>
                <dd className="max-w-measure text-[13.5px] leading-[1.62] text-paper-dim">{current.whoItServes}</dd>
              </div>
              <div className="rule-t pt-4">
                <dt className="label mb-1 text-risk">What it costs you</dt>
                <dd className="max-w-measure text-[13.5px] leading-[1.62] text-paper-dim">{current.tradeoff}</dd>
              </div>
            </dl>
          </motion.div>
        </AnimatePresence>

        {/* Side-by-side comparison, so the prism is a decision tool not a carousel. */}
        <div className="rule-t mt-8 overflow-x-auto pt-5">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <caption className="sr-only">Pivot options compared by effort, ceiling and speed to proof</caption>
            <thead>
              <tr>
                <th scope="col" className="label pb-2 pr-4 font-normal">
                  Pivot
                </th>
                <th scope="col" className="label pb-2 pr-4 font-normal">
                  Effort
                </th>
                <th scope="col" className="label pb-2 pr-4 font-normal">
                  Ceiling
                </th>
                <th scope="col" className="label pb-2 font-normal">
                  Speed to proof
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr
                  key={p.id}
                  className={`rule-t cursor-pointer transition-colors duration-150 ${i === face ? 'text-paper' : 'text-paper-dim hover:text-paper'}`}
                  onClick={() => setFace(i)}
                >
                  <td className="py-3 pr-4 text-[13.5px]">{p.title}</td>
                  <td className="py-3 pr-4">
                    <ScoreBar value={p.effort} label="Effort" tone="ember" />
                  </td>
                  <td className="py-3 pr-4">
                    <ScoreBar value={p.ceiling} label="Ceiling" />
                  </td>
                  <td className="py-3">
                    <ScoreBar value={p.speedToProof} label="Speed to proof" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
