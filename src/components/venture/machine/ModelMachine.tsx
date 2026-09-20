'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Button, IconClose, IconSpark, Input } from '@/components/ui/kit'
import type { BusinessModel, LaunchPlan } from '@/lib/atlas-types'

/**
 * The Business Model Machine.
 *
 * Seven stages of one system — customer, value, channel, price, revenue, cost,
 * retention — wired together so a change visibly travels.
 *
 * Editing a stage does not just change a number in place: the effect is pushed
 * along the wire to every stage downstream, each of which recomputes and
 * flashes as it takes the new value. That is the whole point. A pricing change
 * that does not visibly move revenue and payback is a spreadsheet, not a model.
 *
 * Every figure is labelled a hypothesis, because that is what it is. The
 * scenario modes are three sets of assumptions, not three forecasts.
 */

export type Scenario = 'lean' | 'balanced' | 'ambitious'

export interface Knobs {
  /** Customers reached per month. */
  reach: number
  /** Share of reach that converts. */
  conversion: number
  /** Monthly price per customer. */
  price: number
  /** Monthly cost to serve one customer. */
  serve: number
  /** Fixed monthly cost. */
  fixed: number
  /** Share retained month to month. */
  retention: number
}

/**
 * INR values converted from the earlier GBP scenarios at ₹108/£. Keeping the
 * same ratio preserves the model's economics while making the simulator useful
 * for an Indian founder.
 */
const PRESETS: Record<Scenario, Partial<Knobs>> = {
  lean: { reach: 120, conversion: 0.04, price: 2052, serve: 432, fixed: 43200, retention: 0.82 },
  balanced: { reach: 400, conversion: 0.06, price: 3132, serve: 648, fixed: 129600, retention: 0.88 },
  ambitious: { reach: 1500, conversion: 0.09, price: 4212, serve: 972, fixed: 453600, retention: 0.92 },
}

export interface Derived {
  customers: number
  mrr: number
  grossPerCustomer: number
  grossMargin: number
  monthlyProfit: number
  lifetimeMonths: number
  ltv: number
  breakEvenCustomers: number
}

export function derive(k: Knobs): Derived {
  const customers = k.reach * k.conversion
  const mrr = customers * k.price
  const grossPerCustomer = k.price - k.serve
  const grossMargin = k.price > 0 ? grossPerCustomer / k.price : 0
  const monthlyProfit = customers * grossPerCustomer - k.fixed
  // Average lifetime for a constant monthly churn.
  const churn = Math.max(0.001, 1 - k.retention)
  const lifetimeMonths = 1 / churn
  const ltv = grossPerCustomer * lifetimeMonths
  const breakEvenCustomers = grossPerCustomer > 0 ? k.fixed / grossPerCustomer : Infinity
  return { customers, mrr, grossPerCustomer, grossMargin, monthlyProfit, lifetimeMonths, ltv, breakEvenCustomers }
}

const money = (n: number) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(n))
    : '—'

/* ------------------------------------------------------------------ *
 * Stages
 * ------------------------------------------------------------------ */

interface Stage {
  id: keyof Knobs | 'revenue'
  label: string
  /** What the stage is, in the founder's language. */
  blurb: string
  /** The knob this stage owns, if any. */
  knob?: keyof Knobs
  format: (k: Knobs, d: Derived) => string
  min?: number
  max?: number
  step?: number
  suffix?: string
  percent?: boolean
}

const STAGES: Stage[] = [
  {
    id: 'reach',
    label: 'Customer',
    blurb: 'How many of the right people you put this in front of each month.',
    knob: 'reach',
    format: (k) => `${Math.round(k.reach).toLocaleString()} reached`,
    min: 10,
    max: 5000,
    step: 10,
  },
  {
    id: 'conversion',
    label: 'Value',
    blurb: 'The share who find it worth paying for. This is your value proposition, measured.',
    knob: 'conversion',
    format: (k) => `${(k.conversion * 100).toFixed(1)}% convert`,
    min: 0.005,
    max: 0.4,
    step: 0.005,
    percent: true,
  },
  {
    id: 'price',
    label: 'Price',
    blurb: 'What one customer pays each month.',
    knob: 'price',
    format: (k) => `${money(k.price)} / month`,
    min: 100,
    max: 54000,
    step: 100,
  },
  {
    id: 'revenue',
    label: 'Revenue',
    blurb: 'What arrives each month if the stages above hold.',
    format: (_k, d) => `${money(d.mrr)} MRR`,
  },
  {
    id: 'serve',
    label: 'Cost to serve',
    blurb: 'What each customer costs you every month.',
    knob: 'serve',
    format: (k) => `${money(k.serve)} / customer`,
    min: 0,
    max: 32400,
    step: 100,
  },
  {
    id: 'fixed',
    label: 'Fixed cost',
    blurb: 'What you pay whether anyone buys or not.',
    knob: 'fixed',
    format: (k) => `${money(k.fixed)} / month`,
    min: 0,
    max: 2160000,
    step: 1000,
  },
  {
    id: 'retention',
    label: 'Retention',
    blurb: 'The share still there next month. This sets how long a customer is worth anything.',
    knob: 'retention',
    format: (k, d) => `${(k.retention * 100).toFixed(0)}% · ${d.lifetimeMonths.toFixed(1)} mo life`,
    min: 0.4,
    max: 0.99,
    step: 0.01,
    percent: true,
  },
]

/* ------------------------------------------------------------------ */

export function ModelMachine({
  model,
  launch,
  ventureId,
  onAskMilo,
}: {
  model: BusinessModel | null
  launch: LaunchPlan | null
  ventureId: string
  onAskMilo: (about: string) => void
}) {
  const reduce = useReducedMotion()
  const [scenario, setScenario] = useState<Scenario>('balanced')
  const [knobs, setKnobs] = useState<Knobs>({ ...(PRESETS.balanced as Knobs) })
  const [open, setOpen] = useState<string | null>(null)
  /** Stage ids currently lit because a change just travelled through them. */
  const [pulse, setPulse] = useState<Set<string>>(new Set())
  const pulseTimer = useRef<number | null>(null)

  // The knobs are the founder's working assumptions, so they persist.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`va_model_inr_v1_${ventureId}`)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.knobs) setKnobs(saved.knobs)
        if (saved.scenario) setScenario(saved.scenario)
      }
    } catch {
      /* private mode — the model simply starts from the preset */
    }
  }, [ventureId])

  useEffect(() => {
    try {
      localStorage.setItem(`va_model_inr_v1_${ventureId}`, JSON.stringify({ knobs, scenario }))
    } catch {
      /* nothing to persist to */
    }
  }, [knobs, scenario, ventureId])

  const derived = useMemo(() => derive(knobs), [knobs])

  /** Change a knob, then send the change down the wire. */
  function set(knob: keyof Knobs, value: number) {
    setKnobs((k) => ({ ...k, [knob]: value }))

    // Everything after this stage recomputes, so light them in sequence.
    const from = STAGES.findIndex((s) => s.knob === knob)
    const downstream = STAGES.slice(from + 1).map((s) => s.id as string)
    if (reduce || !downstream.length) return

    if (pulseTimer.current) window.clearTimeout(pulseTimer.current)
    setPulse(new Set([STAGES[from].id as string]))
    downstream.forEach((id, i) => {
      window.setTimeout(() => setPulse((p) => new Set([...p, id])), (i + 1) * 90)
    })
    pulseTimer.current = window.setTimeout(() => setPulse(new Set()), downstream.length * 90 + 700)
  }

  function applyScenario(s: Scenario) {
    setScenario(s)
    setKnobs({ ...(PRESETS[s] as Knobs) })
    if (reduce) return
    setPulse(new Set(STAGES.map((x) => x.id as string)))
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current)
    pulseTimer.current = window.setTimeout(() => setPulse(new Set()), 900)
  }

  const openStage = STAGES.find((s) => s.id === open) ?? null
  const viable = derived.monthlyProfit > 0

  return (
    <div>
      {/* Scenario modes. Three sets of assumptions, said plainly. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="label mr-1">Scenario</span>
        {(['lean', 'balanced', 'ambitious'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => applyScenario(s)}
            aria-pressed={scenario === s}
            className={`tap rounded-full border px-3.5 py-1.5 text-[12.5px] capitalize transition-colors duration-150 ${
              scenario === s
                ? 'border-action bg-action-wash text-action-text'
                : 'border-[color:var(--rule-strong)] text-paper-dim hover:border-paper-sub hover:text-paper'
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-unknown">
          Illustrative inputs · not venture findings
        </span>
      </div>

      {/* The machine. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[repeat(7,minmax(0,1fr))]">
        {STAGES.map((s, i) => {
          const lit = pulse.has(s.id as string)
          const isResult = s.id === 'revenue'
          return (
            <div key={s.id} className="relative">
              {/* The wire into this stage, and the charge travelling it. */}
              {i > 0 && (
                <span aria-hidden="true" className="absolute -left-3 top-1/2 hidden h-px w-3 bg-[color:var(--rule-strong)] lg:block">
                  <motion.span
                    className="absolute inset-y-0 left-0 w-full origin-left bg-action"
                    initial={false}
                    animate={{ scaleX: lit ? 1 : 0, opacity: lit ? 1 : 0 }}
                    transition={{ duration: 0.28 }}
                  />
                </span>
              )}

              <button
                type="button"
                onClick={() => setOpen(open === s.id ? null : (s.id as string))}
                aria-expanded={open === s.id}
                className={`tap flex h-full w-full flex-col rounded-[4px] border p-3.5 text-left transition-colors duration-200 ${
                  lit
                    ? 'border-action bg-action-wash'
                    : isResult
                      ? 'border-[color:var(--rule-strong)] bg-[rgb(var(--paper)/0.04)]'
                      : 'border-[color:var(--rule)] bg-[rgb(var(--paper)/0.02)] hover:border-paper-sub'
                }`}
              >
                <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-sub">{s.label}</span>
                <motion.span
                  key={s.format(knobs, derived)}
                  initial={reduce ? false : { opacity: 0.4, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`num mt-2 text-[15px] leading-tight ${isResult ? 'text-action-text' : 'text-paper'}`}
                >
                  {s.format(knobs, derived)}
                </motion.span>
              </button>
            </div>
          )
        })}
      </div>

      {/* What the machine currently says. */}
      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-[4px] border border-[color:var(--rule)] bg-[rgb(var(--ink-900)/0.4)] p-5 md:grid-cols-4">
        {[
          ['Customers', `${derived.customers.toFixed(0)}`, 'converting each month'],
          ['Gross margin', `${(derived.grossMargin * 100).toFixed(0)}%`, `${money(derived.grossPerCustomer)} per customer`],
          ['Lifetime value', money(derived.ltv), `over ${derived.lifetimeMonths.toFixed(1)} months`],
          [
            'Monthly profit',
            money(derived.monthlyProfit),
            Number.isFinite(derived.breakEvenCustomers)
              ? `break even at ${Math.ceil(derived.breakEvenCustomers)} customers`
              : 'never breaks even at this price',
          ],
        ].map(([label, value, note], i) => (
          <div key={label}>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-sub">{label}</p>
            <p className={`num mt-1.5 text-[19px] leading-none ${i === 3 ? (viable ? 'text-signal' : 'text-risk') : 'text-paper'}`}>
              {value}
            </p>
            <p className="mt-1.5 text-[11.5px] leading-[1.45] text-paper-faint">{note}</p>
          </div>
        ))}
      </div>

      {!viable && (
        <p className="mt-3 border-l-2 border-risk bg-risk-wash px-4 py-3 text-[13px] leading-[1.6] text-paper-dim">
          At these assumptions the model loses {money(Math.abs(derived.monthlyProfit))} a month.{' '}
          {derived.grossPerCustomer <= 0
            ? 'Each customer costs more to serve than they pay, so volume makes it worse, not better.'
            : `It needs ${Math.ceil(derived.breakEvenCustomers)} paying customers to break even — ${(
                derived.breakEvenCustomers / Math.max(1, derived.customers)
              ).toFixed(1)}× what this reach and conversion produce.`}
        </p>
      )}

      {/* ---------------- stage editor ---------------- */}
      <AnimatePresence>
        {openStage && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 rounded-[4px] border border-[color:var(--rule-strong)] bg-[rgb(var(--paper)/0.03)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-medium text-paper">{openStage.label}</h3>
                  <p className="mt-1.5 max-w-[54ch] text-[13px] leading-[1.6] text-paper-faint">{openStage.blurb}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label="Close"
                  className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] text-paper-faint hover:text-paper"
                >
                  <IconClose size={14} />
                </button>
              </div>

              {openStage.knob ? (
                <div className="mt-5">
                  <label htmlFor={`knob-${openStage.id}`} className="label mb-2 block">
                    {openStage.percent ? 'Share' : 'Value'}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      id={`knob-${openStage.id}`}
                      type="range"
                      min={openStage.min}
                      max={openStage.max}
                      step={openStage.step}
                      value={knobs[openStage.knob]}
                      onChange={(e) => set(openStage.knob!, Number(e.target.value))}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[rgb(var(--paper)/0.14)] accent-[rgb(var(--action))]"
                    />
                    <span className="num w-24 shrink-0 text-right text-[14px] text-paper">
                      {openStage.percent
                        ? `${(knobs[openStage.knob] * 100).toFixed(1)}%`
                        : money(knobs[openStage.knob])}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] text-paper-sub">
                    Changing this pushes the new value through every stage to its right.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-[13px] leading-[1.6] text-paper-dim">
                  This stage is computed from the ones before it. Change those and watch this move.
                </p>
              )}

              <Button variant="ghost" size="sm" className="mt-5" onClick={() => onAskMilo(`explain:${openStage.label} in my business model`)}>
                <IconSpark size={12} />
                Ask Milo about this stage
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- what the analysis said ---------------- */}
      {(model?.revenueStreams?.length || model?.mvpScope || launch?.kpis?.length) && (
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {model?.revenueStreams?.length ? (
            <div>
              <p className="label mb-3">Revenue streams the analysis proposed</p>
              <ul className="space-y-3">
                {model.revenueStreams.slice(0, 4).map((r) => (
                  <li key={r.id} className="text-[13px] leading-[1.55]">
                    <span className="text-paper">{r.name}</span>
                    <span className="ml-2 num text-action-text">{r.pricePoint}</span>
                    <span className="mt-1 block text-paper-faint">{r.testMethod}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {model?.mvpScope ? (
            <div>
              <p className="label mb-3">MVP scope</p>
              <ul className="space-y-1.5">
                {model.mvpScope.inScope?.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-[1.5] text-paper-dim">
                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-signal" />
                    {s}
                  </li>
                ))}
                {model.mvpScope.outOfScope?.slice(0, 3).map((s, i) => (
                  <li key={`o${i}`} className="flex gap-2.5 text-[13px] leading-[1.5] text-paper-sub line-through">
                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-paper-sub" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {launch?.kpis?.length ? (
            <div>
              <p className="label mb-3">KPI tree</p>
              <ul className="space-y-3">
                {launch.kpis.slice(0, 4).map((k, i) => (
                  <li key={i} className="text-[13px] leading-[1.55]">
                    <span className="text-paper">{k.name}</span>
                    <span className="mt-1 block text-paper-faint">
                      target <span className="num text-signal">{k.target}</span> · fails below{' '}
                      <span className="num text-risk">{k.failureThreshold}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
