'use client'

import { useEffect, useState } from 'react'
import { AppShell, useSession } from '@/components/AppShell'
import { Button, Chip, ErrorNote, IconCheck, IconKey, Input, Rule, Skeleton, Spinner } from '@/components/ui/kit'
import { ApiError, api, post } from '@/lib/client'

interface SettingsData {
  gemini: { model: string; researchModel: string; configured: boolean }
  profile: {
    name: string
    email: string
    role: string | null
    strengths: string | null
    capital: string | null
    timeframe: string | null
    riskAppetite: string | null
  }
  counts: { ventures: number; archived: number; sources: number }
}

const STRENGTHS = ['Software', 'Design', 'Sales', 'Operations', 'Domain expert', 'Finance', 'Marketing', 'Research']
const CAPITAL = ['Nothing yet', 'Under £10k', '£10k–£50k', 'Over £50k', 'Raising']
const TIMEFRAME = ['Evenings and weekends', 'Part-time', 'Full-time now', 'Full-time after proof']
const RISK = ['Cautious — need evidence first', 'Balanced', 'Aggressive — will move fast']

export default function SettingsPage() {
  const { user } = useSession()
  const [data, setData] = useState<SettingsData | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  const [role, setRole] = useState('')
  const [strengths, setStrengths] = useState<string[]>([])
  const [capital, setCapital] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [risk, setRisk] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await api<SettingsData>('/api/settings')
      setData(d)
      setRole(d.profile.role ?? '')
      setCapital(d.profile.capital ?? '')
      setTimeframe(d.profile.timeframe ?? '')
      setRisk(d.profile.riskAppetite ?? '')
      try {
        setStrengths(d.profile.strengths ? (JSON.parse(d.profile.strengths) as string[]) : [])
      } catch {
        setStrengths([])
      }
    } catch (err) {
      setError(err as ApiError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      await post('/api/onboarding', {
        role: role.trim() || undefined,
        strengths: strengths.length ? strengths : undefined,
        capital: capital || undefined,
        timeframe: timeframe || undefined,
        riskAppetite: risk || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2600)
    } catch (err) {
      setError(err as ApiError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell user={user} breadcrumb={<span className="text-[14px] text-paper-dim">Settings</span>}>
      <div className="mx-auto max-w-[52rem] py-10 md:py-14">
        <h1 className="display text-[clamp(2rem,4.6vw,3rem)] leading-[1.0] text-paper">Settings</h1>
        <p className="mt-2.5 max-w-measure text-[14px] text-paper-faint">
          How the lab is configured on this machine, and the founder profile the analysis weighs against.
        </p>

        {error && <ErrorNote className="mt-6" message={error.message} hint={error.hint} onRetry={load} />}

        {loading ? (
          <div className="mt-10 space-y-4" aria-busy="true">
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </div>
        ) : data ? (
          <>
            {/* Gemini status */}
            <section className="rule-t mt-10 pt-7">
              <h2 className="display text-[1.5rem] leading-tight text-paper">Gemini</h2>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] ${
                    data.gemini.configured ? 'border-action/45 text-action-text' : 'border-risk/50 text-risk'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${data.gemini.configured ? 'bg-action' : 'bg-risk'}`}
                  />
                  {data.gemini.configured ? 'Key configured' : 'No key configured'}
                </span>
                <span className="num font-mono text-[12px] text-paper-faint">{data.gemini.model}</span>
                {data.gemini.researchModel !== data.gemini.model && (
                  <span className="num font-mono text-[12px] text-paper-faint">
                    research: {data.gemini.researchModel}
                  </span>
                )}
              </div>

              {!data.gemini.configured ? (
                <div className="mt-5 border-l-2 border-risk bg-risk-wash px-4 py-4">
                  <p className="flex items-center gap-2 text-[14px] text-paper">
                    <IconKey size={14} className="text-risk" />
                    The server has no Gemini key, so analysis and Milo are unavailable.
                  </p>
                  <ol className="mt-3 space-y-2">
                    {[
                      'Get a key from Google AI Studio at aistudio.google.com/apikey.',
                      'Add GEMINI_API_KEY=your-key to .env.local in the project root.',
                      'Restart the dev server. This page will show the key as configured.',
                    ].map((s, i) => (
                      <li key={i} className="flex gap-3 text-[13.5px] leading-[1.58] text-paper-dim">
                        <span aria-hidden="true" className="num mt-[2px] shrink-0 font-mono text-[10.5px] text-paper-sub">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-paper-faint">
                    The key is read server-side only. It is never sent to the browser and never stored in the database.
                  </p>
                </div>
              ) : (
                <p className="mt-4 max-w-measure text-[13px] leading-relaxed text-paper-faint">
                  The key lives in <span className="font-mono text-paper-dim">.env.local</span> and is used only on the
                  server. Change the model with{' '}
                  <span className="font-mono text-paper-dim">GEMINI_MODEL</span> and restart the dev server.
                </p>
              )}
            </section>

            {/* Founder profile */}
            <section className="rule-t mt-10 pt-7">
              <h2 className="display text-[1.5rem] leading-tight text-paper">Founder profile</h2>
              <p className="mt-2 max-w-measure text-[13.5px] text-paper-faint">
                Feasibility is judged against this. Change it and regenerate a module to see the analysis shift.
              </p>

              <div className="mt-6 space-y-7">
                <div>
                  <label htmlFor="s-role" className="label mb-1.5 block">
                    How you describe yourself
                  </label>
                  <Input id="s-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Technical founder, first venture" />
                </div>

                {(
                  [
                    ['Strengths', STRENGTHS, strengths, (s: string) => setStrengths((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s])), true],
                    ['Capital available', CAPITAL, capital, (s: string) => setCapital(capital === s ? '' : s), false],
                    ['Time you can give it', TIMEFRAME, timeframe, (s: string) => setTimeframe(timeframe === s ? '' : s), false],
                    ['Risk appetite', RISK, risk, (s: string) => setRisk(risk === s ? '' : s), false],
                  ] as const
                ).map(([label, options, value, toggle, multi]) => (
                  <div key={label}>
                    <p className="label mb-2.5">{label}</p>
                    <div className="flex flex-wrap gap-2">
                      {options.map((o) => (
                        <Chip
                          key={o}
                          active={multi ? (value as string[]).includes(o) : value === o}
                          onClick={() => toggle(o)}
                        >
                          {o}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex items-center gap-3">
                <Button variant="primary" size="md" onClick={save} disabled={saving}>
                  {saving ? <Spinner /> : <IconCheck size={14} />}
                  {saving ? 'Saving' : 'Save profile'}
                </Button>
                {saved && (
                  <span role="status" className="text-[13px] text-action-text">
                    Saved.
                  </span>
                )}
              </div>
            </section>

            {/* Account and data */}
            <section className="rule-t mt-10 pt-7">
              <h2 className="display text-[1.5rem] leading-tight text-paper">This device</h2>
              <dl className="mt-4 space-y-3">
                <div className="flex justify-between gap-6">
                  <dt className="text-[13.5px] text-paper-dim">Signed in as</dt>
                  <dd className="text-[13.5px] text-paper">{data.profile.email}</dd>
                </div>
                <div className="flex justify-between gap-6">
                  <dt className="text-[13.5px] text-paper-dim">Active ventures</dt>
                  <dd className="num font-mono text-[13.5px] text-paper">{data.counts.ventures}</dd>
                </div>
                <div className="flex justify-between gap-6">
                  <dt className="text-[13.5px] text-paper-dim">Archived</dt>
                  <dd className="num font-mono text-[13.5px] text-paper">{data.counts.archived}</dd>
                </div>
                <div className="flex justify-between gap-6">
                  <dt className="text-[13.5px] text-paper-dim">Evidence items</dt>
                  <dd className="num font-mono text-[13.5px] text-paper">{data.counts.sources}</dd>
                </div>
              </dl>
              <Rule className="my-5" />
              <p className="max-w-measure text-[12.5px] leading-relaxed text-paper-faint">
                Everything is stored in a local SQLite database at{' '}
                <span className="font-mono text-paper-dim">prisma/dev.db</span>. Nothing is uploaded anywhere except the
                idea text sent to the Gemini API when you run an analysis. Delete the file to wipe all data.
              </p>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  )
}
