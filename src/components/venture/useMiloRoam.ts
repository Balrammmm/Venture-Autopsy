'use client'

import { useEffect, useRef, useState } from 'react'

export type RoamState = 'roaming' | 'fleeing' | 'sleeping' | 'pinned'

/**
 * Where Milo is allowed to be.
 *
 * The hard rule is that he never covers anything a person is trying to read or
 * press. That is enforced structurally rather than hopefully:
 *
 *   1. He lives on the right edge and roams vertically. He never crosses the
 *      reading column, because the axis he travels on runs alongside it.
 *   2. If the pointer comes near he slides away along that same edge — so he
 *      cannot be in front of something you are reaching for.
 *   3. He is `position: fixed` and only his own button takes pointer events, so
 *      he never affects layout or swallows a click meant for the page.
 *   4. Below 900x560 there is no edge worth having, so he pins to the corner.
 *
 * Calm mode and `prefers-reduced-motion` both pin him, which is the same code
 * path as a narrow viewport.
 */

const SIZE = 60
const EDGE = 16
/** The widest the app shell ever draws its content column. */
const CONTENT_MAX = 1700
/** How close the pointer can get before he moves away. */
const PERSONAL_SPACE = 132
const IDLE_BEFORE_SLEEP = 24_000

interface Spot {
  x: number
  y: number
}

export interface MiloMotion {
  /** Pixels per frame, smoothed. Drives whether he walks or sits. */
  speed: number
  /** 1 facing right, -1 facing left. */
  facing: number
  /** Accumulated stride phase, so the legs cycle with real distance covered. */
  gait: number
  pointerX: number
  pointerY: number
  x: number
  y: number
}

export function useMiloRoam({
  calm,
  paused,
  trust,
}: {
  calm: boolean
  paused: boolean
  /** 0–1. A cat that trusts you stops running away from your cursor. */
  trust: React.MutableRefObject<number>
}) {
  const el = useRef<HTMLDivElement>(null)
  const [state, setStateValue] = useState<RoamState>('pinned')
  // The frame loop must not be torn down when the mood changes, so it reads
  // and writes the mood through a ref and only pushes to React on a change.
  const stateRef = useRef<RoamState>('pinned')
  const setState = (next: RoamState) => {
    if (stateRef.current === next) return
    stateRef.current = next
    setStateValue(next)
  }

  // Live values, never React state — this runs every frame.
  const pos = useRef<Spot>({ x: 0, y: 0 })
  const target = useRef<Spot>({ x: 0, y: 0 })
  const pointer = useRef<Spot>({ x: -9999, y: -9999 })
  const lastActivity = useRef(Date.now())
  const nextHop = useRef(0)
  const lastCheck = useRef(0)

  /**
   * What the creature riding this needs to animate itself: how fast it is
   * travelling, which way it faces, an accumulated gait phase so the legs
   * cycle in step with real movement, and where the cursor is so the eyes and
   * ears can follow it.
   */
  const motion = useRef<MiloMotion>({
    speed: 0,
    facing: 1,
    gait: 0,
    pointerX: -9999,
    pointerY: -9999,
    x: 0,
    y: 0,
  })

  useEffect(() => {
    const corner = (): Spot => ({
      x: window.innerWidth - SIZE - (window.innerWidth >= 768 ? 28 : 20),
      y: window.innerHeight - SIZE - (window.innerWidth >= 768 ? 28 : 20),
    })

    /**
     * The free corridor to the right of the content column — and only that.
     *
     * It is measured, not assumed: if the content fills the viewport there is
     * no corridor and the answer is zero, which pins him. An earlier version
     * invented a corridor on any wide screen, which would have let him wander
     * over the text on a 1440px display where the shell already spans the full
     * width.
     */
    const margin = () => {
      const w = window.innerWidth
      const gutter = (w - CONTENT_MAX) / 2
      return Math.max(0, gutter)
    }

    /**
     * He roams on any screen wide enough to have an edge strip, but the roam
     * is vertical: he travels up and down the right edge and perches, rather
     * than wandering across the page.
     *
     * That is the safe axis. A centred column leaves its thinnest content at
     * the outer edge, and moving along it still reads as a creature with a
     * mind of its own. Where a real gutter exists he sits further out into it.
     */
    const canRoam = () => !calm && window.innerWidth >= 900 && window.innerHeight >= 560

    const restX = () => {
      const w = window.innerWidth
      const m = margin()
      // Out into the gutter when there is one; hugging the edge when there is not.
      return w - SIZE - EDGE - Math.min(m * 0.4, 40)
    }

    /**
     * Is this spot free?
     *
     * Rather than trusting a corridor to be empty, the candidate is hit-tested
     * against the live page: sample the square he would occupy and reject it if
     * anything underneath is interactive or carries text. This is what actually
     * enforces "never covers navigation, buttons or copy", because it asks the
     * document instead of assuming a layout.
     */
    const isFree = (s: Spot) => {
      const node = el.current
      const pts: [number, number][] = [
        [s.x + SIZE / 2, s.y + SIZE / 2],
        [s.x + 6, s.y + 6],
        [s.x + SIZE - 6, s.y + 6],
        [s.x + 6, s.y + SIZE - 6],
        [s.x + SIZE - 6, s.y + SIZE - 6],
      ]
      for (const [x, y] of pts) {
        const hit = document.elementFromPoint(x, y)
        if (!hit) continue
        if (node && node.contains(hit)) continue
        if (hit.closest('a,button,input,textarea,select,[role="button"],[role="switch"],[role="menuitem"],nav,header')) {
          return false
        }
        // Any element whose own text renders here is something to read.
        if ([...hit.childNodes].some((n) => n.nodeType === 3 && n.textContent && n.textContent.trim())) {
          return false
        }
      }
      return true
    }

    const pickTarget = (): Spot => {
      const h = window.innerHeight
      const x = restX()
      // Try a handful of heights down the edge and take the first free one.
      for (let attempt = 0; attempt < 8; attempt++) {
        const y = Math.min(h - SIZE - EDGE, Math.max(96, h * 0.22 + Math.random() * h * 0.56))
        const spot = { x, y }
        if (isFree(spot)) return spot
      }
      // Nothing free on the edge today — go and sit in the corner instead.
      return corner()
    }

    pos.current = corner()
    target.current = corner()

    const onPointer = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
      lastActivity.current = Date.now()
    }
    const onActivity = () => {
      lastActivity.current = Date.now()
    }
    const onResize = () => {
      if (!canRoam()) {
        target.current = corner()
      }
    }

    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('keydown', onActivity)
    window.addEventListener('scroll', onActivity, { passive: true })
    window.addEventListener('resize', onResize)

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const node = el.current
      if (!node) return

      const now = Date.now()
      const idle = now - lastActivity.current

      if (!canRoam() || paused) {
        target.current = corner()
        setState('pinned')
      } else {
        // Personal space: if the cursor closes in, leave. A tamed cat lets you
        // get close — that is the whole reward for taming him — but he still
        // will not sit on top of anything, because the perch test is separate.
        const dx = pos.current.x + SIZE / 2 - pointer.current.x
        const dy = pos.current.y + SIZE / 2 - pointer.current.y
        const shy = trust.current < 0.55
        const near = shy && Math.hypot(dx, dy) < PERSONAL_SPACE

        if (near) {
          setState('fleeing')
          // Slide away along the edge — vertically, since that is the axis he
          // lives on. He never darts across the content to escape.
          const away = dy >= 0 ? 1 : -1
          target.current = {
            x: restX(),
            y: Math.min(
              window.innerHeight - SIZE - EDGE,
              Math.max(96, pos.current.y + away * 240),
            ),
          }
          nextHop.current = now + 1600
        } else if (idle > IDLE_BEFORE_SLEEP) {
          setState('sleeping')
          // Settles to the corner and stays there until something happens.
          target.current = corner()
        } else {
          setState('roaming')
          // Scrolling moves the page under him, so a spot that was free can
          // stop being free. Re-check where he is actually sitting and move if
          // something has arrived beneath him.
          const settled = Math.abs(pos.current.y - target.current.y) < 4
          const displaced = settled && now > lastCheck.current + 900 && !isFree(pos.current)
          if (displaced) lastCheck.current = now

          if (now > nextHop.current || displaced) {
            target.current = pickTarget()
            nextHop.current = now + 4200 + Math.random() * 5200
          }
        }
      }

      // Critically damped-ish follow: quick when fleeing, lazy when wandering.
      const k = stateRef.current === 'fleeing' ? 0.14 : stateRef.current === 'sleeping' ? 0.03 : 0.045
      const prevX = pos.current.x
      const prevY = pos.current.y
      pos.current.x += (target.current.x - pos.current.x) * k
      pos.current.y += (target.current.y - pos.current.y) * k

      // Hand the creature everything it needs to animate itself.
      const dxStep = pos.current.x - prevX
      const dyStep = pos.current.y - prevY
      const step = Math.hypot(dxStep, dyStep)
      const m = motion.current
      m.speed += (step - m.speed) * 0.2
      // He walks the vertical edge, so "forward" is up or down; the body turns
      // to face the way it is going and holds that facing while still.
      if (Math.abs(dyStep) > 0.12) m.facing = dyStep > 0 ? 1 : -1
      m.gait += step * 0.26
      m.pointerX = pointer.current.x
      m.pointerY = pointer.current.y
      m.x = pos.current.x
      m.y = pos.current.y

      node.style.transform = `translate3d(${Math.round(pos.current.x)}px, ${Math.round(pos.current.y)}px, 0)`
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('scroll', onActivity)
      window.removeEventListener('resize', onResize)
    }
    // `state` is read inside the loop but the loop must not be torn down when
    // it changes, so it is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calm, paused, trust])

  return { el, state, motion }
}
