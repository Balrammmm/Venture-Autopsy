'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EvidenceTag, IconAlert, IconArrow } from '@/components/ui/kit'
import type { MarketTerrain as MarketTerrainData } from '@/lib/atlas-types'

const EASE = [0.23, 1, 0.32, 1] as const

/**
 * The terrain: personas placed on ground, alternatives as a ridge behind them,
 * and the gaps drawn as the space between. Clicking a figure opens their card.
 */
export function MarketTerrain({ market }: { market: MarketTerrainData }) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState<string | null>(market.personas[0]?.id ?? null)
  const persona = market.personas.find((p) => p.id === active) ?? market.personas[0]

  return (
    <div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-14">
        <div>
          <svg
            viewBox="0 0 480 300"
            className="w-full"
            role="img"
            aria-label="A landscape with the personas placed on it. Each persona is also listed beside this diagram."
          >
            <defs>
              <linearGradient id="terrain-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C8FB2E" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#C8FB2E" stopOpacity="0" />
              </linearGradient>
            </defs>

            <rect width="480" height="300" fill="url(#terrain-sky)" />

            {/* Ridge lines — the alternatives already occupying the ground. */}
            {[0, 1, 2].map((i) => {
              const y = 96 + i * 26
              const amp = 16 - i * 4
              const d = Array.from({ length: 25 }, (_, k) => {
                const x = (k / 24) * 480
                const yy = y + Math.sin(k * 0.55 + i * 1.7) * amp
                return `${k === 0 ? 'M' : 'L'}${x.toFixed(1)} ${yy.toFixed(1)}`
              }).join(' ')
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="rgba(243,238,226,0.2)"
                  strokeWidth={1.2 - i * 0.2}
                  strokeDasharray={i === 0 ? undefined : '4 6'}
                />
              )
            })}

            {/* Ground grid */}
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1="0" y1={180 + i * 17} x2="480" y2={180 + i * 17} stroke="var(--rule)" />
            ))}
            {Array.from({ length: 13 }, (_, i) => (
              <line key={i} x1={i * 40} y1="180" x2={i * 40} y2="300" stroke="var(--rule)" />
            ))}

            {market.personas.map((p) => {
              const cx = 40 + Math.min(0.94, Math.max(0.06, p.x)) * 400
              const cy = 176 + Math.min(0.94, Math.max(0.06, p.y)) * 104
              const on = p.id === active
              return (
                <g key={p.id} className="cursor-pointer" onClick={() => setActive(p.id)}>
                  {/* A standing figure, drawn rather than a dot. */}
                  <line x1={cx} y1={cy} x2={cx} y2={cy - 22} stroke={on ? '#C8FB2E' : 'rgba(243,238,226,0.5)'} strokeWidth={on ? 2.4 : 1.5} strokeLinecap="round" />
                  <circle cx={cx} cy={cy - 28} r={on ? 6.5 : 5} fill={on ? '#C8FB2E' : '#0C0E0B'} stroke={on ? '#C8FB2E' : 'rgba(243,238,226,0.5)'} strokeWidth="1.5" />
                  <ellipse cx={cx} cy={cy + 3} rx={on ? 15 : 11} ry="3.5" fill={on ? '#C8FB2E' : '#F3EEE2'} fillOpacity="0.12" />
                  <text
                    x={cx}
                    y={cy + 18}
                    textAnchor="middle"
                    fontSize="8"
                    fontFamily="var(--font-mono), monospace"
                    fill={on ? '#F3EEE2' : '#827E72'}
                    letterSpacing="1.1"
                  >
                    {p.name.toUpperCase()}
                  </text>
                  <title>{p.jobToBeDone}</title>
                </g>
              )
            })}
          </svg>

          <p className="mt-3 max-w-measure text-[12.5px] leading-relaxed text-paper-faint">
            The ridge behind is what already occupies this ground. Nothing about it has been verified — click through
            to the alternatives below and check each one in your own market.
          </p>
        </div>

        {persona && (
          <AnimatePresence mode="wait">
            <motion.div
              key={persona.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="lg:sticky lg:top-28 lg:self-start"
            >
              <h3 className="display text-[1.7rem] leading-tight text-paper">{persona.name}</h3>
              <p className="mt-1 text-[12.5px] text-lime">{persona.role}</p>
              <p className="mt-3 text-[13.5px] leading-[1.62] text-paper-dim">{persona.context}</p>

              <dl className="mt-5 space-y-4">
                {(
                  [
                    ['Job to be done', persona.jobToBeDone],
                    ['Does today instead', persona.currentWorkaround],
                    ['Buying trigger', persona.buyingTrigger],
                  ] as const
                ).map(([k, val]) => (
                  <div key={k} className="rule-t pt-3.5">
                    <dt className="label mb-1">{k}</dt>
                    <dd className="text-[13.5px] leading-[1.6] text-paper-dim">{val}</dd>
                  </div>
                ))}
                <div className="rule-t pt-3.5">
                  <dt className="label mb-1 text-ember">Objection</dt>
                  <dd className="text-[13.5px] leading-[1.6] text-paper-dim">{persona.objection}</dd>
                </div>
              </dl>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Alternatives, gaps and research gaps */}
      <div className="mt-14 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-3">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[15px] text-paper">What is already there</h3>
          </div>
          <p className="mb-4 max-w-measure border-l-2 border-ember pl-4 text-[12.5px] leading-[1.6] text-paper-faint">
            {market.note}
          </p>
          <ul className="space-y-0">
            {market.alternatives.map((a, i) => (
              <li key={i} className="rule-t py-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <p className="text-[14px] text-paper">{a.name}</p>
                  <EvidenceTag evidence={a.evidence} />
                </div>
                <p className="mt-1 max-w-measure text-[13px] leading-[1.55] text-paper-dim">{a.why}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-[15px] text-paper">Gaps in the position</h3>
          <ul className="space-y-0">
            {market.positioningGaps.map((g, i) => (
              <li key={i} className="rule-t py-3.5">
                <p className="text-[14px] leading-[1.45] text-paper">{g.gap}</p>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-paper-dim">{g.whyItExists}</p>
                <p className="mt-1.5 flex gap-2 text-[13px] leading-[1.55] text-paper-faint">
                  <IconAlert size={13} className="mt-0.5 shrink-0 text-ember" />
                  {g.risk}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-[15px] text-paper">What you have not checked</h3>
          <ul className="space-y-0">
            {market.researchGaps.map((g, i) => (
              <li key={i} className="rule-t py-3.5">
                <p className="text-[14px] leading-[1.45] text-paper">{g.question}</p>
                <p className="mt-1.5 flex gap-2 text-[13px] leading-[1.55] text-lime">
                  <IconArrow size={13} className="mt-0.5 shrink-0" />
                  {g.howToAnswer}
                </p>
                <p className="mt-1 text-[12.5px] leading-[1.5] text-paper-faint">Blocks: {g.blocksWhat}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sizing method — never a number */}
      <div className="rule-t mt-12 pt-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="text-[15px] text-paper">How to size this yourself</h3>
          <EvidenceTag evidence={market.sizingMethod.evidence} />
        </div>
        <div className="grid grid-cols-1 gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <p className="max-w-measure text-[14px] leading-[1.68] text-paper-dim">{market.sizingMethod.approach}</p>
          <div>
            <p className="label mb-2">Numbers you would need to gather</p>
            <ul className="space-y-2">
              {market.sizingMethod.inputsNeeded.map((x, i) => (
                <li key={i} className="flex gap-3 text-[13.5px] leading-[1.58] text-paper-dim">
                  <span aria-hidden="true" className="num mt-[2px] shrink-0 font-mono text-[10.5px] text-paper-sub">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
