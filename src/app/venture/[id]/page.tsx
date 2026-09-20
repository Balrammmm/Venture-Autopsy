'use client'

import { Suspense, use, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AppShell, useSession } from '@/components/AppShell'
import { ModuleFrame, ModuleEmpty } from '@/components/venture/Chrome'
import { AssumptionMinefield, FailureMuseum, IdeaGenome, PivotPrism } from '@/components/venture/modules/Command'
import { Milo } from '@/components/venture/Milo'
import { useVenture } from '@/components/venture/useVenture'
import { Button, ErrorNote, Skeleton } from '@/components/ui/kit'
import { Anatomy, AnalysisProgress, CaseHeading, DecisionTrail, Diagnosis, RiskMap } from '@/components/venture/investigation/Investigation'

function CommandCenter({ id }: { id: string }) {
  const { user } = useSession()
  const params = useSearchParams()
  const v = useVenture(id)
  const reduce = useReducedMotion()
  const [view, setView] = useState('overview')
  const started = useRef(false)
  useEffect(() => {
    if (started.current || params.get('analyze') !== '1' || !v.data || v.data.sections.verdict) return
    started.current = true
    void v.analyse(false)
  }, [params, v])
  useEffect(() => {
    const showHash = () => {
      const hash = location.hash.slice(1)
      if (['genome', 'assumptions', 'failures', 'pivots'].includes(hash)) setView(hash === 'genome' ? 'anatomy' : hash === 'assumptions' ? 'risks' : 'paths')
    }
    showHash()
    window.addEventListener('hashchange', showHash)
    return () => window.removeEventListener('hashchange', showHash)
  }, [])
  if (v.loading) return <AppShell user={user} wide><div className="case-loading" aria-busy="true" aria-label="Opening the case"><span className="micro">OPENING CASE FILE</span><Skeleton className="h-16 w-3/4" /><Skeleton className="h-[350px]" /></div></AppShell>
  if (v.error || !v.data) return <AppShell user={user} wide><div className="py-16"><ErrorNote title="Could not open this venture" message={v.error?.message ?? 'Not found.'} hint={v.error?.hint} onRetry={v.reload} /></div></AppShell>
  const { venture, sections, sectionMeta } = v.data
  const analysed = Boolean(sections.verdict)
  return <AppShell user={user} wide breadcrumb={<span className="truncate text-[13px] text-paper-dim">{venture.title}</span>}>
    <CaseHeading data={v.data} api={v} />
    {v.actionError && <ErrorNote className="mb-6" message={v.actionError.message} hint={v.actionError.hint} onRetry={v.clearActionError} />}
    <div className="case-view-tabs" role="group" aria-label="Investigation view">
      {[['overview', 'Case overview'], ['anatomy', 'Deep anatomy'], ['risks', 'Risk register'], ['paths', 'Alternate futures']].map(([key, label], i) => <button key={key} aria-pressed={view === key} onClick={() => setView(key)}><span>0{i + 1}</span>{label}{view === key && <motion.i layoutId="case-view" transition={{ type: 'spring', stiffness: 380, damping: 35 }} />}</button>)}
    </div>
    {v.analysing ? <AnalysisProgress /> : !analysed ? <div className="case-unopened"><span className="micro">CASE CAPTURED / READY TO INVESTIGATE</span><h2>Let’s take this idea apart.</h2><p>Reveal the assumptions behind the business, its most dangerous dependencies, and the quickest path to proof.</p><Button variant="primary" onClick={() => v.analyse(false)}>Begin investigation ↗</Button><Button variant="ghost" onClick={() => v.analyse(true)}>Investigate with web research</Button></div> : null}
    {analysed && <AnimatePresence mode="wait" initial={false}><motion.div key={view} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .24 }} className="case-view-content">
      {view === 'overview' && <><Diagnosis data={v.data} /><Anatomy data={v.data} /><RiskMap data={v.data} /><DecisionTrail data={v.data} /></>}
      {view === 'anatomy' && <><Anatomy data={v.data} /><ModuleFrame id="genome" name="The dependency network" blurb="Trace the links behind the assessment. Every node belongs to your saved analysis." evidence={sectionMeta.genome?.evidence} onRegenerate={i => v.regenerate('genome', i)} busy={v.busySection === 'genome'}>{sections.genome && <IdeaGenome genome={sections.genome} />}</ModuleFrame></>}
      {view === 'risks' && <><RiskMap data={v.data} /><ModuleFrame id="assumptions" name="The working risk register" blurb="Edit the actual assumptions, record evidence, and change their status. Your investigation stays with the venture." tools={<span className="micro">{v.data.assumptions.length} RECORDS</span>}><AssumptionMinefield assumptions={v.data.assumptions} onUpdate={v.updateAssumption} onDelete={v.deleteAssumption} onCreate={v.createAssumption} /></ModuleFrame></>}
      {view === 'paths' && <><ModuleFrame id="failures" name="Possible causes of death" blurb="Hypothetical post-mortems. Recognise the warning signs before these stories become yours." evidence={sectionMeta.failures?.evidence} onRegenerate={i => v.regenerate('failures', i)} busy={v.busySection === 'failures'}>{sections.failures?.length ? <FailureMuseum failures={sections.failures} /> : <ModuleEmpty />}</ModuleFrame><ModuleFrame id="pivots" name="A different way through" blurb="Three alternatives, each with a tradeoff. Compare effort, ceiling, and speed to proof." evidence={sectionMeta.pivots?.evidence} onRegenerate={i => v.regenerate('pivots', i)} busy={v.busySection === 'pivots'}>{sections.pivots?.length ? <PivotPrism pivots={sections.pivots} /> : <ModuleEmpty />}</ModuleFrame><DecisionTrail data={v.data} /></>}
    </motion.div></AnimatePresence>}
    <footer className="case-footer"><span>VENTURE AUTOPSY</span><span>Question the idea. Keep the evidence.</span></footer>
    <Milo ventureId={id} context={view === 'risks' ? 'assumptions' : view === 'paths' ? 'pivots' : 'genome'} mood={view === 'risks' ? 'wary' : 'idle'} />
  </AppShell>
}
export default function VenturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <Suspense fallback={<div className="min-h-screen bg-ink-800" />}><CommandCenter id={id} /></Suspense>
}
