'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Button, Chip, EvidenceTag, IconCheck, IconClose, Input, Textarea } from '@/components/ui/kit'
import type { BusinessModel, LaunchPlan, Scenarios } from '@/lib/atlas-types'

const EASE = [0.23, 1, 0.32, 1] as const

/* ================================================================== *
 * Business Model Blueprint — an animated flow of value and money.
 * ================================================================== */

const FLOW_TONE: Record<string, string> = { value: '#F3EEE2', money: '#C8FB2E', data: '#8E8A7E' }

export function BusinessModelBlueprint({
  model,
  onSave,
  saving,
}: {
  model: BusinessModel
  onSave: (next: BusinessModel) => Promise<boolean>
  saving?: boolean
}) {
  const reduce = useReducedMotion()
  const [activeFlow, setActiveFlow] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<BusinessModel>(model)

  // Actors are derived from the flows, then placed on a ring.
  const actors = useMemo(() => {
    const names: string[] = []
    for (const f of model.valueFlows) {
      if (!names.includes(f.from)) names.push(f.from)
      if (!names.includes(f.to)) names.push(f.to)
    }
    const n = Math.max(1, names.length)
    return Object.fromEntries(
      names.map((name, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        return [name, { name, x: 230 + Math.cos(a) * 150, y: 175 + Math.sin(a) * 118 }]
      }),
    )
  }, [model.valueFlows])

  return (
    <div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-14">
        <div>
          <svg
            viewBox="0 0 460 350"
            className="w-full"
            role="img"
            aria-label="A diagram of how value, money and data move between the actors. Each flow is listed beside the diagram."
          >
            <defs>
              <marker id="bm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
              </marker>
            </defs>

            {model.valueFlows.map((f) => {
              const from = actors[f.from]
              const to = actors[f.to]
              if (!from || !to) return null
              const on = activeFlow === f.id
              const tone = FLOW_TONE[f.kind] ?? '#F3EEE2'
              // Bow each edge away from the centre so parallel flows stay distinct.
              const mx = (from.x + to.x) / 2
              const my = (from.y + to.y) / 2
              const dx = to.x - from.x
              const dy = to.y - from.y
              const len = Math.hypot(dx, dy) || 1
              const cx = mx - (dy / len) * 34
              const cy = my + (dx / len) * 34

              return (
                <g key={f.id} className="cursor-pointer" onClick={() => setActiveFlow(on ? null : f.id)} style={{ color: tone }}>
                  <path
                    d={`M${from.x} ${from.y} Q${cx} ${cy} ${to.x} ${to.y}`}
                    fill="none"
                    stroke={tone}
                    strokeOpacity={on ? 0.95 : 0.34}
                    strokeWidth={on ? 2 : 1.2}
                    strokeDasharray={f.kind === 'data' ? '3 5' : undefined}
                    markerEnd="url(#bm-arrow)"
                  />
                  {!reduce && (
                    <circle r="3" fill={tone} opacity={on ? 1 : 0.5}>
                      <animateMotion
                        dur={f.kind === 'money' ? '3.4s' : '4.6s'}
                        repeatCount="indefinite"
                        path={`M${from.x} ${from.y} Q${cx} ${cy} ${to.x} ${to.y}`}
                      />
                    </circle>
                  )}
                  <title>{`${f.from} → ${f.to}: ${f.what}`}</title>
                </g>
              )
            })}

            {Object.values(actors).map((a) => (
              <g key={a.name}>
                <rect
                  x={a.x - 52}
                  y={a.y - 15}
                  width="104"
                  height="30"
                  rx="2"
                  fill="#0C0E0B"
                  stroke="rgba(243,238,226,0.34)"
                  strokeWidth="1"
                />
                <text
                  x={a.x}
                  y={a.y + 4}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontFamily="var(--font-mono), monospace"
                  fill="#F3EEE2"
                  letterSpacing="0.8"
                >
                  {a.name.length > 15 ? a.name.slice(0, 14) + '…' : a.name}
                </text>
              </g>
            ))}
          </svg>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-paper-faint">
            {(['value', 'money', 'data'] as const).map((k) => (
              <span key={k} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-px w-5" style={{ background: FLOW_TONE[k] }} />
                {k}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="label mb-3">The flows</p>
          <ul className="space-y-0">
            {model.valueFlows.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => setActiveFlow(activeFlow === f.id ? null : f.id)}
                  aria-pressed={activeFlow === f.id}
                  className={`tap w-full cursor-pointer border-t border-[color:var(--rule)] py-3 text-left transition-colors duration-150 ${
                    activeFlow === f.id ? 'text-paper' : 'text-paper-dim hover:text-paper'
                  }`}
                >
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: FLOW_TONE[f.kind] }}>
                    {f.kind}
                  </span>
                  <span className="mt-1 block text-[13.5px] leading-[1.5]">
                    {f.from} → {f.to}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-paper-faint">{f.what}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="rule-t mt-4 pt-3 text-[12.5px] leading-relaxed text-paper-faint">{model.note}</p>
        </div>
      </div>

      {/* Revenue and costs */}
      <div className="mt-14 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[15px] text-paper">Revenue hypotheses</h3>
            <Button variant="quiet" size="sm" onClick={() => { setDraft(model); setEditing((e) => !e) }} className="no-print">
              {editing ? <IconClose size={13} /> : null}
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>

          {editing ? (
            <div className="space-y-5">
              {draft.revenueStreams.map((r, i) => (
                <div key={r.id} className="rule-t space-y-2.5 pt-4">
                  <Input
                    aria-label={`Stream ${i + 1} name`}
                    value={r.name}
                    onChange={(e) => {
                      const next = { ...draft, revenueStreams: draft.revenueStreams.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) }
                      setDraft(next)
                    }}
                  />
                  <Input
                    aria-label={`Stream ${i + 1} price point`}
                    value={r.pricePoint}
                    onChange={(e) => {
                      const next = { ...draft, revenueStreams: draft.revenueStreams.map((x, k) => (k === i ? { ...x, pricePoint: e.target.value } : x)) }
                      setDraft(next)
                    }}
                  />
                  <Textarea
                    aria-label={`Stream ${i + 1} rationale`}
                    rows={2}
                    value={r.rationale}
                    onChange={(e) => {
                      const next = { ...draft, revenueStreams: draft.revenueStreams.map((x, k) => (k === i ? { ...x, rationale: e.target.value } : x)) }
                      setDraft(next)
                    }}
                  />
                </div>
              ))}
              <Button
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={async () => {
                  const okDone = await onSave(draft)
                  if (okDone) setEditing(false)
                }}
              >
                <IconCheck size={13} />
                Save the model
              </Button>
            </div>
          ) : (
            <ul className="space-y-0">
              {model.revenueStreams.map((r) => (
                <li key={r.id} className="rule-t grid grid-cols-1 gap-x-6 gap-y-3 py-5 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
                  <div>
                    <p className="text-[14.5px] text-paper">{r.name}</p>
                    <p className="num mt-1 font-mono text-[12.5px] text-lime">{r.pricePoint}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-sub">{r.model}</p>
                    <EvidenceTag evidence={r.evidence} className="mt-2" />
                  </div>
                  <dl className="max-w-measure space-y-2.5">
                    <div>
                      <dt className="label mb-0.5">Rationale</dt>
                      <dd className="text-[13.5px] leading-[1.58] text-paper-dim">{r.rationale}</dd>
                    </div>
                    <div>
                      <dt className="label mb-0.5">How to test it</dt>
                      <dd className="text-[13.5px] leading-[1.58] text-paper-dim">{r.testMethod}</dd>
                    </div>
                    <div>
                      <dt className="label mb-0.5 text-ember">Risk</dt>
                      <dd className="text-[13.5px] leading-[1.58] text-paper-dim">{r.risk}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-[15px] text-paper">Cost drivers</h3>
          <ul className="space-y-0">
            {model.costDrivers.map((c) => (
              <li key={c.id} className="rule-t py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] text-paper">{c.name}</p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-sub">{c.kind}</span>
                </div>
                <p className="mt-1 text-[13px] leading-[1.55] text-paper-dim">{c.note}</p>
              </li>
            ))}
          </ul>

          <h3 className="mb-3 mt-8 text-[15px] text-paper">Numbers that decide it</h3>
          <ul className="space-y-0">
            {model.unitEconomics.map((u, i) => (
              <li key={i} className="rule-t py-3.5">
                <p className="text-[14px] text-paper">{u.metric}</p>
                <p className="mt-1 text-[13px] leading-[1.55] text-paper-dim">{u.hypothesis}</p>
                <p className="mt-1 text-[12.5px] leading-[1.5] text-lime">{u.howToMeasure}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* MVP scope */}
      <div className="rule-t mt-12 grid grid-cols-1 gap-x-12 gap-y-8 pt-6 md:grid-cols-2">
        <div>
          <p className="label mb-3 text-lime">Build this</p>
          <ul className="space-y-2.5">
            {model.mvpScope.inScope.map((x, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.58] text-paper-dim">
                <IconCheck size={13} className="mt-[3px] shrink-0 text-lime" />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label mb-3 text-ember">Not this, not yet</p>
          <ul className="space-y-2.5">
            {model.mvpScope.outOfScope.map((x, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.58] text-paper-faint">
                <span aria-hidden="true" className="mt-[9px] h-px w-2.5 shrink-0 bg-ember" />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="label mb-1.5">Success criteria</p>
          <p className="max-w-measure text-[14px] leading-[1.62] text-paper-dim">{model.mvpScope.successCriteria}</p>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== *
 * Future Scope Simulator — three conditional routes.
 * ================================================================== */

const PATH_TONE: Record<string, string> = {
  conservative: '#8E8A7E',
  expected: '#C8FB2E',
  ambitious: '#FF5A1F',
}

export function FutureScope({ scenarios }: { scenarios: Scenarios }) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(scenarios.paths[1]?.kind ?? scenarios.paths[0]?.kind ?? 'expected')
  const path = scenarios.paths.find((p) => p.kind === active) ?? scenarios.paths[0]
  if (!path) return null

  // A rising curve per route; ambition raises the exit, not the start.
  const curveFor = (kind: string) => {
    const lift = kind === 'ambitious' ? 150 : kind === 'expected' ? 96 : 52
    return `M40 250 C 160 ${250 - lift * 0.28}, 300 ${250 - lift * 0.62}, 460 ${250 - lift}`
  }

  return (
    <div>
      <p className="mb-6 max-w-measure border-l-2 border-[rgba(243,238,226,0.24)] pl-4 text-[13px] leading-[1.62] text-paper-faint">
        {scenarios.disclaimer}
      </p>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-14">
        <div>
          <svg viewBox="0 0 500 300" className="w-full" role="img" aria-label="Three scenario paths. Each is described beside this chart.">
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1="40" y1={60 + i * 48} x2="470" y2={60 + i * 48} stroke="var(--rule)" />
            ))}
            <line x1="40" y1="250" x2="470" y2="250" stroke="rgba(243,238,226,0.24)" />

            {scenarios.paths.map((p) => {
              const on = p.kind === active
              return (
                <g key={p.kind} className="cursor-pointer" onClick={() => setActive(p.kind)}>
                  <path
                    d={curveFor(p.kind)}
                    fill="none"
                    stroke={PATH_TONE[p.kind]}
                    strokeOpacity={on ? 1 : 0.3}
                    strokeWidth={on ? 2.4 : 1.4}
                    strokeDasharray={on ? undefined : '5 6'}
                  />
                  <title>{p.title}</title>
                </g>
              )
            })}

            {/* Beats along the selected route */}
            {path.beats.map((b, i) => {
              const t = Math.min(1, Math.max(0, b.t))
              const lift = path.kind === 'ambitious' ? 150 : path.kind === 'expected' ? 96 : 52
              const x = 40 + t * 420
              const y = 250 - lift * (t * t * 0.85 + t * 0.15)
              return (
                <motion.g
                  key={i}
                  initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: EASE, delay: i * 0.08 }}
                >
                  <circle cx={x} cy={y} r="5.5" fill="#0C0E0B" stroke={PATH_TONE[path.kind]} strokeWidth="2" />
                  <text
                    x={x}
                    y={y - 14}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontFamily="var(--font-mono), monospace"
                    fill="#8E8A7E"
                    letterSpacing="0.8"
                  >
                    {b.label}
                  </text>
                </motion.g>
              )
            })}

            <text x="40" y="274" fontSize="8.5" fontFamily="var(--font-mono), monospace" fill="#827E72" letterSpacing="1.4">
              NOW
            </text>
            <text x="470" y="274" textAnchor="end" fontSize="8.5" fontFamily="var(--font-mono), monospace" fill="#827E72" letterSpacing="1.4">
              LATER
            </text>
          </svg>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {scenarios.paths.map((p) => (
              <Chip key={p.kind} active={p.kind === active} onClick={() => setActive(p.kind)}>
                {p.kind}
              </Chip>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={path.kind}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
          >
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: PATH_TONE[path.kind] }}>
              {path.kind}
            </p>
            <h3 className="display mt-2 text-[1.6rem] leading-tight text-paper">{path.title}</h3>
            <p className="mt-3 max-w-measure text-[14px] leading-[1.66] text-paper-dim">{path.narrative}</p>

            <div className="rule-t mt-5 pt-4">
              <p className="label mb-2">This route only holds while</p>
              <ul className="space-y-2">
                {path.dependsOn.map((d, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.55] text-paper-dim">
                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-lime" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rule-t mt-5 pt-4">
              <p className="label mb-1.5 text-ember">It breaks if</p>
              <p className="max-w-measure text-[13.5px] leading-[1.6] text-paper-dim">{path.breaksIf}</p>
            </div>

            <div className="rule-t mt-5 pt-4">
              <p className="label mb-2">Beats along the way</p>
              <ol className="space-y-2.5">
                {path.beats.map((b, i) => (
                  <li key={i}>
                    <p className="text-[13.5px] text-paper">{b.label}</p>
                    <p className="text-[12.5px] leading-[1.5] text-paper-faint">{b.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ================================================================== *
 * Launch Flight Plan
 * ================================================================== */

export function FlightPlan({ launch }: { launch: LaunchPlan }) {
  const reduce = useReducedMotion()
  const [openMilestone, setOpenMilestone] = useState<string | null>(launch.milestones[0]?.id ?? null)
  const maxWeek = Math.max(...launch.milestones.map((m) => m.week), 1)

  return (
    <div>
      <p className="mb-8 max-w-measure text-[13.5px] leading-[1.62] text-paper-faint">{launch.readinessNote}</p>

      {/* Timeline */}
      <div className="relative mb-12 overflow-x-auto pb-2">
        <div className="relative min-w-[620px]">
          <div className="absolute inset-x-0 top-[38px] h-px bg-[rgba(243,238,226,0.2)]" aria-hidden="true" />
          <ol className="relative flex justify-between">
            {launch.milestones.map((m, i) => {
              const on = m.id === openMilestone
              return (
                <li key={m.id} className="flex-1 px-1.5">
                  <button
                    onClick={() => setOpenMilestone(on ? null : m.id)}
                    aria-expanded={on}
                    className="tap w-full cursor-pointer text-left"
                  >
                    <p className="num mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-sub">
                      Week {m.week}
                    </p>
                    <motion.span
                      aria-hidden="true"
                      className="block h-3.5 w-3.5 rounded-full border-2"
                      style={{
                        borderColor: on ? '#C8FB2E' : 'rgba(243,238,226,0.4)',
                        background: on ? '#C8FB2E' : '#0C0E0B',
                      }}
                      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: EASE, delay: i * 0.06 }}
                    />
                    <p className={`mt-3 text-[13.5px] leading-[1.4] ${on ? 'text-paper' : 'text-paper-dim'}`}>{m.name}</p>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      {openMilestone &&
        (() => {
          const m = launch.milestones.find((x) => x.id === openMilestone)
          if (!m) return null
          return (
            <motion.div
              key={m.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: EASE }}
              className="rule-t rule-b mb-12 grid grid-cols-1 gap-x-10 gap-y-4 py-6 md:grid-cols-3"
            >
              <div>
                <p className="label mb-1">Outcome</p>
                <p className="text-[14px] leading-[1.6] text-paper-dim">{m.outcome}</p>
              </div>
              <div>
                <p className="label mb-1">Owner</p>
                <p className="text-[14px] leading-[1.6] text-paper-dim">{m.owner}</p>
              </div>
              <div>
                <p className="label mb-1 text-ember">Risk</p>
                <p className="text-[14px] leading-[1.6] text-paper-dim">{m.risk}</p>
              </div>
            </motion.div>
          )
        })()}

      <div className="grid grid-cols-1 gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="label mb-4">The next seven days</h3>
          <ol className="space-y-0">
            {launch.sevenDays.map((d) => (
              <li key={d.day} className="rule-t grid grid-cols-[36px_minmax(0,1fr)] gap-x-4 py-4">
                <span aria-hidden="true" className="num font-mono text-[11px] text-lime">
                  D{d.day}
                </span>
                <div>
                  <p className="text-[14px] leading-[1.5] text-paper">{d.action}</p>
                  <p className="mt-1 text-[12.5px] leading-[1.5] text-paper-faint">{d.output}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="label mb-4">Early KPIs</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <caption className="sr-only">Key metrics with targets and failure thresholds</caption>
              <thead>
                <tr>
                  {['Metric', 'Target', 'Fails at'].map((h) => (
                    <th key={h} scope="col" className="label rule-b pb-2.5 pr-5 align-bottom font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {launch.kpis.map((k, i) => (
                  <tr key={i} className="rule-b align-top">
                    <td className="py-3.5 pr-5">
                      <p className="text-[13.5px] text-paper">{k.name}</p>
                      <p className="mt-0.5 max-w-[28ch] text-[12px] leading-[1.5] text-paper-faint">{k.definition}</p>
                    </td>
                    <td className="num py-3.5 pr-5 font-mono text-[12.5px] text-lime">{k.target}</td>
                    <td className="max-w-[22ch] py-3.5 text-[12.5px] leading-[1.5] text-ember">{k.failureThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
