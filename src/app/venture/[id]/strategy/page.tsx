'use client'

import { use, useEffect, useState } from 'react'
import { AppShell, useSession } from '@/components/AppShell'
import { ModuleEmpty, ModuleFrame, VentureNav } from '@/components/venture/Chrome'
import { BusinessModelBlueprint, FlightPlan, FutureScope } from '@/components/venture/modules/Strategy'
import { Milo } from '@/components/venture/Milo'
import { useVenture } from '@/components/venture/useVenture'
import { ErrorNote, Skeleton } from '@/components/ui/kit'
import type { BusinessModel } from '@/lib/atlas-types'

function StrategyPage({ id }: { id: string }) {
  const { user } = useSession()
  const v = useVenture(id)
  const [context, setContext] = useState<string>('model')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (seen) setContext(seen.target.id)
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.05, 0.4] },
    )
    ;['model', 'scenarios', 'launch'].forEach((k) => {
      const el = document.getElementById(k)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [v.data])

  if (v.loading) {
    return (
      <AppShell user={user} wide breadcrumb={<Skeleton className="h-4 w-40" />}>
        <div className="space-y-6 py-12" aria-busy="true">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-[320px]" />
        </div>
      </AppShell>
    )
  }

  if (v.error || !v.data) {
    return (
      <AppShell user={user} wide>
        <div className="py-16">
          <ErrorNote message={v.error?.message ?? 'Not found.'} hint={v.error?.hint} onRetry={v.reload} />
        </div>
      </AppShell>
    )
  }

  const { venture, sections, sectionMeta } = v.data

  return (
    <AppShell user={user} wide breadcrumb={<span className="truncate text-[14px] text-paper-dim">{venture.title}</span>}>
      <div className="rule-b sticky top-[57px] z-30 bg-ink-800/85 pt-6 backdrop-blur-xl">
        <VentureNav id={id} />
      </div>

      {v.actionError && (
        <ErrorNote className="mt-6" message={v.actionError.message} hint={v.actionError.hint} onRetry={v.clearActionError} />
      )}

      <ModuleFrame
        id="model"
        name="Business Model Blueprint"
        blurb="Where value and money actually move. Click a flow to trace it; edit the revenue hypotheses in place."
        evidence={sectionMeta.model?.evidence}
        version={sectionMeta.model?.version}
        onRegenerate={sections.model ? (i) => v.regenerate('model', i) : undefined}
        busy={v.busySection === 'model'}
      >
        {sections.model ? (
          <BusinessModelBlueprint
            model={sections.model}
            saving={v.busySection === 'model'}
            onSave={(next: BusinessModel) => v.saveSection('model', next)}
          />
        ) : (
          <ModuleEmpty onAnalyse={() => v.analyse(false)} analysing={v.analysing} />
        )}
      </ModuleFrame>

      <ModuleFrame
        id="scenarios"
        name="Future Scope"
        blurb="Three conditional routes. Not predictions — a way to see which assumptions each future rests on."
        evidence={sectionMeta.scenarios?.evidence}
        version={sectionMeta.scenarios?.version}
        onRegenerate={sections.scenarios ? (i) => v.regenerate('scenarios', i) : undefined}
        busy={v.busySection === 'scenarios'}
      >
        {sections.scenarios ? (
          <FutureScope scenarios={sections.scenarios} />
        ) : (
          <ModuleEmpty onAnalyse={() => v.analyse(false)} analysing={v.analysing} />
        )}
      </ModuleFrame>

      <ModuleFrame
        id="launch"
        name="Launch Flight Plan"
        blurb="Milestones with owners and risks, the KPIs that would tell you it is working, and the next seven days."
        evidence={sectionMeta.launch?.evidence}
        version={sectionMeta.launch?.version}
        onRegenerate={sections.launch ? (i) => v.regenerate('launch', i) : undefined}
        busy={v.busySection === 'launch'}
        className="pb-24"
      >
        {sections.launch ? (
          <FlightPlan launch={sections.launch} />
        ) : (
          <ModuleEmpty onAnalyse={() => v.analyse(false)} analysing={v.analysing} />
        )}
      </ModuleFrame>

      <Milo ventureId={id} context={context} mood="idle" />
    </AppShell>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <StrategyPage id={id} />
}
