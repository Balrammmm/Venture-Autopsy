'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import { Button, IconArchive, IconTrash, Spinner } from '@/components/ui/kit'

export interface VentureSummary {
  id: string
  title: string
  rawIdea: string
  stage: string
  status: string
  verdict: string | null
  confidence: string | null
  healthScore: number
  accent: string
  createdAt: string
  updatedAt: string
  _count?: { assumptions: number; experiments: number; sources: number }
}

/**
 * Each venture is drawn as a specimen plate rather than a table row: a seeded
 * sigil whose density reflects the health score, so the library reads at a
 * glance and no two ventures look alike.
 */
function Sigil({ id, score, accent }: { id: string; score: number; accent: string }) {
  const seed = Array.from(id).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100000, 7)
  const color = accent === 'ember' ? '#FF5A1F' : '#C8FB2E'

  const rings = 3
  const bars: { a: number; r: number; len: number; ring: number }[] = []
  let s = seed
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }

  for (let ring = 0; ring < rings; ring++) {
    const count = 8 + ring * 5
    const radius = 22 + ring * 15
    for (let i = 0; i < count; i++) {
      // Denser rings on healthier ventures; a fragile one reads as sparse.
      if (rand() > 0.35 + (score / 100) * 0.55) continue
      bars.push({ a: (i / count) * Math.PI * 2, r: radius, len: 5 + rand() * 7, ring })
    }
  }

  return (
    <svg viewBox="0 0 140 140" className="h-full w-full" aria-hidden="true">
      <circle cx="70" cy="70" r="66" fill="none" stroke="var(--rule)" strokeWidth="1" />
      <circle cx="70" cy="70" r="52" fill="none" stroke="var(--rule)" strokeWidth="1" strokeDasharray="1 7" />
      {bars.map((b, i) => {
        const x1 = 70 + Math.cos(b.a) * b.r
        const y1 = 70 + Math.sin(b.a) * b.r
        const x2 = 70 + Math.cos(b.a) * (b.r + b.len)
        const y2 = 70 + Math.sin(b.a) * (b.r + b.len)
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeOpacity={0.85 - b.ring * 0.22}
            strokeWidth={b.ring === 0 ? 2.4 : 1.4}
            strokeLinecap="round"
          />
        )
      })}
      <circle cx="70" cy="70" r="11" fill={color} fillOpacity="0.85" />
      <text
        x="70"
        y="74.5"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fontFamily="var(--font-mono), monospace"
        fill="#080A07"
      >
        {score}
      </text>
    </svg>
  )
}

const VERDICT_TONE: Record<string, string> = {
  'High Risk': 'text-ember',
  Promising: 'text-lime',
  'Needs Validation': 'text-paper-dim',
}

export function VentureCard({
  venture,
  onArchive,
  onDelete,
  index = 0,
}: {
  venture: VentureSummary
  onArchive: (id: string, archived: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  index?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const archived = venture.status === 'archived'

  // Pointer-tracked tilt. Subtle, and only on fine pointers.
  function onMove(e: React.PointerEvent) {
    if (reduce || e.pointerType === 'touch' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.transform = `perspective(900px) rotateX(${-py * 4}deg) rotateY(${px * 5}deg) translateZ(0)`
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = ''
  }

  async function act(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: Math.min(index * 0.05, 0.3) }}
    >
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="group relative transition-transform duration-200 ease-out will-change-transform"
      >
        <Link
          href={`/venture/${venture.id}`}
          className="block rounded-[3px] border border-[rgba(243,238,226,0.12)] bg-[rgba(243,238,226,0.02)] p-5 transition-colors duration-200 ease-out hover:border-[rgba(243,238,226,0.32)]"
          style={{ boxShadow: '0 20px 50px -30px rgba(0,0,0,0.95)' }}
        >
          <div className="flex items-start gap-5">
            <div className="w-[76px] shrink-0 md:w-[92px]">
              <Sigil id={venture.id} score={venture.healthScore} accent={venture.accent} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="display text-[1.35rem] leading-[1.14] text-paper transition-colors duration-150 group-hover:text-lime">
                {venture.title}
              </p>
              <p className="mt-1.5 line-clamp-2 max-w-measure text-[13px] leading-[1.55] text-paper-faint">
                {venture.rawIdea}
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em]">
                {venture.verdict ? (
                  <span className={VERDICT_TONE[venture.verdict] ?? 'text-paper-dim'}>{venture.verdict}</span>
                ) : (
                  <span className="text-paper-sub">{venture.stage === 'analysing' ? 'Analysing' : 'Not analysed'}</span>
                )}
                {venture._count && (
                  <>
                    <span className="num text-paper-sub">{venture._count.assumptions} assumptions</span>
                    <span className="num text-paper-sub">{venture._count.experiments} experiments</span>
                    {venture._count.sources > 0 && (
                      <span className="num text-lime">{venture._count.sources} sources</span>
                    )}
                  </>
                )}
                <span className="num text-paper-sub">{new Date(venture.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Row actions sit outside the link so they never fight it for the click. */}
        <div className="no-print absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
          {confirming ? (
            <>
              <Button variant="danger" size="sm" onClick={() => act(() => onDelete(venture.id))} disabled={busy}>
                {busy ? <Spinner /> : null}
                Delete for good
              </Button>
              <Button variant="quiet" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
                Keep
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="quiet"
                size="sm"
                onClick={() => act(() => onArchive(venture.id, !archived))}
                disabled={busy}
                aria-label={archived ? `Restore ${venture.title}` : `Archive ${venture.title}`}
                title={archived ? 'Restore' : 'Archive'}
              >
                <IconArchive size={13} />
              </Button>
              <Button
                variant="quiet"
                size="sm"
                onClick={() => setConfirming(true)}
                disabled={busy}
                aria-label={`Delete ${venture.title}`}
                title="Delete"
              >
                <IconTrash size={13} />
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
