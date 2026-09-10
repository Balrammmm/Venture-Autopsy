'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export const ACTS = ['hero', 'evidence', 'fieldwork', 'atlas', 'resolution'] as const
export type ActId = (typeof ACTS)[number]

export const ACT_LABEL: Record<ActId, string> = {
  hero: 'The idea',
  evidence: 'Evidence',
  fieldwork: 'Fieldwork',
  atlas: 'The atlas',
  resolution: 'The venture',
}

export interface ScrollState {
  /** 0–1 across the whole page. */
  page: number
  /** 0–1 within each act, clamped. */
  act: Record<ActId, number>
  /** The act currently filling the viewport. */
  active: ActId
  /** Viewport-relative scroll velocity, smoothed. Drives motion blur-ish cues. */
  velocity: number
}

interface Ctx {
  /** Mutable, read inside useFrame. Never triggers a render. */
  state: React.MutableRefObject<ScrollState>
  register: (id: ActId, el: HTMLElement | null) => void
  /** Throttled React state, for chrome that must actually re-render. */
  active: ActId
  pageProgress: number
  scrollToAct: (id: ActId) => void
}

const initial: ScrollState = {
  page: 0,
  act: { hero: 0, evidence: 0, fieldwork: 0, atlas: 0, resolution: 0 },
  active: 'hero',
  velocity: 0,
}

const ScrollCtx = createContext<Ctx | null>(null)

export function ScrollDirector({ children }: { children: React.ReactNode }) {
  const state = useRef<ScrollState>({ ...initial, act: { ...initial.act } })
  const els = useRef<Partial<Record<ActId, HTMLElement>>>({})
  const [active, setActive] = useState<ActId>('hero')
  const [pageProgress, setPageProgress] = useState(0)

  const register = useCallback((id: ActId, el: HTMLElement | null) => {
    if (el) els.current[id] = el
    else delete els.current[id]
  }, [])

  useEffect(() => {
    let raf = 0
    let lastY = window.scrollY
    let lastActive: ActId = 'hero'
    let lastRailStep = -1

    const tick = () => {
      const y = window.scrollY
      const vh = window.innerHeight
      const docH = document.documentElement.scrollHeight - vh

      const s = state.current
      s.page = docH > 0 ? Math.min(1, Math.max(0, y / docH)) : 0

      // Smoothed velocity in viewports-per-frame; used for subtle lag effects.
      const raw = (y - lastY) / vh
      s.velocity += (raw - s.velocity) * 0.18
      lastY = y

      let current: ActId = 'hero'
      let bestOverlap = -1

      for (const id of ACTS) {
        const el = els.current[id]
        if (!el) {
          s.act[id] = 0
          continue
        }
        const top = el.offsetTop
        const height = el.offsetHeight
        // Progress across the pinned span: 0 when the act's top hits the
        // viewport top, 1 when its bottom does.
        const span = Math.max(1, height - vh)
        s.act[id] = Math.min(1, Math.max(0, (y - top) / span))

        const visible = Math.min(y + vh, top + height) - Math.max(y, top)
        if (visible > bestOverlap) {
          bestOverlap = visible
          current = id
        }
      }

      s.active = current
      if (current !== lastActive) {
        lastActive = current
        setActive(current)
      }

      // The rail only needs ~100 steps; re-rendering per pixel is waste.
      const step = Math.round(s.page * 100)
      if (step !== lastRailStep) {
        lastRailStep = step
        setPageProgress(step / 100)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const scrollToAct = useCallback((id: ActId) => {
    const el = els.current[id]
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: el.offsetTop + 2, behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  const value = useMemo(
    () => ({ state, register, active, pageProgress, scrollToAct }),
    [active, pageProgress, register, scrollToAct],
  )

  return <ScrollCtx.Provider value={value}>{children}</ScrollCtx.Provider>
}

export function useScrollDirector() {
  const ctx = useContext(ScrollCtx)
  if (!ctx) throw new Error('useScrollDirector must be used inside ScrollDirector')
  return ctx
}

/** Attaches an act's scroll span to the director. */
export function useAct(id: ActId) {
  const { register } = useScrollDirector()
  const ref = useRef<HTMLElement | null>(null)

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      ref.current = el
      register(id, el)
    },
    [id, register],
  )

  useEffect(() => () => register(id, null), [id, register])
  return setRef
}

/* ------------------------------------------------------------------ *
 * Small maths shared by every scene.
 * ------------------------------------------------------------------ */

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/** Maps a value from one range into 0–1. */
export const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a || 1))

/** Smoothstep, for scroll-driven motion that should not feel linear. */
export const ease = (t: number) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

/** A 0→1→0 pulse across a window, for objects that enter and leave. */
export const window01 = (v: number, a: number, b: number) => {
  const t = range(v, a, b)
  return Math.sin(t * Math.PI)
}
