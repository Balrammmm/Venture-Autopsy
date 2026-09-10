'use client'

import { useEffect, useRef } from 'react'
import type { MiloMotion } from './useMiloRoam'
import type { MiloMood } from './Milo'

/**
 * Milo.
 *
 * A small mechanical cat drawn in side profile, animated entirely from the
 * roam loop's real motion rather than from decorative loops:
 *
 *   - Four legs on two-bone IK. The paws trace a stance-and-swing cycle keyed
 *     to distance actually travelled, so the walk speeds up, slows down and
 *     stops in step with the body instead of running at a fixed rate.
 *   - The head turns and the pupils track the cursor. The ears swivel toward
 *     it too, and flatten when he is wary.
 *   - He sits when still, lies down and closes his eyes when asleep, and
 *     arches with a raised tail when he is pleased.
 *   - Petting him builds trust. Past the threshold he purrs, and a bonded cat
 *     stops running away from the cursor.
 *
 * Everything is written straight to SVG attributes inside one frame loop —
 * React never re-renders while he moves.
 */

const VB_W = 92
const VB_H = 68
const GROUND = 58

/** Two-bone IK: given a hip and a paw, find the knee. Knee bends backward. */
function knee(hx: number, hy: number, px: number, py: number, l1: number, l2: number, dir: number) {
  const dx = px - hx
  const dy = py - hy
  let d = Math.hypot(dx, dy)
  // Never let the target exceed the leg's reach, or the maths goes imaginary.
  d = Math.min(d, l1 + l2 - 0.001)
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const mx = hx + (a * dx) / d
  const my = hy + (a * dy) / d
  return { x: mx + (dir * h * dy) / d, y: my - (dir * h * dx) / d }
}

interface Leg {
  /** Hip position in viewBox units. */
  hx: number
  hy: number
  /** Where the paw rests when standing. */
  restX: number
  /** Phase offset in the gait cycle. Diagonal pairs move together. */
  phase: number
  l1: number
  l2: number
  /** Front legs bend the opposite way to back legs. */
  dir: number
  back: boolean
}

const LEGS: Leg[] = [
  { hx: 30, hy: 42, restX: 28, phase: 0, l1: 11, l2: 11, dir: 1, back: true },
  { hx: 34, hy: 42, restX: 34, phase: 0.5, l1: 11, l2: 11, dir: 1, back: true },
  { hx: 62, hy: 42, restX: 63, phase: 0.5, l1: 10, l2: 10, dir: -1, back: false },
  { hx: 66, hy: 42, restX: 69, phase: 0, l1: 10, l2: 10, dir: -1, back: false },
]

/**
 * The standing pose, solved from the same IK and baked in as each leg's
 * initial `d`. Without it a cat rendered before the first frame — or in a tab
 * whose frames are throttled — would stand on nothing.
 */
const REST_D = [
  'M30 46 L40.5 49.2 L34 58',
  'M34 46 L44.5 49.2 L38 58',
  'M62 42 L56.5 50.4 L63 58',
  'M66 42 L61.8 51.1 L69 58',
]

export function MiloCat({
  motion,
  mood,
  trust,
  size = 76,
}: {
  motion: React.MutableRefObject<MiloMotion>
  mood: MiloMood
  trust: React.MutableRefObject<number>
  size?: number
}) {
  const root = useRef<SVGSVGElement>(null)
  const body = useRef<SVGGElement>(null)
  const head = useRef<SVGGElement>(null)
  const earL = useRef<SVGPathElement>(null)
  const earR = useRef<SVGPathElement>(null)
  const pupilL = useRef<SVGCircleElement>(null)
  const pupilR = useRef<SVGCircleElement>(null)
  const lidL = useRef<SVGPathElement>(null)
  const lidR = useRef<SVGPathElement>(null)
  const tail = useRef<SVGPathElement>(null)
  const legRefs = useRef<(SVGPathElement | null)[]>([])
  const purr = useRef<SVGGElement>(null)
  const zzz = useRef<SVGTextElement>(null)

  // Mood is read every frame, so it rides a ref rather than closing over state.
  const moodRef = useRef(mood)
  moodRef.current = mood

  useEffect(() => {
    let raf = 0
    let blink = 0
    let nextBlink = performance.now() + 3000

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const m = motion.current
      const md = moodRef.current
      const asleep = md === 'asleep'
      const walking = m.speed > 0.22 && !asleep
      const t = now / 1000

      /* ---- posture ---------------------------------------------------- */
      // Sitting drops the hindquarters; sleeping lowers the whole body.
      const sit = asleep ? 1 : walking ? 0 : 1
      const crouch = asleep ? 5 : 0
      const bob = walking ? Math.sin(m.gait * Math.PI * 2) * 0.9 : Math.sin(t * 1.6) * 0.5

      if (root.current) {
        // He faces the way he is travelling.
        root.current.style.transform = `scaleX(${m.facing >= 0 ? 1 : -1})`
      }
      if (body.current) {
        body.current.setAttribute('transform', `translate(0 ${(bob + crouch).toFixed(2)})`)
      }

      /* ---- legs -------------------------------------------------------- */
      LEGS.forEach((leg, i) => {
        const el = legRefs.current[i]
        if (!el) return

        let px: number
        let py: number

        if (walking) {
          const p = (m.gait + leg.phase) % 1
          const stride = 9
          if (p < 0.62) {
            // Stance: the paw stays planted and travels backward under him.
            const u = p / 0.62
            px = leg.restX + stride / 2 - u * stride
            py = GROUND
          } else {
            // Swing: it lifts and reaches forward.
            const u = (p - 0.62) / 0.38
            px = leg.restX - stride / 2 + u * stride
            py = GROUND - Math.sin(u * Math.PI) * 7
          }
        } else if (asleep) {
          // Tucked underneath.
          px = leg.hx + (leg.back ? 2 : -2)
          py = GROUND - 1
        } else {
          // Sitting: back legs fold, front legs stand straight.
          px = leg.back ? leg.hx + 4 : leg.restX
          py = leg.back ? GROUND : GROUND
        }

        const hy = leg.hy + bob + crouch + (sit && leg.back && !asleep ? 4 : 0)
        const k = knee(leg.hx, hy, px, py, leg.l1, leg.l2, leg.dir)
        el.setAttribute(
          'd',
          `M${leg.hx} ${hy.toFixed(1)} L${k.x.toFixed(1)} ${k.y.toFixed(1)} L${px.toFixed(1)} ${py.toFixed(1)}`,
        )
      })

      /* ---- head, eyes, ears -------------------------------------------- */
      // Where the cursor is relative to him, in local units.
      const rect = root.current?.getBoundingClientRect()
      let lookX = 0
      let lookY = 0
      if (rect && m.pointerX > -9000) {
        const cx = rect.left + rect.width * 0.78
        const cy = rect.top + rect.height * 0.36
        const dx = (m.pointerX - cx) / 220
        const dy = (m.pointerY - cy) / 220
        lookX = Math.max(-1, Math.min(1, dx)) * (m.facing >= 0 ? 1 : -1)
        lookY = Math.max(-1, Math.min(1, dy))
      }

      if (head.current) {
        const tilt = asleep ? 16 : lookY * 7
        head.current.setAttribute(
          'transform',
          `translate(${(lookX * 1.6).toFixed(2)} ${(bob + crouch + (asleep ? 6 : 0)).toFixed(2)}) rotate(${tilt.toFixed(1)} 72 26)`,
        )
      }

      // Pupils track; they never leave the eye.
      const pupil = (el: SVGCircleElement | null, ox: number) => {
        if (!el) return
        el.setAttribute('cx', (ox + lookX * 1.5).toFixed(2))
        el.setAttribute('cy', (24 + lookY * 1.2).toFixed(2))
      }
      pupil(pupilL.current, 68)
      pupil(pupilR.current, 76)

      // Blink, unless asleep — then the lids simply stay shut.
      if (!asleep && now > nextBlink) {
        blink = 1
        nextBlink = now + 2600 + Math.random() * 4200
      }
      blink = Math.max(0, blink - 0.14)
      const shut = asleep ? 1 : blink
      ;[lidL.current, lidR.current].forEach((el, i) => {
        if (!el) return
        const ox = i === 0 ? 68 : 76
        // The lid is an arc that closes over the eye.
        const y = 24 - 3.4 + shut * 3.4
        el.setAttribute('d', `M${ox - 3.6} ${y.toFixed(1)} q3.6 ${(shut * 4.4).toFixed(1)} 7.2 0 l0 -4 l-7.2 0 Z`)
        el.setAttribute('opacity', shut > 0.02 ? '1' : '0')
      })

      const earTurn = lookX * 12
      if (earL.current) {
        earL.current.setAttribute(
          'transform',
          `rotate(${(md === 'wary' ? -34 : asleep ? -18 : earTurn).toFixed(1)} 66 14)`,
        )
      }
      if (earR.current) {
        earR.current.setAttribute(
          'transform',
          `rotate(${(md === 'wary' ? 34 : asleep ? 18 : earTurn).toFixed(1)} 79 14)`,
        )
      }

      /* ---- tail --------------------------------------------------------- */
      if (tail.current) {
        const happy = md === 'pleased' || trust.current > 0.75
        const swish = Math.sin(t * (walking ? 4.2 : happy ? 2.6 : 1.3)) * (happy ? 9 : 5)
        const lift = happy ? -14 : asleep ? 8 : walking ? -4 : 0
        // A quadratic curve from the rump, so the tail reads as one limb.
        const tipX = 8 + swish * 0.25
        const tipY = 24 + lift + swish * 0.5
        tail.current.setAttribute(
          'd',
          `M26 ${(40 + bob + crouch).toFixed(1)} Q${(14 + swish * 0.4).toFixed(1)} ${(38 + lift * 0.5).toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`,
        )
      }

      /* ---- purring and sleeping ---------------------------------------- */
      if (purr.current) {
        const on = trust.current > 0.55 && !asleep
        purr.current.setAttribute('opacity', on ? String(0.35 + Math.sin(t * 9) * 0.25) : '0')
      }
      if (zzz.current) {
        const p = (t % 3) / 3
        zzz.current.setAttribute('opacity', asleep ? String(Math.sin(p * Math.PI) * 0.9) : '0')
        zzz.current.setAttribute('transform', `translate(0 ${(-p * 9).toFixed(1)})`)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [motion, trust])

  const ink = 'rgb(var(--ink-800))'
  const accent = mood === 'wary' ? 'rgb(var(--risk))' : 'rgb(var(--action-text))'

  return (
    <svg
      ref={root}
      width={size}
      height={(size * VB_H) / VB_W}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      fill="none"
      aria-hidden="true"
      style={{ overflow: 'visible', transformOrigin: '50% 50%' }}
    >
      {/* Contact shadow, so he stands on something. */}
      <ellipse cx="52" cy={GROUND + 3} rx="30" ry="3.4" fill="#000" opacity="0.22" />

      {/* Tail behind the body. */}
      <path
        ref={tail}
        d="M26 40 Q14 38 8 24"
        stroke={accent}
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />

      {/* Back legs draw behind the body. */}
      {LEGS.filter((l) => l.back).map((_, i) => (
        <path
          key={`b${i}`}
          ref={(el) => {
            legRefs.current[i] = el
          }}
          d={REST_D[i]}
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={i === 0 ? 0.55 : 1}
        />
      ))}

      <g ref={body}>
        {/* Torso — a machined shell, not a blob. */}
        <path
          d="M24 44c-3-1-5-5-5-9 0-7 5-12 13-13l24-1c9 0 15 5 15 12 0 6-4 11-11 11Z"
          fill={ink}
          stroke={accent}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* A seam and a service port: he is built, not born. */}
        <path d="M30 33h30" stroke={accent} strokeOpacity="0.3" strokeWidth="1.2" />
        <circle cx="44" cy="39" r="2.6" fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="1.2" />
      </g>

      {/* Front legs in front of the body. */}
      {LEGS.filter((l) => !l.back).map((_, i) => (
        <path
          key={`f${i}`}
          ref={(el) => {
            legRefs.current[i + 2] = el
          }}
          d={REST_D[i + 2]}
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={i === 0 ? 0.55 : 1}
        />
      ))}

      <g ref={head}>
        {/* Ears */}
        <path ref={earL} d="M62 18 L66 6 L72 15 Z" fill={accent} />
        <path ref={earR} d="M83 18 L79 6 L73 15 Z" fill={accent} />
        {/* Skull plate */}
        <path
          d="M72 12c8 0 13 5 13 12s-6 12-13 12-13-5-13-12 5-12 13-12Z"
          fill={ink}
          stroke={accent}
          strokeWidth="2.2"
        />
        {/* Eyes */}
        <circle cx="68" cy="24" r="3.6" fill={accent} fillOpacity="0.22" />
        <circle cx="76" cy="24" r="3.6" fill={accent} fillOpacity="0.22" />
        <circle ref={pupilL} cx="68" cy="24" r="1.9" fill={accent} />
        <circle ref={pupilR} cx="76" cy="24" r="1.9" fill={accent} />
        <path ref={lidL} fill={ink} opacity="0" />
        <path ref={lidR} fill={ink} opacity="0" />
        {/* Muzzle */}
        <path d="M72 29v2" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M70 32q2 1.6 4 0" stroke={accent} strokeWidth="1.3" strokeLinecap="round" fill="none" />
        {/* Whiskers */}
        <g stroke={accent} strokeOpacity="0.42" strokeWidth="0.9" strokeLinecap="round">
          <path d="M84 27l7-1.5M84 29.5l6.5 2" />
          <path d="M60 27l-7-1.5M60 29.5l-6.5 2" />
        </g>
      </g>

      {/* Purr rings — he only makes them once he trusts you. */}
      <g ref={purr} opacity="0">
        <circle cx="88" cy="14" r="3" fill="none" stroke={accent} strokeWidth="1.1" />
        <circle cx="88" cy="14" r="6.5" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.6" />
      </g>

      <text
        ref={zzz}
        x="88"
        y="12"
        fontSize="9"
        fontFamily="var(--font-mono), monospace"
        fill={accent}
        opacity="0"
      >
        z
      </text>
    </svg>
  )
}
