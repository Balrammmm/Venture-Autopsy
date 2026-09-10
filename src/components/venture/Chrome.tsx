'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Button,
  EvidenceTag,
  IconCheck,
  IconClose,
  IconRefresh,
  Spinner,
  Textarea,
} from '@/components/ui/kit'
import type { SectionKey } from '@/lib/atlas-types'

const TABS = [
  { href: '', label: 'Command' },
  { href: '/research', label: 'Research' },
  { href: '/validate', label: 'Validate' },
  { href: '/strategy', label: 'Strategy' },
  { href: '/report', label: 'Report' },
]

export function VentureNav({ id }: { id: string }) {
  const pathname = usePathname()
  const base = `/venture/${id}`

  return (
    <nav aria-label="Venture sections" className="no-print flex gap-x-1 overflow-x-auto">
      {TABS.map((t) => {
        const href = base + t.href
        const active = pathname === href
        return (
          <Link
            key={t.label}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`tap relative shrink-0 px-3 py-2.5 text-[13px] transition-colors duration-150 ease-out ${
              active ? 'text-paper' : 'text-paper-faint hover:text-paper-dim'
            }`}
          >
            {t.label}
            {active && (
              <motion.span
                layoutId="venture-tab"
                className="absolute inset-x-2 -bottom-px h-px bg-action"
                transition={{ type: 'spring', duration: 0.4, bounce: 0.14 }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Wraps every visual module: title, evidence provenance, regenerate with an
 * optional instruction, and an inline error that names the recovery.
 */
export function ModuleFrame({
  id,
  name,
  blurb,
  evidence,
  version,
  children,
  onRegenerate,
  busy,
  error,
  tools,
  className = '',
}: {
  id: SectionKey | string
  name: string
  blurb: string
  evidence?: string
  version?: number
  children: React.ReactNode
  onRegenerate?: (instruction?: string) => void
  busy?: boolean
  error?: string
  tools?: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  const [composing, setComposing] = useState(false)
  const [instruction, setInstruction] = useState('')

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`scroll-mt-28 py-12 md:py-16 ${className}`}>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id={`${id}-heading`} className="display text-[clamp(1.7rem,3.2vw,2.5rem)] leading-[1.02] text-paper">
              {name}
            </h2>
            {evidence && <EvidenceTag evidence={evidence} />}
            {version && version > 1 && (
              <span className="num font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-sub">
                v{version}
              </span>
            )}
          </div>
          <p className="mt-1.5 max-w-measure text-[13.5px] text-paper-faint">{blurb}</p>
        </div>

        <div className="no-print flex shrink-0 items-center gap-1.5">
          {tools}
          {onRegenerate && (
            <Button variant="quiet" size="sm" onClick={() => setComposing((c) => !c)} disabled={busy}>
              {busy ? <Spinner /> : <IconRefresh size={13} />}
              {busy ? 'Regenerating' : 'Regenerate'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 border-l-2 border-risk bg-risk-wash px-4 py-3 text-[13.5px] text-paper-dim">
          {error}
        </div>
      )}

      <AnimatePresence initial={false}>
        {composing && onRegenerate && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
            className="no-print overflow-hidden"
          >
            <div className="mb-8 max-w-measure">
              <label htmlFor={`${id}-instruction`} className="label mb-2 block">
                What should change?
              </label>
              <Textarea
                id={`${id}-instruction`}
                rows={3}
                autoFocus
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Optional. For example: focus on the channel problem, or make every test cost nothing."
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onRegenerate(instruction.trim() || undefined)
                    setInstruction('')
                    setComposing(false)
                  }}
                >
                  <IconCheck size={13} />
                  Regenerate this module
                </Button>
                <Button variant="quiet" size="sm" onClick={() => setComposing(false)}>
                  <IconClose size={13} />
                  Cancel
                </Button>
                <span className="text-[12px] text-paper-sub">Only this module changes. Earlier versions are kept.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={busy ? 'pointer-events-none opacity-40 transition-opacity duration-200' : 'transition-opacity duration-200'}>
        {children}
      </div>
    </section>
  )
}

/** Shown when a module has no data because the venture has not been analysed. */
export function ModuleEmpty({ onAnalyse, analysing }: { onAnalyse?: () => void; analysing?: boolean }) {
  return (
    <div className="rule-t py-12 text-center">
      <p className="text-[14px] text-paper-dim">This module has no data yet.</p>
      <p className="mx-auto mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-paper-faint">
        Run the analysis and the atlas will be built from your idea and any evidence you have attached.
      </p>
      {onAnalyse && (
        <Button variant="primary" size="md" className="mt-5" onClick={onAnalyse} disabled={analysing}>
          {analysing ? <Spinner /> : null}
          {analysing ? 'Building' : 'Build the atlas'}
        </Button>
      )}
    </div>
  )
}
