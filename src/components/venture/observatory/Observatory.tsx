'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Button, IconClose, IconLink, IconSpark, IconTrash } from '@/components/ui/kit'
import type { MarketTerrain, Persona } from '@/lib/atlas-types'
import type { AssumptionRow, SourceRow } from '../useVenture'

/**
 * The Evidence Observatory.
 *
 * Everything you have collected, laid out as a field you can explore rather
 * than a list you scroll. It is a real graph:
 *
 *   - Every source, competitor claim and customer statement is a node.
 *   - Nodes are drawn toward the cluster they belong to — Customer, Market,
 *     Competition, Pricing, Risk — by a small force simulation, and you can
 *     drag any node into a different cluster to reclassify it. The
 *     classification sticks.
 *   - Confidence lines run from a claim to the source backing it. A sourced
 *     link is solid, a pasted one dashed, an unbacked assumption is drawn as
 *     a line into fog.
 *   - Clusters with nothing in them render as fog: a visible hole in what you
 *     know, which is the most useful thing this screen can show you.
 *
 * Nothing here is invented. A node exists only because a row exists.
 */

export type ClusterId = 'customer' | 'market' | 'competition' | 'pricing' | 'risk'

export const CLUSTERS: { id: ClusterId; label: string; x: number; y: number }[] = [
  { id: 'customer', label: 'Customer', x: 0.2, y: 0.28 },
  { id: 'market', label: 'Market', x: 0.5, y: 0.16 },
  { id: 'competition', label: 'Competition', x: 0.8, y: 0.3 },
  { id: 'pricing', label: 'Pricing', x: 0.68, y: 0.74 },
  { id: 'risk', label: 'Risk', x: 0.28, y: 0.76 },
]

export type NodeKind = 'source' | 'claim' | 'persona' | 'unknown'

export interface EvidenceNode {
  id: string
  kind: NodeKind
  label: string
  detail: string
  cluster: ClusterId
  /** sourced | user_provided | hypothesis | unverified */
  integrity: 'sourced' | 'user_provided' | 'hypothesis' | 'unverified'
  url?: string | null
  at?: string | null
  /** Node ids this one is backed by. Drawn as confidence lines. */
  backedBy: string[]
  raw?: SourceRow | Persona | AssumptionRow
}

const INTEGRITY: Record<EvidenceNode['integrity'], { label: string; cls: string; dot: string }> = {
  sourced: { label: 'Sourced', cls: 'border-signal/45 text-signal', dot: 'bg-signal' },
  user_provided: { label: 'You provided', cls: 'border-intel/45 text-intel', dot: 'bg-intel' },
  hypothesis: { label: 'Hypothesis', cls: 'border-unknown/45 text-unknown', dot: 'bg-unknown' },
  unverified: { label: 'Unverified', cls: 'border-risk/45 text-risk', dot: 'bg-risk' },
}

/* ------------------------------------------------------------------ *
 * Classification. Keyword-led, overridable by dragging, and remembered.
 * ------------------------------------------------------------------ */

const WORDS: Record<ClusterId, string[]> = {
  customer: ['customer', 'user', 'interview', 'said', 'segment', 'persona', 'buyer', 'audience'],
  market: ['market', 'size', 'growth', 'trend', 'demand', 'industry', 'report'],
  competition: ['competitor', 'alternative', 'rival', 'incumbent', 'versus', 'already'],
  pricing: ['price', 'pricing', 'cost', 'pay', 'subscription', 'revenue', 'charge', 'willing'],
  risk: ['risk', 'regulat', 'legal', 'churn', 'fail', 'block', 'constraint', 'compliance'],
}

function classify(text: string): ClusterId {
  const t = text.toLowerCase()
  let best: ClusterId = 'market'
  let score = 0
  ;(Object.keys(WORDS) as ClusterId[]).forEach((c) => {
    const n = WORDS[c].reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0)
    if (n > score) {
      score = n
      best = c
    }
  })
  return best
}

function loadOverrides(ventureId: string): Record<string, ClusterId> {
  try {
    return JSON.parse(localStorage.getItem(`va_obs_${ventureId}`) || '{}')
  } catch {
    return {}
  }
}

/* ------------------------------------------------------------------ */

export function buildNodes({
  sources,
  market,
  assumptions,
  overrides,
}: {
  sources: SourceRow[]
  market: MarketTerrain | null
  assumptions: AssumptionRow[]
  overrides: Record<string, ClusterId>
}): EvidenceNode[] {
  const out: EvidenceNode[] = []

  sources.forEach((s) => {
    const id = `s:${s.id}`
    out.push({
      id,
      kind: 'source',
      label: s.title || s.kind,
      detail: s.snippet,
      cluster: overrides[id] ?? classify(`${s.title} ${s.snippet} ${s.kind}`),
      integrity: s.evidence === 'sourced' ? 'sourced' : 'user_provided',
      url: s.url,
      at: s.retrievedAt,
      backedBy: [],
      raw: s,
    })
  })

  market?.personas?.forEach((p) => {
    const id = `p:${p.id}`
    out.push({
      id,
      kind: 'persona',
      label: p.name,
      detail: `${p.role}. ${p.jobToBeDone}`,
      cluster: overrides[id] ?? 'customer',
      // A persona drawn from the idea alone is a hypothesis until a source says otherwise.
      integrity: 'hypothesis',
      backedBy: [],
      raw: p,
    })
  })

  market?.alternatives?.forEach((a, i) => {
    const id = `a:${i}`
    // Only claims the analysis itself marked as sourced get to say so.
    const backed = a.sourceIds
      ?.map((sid) => sources.find((s) => s.id.endsWith(sid))?.id)
      .filter(Boolean)
      .map((s) => `s:${s}`) as string[] | undefined
    out.push({
      id,
      kind: 'claim',
      label: a.name,
      detail: a.why,
      cluster: overrides[id] ?? 'competition',
      integrity: a.evidence === 'sourced' && backed?.length ? 'sourced' : 'hypothesis',
      backedBy: backed ?? [],
    })
  })

  market?.researchGaps?.forEach((g, i) => {
    const id = `g:${i}`
    out.push({
      id,
      kind: 'unknown',
      label: g.question,
      detail: `${g.howToAnswer} Blocks: ${g.blocksWhat}`,
      cluster: overrides[id] ?? classify(g.question),
      integrity: 'unverified',
      backedBy: [],
    })
  })

  assumptions
    .filter((a) => a.impact >= 4)
    .forEach((a) => {
      const id = `k:${a.id}`
      out.push({
        id,
        kind: 'claim',
        label: a.claim,
        detail: a.breaksIfFalse,
        cluster: overrides[id] ?? classify(`${a.claim} ${a.category}`),
        integrity: a.status === 'supported' ? 'user_provided' : 'unverified',
        backedBy: [],
        raw: a,
      })
    })

  return out
}

/* ------------------------------------------------------------------ */

interface Placed extends EvidenceNode {
  x: number
  y: number
  vx: number
  vy: number
}

export function Observatory({
  ventureId,
  sources,
  market,
  assumptions,
  onDeleteSource,
  onAskMilo,
}: {
  ventureId: string
  sources: SourceRow[]
  market: MarketTerrain | null
  assumptions: AssumptionRow[]
  onDeleteSource: (id: string) => Promise<unknown>
  onAskMilo: (about: string) => void
}) {
  const reduce = useReducedMotion()
  const wrap = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 900, h: 520 })
  const [overrides, setOverrides] = useState<Record<string, ClusterId>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [, force] = useState(0)

  useEffect(() => {
    setOverrides(loadOverrides(ventureId))
  }, [ventureId])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(320, r.width), h: Math.max(360, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const nodes = useMemo(
    () => buildNodes({ sources, market, assumptions, overrides }),
    [sources, market, assumptions, overrides],
  )

  // Live positions live in a ref: the simulation runs per frame, not per render.
  const placed = useRef<Map<string, Placed>>(new Map())
  useEffect(() => {
    const next = new Map<string, Placed>()
    nodes.forEach((n, i) => {
      const prev = placed.current.get(n.id)
      const home = CLUSTERS.find((c) => c.id === n.cluster)!
      next.set(n.id, {
        ...n,
        x: prev?.x ?? home.x * size.w + Math.cos(i) * 40,
        y: prev?.y ?? home.y * size.h + Math.sin(i) * 40,
        vx: 0,
        vy: 0,
      })
    })
    placed.current = next
    force((n) => n + 1)
  }, [nodes, size.w, size.h])

  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)

  useEffect(() => {
    if (reduce) return
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const list = [...placed.current.values()]
      if (!list.length) return

      list.forEach((n) => {
        if (dragRef.current?.id === n.id) return
        const home = CLUSTERS.find((c) => c.id === n.cluster)!
        // Pulled toward its cluster.
        n.vx += (home.x * size.w - n.x) * 0.0022
        n.vy += (home.y * size.h - n.y) * 0.0022
        // Pushed off its neighbours, so nothing stacks unreadably.
        list.forEach((o) => {
          if (o === n) return
          const dx = n.x - o.x
          const dy = n.y - o.y
          const d2 = dx * dx + dy * dy
          if (d2 < 4900 && d2 > 0.01) {
            const f = (4900 - d2) / 4900
            const d = Math.sqrt(d2)
            n.vx += (dx / d) * f * 0.65
            n.vy += (dy / d) * f * 0.65
          }
        })
        n.vx *= 0.86
        n.vy *= 0.86
        n.x = Math.max(28, Math.min(size.w - 28, n.x + n.vx))
        n.y = Math.max(24, Math.min(size.h - 24, n.y + n.vy))

        const el = document.getElementById(`obs-${n.id}`)
        if (el) el.style.transform = `translate3d(${Math.round(n.x)}px, ${Math.round(n.y)}px, 0) translate(-50%, -50%)`
      })

      // Confidence lines follow their endpoints.
      list.forEach((n) => {
        n.backedBy.forEach((b, i) => {
          const target = placed.current.get(b)
          const line = document.getElementById(`obsline-${n.id}-${i}`)
          if (!target || !line) return
          line.setAttribute('x1', String(n.x))
          line.setAttribute('y1', String(n.y))
          line.setAttribute('x2', String(target.x))
          line.setAttribute('y2', String(target.y))
        })
      })
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [size.w, size.h, reduce])

  const reclassify = useCallback(
    (id: string, cluster: ClusterId) => {
      setOverrides((prev) => {
        const next = { ...prev, [id]: cluster }
        try {
          localStorage.setItem(`va_obs_${ventureId}`, JSON.stringify(next))
        } catch {
          /* the classification simply will not persist */
        }
        return next
      })
    },
    [ventureId],
  )

  function onPointerDown(e: React.PointerEvent, id: string) {
    const n = placed.current.get(id)
    if (!n || !wrap.current) return
    const r = wrap.current.getBoundingClientRect()
    dragRef.current = { id, dx: e.clientX - r.left - n.x, dy: e.clientY - r.top - n.y }
    setDragging(id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || !wrap.current) return
    const r = wrap.current.getBoundingClientRect()
    const n = placed.current.get(d.id)
    if (!n) return
    n.x = Math.max(28, Math.min(size.w - 28, e.clientX - r.left - d.dx))
    n.y = Math.max(24, Math.min(size.h - 24, e.clientY - r.top - d.dy))
    n.vx = 0
    n.vy = 0
    const el = document.getElementById(`obs-${n.id}`)
    if (el) el.style.transform = `translate3d(${Math.round(n.x)}px, ${Math.round(n.y)}px, 0) translate(-50%, -50%)`
  }

  function onPointerUp() {
    const d = dragRef.current
    dragRef.current = null
    setDragging(null)
    if (!d) return
    const n = placed.current.get(d.id)
    if (!n) return
    // Dropped into whichever cluster centre is nearest.
    let best = CLUSTERS[0]
    let bestD = Infinity
    CLUSTERS.forEach((c) => {
      const dd = Math.hypot(c.x * size.w - n.x, c.y * size.h - n.y)
      if (dd < bestD) {
        bestD = dd
        best = c
      }
    })
    if (best.id !== n.cluster) reclassify(n.id, best.id)
  }

  const counts = useMemo(() => {
    const m = new Map<ClusterId, number>()
    CLUSTERS.forEach((c) => m.set(c.id, 0))
    nodes.forEach((n) => m.set(n.cluster, (m.get(n.cluster) ?? 0) + 1))
    return m
  }, [nodes])

  const pick = nodes.find((n) => n.id === selected) ?? null

  return (
    <div className="relative">
      <div
        ref={wrap}
        className="relative h-[520px] w-full overflow-hidden rounded-[4px] border border-[color:var(--rule)] bg-[rgb(var(--ink-900)/0.45)]"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Cluster fields. An empty one is fog — a hole in what you know. */}
        {CLUSTERS.map((c) => {
          const n = counts.get(c.id) ?? 0
          return (
            <div
              key={c.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: c.x * size.w, top: c.y * size.h }}
            >
              <div
                className={`h-[190px] w-[190px] rounded-full ${n === 0 ? 'animate-pulse' : ''}`}
                style={{
                  background: n
                    ? 'radial-gradient(circle, rgb(var(--paper)/0.05) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgb(var(--unknown)/0.14) 0%, transparent 68%)',
                  border: n ? '1px dashed var(--rule)' : '1px dashed rgb(var(--unknown)/0.45)',
                  borderRadius: '50%',
                }}
              />
              <p className="absolute left-1/2 top-1/2 w-[190px] -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-paper-sub">{c.label}</span>
                <span className={`mt-1 block text-[11px] ${n ? 'text-paper-faint' : 'text-unknown'}`}>
                  {n ? `${n} item${n === 1 ? '' : 's'}` : 'nothing here yet'}
                </span>
              </p>
            </div>
          )
        })}

        {/* Confidence lines. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {nodes.flatMap((n) =>
            n.backedBy.map((b, i) => (
              <line
                key={`${n.id}-${i}`}
                id={`obsline-${n.id}-${i}`}
                stroke="rgb(var(--signal))"
                strokeWidth="1.2"
                strokeOpacity="0.5"
                strokeDasharray={n.integrity === 'sourced' ? undefined : '3 3'}
              />
            )),
          )}
        </svg>

        {/* Nodes. */}
        {nodes.map((n) => {
          const tone = INTEGRITY[n.integrity]
          const on = selected === n.id
          return (
            <button
              key={n.id}
              id={`obs-${n.id}`}
              type="button"
              onPointerDown={(e) => onPointerDown(e, n.id)}
              onClick={() => setSelected(on ? null : n.id)}
              aria-label={`${n.label} — ${tone.label}`}
              className={`tap absolute left-0 top-0 flex max-w-[168px] cursor-grab items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-[box-shadow,border-color] duration-150 active:cursor-grabbing ${
                on ? 'border-action bg-[rgb(var(--ink-700))]' : 'border-[color:var(--rule-strong)] bg-[rgb(var(--ink-800)/0.92)] hover:border-paper-sub'
              } ${dragging === n.id ? 'z-20 shadow-[var(--shadow-lift)]' : 'z-10'}`}
              style={{ transform: 'translate3d(0,0,0) translate(-50%,-50%)' }}
            >
              <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
              <span className="truncate text-[11.5px] leading-tight text-paper-dim">{n.label}</span>
            </button>
          )
        })}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
            <p className="max-w-[38ch] text-[13.5px] leading-[1.6] text-paper-faint">
              Nothing collected yet. Every source you attach and every claim the analysis makes appears here as a
              node you can drag, cluster and open — and the empty rings show you exactly where the holes are.
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-[12px] text-paper-sub">
        Drag any node into a different ring to reclassify it. Faded rings are gaps in your evidence.
      </p>

      {/* ---------------- evidence drawer ---------------- */}
      <AnimatePresence>
        {pick && (
          <motion.aside
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
            role="dialog"
            aria-label={`${pick.label} evidence`}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col overflow-y-auto border-l border-[color:var(--rule)] bg-[rgb(var(--ink-800)/0.98)] p-6 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${INTEGRITY[pick.integrity].cls}`}
                >
                  {INTEGRITY[pick.integrity].label}
                </span>
                <h3 className="display mt-3 text-[1.4rem] leading-tight text-paper">{pick.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="tap -mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-[3px] text-paper-faint transition-colors hover:text-paper"
              >
                <IconClose size={15} />
              </button>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-[13.5px] leading-[1.7] text-paper-dim">{pick.detail}</p>

            <dl className="mt-6 space-y-2.5 text-[12.5px]">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-mono uppercase tracking-[0.12em] text-paper-sub">Cluster</dt>
                <dd className="text-paper-dim">{CLUSTERS.find((c) => c.id === pick.cluster)?.label}</dd>
              </div>
              {pick.at && (
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 font-mono uppercase tracking-[0.12em] text-paper-sub">Retrieved</dt>
                  <dd className="num text-paper-dim">{new Date(pick.at).toLocaleString()}</dd>
                </div>
              )}
              {pick.url && (
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 font-mono uppercase tracking-[0.12em] text-paper-sub">Source</dt>
                  <dd className="min-w-0">
                    <a
                      href={pick.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="tap inline-flex items-center gap-1.5 break-all text-action-text underline-offset-4 hover:underline"
                    >
                      <IconLink size={12} />
                      {pick.url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-auto space-y-2 pt-8">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => onAskMilo(`explain:${pick.label}`)}>
                <IconSpark size={13} />
                Ask Milo about this
              </Button>
              {pick.id.startsWith('s:') && (
                <Button
                  variant="quiet"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    await onDeleteSource(pick.id.slice(2))
                    setSelected(null)
                  }}
                >
                  <IconTrash size={12} />
                  Remove this source
                </Button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
