'use client'

import { useScrollDirector, type ActId } from './scroll/ScrollDirector'

/**
 * The page without WebGL. Five drawn scenes, one per act, cross-faded by scroll
 * position — art-directed rather than a degraded placeholder. Also used for
 * reduced motion, where the fades are the only movement.
 */

const S = 'rgb(var(--signal))'
const R = 'rgb(var(--risk))'
const I = 'rgb(var(--intel))'
const P = 'rgb(var(--paper))'

function Defs() {
  return (
    <defs>
      <pattern id="ss-grid" width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M16 0H0v16" fill="none" stroke={S} strokeOpacity="0.2" strokeWidth="0.6" />
      </pattern>
      <linearGradient id="ss-paper" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={P} stopOpacity="0.16" />
        <stop offset="100%" stopColor={P} stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="ss-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={S} stopOpacity="0.2" />
        <stop offset="100%" stopColor={S} stopOpacity="0.04" />
      </linearGradient>
      <filter id="ss-soft" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="12" />
      </filter>
    </defs>
  )
}

export function HeroScene() {
  return (
    <svg viewBox="0 0 560 520" className="h-full w-full" role="img" aria-label="An engine assembled from blueprint sheets, charts, glass plates, a coin and a compass, mounted on a lit spine.">
      <Defs />
      <circle cx="280" cy="262" r="140" fill={S} opacity="0.07" filter="url(#ss-soft)" />
      <line x1="280" y1="70" x2="280" y2="452" stroke={S} strokeOpacity="0.5" strokeWidth="2.5" />
      <ellipse cx="280" cy="400" rx="196" ry="46" fill="none" stroke={P} strokeOpacity="0.28" />
      <ellipse cx="280" cy="150" rx="132" ry="32" fill="none" stroke={P} strokeOpacity="0.24" />
      <ellipse cx="280" cy="400" rx="34" ry="9" fill="none" stroke={S} strokeOpacity="0.5" />

      <g transform="translate(140 196) skewY(-11)">
        <rect width="164" height="112" fill="url(#ss-paper)" stroke={P} strokeOpacity="0.4" />
        <rect width="164" height="112" fill="url(#ss-grid)" />
        <path d="M20 84h56M20 94h88" stroke={P} strokeOpacity="0.4" strokeWidth="2" />
      </g>
      <g transform="translate(304 214) skewY(8)">
        <rect width="150" height="104" rx="2" fill="url(#ss-glass)" stroke={S} strokeOpacity="0.55" />
        <path d="M18 82 L48 58 L76 70 L106 34 L132 46" fill="none" stroke={S} strokeWidth="2" strokeLinejoin="round" />
      </g>
      <g transform="translate(112 300) skewY(-7)">
        {[26, 44, 20, 56].map((h, i) => (
          <rect key={i} x={i * 18} y={60 - h} width="11" height={h} fill={P} fillOpacity={0.2 + i * 0.05} stroke={P} strokeOpacity="0.34" />
        ))}
      </g>
      <g transform="translate(408 320)">
        <ellipse cx="0" cy="0" rx="24" ry="10" fill={S} fillOpacity="0.24" stroke={S} strokeOpacity="0.7" />
        <ellipse cx="0" cy="-8" rx="24" ry="10" fill="rgb(var(--ink-800))" stroke={S} strokeOpacity="0.85" />
      </g>
      <g transform="translate(146 386)">
        <circle r="22" fill="none" stroke={P} strokeOpacity="0.26" />
        <path d="M0 -18 L6 3 L0 -1 L-6 3 Z" fill={R} />
      </g>
      <g transform="translate(360 150)">
        <path d="M0 34 L46 0 L84 26 L38 62 Z" fill="url(#ss-paper)" stroke={P} strokeOpacity="0.34" />
      </g>
    </svg>
  )
}

function EvidenceScene() {
  return (
    <svg viewBox="0 0 560 520" className="h-full w-full" role="img" aria-label="A sheet unfolding into a customer figure, a loop of value and money, and a plane fracturing into risk shards.">
      <Defs />
      {/* Customer */}
      <g transform="translate(52 130)">
        <rect width="120" height="160" fill="url(#ss-paper)" stroke={P} strokeOpacity="0.36" />
        <rect width="120" height="160" fill="url(#ss-grid)" opacity="0.5" />
        <g transform="translate(60 78)">
          <circle cy="-30" r="16" fill={I} fillOpacity="0.72" />
          <path d="M-24 34 q-4 -46 24 -46 q28 0 24 46 z" fill={I} fillOpacity="0.55" />
        </g>
        <g stroke={I} strokeOpacity="0.6" fill="none">
          <rect x="128" y="6" width="92" height="26" rx="2" fill={P} fillOpacity="0.08" />
          <rect x="140" y="46" width="74" height="26" rx="2" fill={P} fillOpacity="0.08" />
          <rect x="126" y="86" width="86" height="26" rx="2" fill={P} fillOpacity="0.08" />
        </g>
      </g>
      {/* Model loop */}
      <g transform="translate(300 150)">
        <path d="M20 30 C 96 -12, 176 40, 140 108 C 104 172, 12 150, 20 30 Z" fill="none" stroke={S} strokeOpacity="0.6" strokeWidth="2" />
        {[[20, 30], [140, 108], [92, 156], [24, 96]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <rect x="-26" y="-11" width="52" height="22" fill="rgb(var(--ink-700))" stroke={P} strokeOpacity="0.4" />
          </g>
        ))}
        {[[70, 6], [156, 76], [56, 168]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="8" ry="8" fill={S} fillOpacity="0.85" />
        ))}
      </g>
      {/* Risk */}
      <g transform="translate(196 356)">
        <circle cx="80" cy="52" r="66" fill={R} opacity="0.09" filter="url(#ss-soft)" />
        {[
          'M0 20 L44 0 L56 40 L14 54 Z',
          'M56 40 L104 14 L128 52 L74 70 Z',
          'M14 54 L74 70 L58 108 L8 90 Z',
          'M74 70 L128 52 L140 98 L92 112 Z',
        ].map((d, i) => (
          <path key={i} d={d} fill="url(#ss-glass)" stroke={R} strokeOpacity="0.7" />
        ))}
      </g>
    </svg>
  )
}

function FieldworkScene() {
  return (
    <svg viewBox="0 0 560 520" className="h-full w-full" role="img" aria-label="A workbench with an open notebook, a phone of interview messages, sticky notes grouped on a wall, a crumpled receipt and a prototype.">
      <Defs />
      <path d="M20 400 L540 400 L500 500 L60 500 Z" fill={P} fillOpacity="0.07" stroke={P} strokeOpacity="0.2" />
      {/* Sticky wall */}
      <g transform="translate(60 60)">
        {[
          [0, 0, S], [56, 8, S], [112, 0, S],
          [180, 6, I], [236, 0, I],
          [304, 4, R], [360, 12, R],
          [8, 58, S], [64, 66, S], [188, 62, I], [312, 60, R],
        ].map(([x, y, c], i) => (
          <rect key={i} x={Number(x)} y={Number(y)} width="46" height="46" fill={String(c)} fillOpacity="0.34" stroke={String(c)} strokeOpacity="0.65" transform={`rotate(${(i % 3) - 1} ${Number(x) + 23} ${Number(y) + 23})`} />
        ))}
      </g>
      {/* Notebook */}
      <g transform="translate(56 240) skewY(-9)">
        <rect width="170" height="120" fill="rgb(var(--ink-600))" stroke={P} strokeOpacity="0.28" />
        <rect x="6" y="6" width="158" height="108" fill="url(#ss-paper)" />
        <path d="M22 36h120M22 56h96M22 76h124M22 96h72" stroke={P} strokeOpacity="0.34" strokeWidth="2" />
        <path d="M85 6v108" stroke={P} strokeOpacity="0.2" />
      </g>
      {/* Phone */}
      <g transform="translate(258 232)">
        <rect width="86" height="150" rx="8" fill="rgb(var(--ink-600))" stroke={P} strokeOpacity="0.3" />
        <rect x="6" y="10" width="74" height="130" rx="4" fill="rgb(var(--ink-800))" />
        <rect x="12" y="22" width="46" height="17" rx="3" fill={P} fillOpacity="0.5" />
        <rect x="30" y="48" width="40" height="17" rx="3" fill={S} fillOpacity="0.75" />
        <rect x="12" y="74" width="54" height="17" rx="3" fill={P} fillOpacity="0.5" />
        <rect x="34" y="100" width="34" height="17" rx="3" fill={S} fillOpacity="0.75" />
      </g>
      {/* Crumpled receipt */}
      <g transform="translate(372 268) rotate(14)">
        <path d="M0 0 L50 -6 L58 40 L36 58 L44 86 L8 96 L14 62 L-4 44 Z" fill="url(#ss-paper)" stroke={P} strokeOpacity="0.36" />
        <path d="M8 22 L44 16 M14 44 L40 38" stroke={P} strokeOpacity="0.3" strokeWidth="2" />
        <path d="M-4 44 L36 58 L14 62" fill="none" stroke={P} strokeOpacity="0.24" />
      </g>
      {/* Prototype */}
      <g transform="translate(462 300)">
        <path d="M0 26 L30 8 L60 26 L60 60 L30 78 L0 60 Z" fill={P} fillOpacity="0.12" stroke={S} strokeOpacity="0.7" />
        <path d="M0 26 L30 44 L60 26 M30 44 v34" fill="none" stroke={S} strokeOpacity="0.5" />
      </g>
    </svg>
  )
}

function AtlasScene() {
  const mods = [
    'Genome', 'Minefield', 'Museum', 'Terrain', 'Prism', 'Model', 'Scope', 'Lab', 'Flight',
  ]
  return (
    <svg viewBox="0 0 560 520" className="h-full w-full" role="img" aria-label="Nine modules orbiting a central venture core.">
      <Defs />
      <circle cx="280" cy="260" r="150" fill="none" stroke={P} strokeOpacity="0.18" />
      <circle cx="280" cy="260" r="150" fill="none" stroke={S} strokeOpacity="0.12" strokeDasharray="2 10" />
      <circle cx="280" cy="260" r="52" fill={S} opacity="0.1" filter="url(#ss-soft)" />
      <g transform="translate(280 260)">
        <path d="M0 -40 L35 -20 L35 20 L0 40 L-35 20 L-35 -20 Z" fill="url(#ss-glass)" stroke={S} strokeOpacity="0.8" strokeWidth="1.5" />
        <path d="M0 -40 L0 40 M-35 -20 L35 20 M35 -20 L-35 20" stroke={S} strokeOpacity="0.35" />
      </g>
      {mods.map((m, i) => {
        const a = (i / mods.length) * Math.PI * 2 - Math.PI / 2
        const x = 280 + Math.cos(a) * 150
        const y = 260 + Math.sin(a) * 150
        const tone = i === 1 || i === 2 ? R : i === 3 || i === 6 ? I : S
        return (
          <g key={m}>
            <line x1="280" y1="260" x2={x} y2={y} stroke={tone} strokeOpacity="0.16" />
            <circle cx={x} cy={y} r="22" fill="rgb(var(--ink-700))" stroke={tone} strokeOpacity="0.75" strokeWidth="1.4" />
            <circle cx={x} cy={y} r="7" fill={tone} fillOpacity="0.8" />
            <text
              x={x}
              y={y + 38}
              textAnchor="middle"
              fontSize="9"
              fontFamily="var(--font-mono), monospace"
              fill="rgb(var(--paper-faint))"
              letterSpacing="1.2"
            >
              {m.toUpperCase()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ResolutionScene() {
  return (
    <svg viewBox="0 0 560 520" className="h-full w-full" role="img" aria-label="Fragments bound into a single finished blueprint, framed by an open portal.">
      <Defs />
      <circle cx="280" cy="260" r="170" fill={S} opacity="0.09" filter="url(#ss-soft)" />
      <circle cx="280" cy="260" r="168" fill="none" stroke={S} strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="280" cy="260" r="176" fill="none" stroke={S} strokeOpacity="0.18" />
      <g transform="translate(280 260)">
        {[-88, -66, -44, -22, 0, 22, 44, 66].map((y, i) => (
          <g key={y} transform={`translate(${(i % 2 ? 4 : -4)} ${y}) skewY(-3)`}>
            <rect x="-84" y="-9" width="168" height="18" fill="url(#ss-paper)" stroke={P} strokeOpacity="0.34" />
            <rect x="-72" y="-3" width={54 + (i % 3) * 22} height="5" fill={S} fillOpacity={0.36} />
          </g>
        ))}
        <rect x="-96" y="-108" width="192" height="204" fill="none" stroke={S} strokeOpacity="0.8" strokeWidth="1.5" />
        <path d="M-96 -108 h22 M96 -108 h-22 M-96 96 h22 M96 96 h-22" stroke={S} strokeWidth="3" />
      </g>
    </svg>
  )
}

const SCENES: Record<ActId, () => React.ReactElement> = {
  hero: HeroScene,
  evidence: EvidenceScene,
  fieldwork: FieldworkScene,
  atlas: AtlasScene,
  resolution: ResolutionScene,
}

export function StaticStage() {
  const { active } = useScrollDirector()

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="false">
      <div className="relative aspect-square w-[min(88vw,88vh,760px)]">
        {(Object.keys(SCENES) as ActId[]).map((id) => {
          const Scene = SCENES[id]
          const on = id === active
          return (
            <div
              key={id}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
              style={{ opacity: on ? 1 : 0 }}
              aria-hidden={!on}
            >
              <Scene />
            </div>
          )
        })}
      </div>
    </div>
  )
}
