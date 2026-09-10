'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAct, type ActId } from '../scroll/ScrollDirector'
import { publishZone } from './zones'

/**
 * The composition system.
 *
 * Every act is laid out on the same grid, so nothing can collide by accident:
 *
 *   [ rail gutter ] [ content column ] [ 3D column ]
 *
 * The rail gutter is reserved space — the progress rail lives inside it and
 * can never sit under text. The content column is the only place copy is
 * allowed. The 3D column is where the camera frames its subject. On narrow
 * screens the grid collapses to a single content column, the rail becomes a
 * top bar, and the scene sits behind a scrim instead of beside the copy.
 *
 * Nothing here uses fixed pixel offsets that break between breakpoints.
 */

/** Reserved widths, shared with the camera rig so the 3D never enters the copy. */
export const LAYOUT = {
  /** Rail gutter, desktop only. Matches ProgressRail's own width. */
  railGutter: 104,
  /** Header height, reserved at the top of every act. */
  headerH: 76,
  /** Breakpoint at which the two-column composition switches on. */
  splitAt: 1024,
} as const

export const Z = {
  scene: 0,
  glow: 1,
  grain: 2,
  scrim: 3,
  content: 10,
  rail: 30,
  header: 50,
  readout: 65,
  cursor: 70,
} as const

type Side = 'left' | 'right' | 'center'

/**
 * One act. Provides the scroll span, pins its content, and lays out the
 * reserved zones. Children render inside the content column only.
 */
export function Act({
  id,
  height,
  side = 'left',
  children,
  scrim = true,
}: {
  id: ActId
  height: string
  /** Which column the copy occupies. The scene takes the other. */
  side?: Side
  children: React.ReactNode
  scrim?: boolean
}) {
  const setRef = useAct(id)
  const sceneRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement | null>(null)
  const copyRef = useRef<HTMLDivElement>(null)

  const attach = useCallback(
    (el: HTMLElement | null) => {
      sectionRef.current = el
      setRef(el)
    },
    [setRef],
  )

  /*
    Exit. Once a section's bottom enters the viewport its pinned panel is
    released and starts sliding upward. Copy is faded out across the first part
    of that slide so it hands the screen to the next act cleanly, instead of
    travelling up underneath the header and the rail. Written to the element
    directly — the page must not re-render while scrolling.
  */
  useEffect(() => {
    let raf = 0
    const sync = () => {
      const sec = sectionRef.current
      const el = copyRef.current
      if (!sec || !el) return
      const vh = window.innerHeight || 1
      const bottom = sec.getBoundingClientRect().bottom
      const released = bottom < vh ? Math.min(1, Math.max(0, (vh - bottom) / vh)) : 0
      const o = 1 - Math.min(1, released / 0.16)
      el.style.opacity = o >= 0.999 ? '' : o.toFixed(3)
      el.style.pointerEvents = o < 0.4 ? 'none' : ''
    }
    const tick = () => {
      sync()
      raf = requestAnimationFrame(tick)
    }
    // Both, deliberately: the frame loop keeps it smooth, and the scroll event
    // keeps it correct in contexts where frames are throttled.
    raf = requestAnimationFrame(tick)
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    sync()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])

  // The scene column reports its real rect, so the camera can frame inside it.
  const measure = useCallback(() => publishZone(id, sceneRef.current), [id])

  useEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (sceneRef.current) ro.observe(sceneRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      publishZone(id, null)
    }
  }, [id, measure])

  // The copy column is capped so the measure never runs long on wide screens,
  // and the scene column takes whatever is left.
  const columns =
    side === 'center'
      ? 'lg:grid-cols-[var(--rail-gutter)_minmax(0,1fr)]'
      : side === 'right'
        ? 'lg:grid-cols-[var(--rail-gutter)_minmax(0,1fr)_minmax(0,38rem)]'
        : 'lg:grid-cols-[var(--rail-gutter)_minmax(0,38rem)_minmax(0,1fr)]'

  return (
    <section
      ref={attach}
      id={id}
      style={{ height }}
      className="relative"
      data-act={id}
      data-side={side}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {/*
          Readability surface. A gradient anchored to the copy column, so text
          always sits on an intentional ground rather than directly on the art.
        */}
        {scrim && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              zIndex: Z.scrim,
              background:
                side === 'right'
                  ? 'linear-gradient(to left, rgb(var(--scrim) / 0.95) 0%, rgb(var(--scrim) / 0.86) 30%, rgb(var(--scrim) / 0.34) 62%, transparent 88%)'
                  : side === 'center'
                    ? 'radial-gradient(70% 55% at 50% 52%, rgb(var(--scrim) / 0.9) 0%, rgb(var(--scrim) / 0.62) 45%, transparent 78%)'
                    : 'linear-gradient(to right, rgb(var(--scrim) / 0.95) 0%, rgb(var(--scrim) / 0.86) 30%, rgb(var(--scrim) / 0.34) 62%, transparent 88%)',
            }}
          />
        )}

        <div
          className={`relative mx-auto grid h-full w-full max-w-[1600px] grid-cols-1 ${columns}`}
          style={
            {
              zIndex: Z.content,
              '--rail-gutter': `${LAYOUT.railGutter}px`,
            } as React.CSSProperties
          }
        >
          {/* Reserved rail gutter. Never receives content. */}
          <div aria-hidden="true" className="hidden lg:block" />

          {side === 'right' && <div ref={sceneRef} aria-hidden="true" className="hidden h-full lg:block" />}

          {/*
            Copy is centred when it fits and top-aligned when it does not — the
            `my-auto` + `overflow-y-auto` pair, rather than `items-center`,
            which would let tall copy overflow upward into the header on short
            viewports.
          */}
          <div
            ref={copyRef}
            className={`flex h-full flex-col overflow-y-auto px-5 pb-12 md:px-8 lg:px-0 ${
              side === 'center' ? 'items-center' : side === 'right' ? 'lg:pl-10' : 'lg:pr-10'
            }`}
            style={{ paddingTop: LAYOUT.headerH }}
          >
            {/*
              The bottom strip belongs to the child, not the scroll container:
              a scroll container's bottom padding is not counted in
              `scrollHeight`, so tall copy spills straight through it. Carried
              here, the reserve survives whether the copy fits or overflows, and
              keeps text clear of the fixed chrome in the bottom corners.
            */}
            <div
              className={`my-auto w-full shrink-0 pb-16 lg:pb-0 ${
                side === 'center' ? 'max-w-[42rem] text-center' : 'max-w-[34rem]'
              }`}
            >
              {children}
            </div>
          </div>

          {side === 'left' && <div ref={sceneRef} aria-hidden="true" className="hidden h-full lg:block" />}
        </div>
      </div>
    </section>
  )
}
