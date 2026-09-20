'use client'

import { use, useState } from 'react'
import { AppShell, useSession } from '@/components/AppShell'
import { Milo } from '@/components/venture/Milo'
import { VentureNav } from '@/components/venture/Chrome'
import { useVenture } from '@/components/venture/useVenture'
import { Presentation } from '@/components/venture/report/Presentation'
import { buildSlides } from '@/components/venture/report/buildSlides'
import { Button, ErrorNote, EvidenceTag, IconDownload, IconLayers, IconPrint, IntegrityNote, Rule, Skeleton } from '@/components/ui/kit'

function Section({ title, children, breakBefore }: { title: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <section data-milo-target={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")} data-milo-title={title} data-milo-section="report" className={`rule-t py-8 print-plain ${breakBefore ? 'print-break' : ''}`}>
      <h2 className="display mb-5 text-[1.55rem] leading-tight text-paper print-plain">{title}</h2>
      {children}
    </section>
  )
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-1 py-2.5 md:grid-cols-[minmax(0,170px)_minmax(0,1fr)]">
      <dt className="label print-plain">{term}</dt>
      <dd className="max-w-measure text-[13.5px] leading-[1.62] text-paper-dim print-plain">{children}</dd>
    </div>
  )
}

function ReportPage({ id }: { id: string }) {
  const { user } = useSession()
  const v = useVenture(id)
  const [presenting, setPresenting] = useState(false)

  function exportJson() {
    if (!v.data) return
    const blob = new Blob([JSON.stringify(v.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download =
      (v.data.venture.title || 'venture').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (v.loading) {
    return (
      <AppShell user={user} breadcrumb={<Skeleton className="h-4 w-40" />}>
        <div className="space-y-5 py-12" aria-busy="true">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-64" />
        </div>
      </AppShell>
    )
  }

  if (v.error || !v.data) {
    return (
      <AppShell user={user}>
        <div className="py-16">
          <ErrorNote message={v.error?.message ?? 'Not found.'} hint={v.error?.hint} onRetry={v.reload} />
        </div>
      </AppShell>
    )
  }

  const { venture, sections, sectionMeta, assumptions, experiments, sources } = v.data
  const grounded = sources.filter((s) => s.evidence === 'sourced')
  const overall = grounded.length ? 'sourced' : sources.length ? 'user_provided' : 'hypothesis'

  return (
    <AppShell
      user={user}
      breadcrumb={<span className="truncate text-[14px] text-paper-dim">{venture.title}</span>}
      actions={
        <>
          <Button variant="quiet" size="sm" onClick={exportJson} aria-label="Download as JSON">
            <IconDownload size={13} />
            <span className="hidden sm:inline">JSON</span>
          </Button>
          <Button variant="quiet" size="sm" onClick={() => window.print()}>
            <IconPrint size={13} />
            <span className="hidden sm:inline">Print</span>
          </Button>
          {/* Print stays on the document; this is for showing it to a room. */}
          <Button variant="primary" size="sm" onClick={() => setPresenting(true)}>
            <IconLayers size={13} />
            <span className="hidden sm:inline">Present</span>
          </Button>
        </>
      }
    >
      {presenting && (
        <Presentation
          title={venture.title}
          slides={buildSlides({ venture, sections, assumptions, experiments, sources })}
          onClose={() => setPresenting(false)}
        />
      )}

      <div className="no-print rule-b sticky top-[57px] z-30 bg-ink-800/85 pt-6 backdrop-blur-xl">
        <VentureNav id={id} />
      </div>

      <article className="mx-auto max-w-[52rem] py-10 print-plain md:py-14">
        <header className="print-plain">
          <p className="label print-plain">Venture dossier</p>
          <h1 className="display mt-3 text-[clamp(2.1rem,5vw,3.4rem)] leading-[1.0] text-paper print-plain">
            {venture.title}
          </h1>
          <p className="mt-4 max-w-measure text-[14.5px] leading-[1.7] text-paper-dim print-plain">{venture.rawIdea}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <EvidenceTag evidence={overall} />
            <span className="num font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-sub print-plain">
              {new Date(venture.createdAt).toLocaleDateString()}
            </span>
            <span className="num font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-sub print-plain">
              Health {venture.healthScore}/100
            </span>
          </div>
          <Rule className="mt-6" />
          <IntegrityNote evidence={overall} className="mt-5 print-plain" />
        </header>

        {sections.verdict && (
          <Section title="Verdict">
            <p className="display text-[2rem] leading-none text-paper print-plain">{sections.verdict.verdict}</p>
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper-sub print-plain">
              Confidence {sections.verdict.confidence}
            </p>
            <p className="mt-4 max-w-measure text-[14.5px] leading-[1.7] text-paper-dim print-plain">
              {sections.verdict.reasoning}
            </p>
            <dl className="mt-5">
              <Row term="Strongest signal">{sections.verdict.strongestSignal}</Row>
              <Row term="Fatal flaw risk">{sections.verdict.fatalFlawRisk}</Row>
              <Row term="What would change this">{sections.verdict.whatWouldChangeThis}</Row>
            </dl>
          </Section>
        )}

        {sections.genome && (
          <Section title="Idea Genome">
            <p className="mb-4 max-w-measure text-[14px] leading-[1.66] text-paper-dim print-plain">
              {sections.genome.summary}
            </p>
            <dl>
              {sections.genome.nodes.map((n) => (
                <Row key={n.id} term={n.label}>
                  {n.detail}
                </Row>
              ))}
              <Row term="Why now">{sections.genome.whyNow}</Row>
            </dl>
            <p className="label mb-2 mt-5 print-plain">Not specified</p>
            <ul className="space-y-1.5">
              {sections.genome.missingInformation.map((m, i) => (
                <li key={i} className="text-[13.5px] leading-[1.6] text-paper-dim print-plain">
                  — {m}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {assumptions.length > 0 && (
          <Section title="Assumptions" breakBefore>
            <ol className="space-y-5">
              {assumptions.map((a, i) => (
                <li key={a.id} className="print-plain">
                  <p className="text-[14.5px] leading-[1.5] text-paper print-plain">
                    <span className="num mr-2 font-mono text-[11px] text-paper-sub">{String(i + 1).padStart(2, '0')}</span>
                    {a.claim}
                  </p>
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-sub print-plain">
                    {a.category} · impact {a.impact}/5 · uncertainty {a.uncertainty}/5 · {a.status}
                  </p>
                  <p className="mt-1.5 max-w-measure text-[13px] leading-[1.58] text-paper-dim print-plain">
                    Breaks if false: {a.breaksIfFalse}
                  </p>
                  <p className="mt-1 max-w-measure text-[13px] leading-[1.58] text-paper-dim print-plain">
                    Cheapest test: {a.cheapestTest} {a.testCost ? `(${a.testCost}` : ''}
                    {a.testDuration ? `, ${a.testDuration})` : a.testCost ? ')' : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {sections.failures && sections.failures.length > 0 && (
          <Section title="Failure modes">
            <ol className="space-y-5">
              {sections.failures.map((f) => (
                <li key={f.id} className="print-plain">
                  <p className="text-[15px] text-paper print-plain">{f.title}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-sub print-plain">
                    {f.killZone} · likelihood {f.likelihood}
                  </p>
                  <p className="mt-1.5 max-w-measure text-[13.5px] leading-[1.62] text-paper-dim print-plain">
                    {f.narrative}
                  </p>
                  <p className="mt-1.5 max-w-measure text-[13px] leading-[1.58] text-paper-dim print-plain">
                    Mitigation: {f.mitigation}
                  </p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {sections.pivots && sections.pivots.length > 0 && (
          <Section title="Pivots" breakBefore>
            <dl>
              {sections.pivots.map((p) => (
                <Row key={p.id} term={`${p.kind} — ${p.title}`}>
                  {p.description} <span className="text-paper-faint">Costs you: {p.tradeoff}</span>
                </Row>
              ))}
            </dl>
          </Section>
        )}

        {sections.model && (
          <Section title="Business model">
            <dl>
              {sections.model.revenueStreams.map((r) => (
                <Row key={r.id} term={r.name}>
                  {r.pricePoint} — {r.rationale} <span className="text-paper-faint">Risk: {r.risk}</span>
                </Row>
              ))}
            </dl>
            <p className="label mb-2 mt-5 print-plain">MVP scope</p>
            <ul className="space-y-1.5">
              {sections.model.mvpScope.inScope.map((x, i) => (
                <li key={i} className="text-[13.5px] leading-[1.6] text-paper-dim print-plain">
                  — {x}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {experiments.length > 0 && (
          <Section title="Experiments" breakBefore>
            <ol className="space-y-5">
              {experiments.map((e) => (
                <li key={e.id} className="print-plain">
                  <p className="text-[14.5px] text-paper print-plain">
                    {e.name} <span className="font-mono text-[10.5px] uppercase text-paper-sub">· {e.status}</span>
                  </p>
                  <p className="mt-1 max-w-measure text-[13px] leading-[1.58] text-paper-dim print-plain">
                    {e.hypothesis}
                  </p>
                  <p className="mt-1 max-w-measure text-[13px] leading-[1.58] text-paper-dim print-plain">
                    Passes if {e.successThreshold}. Fails if {e.failThreshold}.
                  </p>
                  {e.result && (
                    <p className="mt-1 max-w-measure text-[13px] leading-[1.58] text-paper-dim print-plain">
                      Result: {e.result}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {sections.launch && (
          <Section title="The next seven days">
            <ol className="space-y-2.5">
              {sections.launch.sevenDays.map((d) => (
                <li key={d.day} className="text-[13.5px] leading-[1.6] text-paper-dim print-plain">
                  <span className="num font-mono text-[11px] text-paper-sub">Day {d.day}</span> — {d.action}{' '}
                  <span className="text-paper-faint">({d.output})</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Section title="Evidence">
          {sources.length === 0 ? (
            <p className="max-w-measure text-[13.5px] leading-[1.62] text-paper-faint print-plain">
              No evidence was attached. Everything in this dossier is a hypothesis derived from the idea description.
            </p>
          ) : (
            <ul className="space-y-3">
              {sources.map((s) => (
                <li key={s.id} className="print-plain">
                  <p className="text-[13.5px] text-paper print-plain">
                    {s.title}{' '}
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-sub">
                      · {s.evidence === 'sourced' ? 'sourced' : 'your evidence'}
                    </span>
                  </p>
                  {s.url && (
                    <a href={s.url} className="break-all text-[12.5px] text-paper-faint underline print-plain">
                      {s.url}
                    </a>
                  )}
                  <p className="num mt-0.5 font-mono text-[10.5px] text-paper-sub print-plain">
                    retrieved {new Date(s.retrievedAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <footer className="rule-t pt-6 print-plain">
          <p className="max-w-measure text-[12px] leading-relaxed text-paper-faint print-plain">
            Generated by Venture Autopsy on {new Date().toLocaleDateString()}. Section versions:{' '}
            {Object.entries(sectionMeta)
              .map(([k, m]) => `${k} v${m.version}`)
              .join(', ') || 'none'}
            . Unmarked claims are hypotheses to test, not findings.
          </p>
        </footer>
      </article>
      <Milo ventureId={id} context="report" />
    </AppShell>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ReportPage id={id} />
}
