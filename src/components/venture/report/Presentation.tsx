'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Button, IconClose } from '@/components/ui/kit'

/**
 * Presentation mode.
 *
 * The report, told one beat at a time, for showing to somebody else. It takes
 * the whole screen, moves with arrow keys, space or a click, and never
 * animates anything a reader has to chase. Escape leaves.
 *
 * Print is deliberately unaffected: printing renders the scrolling report, not
 * this, because a slide deck makes a poor document.
 */

export interface Slide {
  /** Small label above the headline. */
  eyebrow: string
  headline: string
  /** One sentence of substance. Never a paragraph. */
  body?: string
  /** Figures, shown as a row of measurements. */
  stats?: { label: string; value: string; note?: string }[]
  /** Bullets. Kept to five; a slide with more is a document. */
  points?: string[]
  tone?: 'default' | 'risk' | 'signal'
}

export function Presentation({
  slides,
  title,
  onClose,
}: {
  slides: Slide[]
  title: string
  onClose: () => void
}) {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)

  const go = useCallback(
    (d: number) => setI((n) => Math.min(slides.length - 1, Math.max(0, n + d))),
    [slides.length],
  )

  useEffect(() => {
    wrap.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        go(1)
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(-1)
      }
      if (e.key === 'Home') setI(0)
      if (e.key === 'End') setI(slides.length - 1)
    }
    document.addEventListener('keydown', onKey)
    // The page behind must not scroll while a deck is open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [go, onClose, slides.length])

  const s = slides[i]
  const tone = s.tone === 'risk' ? 'text-risk' : s.tone === 'signal' ? 'text-signal' : 'text-action-text'

  return (
    <div
      ref={wrap}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — presentation`}
      className="no-print fixed inset-0 z-[60] flex flex-col bg-ink-900 outline-none"
    >
      {/* Chrome: quiet, and out of the way of the content. */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 md:px-10">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.22em] text-paper-sub">{title}</p>
        <div className="flex items-center gap-3">
          <p className="num font-mono text-[11px] text-paper-sub">
            {String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Leave presentation"
            className="tap flex h-9 w-9 items-center justify-center rounded-[3px] text-paper-faint transition-colors hover:text-paper"
          >
            <IconClose size={15} />
          </button>
        </div>
      </div>

      {/* The slide. Clicking anywhere advances, which is what people expect. */}
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next slide"
        className="flex flex-1 cursor-default items-center justify-center px-6 pb-16 text-left md:px-16"
      >
        <div className="relative w-full max-w-[62rem]">
          {/*
            Deliberately not `mode="wait"`: that holds the next slide back
            until the previous one has finished animating out, which makes the
            content depend on an animation completing. In a throttled tab that
            never happens and the deck appears frozen. The new slide mounts at
            once and the old one leaves underneath it.
          */}
          <AnimatePresence initial={false}>
            <motion.div
              key={i}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, position: 'absolute' }}
              transition={{ duration: reduce ? 0.12 : 0.34, ease: [0.23, 1, 0.32, 1] }}
            >
              <p className={`font-mono text-[11px] uppercase tracking-[0.22em] ${tone}`}>{s.eyebrow}</p>
              <h2 className="display mt-5 text-[clamp(2rem,5.4vw,4.2rem)] leading-[1.02] tracking-display text-paper">
                {s.headline}
              </h2>
              {s.body && (
                <p className="mt-6 max-w-[54ch] text-[clamp(1rem,1.6vw,1.25rem)] leading-[1.6] text-paper-dim">
                  {s.body}
                </p>
              )}

              {s.stats?.length ? (
                <dl className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 md:grid-cols-4">
                  {s.stats.map((st) => (
                    <div key={st.label}>
                      <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-paper-sub">{st.label}</dt>
                      <dd className="num mt-2 text-[clamp(1.4rem,2.6vw,2rem)] leading-none text-paper">{st.value}</dd>
                      {st.note && <p className="mt-2 text-[12px] leading-[1.45] text-paper-faint">{st.note}</p>}
                    </div>
                  ))}
                </dl>
              ) : null}

              {s.points?.length ? (
                <ul className="mt-9 space-y-3.5">
                  {s.points.slice(0, 5).map((p, n) => (
                    <motion.li
                      key={n}
                      initial={reduce ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: reduce ? 0 : 0.1 + n * 0.07 }}
                      className="flex gap-4 text-[clamp(0.95rem,1.4vw,1.1rem)] leading-[1.55] text-paper-dim"
                    >
                      <span className="num shrink-0 font-mono text-[11px] text-paper-sub">
                        {String(n + 1).padStart(2, '0')}
                      </span>
                      {p}
                    </motion.li>
                  ))}
                </ul>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </button>

      {/* Progress and controls. */}
      <div className="flex items-center gap-4 px-6 pb-6 md:px-10">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {slides.map((_, n) => (
            <span
              key={n}
              className={`h-[2px] flex-1 rounded-full transition-colors duration-300 ${
                n <= i ? 'bg-action' : 'bg-[rgb(var(--paper)/0.14)]'
              }`}
            />
          ))}
        </div>
        <div className="flex gap-1.5">
          <Button variant="quiet" size="sm" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous slide">
            ←
          </Button>
          <Button
            variant="quiet"
            size="sm"
            onClick={() => go(1)}
            disabled={i === slides.length - 1}
            aria-label="Next slide"
          >
            →
          </Button>
        </div>
      </div>
    </div>
  )
}
