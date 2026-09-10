'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ScrollDirector, useScrollDirector, type ActId } from './scroll/ScrollDirector'
import { ThemeProvider } from './theme/ThemeProvider'
import { Act, Z } from './layout/Stage'
import { LandingStage } from './LandingStage'
import { AnalysisLens, HoverReadout, ProgressRail, ThemeToggle } from './ui/LandingChrome'
import { InlineCta, PrimaryCta, SecondaryCta } from './ui/Cta'
import { KineticLine, KineticResolve, KineticSlide } from './KineticType'
import { ATLAS_MODULES, type AtlasModule } from './canvas/scenes/Atlas'
import type { CanvasHandlers, PointerState } from './canvas/LandingCanvas'

/* ------------------------------------------------------------------ *
 * Scroll-stepped copy.
 * ------------------------------------------------------------------ */

function useActStep(act: ActId, stops: readonly number[]) {
  const { state } = useScrollDirector()
  const [step, setStep] = useState(0)
  const last = useRef(0)
  const stopsRef = useRef(stops)
  stopsRef.current = stops

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const t = state.current.act[act]
      const s = stopsRef.current
      let next = 0
      for (let i = 0; i < s.length; i++) if (t >= s[i]) next = i
      if (next !== last.current) {
        last.current = next
        setStep(next)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [act, state])

  return step
}

const THREE_STOPS = [0, 0.36, 0.66] as const

/**
 * Stepped copy. The crossfade is a CSS transition, never a JS animation, and
 * the panel reserves its own height so the layout below never shifts.
 */
function Steps<T>({
  items,
  current,
  minHeight,
  render,
}: {
  items: readonly T[]
  current: number
  minHeight: string
  render: (item: T, index: number) => React.ReactNode
}) {
  return (
    <div className="relative w-full" style={{ minHeight }}>
      {items.map((item, i) => {
        const on = i === current
        return (
          <div
            key={i}
            aria-hidden={!on}
            className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-out ${
              on ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
            }`}
          >
            {render(item, i)}
          </div>
        )
      })}
    </div>
  )
}

/** The small caption that names what the scene is doing right now. */
function Kicker({ children, tone = 'action' }: { children: React.ReactNode; tone?: 'action' | 'intel' | 'risk' }) {
  const color = tone === 'risk' ? 'text-risk' : tone === 'intel' ? 'text-intel' : 'text-action-text'
  return (
    <p className={`flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.2em] ${color}`}>
      <span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />
      {children}
    </p>
  )
}

function Lede({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 max-w-[46ch] text-[15px] leading-[1.75] text-paper-dim">{children}</p>
}

/* ------------------------------------------------------------------ *
 * Copy
 * ------------------------------------------------------------------ */

const EVIDENCE_STEPS = [
  {
    kicker: 'One — the blueprint opens',
    tone: 'intel' as const,
    title: 'A person, not a market',
    body: 'The sheet unfolds and somebody specific steps out of it. Not a segment — one person whose Tuesday is worse than it needs to be.',
  },
  {
    kicker: 'Two — the value flows',
    tone: 'action' as const,
    title: 'Pain, solution, payment',
    body: 'A single line runs from their problem to your answer to the moment money moves. If any leg of it is imagined, the whole line is.',
  },
  {
    kicker: 'Three — the glass breaks',
    tone: 'risk' as const,
    title: 'The load-bearing assumption',
    body: 'One belief holds the rest up. Here it is, made visible, then broken on purpose — so you find out now rather than in month nine.',
  },
]

const FIELDWORK_STEPS = [
  {
    kicker: 'Collect',
    tone: 'intel' as const,
    title: 'Go and ask',
    body: 'Five conversations about what someone actually did last month beat a quarter of building on what you assumed they would do.',
  },
  {
    kicker: 'Cluster',
    tone: 'action' as const,
    title: 'Put it on the wall',
    body: 'Patterns only appear once the notes are side by side. Most of them will contradict the idea you walked in with.',
  },
  {
    kicker: 'Separate',
    tone: 'risk' as const,
    title: 'Keep the contradictions',
    body: 'What repeats is signal. What conflicts is not noise — it is the edge of your understanding. Both stay on the wall.',
  },
]

const FIELDWORK_DETAIL: Record<string, { title: string; body: string }> = {
  signal: { title: 'Repeated signal', body: 'Heard more than twice, unprompted. This is what you build the next test around.' },
  contradiction: { title: 'Contradiction', body: 'One person flatly disagreed. Keep it — it marks the boundary of who this is actually for.' },
  insight: { title: 'The insight', body: 'What the repeats add up to. One sentence you could not have written before the conversations.' },
}

/* ------------------------------------------------------------------ */

function LandingInner() {
  const router = useRouter()
  const { active } = useScrollDirector()

  const pointer = useRef<PointerState>({ x: 0, y: 0, active: false })
  const [benchHover, setBenchHover] = useState<string | null>(null)
  const [atlasHover, setAtlasHover] = useState<string | null>(null)
  const [atlasFocus, setAtlasFocus] = useState(0)
  // While a reader is driving the carousel by hand, scroll stops overriding it.
  const pinnedUntil = useRef(0)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d: { user: unknown }) => setSignedIn(Boolean(d.user)))
      .catch(() => setSignedIn(false))
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
      pointer.current.active = true
    }
    const onLeave = () => {
      pointer.current.active = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  const handlers: CanvasHandlers = {
    onWorkbenchHover: useCallback((id: string | null) => setBenchHover(id), []),
    onAtlasHover: useCallback((id: string | null) => setAtlasHover(id), []),
    // Clicking a resting instrument promotes it, and pins it so scroll does
    // not immediately steal focus back.
    onAtlasSelect: useCallback((i: number) => {
      setAtlasFocus(i)
      pinnedUntil.current = performance.now() + 2600
    }, []),
  }

  const evidenceStep = useActStep('evidence', THREE_STOPS)
  const fieldworkStep = useActStep('fieldwork', THREE_STOPS)

  // Scroll walks the atlas carousel, unless the reader has taken it over.
  const { state: scrollState } = useScrollDirector()
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (performance.now() >= pinnedUntil.current) {
        const t = scrollState.current.act.atlas
        if (t > 0.0001 && t < 0.9999) {
          const i = Math.min(ATLAS_MODULES.length - 1, Math.floor(t * ATLAS_MODULES.length))
          setAtlasFocus((prev) => (prev === i ? prev : i))
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [scrollState])

  const stepAtlas = useCallback((dir: number) => {
    setAtlasFocus((prev) => (prev + dir + ATLAS_MODULES.length) % ATLAS_MODULES.length)
    pinnedUntil.current = performance.now() + 2600
  }, [])

  const startHref = signedIn ? '/ventures' : '/onboarding'
  const hovered = benchHover ? FIELDWORK_DETAIL[benchHover] : null
  const hoveredModule = atlasHover ? ATLAS_MODULES.find((m) => m.id === atlasHover) : null
  const focusModule = ATLAS_MODULES[atlasFocus]

  return (
    <div className="relative bg-ink-800">
      <AnalysisLens />
      <ProgressRail />

      <LandingStage
        atlasActive={atlasFocus}
        pointer={pointer}
        handlers={handlers}
        interactive={active === 'atlas' || active === 'fieldwork'}
      />

      {/* Atmospheric light, tinted per theme. */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          zIndex: Z.glow,
          background:
            'radial-gradient(58% 48% at 16% 20%, var(--glow-a), transparent 72%), radial-gradient(52% 44% at 84% 80%, var(--glow-b), transparent 72%)',
        }}
      />
      <div className="grain pointer-events-none fixed inset-0" aria-hidden="true" style={{ zIndex: Z.grain }} />

      <header className="fixed inset-x-0 top-0" style={{ zIndex: Z.header }}>
        {/* The header keeps its own ground. Copy and 3D scroll beneath it
            without ever competing with the wordmark or the controls. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[112px]"
          style={{
            background:
              'linear-gradient(to bottom, rgb(var(--ink-800) / 0.95) 0%, rgb(var(--ink-800) / 0.78) 44%, rgb(var(--ink-800) / 0) 100%)',
          }}
        />
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="tap flex items-baseline gap-2.5">
            <span className="display text-[19px] tracking-tightest text-paper">Venture Autopsy</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-paper-faint sm:inline">
              Validation lab
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => router.push(signedIn ? '/ventures' : '/onboarding')}
              disabled={signedIn === null}
              className="tap group inline-flex h-9 items-center gap-2 rounded-[3px] border border-[color:var(--rule-strong)] px-4 text-[13px] font-medium text-paper transition-colors duration-200 hover:border-action hover:text-action-text disabled:opacity-50"
            >
              {signedIn ? 'Open the lab' : 'Start'}
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </button>
          </nav>
        </div>
      </header>

      <main id="main" style={{ position: 'relative', zIndex: Z.content }}>
        {/* ------------------------------------------------ Act 1: hero */}
        <Act id="hero" height="230vh" side="left">
          <h1 className="display text-[clamp(2.7rem,5.6vw,4.9rem)] leading-[0.94] text-paper">
            <KineticLine text="An idea is not" />
            <br />
            <KineticLine text="a company yet." delay={0.1} className="italic text-action-text" />
          </h1>

          <p
            className="kt-block mt-6 max-w-[46ch] text-[15.5px] leading-[1.75] text-paper-dim"
            style={{ animationDelay: '0.45s' }}
          >
            This is the machine that takes one apart. Assumptions ranked by what breaks if they are false, the
            cheapest way to find out, and an honest verdict at the end of it.
          </p>

          <div className="kt-block mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.58s' }}>
            <PrimaryCta onClick={() => router.push(startHref)}>Engineer an idea</PrimaryCta>
            <SecondaryCta onClick={() => router.push('/onboarding?demo=1')}>Worked example</SecondaryCta>
          </div>

          <p
            className="kt-block mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-faint"
            style={{ animationDelay: '0.72s' }}
          >
            Scroll to take it apart
          </p>
        </Act>

        {/* -------------------------------------------- Act 2: evidence */}
        <Act id="evidence" height="300vh" side="right">
          <Steps
            items={EVIDENCE_STEPS}
            current={evidenceStep}
            minHeight="300px"
            render={(s) => (
              <>
                <Kicker tone={s.tone}>{s.kicker}</Kicker>
                <h2 className="display mt-4 text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.0] text-paper">{s.title}</h2>
                <Lede>{s.body}</Lede>
              </>
            )}
          />
          <StepDots count={EVIDENCE_STEPS.length} current={evidenceStep} />
        </Act>

        {/* ------------------------------------------- Act 3: fieldwork */}
        <Act id="fieldwork" height="270vh" side="left">
          <Steps
            items={FIELDWORK_STEPS}
            current={fieldworkStep}
            minHeight="290px"
            render={(s) => (
              <>
                <Kicker tone={s.tone}>{s.kicker}</Kicker>
                <h2 className="display mt-4 text-[clamp(2rem,4.2vw,3.3rem)] leading-[1.0] text-paper">{s.title}</h2>
                <Lede>{s.body}</Lede>
              </>
            )}
          />
          <StepDots count={FIELDWORK_STEPS.length} current={fieldworkStep} />
        </Act>

        {/* ----------------------------------------------- Act 4: atlas */}
        <Act id="atlas" height="340vh" side="right">
          <Kicker>The Venture Atlas</Kicker>
          <h2 className="display mt-4 text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.0] text-paper">
            Nine instruments, one system.
          </h2>

          {/*
            The instrument panel. Opaque enough to be read against whatever the
            scene is doing behind it, height reserved so nothing jumps, and
            driveable by keyboard as well as by scroll.
          */}
          <div
            role="group"
            aria-label="Venture Atlas instruments"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault()
                stepAtlas(1)
              }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault()
                stepAtlas(-1)
              }
            }}
            className="mt-7 rounded-[5px] border border-[color:var(--rule-strong)] bg-[rgb(var(--ink-700))]/92 p-5 backdrop-blur-xl"
            style={{ minHeight: 236, boxShadow: 'var(--shadow-lift)' }}
          >
            <Steps
              items={ATLAS_MODULES}
              current={atlasFocus}
              minHeight="150px"
              render={(m, i) => (
                <>
                  <p className="num font-mono text-[11px] tracking-[0.14em] text-paper-sub">
                    {String(i + 1).padStart(2, '0')} <span className="text-paper-faint">/ {ATLAS_MODULES.length}</span>
                  </p>
                  <p className="display mt-2 text-[1.75rem] leading-tight text-action-text">{m.name}</p>
                  <p className="mt-2 max-w-[42ch] text-[14px] leading-[1.65] text-paper-dim">{m.purpose}</p>
                </>
              )}
            />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
              <InlineCta onClick={() => router.push(focusModule?.href ?? '/onboarding')}>
                Explore this instrument
              </InlineCta>

              <div className="flex items-center gap-1.5">
                <CarouselButton label="Previous instrument" onClick={() => stepAtlas(-1)}>
                  ←
                </CarouselButton>
                <CarouselButton label="Next instrument" onClick={() => stepAtlas(1)}>
                  →
                </CarouselButton>
              </div>
            </div>
          </div>

          <StepDots count={ATLAS_MODULES.length} current={atlasFocus} compact />
        </Act>

        {/* ------------------------------------------ Act 5: resolution */}
        <Act id="resolution" height="230vh" side="left">
          <h2 className="display text-[clamp(2.1rem,4.4vw,3.5rem)] leading-[1.0] text-paper">
            <KineticResolve text="Build less." />
            <br />
            <KineticResolve text="Learn faster." delay={0.24} className="italic text-action-text" />
          </h2>

          <KineticSlide
            text="Every fragment on this page came from one idea. So does a company."
            className="mt-6 max-w-[46ch] text-[15.5px] leading-[1.75] text-paper-dim"
          />

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <PrimaryCta onClick={() => router.push(startHref)}>Start your venture</PrimaryCta>
            <SecondaryCta onClick={() => router.push('/onboarding?demo=1')}>See a worked example</SecondaryCta>
          </div>

        </Act>
      </main>

      {/* ------------------------------------------------------ Footer */}
      {/*
        The last act needs a clear viewport to release into before the closing
        panel arrives. Without it the released copy ends its life pinned under
        the header. The gap is transparent, so the finished monument holds the
        screen alone for a beat.
      */}
      <div aria-hidden="true" className="pointer-events-none h-[85vh]" />

      <footer
        className="relative border-t border-[color:var(--rule)] bg-ink-900"
        style={{ zIndex: Z.content }}
      >
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-8 px-5 py-14 md:grid-cols-[minmax(0,1fr)_auto] md:px-8">
          <div>
            <p className="display text-[1.6rem] leading-none text-paper">Venture Autopsy</p>
            <p className="mt-3 max-w-[52ch] text-[13px] leading-[1.7] text-paper-faint">
              A validation lab for one idea at a time. Runs locally against your own Gemini key; ventures are
              stored in a database on this machine.
            </p>
          </div>
          <nav className="flex items-end gap-7 md:justify-end" aria-label="Footer">
            {[
              ['Start', '/onboarding'],
              ['Ventures', '/ventures'],
              ['Settings', '/settings'],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="tap group relative inline-flex items-center text-[13px] text-paper-dim transition-colors duration-150 hover:text-action-text"
              >
                {label}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-action transition-transform duration-300 ease-out group-hover:scale-x-100"
                />
              </Link>
            ))}
          </nav>
        </div>
      </footer>

      <HoverReadout
        title={hoveredModule?.name ?? hovered?.title ?? null}
        body={hoveredModule?.purpose ?? hovered?.body}
      />
    </div>
  )
}

/** A small tactile control for stepping the atlas carousel by hand. */
function CarouselButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap inline-flex h-9 w-9 items-center justify-center rounded-[3px] border border-[color:var(--rule-strong)] text-[14px] text-paper-dim transition-[background-color,border-color,color,transform] duration-200 ease-out hover:border-action hover:text-action-text active:translate-y-[1px]"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}

/** A row of steps under a stepped panel. Never overlaps the copy above it. */
function StepDots({ count, current, compact }: { count: number; current: number; compact?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-5' : 'mt-7'}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`h-px transition-all duration-500 ease-out ${
            i === current
              ? compact
                ? 'w-6 bg-action'
                : 'w-12 bg-action'
              : compact
                ? 'w-3 bg-[color:var(--rule-strong)]'
                : 'w-6 bg-[color:var(--rule-strong)]'
          }`}
        />
      ))}
    </div>
  )
}

export function Landing() {
  return (
    <ThemeProvider>
      <ScrollDirector>
        <LandingInner />
      </ScrollDirector>
    </ThemeProvider>
  )
}
