'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Button, IconClose, IconSpark } from '@/components/ui/kit'
import { SignalSystem, type Signal } from './SignalSystem'
import type { CoreLink, CoreNode } from './VentureCore'
import type { Genome, Verdict } from '@/lib/atlas-types'
import type { AssumptionRow, ExperimentRow, SourceRow, VentureRow } from '../useVenture'

const VentureCore = dynamic(() => import('./VentureCore').then((m) => m.VentureCore), {
  ssr: false,
  loading: () => <CoreFallback />,
})

function webglAvailable() {
  if (typeof window === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

/** The drawn stand-in: the same chain, flat. Never an empty box. */
function CoreFallback({ nodes = [] as CoreNode[] }) {
  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <svg viewBox="0 0 420 150" className="h-full w-full max-w-[520px]" role="img" aria-label="The venture value chain">
        <line x1="20" y1="96" x2="400" y2="96" stroke="var(--rule)" strokeWidth="1" />
        {(nodes.length ? nodes : Array.from({ length: 6 }, () => null)).slice(0, 6).map((n, i) => {
          const x = 40 + i * 68
          const h = n ? 20 + (n.strength / 5) * 46 : 40
          const tone = !n ? 'rgb(var(--paper)/0.2)' : n.risk >= 4 ? 'rgb(var(--risk))' : n.evidenced ? 'rgb(var(--signal))' : 'rgb(var(--unknown))'
          return (
            <g key={i}>
              <rect
                x={x - 15}
                y={96 - h}
                width="30"
                height={h}
                rx="2"
                fill={tone}
                fillOpacity={n?.evidenced ? 0.9 : 0.3}
                stroke={tone}
                strokeWidth="1.2"
              />
              {n && (
                <text x={x} y="116" textAnchor="middle" fontSize="8" fill="rgb(var(--paper-faint))" fontFamily="var(--font-mono), monospace">
                  {n.kind.slice(0, 8)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Turning real rows into the model and the signals.
 * ------------------------------------------------------------------ */

/** Words in an assumption or source that tie it to a part of the chain. */
const KIND_WORDS: Record<string, string[]> = {
  customer: ['customer', 'user', 'buyer', 'segment', 'audience'],
  pain: ['pain', 'problem', 'frustration', 'need'],
  solution: ['solution', 'product', 'feature', 'build'],
  advantage: ['advantage', 'moat', 'defensib', 'differenti'],
  distribution: ['distribution', 'channel', 'acquisition', 'reach', 'marketing'],
  revenue: ['revenue', 'price', 'pricing', 'pay', 'willing', 'monet'],
}

function matches(kind: string, text: string) {
  const words = KIND_WORDS[kind.toLowerCase()]
  if (!words) return false
  const t = text.toLowerCase()
  return words.some((w) => t.includes(w))
}

export function buildCore(
  genome: Genome | null,
  assumptions: AssumptionRow[],
  sources: SourceRow[],
): { nodes: CoreNode[]; links: CoreLink[] } {
  if (!genome?.nodes?.length) return { nodes: [], links: [] }

  const nodes: CoreNode[] = genome.nodes.map((n) => {
    const related = assumptions.filter((a) => matches(n.kind, `${a.claim} ${a.category}`))
    const unresolved = related.filter((a) => a.status !== 'supported')
    const risk = unresolved.reduce((max, a) => Math.max(max, a.impact), 0)
    const evidenced = sources.some((s) => matches(n.kind, `${s.title} ${s.snippet}`))
    return {
      id: n.id,
      kind: n.kind,
      label: n.label,
      strength: Math.min(5, Math.max(1, n.strength)),
      unknowns: n.unknowns?.length ?? 0,
      evidenced,
      risk,
    }
  })

  const links: CoreLink[] = (genome.links ?? []).map((l) => ({ from: l.from, to: l.to }))
  return { nodes, links }
}

export function buildSignals({
  verdict,
  nodes,
  assumptions,
  experiments,
  sources,
}: {
  verdict: Verdict | null
  nodes: CoreNode[]
  assumptions: AssumptionRow[]
  experiments: ExperimentRow[]
  sources: SourceRow[]
}): Signal[] {
  const conf = verdict?.confidence === 'high' ? 0.85 : verdict?.confidence === 'moderate' ? 0.55 : 0.25
  const evidenced = nodes.filter((n) => n.evidenced).length
  const coverage = nodes.length ? evidenced / nodes.length : 0
  const sourced = sources.filter((s) => s.evidence === 'sourced').length

  const critical = assumptions.filter((a) => a.impact >= 4 && a.status !== 'supported')
  // High uncertainty is bad, so the signal is inverted: 1 means little left to fear.
  const uncertainty = assumptions.length ? 1 - critical.length / assumptions.length : 0

  const done = experiments.filter((e) => e.status === 'passed' || e.status === 'failed').length
  const progress = experiments.length ? done / experiments.length : 0

  return [
    {
      id: 'confidence',
      label: 'Analysis confidence',
      value: conf,
      tone: 'intel',
      reading: verdict?.reasoning
        ? verdict.reasoning
        : 'No verdict yet. Build the atlas and the analysis will say how sure it is, and why.',
      drivers: [
        verdict?.strongestSignal ? { text: verdict.strongestSignal, effect: 'up' as const } : null,
        verdict?.fatalFlawRisk ? { text: verdict.fatalFlawRisk, effect: 'down' as const } : null,
      ].filter(Boolean) as Signal['drivers'],
    },
    {
      id: 'coverage',
      label: 'Evidence coverage',
      value: coverage,
      tone: 'signal',
      reading: nodes.length
        ? `${evidenced} of ${nodes.length} parts of the chain are backed by something you collected. ${sourced} source${sourced === 1 ? '' : 's'} carry a real link.`
        : 'Nothing to cover yet.',
      drivers: nodes
        .filter((n) => !n.evidenced)
        .slice(0, 4)
        .map((n) => ({ text: `${n.label} rests on assumption alone`, effect: 'down' as const })),
    },
    {
      id: 'uncertainty',
      label: 'Critical uncertainty',
      value: uncertainty,
      tone: critical.length ? 'risk' : 'signal',
      reading: assumptions.length
        ? `${critical.length} high-impact assumption${critical.length === 1 ? '' : 's'} still unresolved out of ${assumptions.length}. These are the ones that break the venture if they are wrong.`
        : 'No assumptions recorded yet.',
      drivers: critical.slice(0, 4).map((a) => ({ text: a.claim, effect: 'down' as const })),
    },
    {
      id: 'validation',
      label: 'Validation progress',
      value: progress,
      tone: 'unknown',
      reading: experiments.length
        ? `${done} of ${experiments.length} experiments have run to a result.`
        : 'No experiments designed yet. The lab turns your riskiest assumptions into cheap tests.',
      drivers: experiments
        .filter((e) => e.status === 'planned')
        .slice(0, 4)
        .map((e) => ({ text: `${e.name} not started`, effect: 'down' as const })),
    },
  ]
}

/* ------------------------------------------------------------------ */

export function CoreStage({
  venture,
  genome,
  verdict,
  assumptions,
  experiments,
  sources,
  onAskMilo,
}: {
  venture: VentureRow
  genome: Genome | null
  verdict: Verdict | null
  assumptions: AssumptionRow[]
  experiments: ExperimentRow[]
  sources: SourceRow[]
  onAskMilo: (about: string) => void
}) {
  const reduce = useReducedMotion()
  const [selected, setSelected] = useState<string | null>(null)
  const [canRender, setCanRender] = useState<boolean | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setCanRender(webglAvailable())
    const onLost = () => setFailed(true)
    window.addEventListener('webglcontextlost', onLost)
    return () => window.removeEventListener('webglcontextlost', onLost)
  }, [])

  const { nodes, links } = useMemo(
    () => buildCore(genome, assumptions, sources),
    [genome, assumptions, sources],
  )
  const signals = useMemo(
    () => buildSignals({ verdict, nodes, assumptions, experiments, sources }),
    [verdict, nodes, assumptions, experiments, sources],
  )

  const picked = nodes.find((n) => n.id === selected) ?? null
  const pickedGenome = genome?.nodes.find((n) => n.id === selected) ?? null
  const pickedAssumptions = useMemo(
    () => (picked ? assumptions.filter((a) => matches(picked.kind, `${a.claim} ${a.category}`)) : []),
    [picked, assumptions],
  )

  const weakest = nodes.slice().sort((a, b) => a.strength - b.strength)[0]
  const critical = assumptions.filter((a) => a.impact >= 4 && a.status !== 'supported')
  const nextAction = critical.length
    ? { text: `Test "${critical[0].claim}" — it is the highest-impact thing still unproven.`, onClick: () => onAskMilo('biggestrisk') }
    : weakest && !weakest.evidenced
      ? { text: `Go and find evidence for ${weakest.label}. It is the weakest link in the chain.`, onClick: () => onAskMilo('interviews') }
      : nodes.length
        ? { text: 'Design the next experiment and put a pass line on it before you start.', onClick: () => onAskMilo('cheapest') }
        : null

  const useStatic = canRender === null || reduce || !canRender || failed

  return (
    <section aria-label="Venture core" className="rule-b grid grid-cols-1 gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-12">
      {/* ---------------- the model ---------------- */}
      <div className="relative min-h-[320px] overflow-hidden rounded-[4px] border border-[color:var(--rule)] bg-[rgb(var(--ink-900)/0.5)] lg:min-h-[420px]">
        {nodes.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-center">
            <p className="max-w-[34ch] text-[13.5px] leading-[1.6] text-paper-faint">
              The core assembles once the atlas is built. Every part of the chain appears here, sized by how strongly
              it holds and see-through where it rests on assumption.
            </p>
          </div>
        ) : useStatic ? (
          <div className="h-full min-h-[320px] lg:min-h-[420px]">
            <CoreFallback nodes={nodes} />
          </div>
        ) : (
          <div className="h-full min-h-[320px] lg:min-h-[420px]">
            <VentureCore nodes={nodes} links={links} selected={selected} onSelect={setSelected} />
          </div>
        )}

        {/* Legend: the materials mean something, so say what. */}
        {nodes.length > 0 && (
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em]">
            {[
              ['bg-signal', 'evidenced'],
              ['bg-unknown', 'assumed'],
              ['bg-risk', 'fractured'],
            ].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5 text-paper-sub">
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${c}`} />
                {l}
              </span>
            ))}
          </div>
        )}

        {/* ---------------- component drawer ---------------- */}
        <AnimatePresence>
          {picked && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
              transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
              className="absolute inset-y-0 right-0 z-10 w-full max-w-[330px] overflow-y-auto border-l border-[color:var(--rule)] bg-[rgb(var(--ink-800)/0.97)] p-5 backdrop-blur-xl"
              role="dialog"
              aria-label={`${picked.label} detail`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-paper-sub">{picked.kind}</p>
                  <h3 className="display mt-1 text-[1.3rem] leading-tight text-paper">{picked.label}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="tap -mr-1.5 -mt-1 flex h-8 w-8 items-center justify-center rounded-[3px] text-paper-faint transition-colors hover:text-paper"
                >
                  <IconClose size={14} />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[color:var(--rule-strong)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-dim">
                  strength {picked.strength}/5
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
                    picked.evidenced ? 'border-signal/45 text-signal' : 'border-unknown/45 text-unknown'
                  }`}
                >
                  {picked.evidenced ? 'evidenced' : 'assumed'}
                </span>
                {picked.risk >= 4 && (
                  <span className="rounded-full border border-risk/45 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-risk">
                    fractured
                  </span>
                )}
              </div>

              {pickedGenome?.detail && (
                <p className="mt-4 text-[13px] leading-[1.65] text-paper-dim">{pickedGenome.detail}</p>
              )}

              {pickedGenome?.unknowns?.length ? (
                <div className="mt-5">
                  <p className="label mb-2">Unknowns</p>
                  <ul className="space-y-1.5">
                    {pickedGenome.unknowns.map((u, i) => (
                      <li key={i} className="flex gap-2.5 text-[12.5px] leading-[1.5] text-paper-faint">
                        <span aria-hidden="true" className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-unknown" />
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {pickedAssumptions.length > 0 && (
                <div className="mt-5">
                  <p className="label mb-2">Assumptions riding on this</p>
                  <ul className="space-y-2">
                    {pickedAssumptions.slice(0, 5).map((a) => (
                      <li key={a.id} className="text-[12.5px] leading-[1.5]">
                        <span className="text-paper-dim">{a.claim}</span>
                        <span
                          className={`ml-2 font-mono text-[10px] uppercase ${
                            a.status === 'supported' ? 'text-signal' : a.status === 'refuted' ? 'text-risk' : 'text-paper-sub'
                          }`}
                        >
                          {a.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="mt-6 w-full"
                onClick={() => onAskMilo(`explain:${picked.label}`)}
              >
                <IconSpark size={13} />
                Ask Milo about this
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------------- the signals ---------------- */}
      <div>
        <SignalSystem
          score={venture.healthScore}
          label={
            verdict?.verdict
              ? `${verdict.verdict}. ${verdict.confidence} confidence. Four signals feed this — open one to see what moves it.`
              : 'Not analysed yet. Build the atlas and the signals below will populate from real rows.'
          }
          signals={signals}
          nextAction={nextAction}
        />
      </div>
    </section>
  )
}
