'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ACTS, ACT_LABEL, useScrollDirector, type ActId } from '../scroll/ScrollDirector'
import { useTheme } from '../theme/ThemeProvider'

/* ------------------------------------------------------------------ *
 * Progress rail — the venture journey, not a scrollbar.
 * ------------------------------------------------------------------ */

/**
 * The journey indicator. On desktop it lives inside the reserved rail gutter,
 * so it occupies its own column and can never sit under copy. Below the split
 * it becomes a slim top bar under the header instead of floating over content.
 */
export function ProgressRail() {
  const { active, pageProgress, scrollToAct } = useScrollDirector()
  const index = ACTS.indexOf(active)

  return (
    <>
      {/*
        Desktop: a hairline, five dots and exactly one label — the current
        stage. Locked to a narrow gutter that the layout reserves for it, so it
        cannot reach content, canvas or CTAs at any width.
      */}
      <nav
        aria-label="Page sections"
        className="no-print fixed left-0 top-1/2 hidden w-[104px] -translate-y-1/2 lg:block"
        style={{ zIndex: Z_RAIL }}
      >
        <div className="relative flex flex-col items-center">
          {/* The track the dots sit on. */}
          <div className="relative flex flex-col items-center gap-1 py-1">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[color:var(--rule)]"
            >
              <span
                className="block w-full origin-top bg-action transition-transform duration-300 ease-out"
                style={{ height: '100%', transform: `scaleY(${pageProgress})` }}
              />
            </span>

            {ACTS.map((id, i) => {
              const on = id === active
              const past = index > i
              return (
                <button
                  key={id}
                  onClick={() => scrollToAct(id)}
                  aria-current={on ? 'step' : undefined}
                  title={ACT_LABEL[id]}
                  className="tap group relative flex h-7 w-8 items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={`block rounded-full transition-all duration-300 ease-out ${
                      on
                        ? 'h-[7px] w-[7px] bg-action ring-4 ring-[rgb(var(--action)/0.16)]'
                        : past
                          ? 'h-[5px] w-[5px] bg-paper-faint'
                          : 'h-[5px] w-[5px] bg-paper-sub group-hover:bg-paper-faint'
                    }`}
                  />
                  <span className="sr-only">{ACT_LABEL[id]}</span>
                </button>
              )
            })}
          </div>

          {/* One label only, for the current stage. Rotated to stay inside
              the gutter rather than reaching across the page. */}
          <p
            aria-hidden="true"
            className="mt-5 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.22em] text-paper-faint"
            style={{ writingMode: 'vertical-rl' }}
          >
            {ACT_LABEL[active]}
          </p>
        </div>
      </nav>

      {/* Mobile: a compact horizontal indicator, out of the content flow. */}
      <div
        className="no-print pointer-events-none fixed inset-x-0 lg:hidden"
        style={{ top: 68, zIndex: Z_RAIL_MOBILE }}
        aria-hidden="true"
      >
        {/* Its own ground, so copy scrolling beneath never mixes with it. */}
        <div className="mx-5 inline-flex items-center gap-2.5 rounded-full border border-[color:var(--rule)] bg-[rgb(var(--ink-800)/0.88)] py-1.5 pl-3 pr-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            {ACTS.map((id, i) => (
              <span
                key={id}
                className={`h-[3px] rounded-full transition-all duration-300 ease-out ${
                  id === active ? 'w-5 bg-action' : index > i ? 'w-2 bg-paper-faint' : 'w-2 bg-paper-sub'
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper-faint">
            {ACT_LABEL[active]}
          </span>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {ACT_LABEL[active]}
      </p>
    </>
  )
}

const Z_RAIL = 30
// The compact indicator is chrome, so it rides above the header scrim.
const Z_RAIL_MOBILE = 55

/* ------------------------------------------------------------------ *
 * Theme toggle
 * ------------------------------------------------------------------ */

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle, ready } = useTheme()
  const reduce = useReducedMotion()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={!isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      disabled={!ready}
      className={`tap relative inline-flex h-9 w-[62px] shrink-0 items-center rounded-full border border-[color:var(--rule-strong)] bg-[rgb(var(--ink-700))] px-1 transition-colors duration-300 ease-out hover:border-action/50 disabled:opacity-50 ${className}`}
    >
      <motion.span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-action text-action-ink"
        animate={{ x: isDark ? 0 : 26 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', duration: 0.42, bounce: 0.22 }}
      >
        {isDark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M5.2 18.8l1.4-1.4M17.4 6.6l1.4-1.4" />
          </svg>
        )}
      </motion.span>
    </button>
  )
}

/* ------------------------------------------------------------------ *
 * Analysis lens — the cursor swells over anything interactive.
 * ------------------------------------------------------------------ */

export function AnalysisLens() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (reduce) return
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (!mq.matches) return
    setOn(true)

    const s = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, k: 1, tk: 1 }
    let raf = 0

    const move = (e: PointerEvent) => {
      s.tx = e.clientX
      s.ty = e.clientY
      const el = e.target as HTMLElement | null
      const hit = el?.closest('a,button,input,textarea,select,[role="button"],[role="switch"],[data-lens]')
      s.tk = hit ? 2.6 : 1
    }

    const tick = () => {
      s.x += (s.tx - s.x) * 0.17
      s.y += (s.ty - s.y) * 0.17
      s.k += (s.tk - s.k) * 0.13
      if (ref.current) {
        ref.current.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) scale(${s.k})`
      }
      if (ring.current) {
        // The ring trails a little further behind, which reads as depth.
        ring.current.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) scale(${0.6 + s.k * 0.55})`
        ring.current.style.opacity = String(Math.min(0.5, (s.k - 1) * 0.5))
      }
      raf = requestAnimationFrame(tick)
    }

    addEventListener('pointermove', move, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', move)
    }
  }, [reduce])

  if (!on) return null

  return (
    <>
      <div
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[70] h-16 w-16 rounded-full mix-blend-screen"
        style={{
          background:
            'radial-gradient(circle, rgb(var(--intel) / 0.26) 0%, rgb(var(--intel) / 0.07) 46%, transparent 70%)',
          willChange: 'transform',
        }}
      />
      <div
        ref={ring}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[70] h-16 w-16 rounded-full border border-intel/60"
        style={{ willChange: 'transform, opacity', opacity: 0 }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ *
 * A floating readout that names what the pointer is over in 3D.
 * ------------------------------------------------------------------ */

export function HoverReadout({ title, body }: { title: string | null; body?: string }) {
  const reduce = useReducedMotion()
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!title) return
    const move = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY })
    addEventListener('pointermove', move, { passive: true })
    return () => removeEventListener('pointermove', move)
  }, [title])

  if (!title) return null

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className="pointer-events-none fixed z-[65] max-w-[260px] rounded-[3px] border border-[color:var(--rule-strong)] bg-[rgb(var(--ink-700))]/95 px-3 py-2 backdrop-blur-md"
      style={{ left: Math.min(pos.x + 20, innerWidth - 280), top: Math.min(pos.y + 18, innerHeight - 90) }}
      role="status"
    >
      <p className="text-[13px] leading-tight text-paper">{title}</p>
      {body && <p className="mt-1 text-[12px] leading-[1.5] text-paper-faint">{body}</p>}
    </motion.div>
  )
}
