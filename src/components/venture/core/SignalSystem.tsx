'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * The Venture Signal System.
 *
 * Readiness is one small result here, not the product. Four signals feed it,
 * each computed from real rows, each expandable to show exactly what moves it.
 * The bars are not decoration: a signal's fill is its value, and the connector
 * carrying it into the readiness figure pulses at a rate set by that value, so
 * a weak signal visibly starves the result.
 */

export interface Signal {
  id: string
  label: string
  /** 0–1. */
  value: number
  /** Plain-language summary of the current level. */
  reading: string
  /** What would move it, in order. */
  drivers: { text: string; effect: 'up' | 'down' }[]
  tone: 'signal' | 'intel' | 'risk' | 'unknown'
}

const TONE: Record<Signal['tone'], { text: string; bar: string; ring: string }> = {
  signal: { text: 'text-signal', bar: 'bg-signal', ring: 'rgb(var(--signal))' },
  intel: { text: 'text-intel', bar: 'bg-intel', ring: 'rgb(var(--intel))' },
  risk: { text: 'text-risk', bar: 'bg-risk', ring: 'rgb(var(--risk))' },
  unknown: { text: 'text-unknown', bar: 'bg-unknown', ring: 'rgb(var(--unknown))' },
}

function Readiness({ score, label }: { score: number; label: string }) {
  const reduce = useReducedMotion()
  const ref = useRef<SVGCircleElement>(null)
  const C = 2 * Math.PI * 34

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = (score / 100) * C
    if (reduce) {
      el.style.strokeDasharray = `${target} ${C}`
      return
    }
    // Counts up rather than snapping, so the figure reads as a measurement.
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900)
      const eased = 1 - Math.pow(1 - t, 3)
      el.style.strokeDasharray = `${target * eased} ${C}`
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score, C, reduce])

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[86px] w-[86px] shrink-0">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(var(--paper)/0.12)" strokeWidth="4" />
          <circle
            ref={ref}
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="rgb(var(--action-text))"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ strokeDasharray: `0 ${C}` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num display text-[26px] leading-none text-paper">{score}</span>
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-paper-sub">ready</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper-sub">Readiness</p>
        <p className="mt-1.5 max-w-[34ch] text-[13px] leading-[1.55] text-paper-dim">{label}</p>
      </div>
    </div>
  )
}

function SignalRow({ s, open, onToggle }: { s: Signal; open: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion()
  const tone = TONE[s.tone]
  const pct = Math.round(s.value * 100)

  return (
    <div className="rule-t py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="tap group flex w-full items-center gap-3 text-left"
      >
        {/* The connector: pulses faster the stronger the signal. */}
        <span aria-hidden="true" className="relative h-6 w-6 shrink-0">
          <span
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: tone.ring, opacity: 0.35 }}
          />
          <motion.span
            className="absolute inset-[5px] rounded-full"
            style={{ background: tone.ring }}
            animate={reduce ? {} : { scale: [1, 1.28, 1], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.6 - s.value * 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-[13.5px] font-medium text-paper">{s.label}</span>
            <span className={`num font-mono text-[11px] ${tone.text}`}>{pct}%</span>
          </span>
          <span className="mt-1.5 block h-[3px] w-full overflow-hidden rounded-full bg-[rgb(var(--paper)/0.1)]">
            <motion.span
              className={`block h-full rounded-full ${tone.bar}`}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: s.value }}
              style={{ transformOrigin: 'left' }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            />
          </span>
        </span>

        <span
          aria-hidden="true"
          className={`shrink-0 text-[11px] text-paper-sub transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        >
          ›
        </span>
      </button>

      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.26, ease: [0.23, 1, 0.32, 1] }}
        className="overflow-hidden"
      >
        <div className="pl-9 pt-3">
          <p className="max-w-[52ch] text-[13px] leading-[1.6] text-paper-dim">{s.reading}</p>
          {s.drivers.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {s.drivers.map((d, i) => (
                <li key={i} className="flex gap-2.5 text-[12.5px] leading-[1.5] text-paper-faint">
                  <span
                    aria-hidden="true"
                    className={`mt-[6px] h-1 w-1 shrink-0 rounded-full ${d.effect === 'up' ? 'bg-signal' : 'bg-risk'}`}
                  />
                  {d.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export function SignalSystem({
  score,
  label,
  signals,
  nextAction,
}: {
  score: number
  label: string
  signals: Signal[]
  nextAction: { text: string; href?: string; onClick?: () => void } | null
}) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div>
      <Readiness score={score} label={label} />

      <div className="mt-5">
        {signals.map((s) => (
          <SignalRow key={s.id} s={s} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} />
        ))}
      </div>

      {nextAction && (
        <div className="rule-t mt-1 pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-action-text">Next best action</p>
          <button
            type="button"
            onClick={nextAction.onClick}
            className="tap group mt-2 flex w-full items-start gap-2.5 text-left"
          >
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-action" aria-hidden="true" />
            <span className="text-[13.5px] leading-[1.55] text-paper transition-colors duration-150 group-hover:text-action-text">
              {nextAction.text}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
