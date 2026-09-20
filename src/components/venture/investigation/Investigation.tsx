'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { animate, AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { VentureBundle, VentureApi, AssumptionRow } from '../useVenture'
import { ExplainButton, ExplainRegion } from './Explain'
import { Button, EvidenceTag, IconPencil, Input, Spinner } from '@/components/ui/kit'

const EASE = [0.22, 1, 0.36, 1] as const

export function Count({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (reduce) { setShown(value); return }
    const a = animate(0, value, { duration: 1.15, ease: EASE, onUpdate: v => setShown(Math.round(v)) })
    return () => a.stop()
  }, [value, reduce])
  return <>{shown}</>
}

export function CaseHeading({ data, api }: { data: VentureBundle; api: VentureApi }) {
  const { venture, sections } = data
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(venture.title)
  const [saving, setSaving] = useState(false)
  const verdict = sections.verdict
  return <header className="case-heading">
    <div className="case-eyebrow"><span className="status-dot" /> VENTURE INTELLIGENCE <span className="case-id">CASE / {venture.id.slice(-6).toUpperCase()}</span></div>
    <div className="case-title-row">
      {editing ? <form className="case-rename" onSubmit={async e => {
        e.preventDefault(); setSaving(true)
        if (await api.updateVenture({ title: title.trim() })) setEditing(false)
        setSaving(false)
      }}><Input aria-label="Venture title" autoFocus value={title} maxLength={120} onChange={e => setTitle(e.target.value)} />
        <Button type="submit" disabled={saving || !title.trim()}>{saving ? <Spinner /> : 'Save'}</Button>
        <Button type="button" variant="quiet" onClick={() => setEditing(false)}>Cancel</Button></form>
      : <h1>{venture.title}<button aria-label="Rename venture" onClick={() => { setTitle(venture.title); setEditing(true) }}><IconPencil size={15} /></button></h1>}
      <span className={`case-verdict ${verdict?.verdict === 'High Risk' ? 'is-risk' : ''}`}><span />{verdict?.verdict ?? 'Awaiting analysis'}</span>
    </div>
    {Object.values(data.sectionMeta).some(m => m.model === 'seed') && <p className="case-demo-note">WORKED EXAMPLE · Illustrative case and evidence, supplied with the demo.</p>}
    <details className="case-brief"><summary>The original brief <span>+</span></summary><p>{venture.rawIdea}</p></details>
  </header>
}

function ScoreInstrument({ data }: { data: VentureBundle }) {
  const verdict = data.sections.verdict
  const score = Math.max(0, Math.min(100, verdict?.healthScore ?? 0))
  const reduce = useReducedMotion()
  return <ExplainRegion id="readiness" title="Venture readiness score" section="verdict" aliases="score low health verdict confidence readiness" className="score-instrument">
    <div className="instrument-head"><span className="micro">READINESS INDEX</span><span className="micro">01 / 100</span></div>
    <div className="score-dial">
      <svg viewBox="0 0 240 205" role="img" aria-label={verdict ? `Readiness ${score} out of 100. Model assessment, not probability of success.` : 'No readiness assessment yet'}>
        {Array.from({ length: 51 }, (_, i) => {
          const a = (140 + i * 5.2) * Math.PI / 180
          return <line key={i} x1={120 + Math.cos(a) * 86} y1={114 + Math.sin(a) * 86} x2={120 + Math.cos(a) * 98} y2={114 + Math.sin(a) * 98}
            stroke={i <= score / 2 && verdict ? 'rgb(var(--risk))' : 'rgb(var(--paper)/.13)'} strokeWidth={2.5} />
        })}
        <motion.circle cx="120" cy="114" r="73" fill="none" stroke="rgb(var(--paper)/.08)" strokeDasharray="2 6" initial={false} animate={{ rotate: reduce ? 0 : 12 }} transition={{ duration: 1.2 }} />
      </svg>
      <div className="score-value"><strong>{verdict ? <Count value={score} /> : '—'}</strong><span>OUT OF 100</span></div>
    </div>
    <p className="score-caption">{verdict?.confidence ?? 'No'} confidence <span>·</span> Model assessment</p>
    <ExplainButton target="readiness" label="What drives this score?" />
  </ExplainRegion>
}

export function Diagnosis({ data }: { data: VentureBundle }) {
  const verdict = data.sections.verdict
  const unresolved = data.assumptions.filter(a => a.impact >= 4 && a.status !== 'supported')
  const completed = data.experiments.filter(e => ['passed', 'failed', 'inconclusive'].includes(e.status))
  return <>
    <div className="diagnosis-grid">
      <ExplainRegion id="diagnosis" title="The diagnosis" section="verdict" aliases="reasoning summary diagnosis" className="diagnosis-copy">
        <span className="micro">THE DIAGNOSIS</span>
        <h2>{verdict?.verdict === 'High Risk' ? <>Potential found.<br /><em>Proof still missing.</em></> : verdict?.verdict === 'Promising' ? <>A signal worth<br /><em>following.</em></> : <>An idea is a theory.<br /><em>Let’s test yours.</em></>}</h2>
        <p>{verdict?.reasoning ?? 'Your investigation starts with the idea. Build the analysis to reveal its dependencies, expose the assumptions, and find the first thing worth testing.'}</p>
        <ExplainButton target="diagnosis" label="Walk me through the diagnosis" />
      </ExplainRegion>
      <ScoreInstrument data={data} />
    </div>
    <div className="case-facts">
      <a href="#risk-map"><span className="micro">CRITICAL ASSUMPTIONS</span><strong className="text-risk"><Count value={unresolved.length} /><small>unresolved</small></strong></a>
      <Link href={`/venture/${data.venture.id}/research#evidence`}><span className="micro">EVIDENCE COLLECTED</span><strong><Count value={data.sources.length} /><small>{data.sources.filter(s => s.evidence === 'sourced').length} grounded sources</small></strong></Link>
      <Link href={`/venture/${data.venture.id}/validate`}><span className="micro">EXPERIMENTS CONCLUDED</span><strong><Count value={completed.length} /><small>of {data.experiments.length} designed</small></strong></Link>
      <div><span className="micro">ANALYSIS PROVENANCE</span><strong className="fact-provenance">{data.sectionMeta.verdict?.evidence === 'sourced' ? 'Research-assisted' : data.sources.length ? 'Founder evidence' : 'Hypothesis'}<small>Inspect individual claims before acting</small></strong></div>
    </div>
  </>
}

export function Anatomy({ data }: { data: VentureBundle }) {
  const genome = data.sections.genome
  const [selected, setSelected] = useState(genome?.nodes[0]?.id ?? '')
  const reduce = useReducedMotion()
  if (!genome?.nodes.length) return null
  const node = genome.nodes.find(n => n.id === selected) ?? genome.nodes[0]
  const n = genome.nodes.length
  const point = (index: number, radius: number) => ({ x: 190 + Math.cos(index * 2 * Math.PI / n - Math.PI / 2) * radius, y: 172 + Math.sin(index * 2 * Math.PI / n - Math.PI / 2) * radius })
  const polygon = (scale: number) => genome.nodes.map((_, i) => { const p = point(i, scale); return `${p.x},${p.y}` }).join(' ')
  const values = genome.nodes.map((v, i) => { const p = point(i, 116 * Math.max(1, Math.min(5, v.strength)) / 5); return `${p.x},${p.y}` }).join(' ')
  return <ExplainRegion id="anatomy" title="Venture anatomy" section="genome" aliases="chart radar strength genome customer pain solution revenue distribution advantage" className="anatomy-panel lab-panel">
    <div className="panel-heading"><div><span className="micro">01 / THE ANATOMY</span><h2>Where the idea holds.<br /><em>Where it comes apart.</em></h2></div><ExplainButton target="anatomy" label="Explain this chart" /></div>
    <div className="anatomy-grid">
      <div className="anatomy-visual">
        <svg viewBox="0 0 380 345" role="img" aria-label={`Venture anatomy. ${genome.nodes.map(v => `${v.kind}: ${v.strength} of 5`).join(', ')}. Select a dimension using the buttons.`}>
          {[.2, .4, .6, .8, 1].map(r => <polygon key={r} points={polygon(r * 116)} fill="none" stroke="rgb(var(--paper)/.12)" />)}
          {genome.nodes.map((v, i) => { const p = point(i, 116); const label = point(i, 148); return <g key={v.id}><line x1="190" y1="172" x2={p.x} y2={p.y} stroke="rgb(var(--paper)/.09)" />
            <text x={label.x} y={label.y} fill={v.id === node.id ? 'rgb(var(--signal))' : 'rgb(var(--paper-faint))'} fontSize="9" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">{v.kind.toUpperCase()}</text></g> })}
          <motion.polygon points={values} fill="rgb(var(--signal)/.13)" stroke="rgb(var(--signal))" strokeWidth="1.7" initial={reduce ? false : { opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .9, ease: EASE }} style={{ transformOrigin: '190px 172px' }} />
          {genome.nodes.map((v, i) => { const p = point(i, 116 * Math.max(1, Math.min(5, v.strength)) / 5); return <circle key={v.id} cx={p.x} cy={p.y} r={node.id === v.id ? 6 : 3.5} fill={v.strength <= 2 ? 'rgb(var(--risk))' : 'rgb(var(--signal))'} stroke="rgb(var(--ink-800))" strokeWidth="2" /> })}
        </svg>
        <p className="chart-footnote">Distance from the centre = strength / 5.<br />An assessment of the idea, not verified market evidence.</p>
      </div>
      <div className="anatomy-dimensions" role="group" aria-label="Inspect a venture dimension">
        {genome.nodes.map((v, i) => <button key={v.id} type="button" aria-pressed={v.id === node.id} onClick={() => setSelected(v.id)} className={v.id === node.id ? 'selected' : ''}>
          <span className="dimension-number">0{i + 1}</span><span className="dimension-label">{v.kind}<span className="dimension-track"><motion.i initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.min(100, v.strength * 20)}%` }} transition={{ duration: .8, delay: i * .05 }} style={{ background: v.strength <= 2 ? 'rgb(var(--risk))' : 'rgb(var(--signal))' }} /></span></span><b>{v.strength}<small>/5</small></b><span aria-hidden="true">↗</span>
        </button>)}
      </div>
      <div className="anatomy-reading" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}><motion.div key={node.id} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
          <span className={`micro ${node.strength <= 2 ? 'text-risk' : 'text-signal'}`}>{node.strength <= 2 ? 'FRAGILE LINK' : 'CURRENT FINDING'} / {node.kind}</span><h3>{node.label}</h3><p>{node.detail}</p>
          <span className="micro reading-label">STILL TO ESTABLISH</span><ul>{node.unknowns.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </motion.div></AnimatePresence>
      </div>
    </div>
  </ExplainRegion>
}

export function RiskMap({ data }: { data: VentureBundle }) {
  const rows = useMemo(() => [...data.assumptions].sort((a, b) => b.impact * b.uncertainty - a.impact * a.uncertainty), [data.assumptions])
  const [selected, setSelected] = useState(rows[0]?.id)
  const [filter, setFilter] = useState('all')
  const filtered = rows.filter(a => filter === 'all' || (filter === 'open' ? a.status !== 'supported' : a.status === 'supported'))
  const active = filtered.find(a => a.id === selected) ?? filtered[0]
  const groups = new Map<string, AssumptionRow[]>()
  filtered.forEach(a => { const k = `${a.impact}-${a.uncertainty}`; groups.set(k, [...(groups.get(k) ?? []), a]) })
  return <ExplainRegion id="risk-map" title="Risk exposure map" section="assumptions" aliases="risk chart matrix uncertainty impact assumption critical" className="lab-panel risk-panel">
    <div className="panel-heading"><div><span className="micro">02 / PRESSURE POINTS</span><h2>Find what breaks first.</h2></div><ExplainButton target="risk-map" /></div>
    <div className="risk-layout"><div>
      <div className="segmented" role="group" aria-label="Filter risk map">{[['all', 'All assumptions'], ['open', 'Unresolved'], ['supported', 'Supported']].map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
      <div className="risk-chart" role="group" aria-label="Risk matrix: uncertainty left to right, impact bottom to top">
        <div className="risk-chart-grid" /><span className="risk-quadrant">HIGH IMPACT / UNKNOWN</span><span className="axis-y">IMPACT →</span><span className="axis-x">UNCERTAINTY →</span>
        {filtered.map(a => { const peers = groups.get(`${a.impact}-${a.uncertainty}`)!; const offset = (peers.indexOf(a) - (peers.length - 1) / 2) * 25; return <button key={a.id} className={`risk-node ${a.id === active?.id ? 'selected' : ''} ${a.status === 'supported' ? 'supported' : ''}`} style={{ left: `calc(${10 + (a.uncertainty - 1) * 20}% + ${offset}px)`, top: `${90 - (a.impact - 1) * 20}%` }} onClick={() => setSelected(a.id)} aria-pressed={a.id === active?.id} aria-label={`${a.claim}. Impact ${a.impact}, uncertainty ${a.uncertainty}. ${a.status}`} title={a.claim}>{rows.indexOf(a) + 1}</button> })}
        {!filtered.length && <p className="chart-empty">No assumptions in this view.</p>}
      </div><p className="chart-footnote">Ordinal scales, 1–5. Numbers identify the ranked assumptions.<br />Overlapping points are separated for selection.</p>
    </div><div className="risk-reading" aria-live="polite">{active ? <>
      <div className="risk-reading-meta"><span className="micro">{active.category}</span><span className="status-tag">{active.status}</span></div>
      <h3>{active.claim}</h3><div className="risk-scores"><span>Impact <b>{active.impact}/5</b></span><span>Uncertainty <b>{active.uncertainty}/5</b></span></div>
      <details open><summary>What breaks if this is false</summary><p>{active.breaksIfFalse}</p></details>
      <details><summary>The evidence that would settle it</summary><p>{active.proofNeeded}</p></details>
      <div className="next-test"><span className="micro">THE CHEAPEST WAY TO KNOW</span><p>{active.cheapestTest}</p><span>{active.testCost} {active.testDuration ? ` / ${active.testDuration}` : ''}</span></div>
      <Link className="text-link" href={`/venture/${data.venture.id}/validate`}>Take it to the validation lab <span>↗</span></Link>
    </> : <p className="chart-empty">No evidence of support recorded yet. Run a test and record the result in the validation lab.</p>}</div></div>
    <div className="risk-index">{filtered.map(a => <button key={a.id} onClick={() => setSelected(a.id)} aria-pressed={a.id === active?.id}><span>{String(rows.indexOf(a) + 1).padStart(2, '0')}</span><span>{a.claim}</span><b>{a.impact * a.uncertainty}<small>/25</small></b></button>)}</div>
  </ExplainRegion>
}

export function DecisionTrail({ data }: { data: VentureBundle }) {
  const verdict = data.sections.verdict
  if (!verdict) return null
  return <ExplainRegion id="decision" title="Evidence and next decision" section="verdict" aliases="opportunity signal flaw recommendation next decision" className="decision-trail">
    <div className="panel-heading"><div><span className="micro">03 / THE WAY FORWARD</span><h2>Follow the signal.<br /><em>Challenge the story.</em></h2></div><ExplainButton target="decision" /></div>
    <div className="decision-columns"><article><span className="micro text-signal">01 / THE STRONGEST SIGNAL</span><p>{verdict.strongestSignal}</p></article><article><span className="micro text-risk">02 / THE FATAL FLAW TO TEST</span><p>{verdict.fatalFlawRisk}</p></article><article><span className="micro">03 / WHAT CHANGES THE VERDICT</span><p>{verdict.whatWouldChangeThis}</p><Link href={`/venture/${data.venture.id}/validate`} className="text-link">Design the next move ↗</Link></article></div>
    <div className="case-source-note"><EvidenceTag evidence={data.sectionMeta.verdict?.evidence ?? 'hypothesis'} /><span>Reasoning from your saved analysis. This is not a prediction of success.</span></div>
  </ExplainRegion>
}

export function AnalysisProgress() {
  return <div className="analysis-progress" role="status"><span className="micro"><Spinner /> INVESTIGATION IN PROGRESS</span><h2>Opening the case.</h2><p>Examining the idea, its assumptions, and the evidence you provided. Your analysis will appear when the model finishes.</p><div className="analysis-scan" aria-hidden="true" /><span className="micro">Generating the atlas · no findings available yet</span></div>
}
