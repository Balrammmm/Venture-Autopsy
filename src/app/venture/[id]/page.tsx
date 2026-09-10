'use client'

import { Suspense, use, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell, useSession } from '@/components/AppShell'
import { VentureNav, ModuleFrame, ModuleEmpty } from '@/components/venture/Chrome'
import { AssumptionMinefield, FailureMuseum, IdeaGenome, PivotPrism } from '@/components/venture/modules/Command'
import { CoreStage } from '@/components/venture/core/CoreStage'
import { Milo, type MiloMood } from '@/components/venture/Milo'
import { VentureHeader } from '@/components/venture/VentureHeader'
import { useVenture } from '@/components/venture/useVenture'
import { Button, ErrorNote, Skeleton, Spinner } from '@/components/ui/kit'

function CommandCenter({ id }: { id: string }) {
  const { user } = useSession()
  const params = useSearchParams()
  const v = useVenture(id)
  const [context, setContext] = useState<string | undefined>('genome')
  const [ask, setAsk] = useState<{ about: string; at: number } | null>(null)
  const started = useRef(false)

  // Arriving with ?analyze=1 from onboarding kicks the analysis off once.
  useEffect(() => {
    if (started.current) return
    if (params.get('analyze') !== '1') return
    if (!v.data || v.data.venture.stage === 'analysed') return
    started.current = true
    v.analyse(false)
  }, [params, v])

  // Milo reacts to what is on screen: wary in the risk modules, alert on pivots.
  useEffect(() => {
    const targets = [
      ['genome', 'idle'],
      ['assumptions', 'wary'],
      ['failures', 'wary'],
      ['pivots', 'alert'],
    ] as const
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (seen) setContext(seen.target.id)
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.05, 0.4] },
    )
    targets.forEach(([key]) => {
      const el = document.getElementById(key)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [v.data])

  const mood: MiloMood =
    context === 'assumptions' || context === 'failures' ? 'wary' : context === 'pivots' ? 'alert' : 'idle'

  if (v.loading) {
    return (
      <AppShell user={user} breadcrumb={<Skeleton className="h-4 w-40" />} wide>
        <div className="space-y-8 py-12" aria-busy="true" aria-label="Loading the venture">
          <Skeleton className="h-14 w-2/5" />
          <Skeleton className="h-4 w-3/5" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Skeleton className="h-[320px]" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (v.error || !v.data) {
    return (
      <AppShell user={user} wide>
        <div className="py-16">
          <ErrorNote
            title="Could not open this venture"
            message={v.error?.message ?? 'It was not found.'}
            hint={v.error?.hint}
            onRetry={v.reload}
          />
          <Button variant="ghost" size="md" className="mt-5" onClick={() => (window.location.href = '/ventures')}>
            Back to ventures
          </Button>
        </div>
      </AppShell>
    )
  }

  const { venture, sections, sectionMeta } = v.data
  const analysed = venture.stage === 'analysed'
  const meta = (key: string) => sectionMeta[key]

  return (
    <AppShell
      user={user}
      wide
      breadcrumb={<span className="truncate text-[14px] text-paper-dim">{venture.title}</span>}
      actions={
        analysed ? undefined : (
          <Button variant="primary" size="sm" onClick={() => v.analyse(false)} disabled={v.analysing}>
            {v.analysing ? <Spinner /> : null}
            {v.analysing ? 'Building' : 'Build the atlas'}
          </Button>
        )
      }
    >
      <VentureHeader venture={venture} verdict={sections.verdict} api={v} />

      {/*
        The core: a working model of the chain, and the signals that feed the
        readiness figure. Everything in it comes from real rows, so it is empty
        and says so until the atlas is built.
      */}
      <CoreStage
        venture={venture}
        genome={sections.genome ?? null}
        verdict={sections.verdict ?? null}
        assumptions={v.data.assumptions}
        experiments={v.data.experiments}
        sources={v.data.sources}
        onAskMilo={(about) => setAsk({ about, at: Date.now() })}
      />

      <div className="rule-b sticky top-[57px] z-30 bg-[rgb(var(--ink-800)/0.85)] backdrop-blur-xl">
        <VentureNav id={id} />
      </div>

      {v.actionError && (
        <ErrorNote
          className="mt-6"
          title="That request failed"
          message={v.actionError.message}
          hint={v.actionError.hint}
          onRetry={v.clearActionError}
        />
      )}

      {v.analysing && (
        <div className="rule-b flex items-center gap-3 py-5 text-[13.5px] text-paper-dim" role="status" aria-live="polite">
          <Spinner />
          Building the atlas. This takes a moment — Gemini is writing every module against your idea.
        </div>
      )}

      <ModuleFrame
        id="genome"
        name="Idea Genome"
        blurb="The six parts of the idea, how strongly each is established, and what depends on what."
        evidence={meta('genome')?.evidence}
        version={meta('genome')?.version}
        onRegenerate={analysed ? (i) => v.regenerate('genome', i) : undefined}
        busy={v.busySection === 'genome'}
      >
        {sections.genome ? (
          <IdeaGenome genome={sections.genome} />
        ) : (
          <ModuleEmpty onAnalyse={() => v.analyse(false)} analysing={v.analysing} />
        )}
      </ModuleFrame>

      <ModuleFrame
        id="assumptions"
        name="Assumption Minefield"
        blurb="Sized by impact, placed by uncertainty. Click a node to open what breaks, the proof needed and the cheapest test."
        onRegenerate={analysed ? (i) => v.regenerate('genome', i) : undefined}
        busy={false}
        tools={
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-sub">
            {v.data.assumptions.filter((a) => a.status === 'supported').length} of {v.data.assumptions.length} supported
          </span>
        }
      >
        {v.data.assumptions.length ? (
          <AssumptionMinefield
            assumptions={v.data.assumptions}
            onUpdate={v.updateAssumption}
            onDelete={v.deleteAssumption}
            onCreate={v.createAssumption}
          />
        ) : (
          <ModuleEmpty onAnalyse={() => v.analyse(false)} analysing={v.analysing} />
        )}
      </ModuleFrame>

      <ModuleFrame
        id="failures"
        name="Failure Museum"
        blurb="Each exhibit is a way this dies, written as a post-mortem, with the signal that came first."
        evidence={meta('failures')?.evidence}
        version={meta('failures')?.version}
        onRegenerate={analysed ? (i) => v.regenerate('failures', i) : undefined}
        busy={v.busySection === 'failures'}
      >
        {sections.failures?.length ? (
          <FailureMuseum failures={sections.failures} />
        ) : (
          <ModuleEmpty onAnalyse={() => v.analyse(false)} analysing={v.analysing} />
        )}
      </ModuleFrame>

      <ModuleFrame
        id="pivots"
        name="Pivot Prism"
        blurb="Three other shapes this venture could take. Drag the prism or use the arrow keys."
        evidence={meta('pivots')?.evidence}
        version={meta('pivots')?.version}
        onRegenerate={analysed ? (i) => v.regenerate('pivots', i) : undefined}
        busy={v.busySection === 'pivots'}
        className="pb-24"
      >
        {sections.pivots?.length ? (
          <PivotPrism pivots={sections.pivots} />
        ) : (
          <ModuleEmpty onAnalyse={() => v.analyse(false)} analysing={v.analysing} />
        )}
      </ModuleFrame>

      <Milo ventureId={id} context={context} mood={mood} ask={ask} />
    </AppShell>
  )
}

export default function VenturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-800" />}>
      <CommandCenter id={id} />
    </Suspense>
  )
}
