'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Button, Chip, ErrorNote, Field, IconArrow, IconBack, IconCheck, Input, Spinner, Textarea } from '@/components/ui/kit'
import { SeedStage } from '@/components/onboarding/SeedStage'
import { BrandMark } from '@/components/brand/BrandMark'
import { EXAMPLE_IDEAS } from '@/lib/demo-atlas'
import { ApiError, post } from '@/lib/client'

const STRENGTHS = ['Software', 'Design', 'Sales', 'Operations', 'Domain expert', 'Finance', 'Marketing', 'Research']
const CAPITAL = ['Nothing yet', 'Under £10k', '£10k–£50k', 'Over £50k', 'Raising']
const TIMEFRAME = ['Evenings and weekends', 'Part-time', 'Full-time now', 'Full-time after proof']
const RISK = ['Cautious — need evidence first', 'Balanced', 'Aggressive — will move fast']

const STEPS = ['You', 'How you work', 'The idea'] as const

function OnboardingInner() {
  const router = useRouter()
  const params = useSearchParams()
  const reduce = useReducedMotion()
  const demo = params.get('demo') === '1'

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [strengths, setStrengths] = useState<string[]>([])
  const [capital, setCapital] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [risk, setRisk] = useState('')
  const [idea, setIdea] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const ideaRef = useRef<HTMLTextAreaElement>(null)
  // Feeds the 3D core: every keystroke adds a little light, which decays.
  const charge = useRef(0)

  // The demo link fills a working founder profile so the lab can be explored at once.
  useEffect(() => {
    if (!demo) return
    setName('Demo Founder')
    setEmail('founder@demo.local')
    setRole('Technical founder, first venture')
    setStrengths(['Software', 'Product'])
    setCapital('Under £10k')
    setTimeframe('Evenings and weekends')
    setRisk('Cautious — need evidence first')
  }, [demo])

  function toggleStrength(s: string) {
    setStrengths((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  function next() {
    setFieldError(null)
    if (step === 0) {
      if (!name.trim()) return setFieldError('Enter your name.')
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setFieldError('Enter a valid email address.')
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  async function finish() {
    setFieldError(null)
    if (idea.trim().length < 40) {
      setFieldError('Give the idea at least 40 characters — a fragment produces a generic analysis.')
      ideaRef.current?.focus()
      return
    }

    setBusy(true)
    setError(null)
    try {
      await post('/api/auth/demo', { email: email.trim(), name: name.trim() })
      await post('/api/onboarding', {
        role: role.trim() || undefined,
        strengths: strengths.length ? strengths : undefined,
        capital: capital || undefined,
        timeframe: timeframe || undefined,
        riskAppetite: risk || undefined,
      })
      const { venture } = await post<{ venture: { id: string } }>('/api/ventures', { rawIdea: idea.trim() })
      // Straight into the command center, which runs the analysis itself.
      router.push(`/venture/${venture.id}?analyze=1`)
    } catch (err) {
      setError(err as ApiError)
      setBusy(false)
    }
  }

  async function skipToLibrary() {
    setBusy(true)
    setError(null)
    try {
      await post('/api/auth/demo', { email: email.trim() || 'founder@demo.local', name: name.trim() || 'Demo Founder' })
      await post('/api/onboarding', {
        role: role.trim() || undefined,
        strengths: strengths.length ? strengths : undefined,
        capital: capital || undefined,
        timeframe: timeframe || undefined,
        riskAppetite: risk || undefined,
      })
      router.push('/ventures')
    } catch (err) {
      setError(err as ApiError)
      setBusy(false)
    }
  }

  return (
    <div className="grain relative min-h-screen bg-ink-800">
      <div className="grid-field pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 md:px-10">
        <BrandMark href="/" compact />
        <Link href="/" className="tap inline-flex items-center gap-1.5 text-[13px] text-paper-faint hover:text-paper">
          <IconBack size={14} />
          Back
        </Link>
      </header>

      <main id="main" className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-5 pb-24 pt-6 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-20 lg:pt-14">
        <div className="max-w-[38rem]">
          {/* Step rail — the sequence carries real information here. */}
          <ol className="mb-10 flex items-center gap-3" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={`flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] ${
                    i === step ? 'text-action-text' : i < step ? 'text-paper-dim' : 'text-paper-sub'
                  }`}
                  aria-current={i === step ? 'step' : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${
                      i === step
                        ? 'border-action text-action-text'
                        : i < step
                          ? 'border-paper-dim text-paper-dim'
                          : 'border-[rgb(var(--paper)/0.24)]'
                    }`}
                  >
                    {i < step ? <IconCheck size={9} /> : i + 1}
                  </span>
                  {s}
                </span>
                {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-6 bg-[rgb(var(--paper)/0.2)]" />}
              </li>
            ))}
          </ol>

          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            {step === 0 && (
              <>
                <h1 className="display text-[clamp(2.1rem,5vw,3.2rem)] leading-[1.02] text-paper">
                  Who is doing this?
                </h1>
                <p className="mt-4 max-w-measure text-[14.5px] leading-[1.7] text-paper-dim">
                  Feasibility is not abstract. The analysis weighs whether <em>you</em> can carry this venture, so a
                  little about you changes the answer.
                </p>

                <div className="mt-8 space-y-5">
                  <Field label="Your name" htmlFor="name">
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" autoComplete="name" />
                  </Field>
                  <Field
                    label="Email"
                    htmlFor="email"
                    hint="Used only to identify your local account. No password, no verification, nothing leaves this machine."
                  >
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="How would you describe yourself?" htmlFor="role">
                    <Input
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Technical founder, second venture"
                    />
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="display text-[clamp(2.1rem,5vw,3.2rem)] leading-[1.02] text-paper">
                  What can you actually bring?
                </h1>
                <p className="mt-4 max-w-measure text-[14.5px] leading-[1.7] text-paper-dim">
                  Be honest rather than aspirational. A gap named now becomes a risk the analysis can price.
                </p>

                <div className="mt-8 space-y-7">
                  <div>
                    <p className="label mb-2.5">Strengths</p>
                    <div className="flex flex-wrap gap-2">
                      {STRENGTHS.map((s) => (
                        <Chip key={s} active={strengths.includes(s)} onClick={() => toggleStrength(s)}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="label mb-2.5">Capital available</p>
                    <div className="flex flex-wrap gap-2">
                      {CAPITAL.map((s) => (
                        <Chip key={s} active={capital === s} onClick={() => setCapital(capital === s ? '' : s)}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="label mb-2.5">Time you can give it</p>
                    <div className="flex flex-wrap gap-2">
                      {TIMEFRAME.map((s) => (
                        <Chip key={s} active={timeframe === s} onClick={() => setTimeframe(timeframe === s ? '' : s)}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="label mb-2.5">Risk appetite</p>
                    <div className="flex flex-wrap gap-2">
                      {RISK.map((s) => (
                        <Chip key={s} active={risk === s} onClick={() => setRisk(risk === s ? '' : s)}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="display text-[clamp(2.1rem,5vw,3.2rem)] leading-[1.02] text-paper">
                  Describe the idea you cannot stop thinking about.
                </h1>
                <p className="mt-4 max-w-measure text-[14.5px] leading-[1.7] text-paper-dim">
                  Who is it for, what goes wrong for them today, and how would money actually arrive? The more
                  specific you are, the less this has to guess.
                </p>

                <div className="mt-8">
                  <label htmlFor="idea" className="sr-only">
                    Your business idea
                  </label>
                  <Textarea
                    id="idea"
                    ref={ideaRef}
                    rows={7}
                    value={idea}
                    onChange={(e) => {
                      setIdea(e.target.value)
                      // Each keystroke feeds the core. It decays on its own,
                      // so writing makes the specimen visibly brighten.
                      charge.current = Math.min(1.4, charge.current + 0.16)
                    }}
                    placeholder="A tool for small landlords who self-manage. The tenant reports a repair by text, we dispatch a vetted tradesperson, and every job becomes a compliance record…"
                    aria-describedby="idea-count"
                    className="min-h-[180px]"
                  />
                  <p id="idea-count" className="mt-2 text-[12.5px] text-paper-faint" aria-live="polite">
                    <span className="num font-mono text-paper-sub">{idea.trim().length}</span> characters
                    {idea.trim().length > 0 && idea.trim().length < 40 && (
                      <span className="text-risk"> · at least 40 needed</span>
                    )}
                  </p>

                  <p className="label mb-2.5 mt-6">Or start from one of these</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_IDEAS.map((ex) => (
                      <Chip key={ex.label} onClick={() => setIdea(ex.idea)} title={ex.idea}>
                        {ex.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {fieldError && <p className="mt-5 text-[13px] text-risk" role="alert">{fieldError}</p>}
          {error && (
            <ErrorNote className="mt-5" message={error.message} hint={error.hint} onRetry={step === 2 ? finish : undefined} />
          )}

          <div className="mt-9 flex flex-wrap items-center gap-2.5">
            {step > 0 && (
              <Button variant="quiet" size="md" onClick={() => setStep((s) => s - 1)} disabled={busy}>
                <IconBack size={14} />
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button variant="primary" size="lg" onClick={next}>
                Continue
                <IconArrow size={16} />
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={finish} disabled={busy} className="min-w-[200px]">
                {busy ? <Spinner /> : null}
                {busy ? 'Building the atlas' : 'Build the venture atlas'}
                {!busy && <IconArrow size={16} />}
              </Button>
            )}
            {step === STEPS.length - 1 && (
              <Button variant="quiet" size="md" onClick={skipToLibrary} disabled={busy}>
                Skip — go to my ventures
              </Button>
            )}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-16">
            <SeedStage step={step} charge={charge} />
            <p aria-hidden="true" className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-paper-faint">
              {step === 0 ? 'Specimen · dormant' : step === 1 ? 'Specimen · waking' : 'Specimen · open'}
            </p>
            <p className="mt-3 max-w-[36ch] text-[12.5px] leading-relaxed text-paper-faint">
              Nothing here is researched unless you say so. Everything the analysis produces from your description
              alone is labelled a hypothesis — written to be tested, not believed.
            </p>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-800" />}>
      <OnboardingInner />
    </Suspense>
  )
}
