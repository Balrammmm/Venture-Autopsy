'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button, IconCheck, IconClose, IconPencil, IconRefresh, Input, Spinner } from '@/components/ui/kit'
import type { Verdict } from '@/lib/atlas-types'
import type { VentureApi, VentureRow } from './useVenture'

const VERDICT_TONE: Record<string, string> = {
  'High Risk': 'text-ember',
  Promising: 'text-lime',
  'Needs Validation': 'text-paper',
}

/** A health dial that reads as an instrument, not a progress ring. */
function HealthDial({ score, accent }: { score: number; accent: string }) {
  const reduce = useReducedMotion()
  const color = accent === 'ember' ? '#FF5A1F' : '#C8FB2E'
  const ticks = 40
  const lit = Math.round((score / 100) * ticks)

  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label={`Venture health ${score} out of 100`}>
      {Array.from({ length: ticks }, (_, i) => {
        // A 270° sweep, opening at the bottom so it reads as a gauge.
        const a = (-225 + (i / (ticks - 1)) * 270) * (Math.PI / 180)
        const on = i < lit
        const r1 = on ? 40 : 44
        const r2 = 50
        return (
          <motion.line
            key={i}
            x1={60 + Math.cos(a) * r1}
            y1={60 + Math.sin(a) * r1}
            x2={60 + Math.cos(a) * r2}
            y2={60 + Math.sin(a) * r2}
            stroke={on ? color : 'rgba(243,238,226,0.16)'}
            strokeWidth={on ? 2.4 : 1.2}
            strokeLinecap="round"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.012 }}
          />
        )
      })}
      <text
        x="60"
        y="64"
        textAnchor="middle"
        fontSize="24"
        fontWeight="700"
        fontFamily="var(--font-mono), monospace"
        fill="#F3EEE2"
      >
        {score}
      </text>
      <text x="60" y="80" textAnchor="middle" fontSize="7.5" fontFamily="var(--font-mono), monospace" fill="#827E72" letterSpacing="1.6">
        ESTABLISHED
      </text>
    </svg>
  )
}

export function VentureHeader({
  venture,
  verdict,
  api,
}: {
  venture: VentureRow
  verdict?: Verdict
  api: VentureApi
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(venture.title)
  const [saving, setSaving] = useState(false)

  async function saveTitle() {
    if (!title.trim()) return
    setSaving(true)
    await api.updateVenture({ title: title.trim() })
    setSaving(false)
    setEditing(false)
  }

  return (
    <header className="pt-9 md:pt-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,150px)] lg:gap-12">
        <div className="min-w-0">
          {editing ? (
            <div className="flex max-w-[34rem] items-center gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Venture title" autoFocus />
              <Button variant="primary" size="md" onClick={saveTitle} disabled={saving} aria-label="Save title">
                {saving ? <Spinner /> : <IconCheck size={14} />}
              </Button>
              <Button
                variant="quiet"
                size="md"
                onClick={() => {
                  setTitle(venture.title)
                  setEditing(false)
                }}
                aria-label="Cancel"
              >
                <IconClose size={14} />
              </Button>
            </div>
          ) : (
            <div className="group flex items-start gap-3">
              <h1 className="display text-[clamp(2.1rem,4.6vw,3.4rem)] leading-[1.0] text-paper">{venture.title}</h1>
              <button
                onClick={() => setEditing(true)}
                aria-label="Rename venture"
                className="no-print tap mt-2 shrink-0 rounded-[3px] p-1.5 text-paper-sub opacity-0 transition-opacity duration-150 hover:text-paper focus-visible:opacity-100 group-hover:opacity-100"
              >
                <IconPencil size={14} />
              </button>
            </div>
          )}

          <p className="mt-3 max-w-measure text-[14px] leading-[1.68] text-paper-dim">{venture.rawIdea}</p>

          {verdict && (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              <p className={`display text-[1.7rem] leading-none ${VERDICT_TONE[verdict.verdict] ?? 'text-paper'}`}>
                {verdict.verdict}
              </p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper-sub">
                Confidence {verdict.confidence}
              </p>
              <Button
                variant="quiet"
                size="sm"
                onClick={() => api.regenerate('verdict')}
                disabled={api.busySection === 'verdict'}
                className="no-print"
              >
                {api.busySection === 'verdict' ? <Spinner /> : <IconRefresh size={12} />}
                Re-judge
              </Button>
            </div>
          )}
          {verdict && (
            <p className="mt-3 max-w-measure text-[13.5px] leading-[1.65] text-paper-faint">{verdict.reasoning}</p>
          )}
        </div>

        <div className="w-[130px] shrink-0 lg:w-full">
          <HealthDial score={venture.healthScore} accent={venture.accent} />
        </div>
      </div>
    </header>
  )
}
