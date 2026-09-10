'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Button, IconClose, IconFlask, IconSpark } from '@/components/ui/kit'
import type { AssumptionRow, ExperimentRow } from '../useVenture'

/**
 * The Validation Lab.
 *
 * A bench you put things on, not a table you read.
 *
 *   - Every unresolved assumption is a specimen on the risk terrain at the
 *     top: its height is impact, its position is uncertainty, and the ones in
 *     the far corner are the ones that end the venture if they are wrong.
 *   - Drag a specimen onto a rig to attach it to an experiment. Drop it on the
 *     empty rig and the lab offers to design one.
 *   - A running rig pulses. When you record a pass, the specimen crystallises
 *     and travels back to the terrain as solid ground. When you record a fail,
 *     it fractures and leaves a crater — the pivot you now have to make.
 *
 * The pass/fail states are the point of the screen, so they are the loudest
 * thing on it.
 */

const STATUS_TONE: Record<string, { label: string; cls: string; dot: string }> = {
  planned: { label: 'Planned', cls: 'border-[color:var(--rule-strong)] text-paper-sub', dot: 'bg-paper-sub' },
  running: { label: 'Running', cls: 'border-intel/50 text-intel', dot: 'bg-intel' },
  passed: { label: 'Passed', cls: 'border-signal/50 text-signal', dot: 'bg-signal' },
  failed: { label: 'Failed', cls: 'border-risk/50 text-risk', dot: 'bg-risk' },
  inconclusive: { label: 'Inconclusive', cls: 'border-unknown/50 text-unknown', dot: 'bg-unknown' },
}

/* ------------------------------------------------------------------ *
 * The risk terrain
 * ------------------------------------------------------------------ */

function Terrain({
  assumptions,
  onPick,
  picked,
  onDragStart,
}: {
  assumptions: AssumptionRow[]
  onPick: (id: string) => void
  picked: string | null
  onDragStart: (id: string) => void
}) {
  const reduce = useReducedMotion()
  const W = 100
  const H = 46

  return (
    <div className="relative overflow-hidden rounded-[4px] border border-[color:var(--rule)] bg-[rgb(var(--ink-900)/0.45)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[260px] w-full md:h-[300px]" role="img" aria-label="Risk terrain">
        <defs>
          <linearGradient id="lab-danger" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(var(--signal))" stopOpacity="0.1" />
            <stop offset="100%" stopColor="rgb(var(--risk))" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        {/* The ground: safe at bottom-left, fatal at top-right. */}
        <rect x="0" y="0" width={W} height={H} fill="url(#lab-danger)" />
        {Array.from({ length: 9 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={(i + 1) * (W / 10)}
            y1="0"
            x2={(i + 1) * (W / 10)}
            y2={H}
            stroke="var(--rule)"
            strokeWidth="0.15"
          />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            y1={(i + 1) * (H / 6)}
            x2={W}
            y2={(i + 1) * (H / 6)}
            stroke="var(--rule)"
            strokeWidth="0.15"
          />
        ))}

        {assumptions.map((a) => {
          // Uncertainty runs left to right, impact bottom to top.
          const x = 8 + ((a.uncertainty - 1) / 4) * (W - 16)
          const y = H - 6 - ((a.impact - 1) / 4) * (H - 14)
          const on = picked === a.id
          const fatal = a.impact >= 4 && a.uncertainty >= 4 && a.status !== 'supported'
          const tone =
            a.status === 'supported'
              ? 'rgb(var(--signal))'
              : a.status === 'refuted'
                ? 'rgb(var(--risk))'
                : fatal
                  ? 'rgb(var(--risk))'
                  : 'rgb(var(--unknown))'
          return (
            <g key={a.id} transform={`translate(${x} ${y})`}>
              {a.status === 'refuted' ? (
                // A crater: the ground gave way here.
                <g>
                  <circle r="3.4" fill="none" stroke={tone} strokeWidth="0.5" strokeDasharray="1 0.8" />
                  <circle r="1.6" fill={tone} fillOpacity="0.25" />
                </g>
              ) : (
                <>
                  {fatal && !reduce && (
                    <circle r="3.2" fill="none" stroke={tone} strokeWidth="0.4" opacity="0.5">
                      <animate attributeName="r" values="2.4;4.4;2.4" dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.55;0;0.55" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    r={on ? 2.6 : 1.9}
                    fill={tone}
                    fillOpacity={a.status === 'supported' ? 1 : 0.75}
                    stroke={on ? 'rgb(var(--paper))' : 'none'}
                    strokeWidth="0.5"
                  />
                </>
              )}
            </g>
          )
        })}
      </svg>

      {/* Axis labels sit outside the plot so they never collide with a specimen. */}
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute bottom-2 left-3 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-sub">
          low uncertainty →
        </span>
        <span className="absolute right-3 top-2 font-mono text-[9px] uppercase tracking-[0.16em] text-risk">
          ends the venture
        </span>
      </div>

      {/* The draggable handles ride above the plot. */}
      <div className="absolute inset-0">
        {assumptions.map((a) => {
          const x = (8 + ((a.uncertainty - 1) / 4) * (W - 16)) / W
          const y = (H - 6 - ((a.impact - 1) / 4) * (H - 14)) / H
          return (
            <button
              key={a.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', a.id)
                e.dataTransfer.effectAllowed = 'link'
                onDragStart(a.id)
              }}
              onClick={() => onPick(a.id)}
              aria-label={`${a.claim} — impact ${a.impact}, uncertainty ${a.uncertainty}`}
              title={a.claim}
              className="tap absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full active:cursor-grabbing"
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * A rig
 * ------------------------------------------------------------------ */

function Rig({
  experiment,
  assumption,
  onDrop,
  onStatus,
  onOpen,
}: {
  experiment: ExperimentRow
  assumption: AssumptionRow | null
  onDrop: (assumptionId: string) => void
  onStatus: (status: string) => void
  onOpen: () => void
}) {
  const reduce = useReducedMotion()
  const [over, setOver] = useState(false)
  const tone = STATUS_TONE[experiment.status] ?? STATUS_TONE.planned
  const running = experiment.status === 'running'

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const id = e.dataTransfer.getData('text/plain')
        if (id) onDrop(id)
      }}
      className={`relative overflow-hidden rounded-[4px] border p-4 transition-colors duration-200 ${
        over ? 'border-action bg-action-wash' : 'border-[color:var(--rule)] bg-[rgb(var(--paper)/0.02)]'
      }`}
    >
      {/* A running rig has something moving through it. */}
      {running && !reduce && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px] bg-intel"
          animate={{ scaleX: [0, 1, 0], transformOrigin: ['0%', '0%', '100%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="tap min-w-0 flex-1 text-left">
          <p className="truncate text-[14px] font-medium text-paper">{experiment.name}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-sub">{experiment.kind}</p>
        </button>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] ${tone.cls}`}
        >
          {tone.label}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-[12.5px] leading-[1.55] text-paper-faint">{experiment.hypothesis}</p>

      {/* The specimen currently loaded into this rig. */}
      <div className="mt-3 min-h-[34px] rounded-[3px] border border-dashed border-[color:var(--rule-strong)] px-3 py-2">
        {assumption ? (
          <p className="line-clamp-1 text-[12px] text-paper-dim">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper-sub">testing </span>
            {assumption.claim}
          </p>
        ) : (
          <p className="text-[12px] text-paper-sub">Drag an assumption here to test it</p>
        )}
      </div>

      {/* The pass line, stated before you start. */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
        <dt className="font-mono uppercase tracking-[0.1em] text-paper-sub">Pass</dt>
        <dd className="truncate text-signal" title={experiment.successThreshold}>
          {experiment.successThreshold}
        </dd>
        <dt className="font-mono uppercase tracking-[0.1em] text-paper-sub">Fail</dt>
        <dd className="truncate text-risk" title={experiment.failThreshold}>
          {experiment.failThreshold}
        </dd>
      </dl>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {(['running', 'passed', 'failed', 'inconclusive'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatus(s)}
            aria-pressed={experiment.status === s}
            className={`tap rounded-full border px-2.5 py-1 text-[11px] transition-colors duration-150 ${
              experiment.status === s
                ? STATUS_TONE[s].cls
                : 'border-[color:var(--rule)] text-paper-sub hover:border-paper-sub hover:text-paper-dim'
            }`}
          >
            {STATUS_TONE[s].label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function ValidationLab({
  assumptions,
  experiments,
  onLink,
  onStatus,
  onAskMilo,
}: {
  assumptions: AssumptionRow[]
  experiments: ExperimentRow[]
  onLink: (experimentId: string, assumptionId: string) => Promise<unknown>
  onStatus: (experimentId: string, status: string) => Promise<unknown>
  onAskMilo: (about: string) => void
}) {
  const reduce = useReducedMotion()
  const [picked, setPicked] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ id: string; kind: 'pass' | 'fail' } | null>(null)
  const flashTimer = useRef<number | null>(null)

  const byId = useMemo(() => new Map(assumptions.map((a) => [a.id, a])), [assumptions])
  const pickedRow = picked ? byId.get(picked) : null
  const openRow = experiments.find((e) => e.id === open) ?? null

  async function setStatus(id: string, status: string) {
    await onStatus(id, status)
    if (status === 'passed' || status === 'failed') {
      setFlash({ id, kind: status === 'passed' ? 'pass' : 'fail' })
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlash(null), 1800)
    }
  }

  const unresolved = assumptions.filter((a) => a.status !== 'supported')

  return (
    <div className="relative">
      {/* The result of a run, announced properly rather than as a toast. */}
      <AnimatePresence>
        {flash && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className={`pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full border px-4 py-2 text-[13px] backdrop-blur-md ${
              flash.kind === 'pass'
                ? 'border-signal/60 bg-signal-wash text-signal'
                : 'border-risk/60 bg-risk-wash text-risk'
            }`}
          >
            {flash.kind === 'pass'
              ? 'Passed. That part of the chain just got firmer.'
              : 'Failed. That is a real finding — the assumption was wrong, not the venture.'}
          </motion.div>
        )}
      </AnimatePresence>

      <Terrain assumptions={assumptions} picked={picked} onPick={setPicked} onDragStart={setPicked} />

      {pickedRow && (
        <div className="mt-3 rounded-[3px] border border-[color:var(--rule)] bg-[rgb(var(--paper)/0.02)] p-4">
          <p className="text-[13.5px] leading-[1.6] text-paper">{pickedRow.claim}</p>
          <p className="mt-2 text-[12.5px] leading-[1.55] text-paper-faint">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-risk">breaks if false </span>
            {pickedRow.breaksIfFalse}
          </p>
          <p className="mt-2 text-[12.5px] leading-[1.55] text-paper-faint">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-signal">cheapest test </span>
            {pickedRow.cheapestTest}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => onAskMilo(`explain:${pickedRow.claim}`)}>
              <IconSpark size={12} />
              Ask Milo
            </Button>
            <Button variant="quiet" size="sm" onClick={() => setPicked(null)}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <p className="label">The bench</p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-sub">
            {unresolved.length} unresolved · {experiments.filter((e) => e.status === 'passed').length} passed
          </p>
        </div>

        {experiments.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {experiments.map((e) => (
              <Rig
                key={e.id}
                experiment={e}
                assumption={e.assumptionId ? (byId.get(e.assumptionId) ?? null) : null}
                onDrop={(aid) => onLink(e.id, aid)}
                onStatus={(s) => setStatus(e.id, s)}
                onOpen={() => setOpen(open === e.id ? null : e.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[4px] border border-dashed border-[color:var(--rule-strong)] p-8 text-center">
            <IconFlask size={18} className="mx-auto mb-3 text-paper-sub" />
            <p className="mx-auto max-w-[42ch] text-[13.5px] leading-[1.6] text-paper-faint">
              No rigs on the bench yet. Build the atlas and the lab fills with experiments designed against your
              riskiest assumptions — each with a pass line agreed before you start.
            </p>
          </div>
        )}
      </div>

      {/* ---------------- protocol drawer ---------------- */}
      <AnimatePresence>
        {openRow && (
          <motion.aside
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
            role="dialog"
            aria-label={`${openRow.name} protocol`}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col overflow-y-auto border-l border-[color:var(--rule)] bg-[rgb(var(--ink-800)/0.98)] p-6 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-sub">{openRow.kind}</p>
                <h3 className="display mt-1.5 text-[1.4rem] leading-tight text-paper">{openRow.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="tap -mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-[3px] text-paper-faint transition-colors hover:text-paper"
              >
                <IconClose size={15} />
              </button>
            </div>

            {[
              ['Hypothesis', openRow.hypothesis],
              ['Method', openRow.method],
              ['Passes if', openRow.successThreshold],
              ['Fails if', openRow.failThreshold],
              ['Sample', openRow.sampleSize],
              ['Duration', openRow.duration],
              ['Cost', openRow.cost],
              ['What you learned', openRow.result],
            ]
              .filter(([, val]) => val)
              .map(([label, val]) => (
                <div key={label as string} className="mt-5">
                  <p className="label mb-1.5">{label}</p>
                  <p className="text-[13px] leading-[1.65] text-paper-dim">{val}</p>
                </div>
              ))}

            {openRow.script?.length ? (
              <div className="mt-5">
                <p className="label mb-2">Script</p>
                <ol className="space-y-2">
                  {openRow.script.map((q, i) => (
                    <li key={i} className="flex gap-3 text-[13px] leading-[1.6] text-paper-dim">
                      <span className="num shrink-0 font-mono text-[10.5px] text-paper-sub">{String(i + 1).padStart(2, '0')}</span>
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              className="mt-auto w-full"
              onClick={() => onAskMilo(`explain:${openRow.name}`)}
            >
              <IconSpark size={13} />
              Ask Milo about this experiment
            </Button>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
