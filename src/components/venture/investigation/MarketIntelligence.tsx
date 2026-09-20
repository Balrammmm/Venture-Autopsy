'use client'

import type { VentureBundle } from '../useVenture'
import { EvidenceTag } from '@/components/ui/kit'
import { ExplainButton, ExplainRegion } from './Explain'

export function MarketIntelligence({ data }: { data: VentureBundle }) {
  const market = data.sections.market
  if (!market) return null
  return <>
    <header className="case-page-intro"><span className="micro">02 / MARKET INTELLIGENCE</span><h1>Meet the market.<br /><em>Interrogate the evidence.</em></h1><p>{market.note}</p></header>
    <ExplainRegion id="competition" title="Competitive intelligence" section="market" aliases="competition competitors alternatives incumbent" className="lab-panel">
      <div className="panel-heading"><div><span className="micro">THE COMPETITIVE FIELD</span><h2>You are never competing with nothing.</h2></div><ExplainButton target="competition" /></div>
      <table className="intel-table"><caption className="sr-only">Alternatives and the evidence supporting each one</caption><thead><tr><th>ALTERNATIVE</th><th>WHY IT MATTERS</th><th>EVIDENCE STATUS</th></tr></thead><tbody>{market.alternatives.map((a, i) => {
        const sources = data.sources.filter(s => a.sourceIds.includes(s.id) || a.sourceIds.includes(s.id.slice(-6)))
        return <tr key={i}><td><span className="micro">0{i + 1} / </span>{a.name}</td><td>{a.why}</td><td><EvidenceTag evidence={a.evidence} />{sources.map(s => s.url && /^https?:\/\//i.test(s.url) ? <a className="source-link" key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a> : <span className="source-link" key={s.id}>{s.title}</span>)}{!sources.length && <span className="source-link" style={{ color: 'rgb(var(--paper-faint))' }}>No linked citation</span>}</td></tr>
      })}</tbody></table>
    </ExplainRegion>
    <ExplainRegion id="customer-intelligence" title="Customer intelligence" section="market" aliases="persona customer buyer audience" className="decision-trail">
      <div className="panel-heading"><div><span className="micro">THE PEOPLE BEHIND THE MARKET</span><h2>A person. A problem. A reason to switch.</h2></div><ExplainButton target="customer-intelligence" /></div>
      <div className="decision-columns">{market.personas.map(p => <article key={p.id}><span className="micro">{p.role}</span><h3 className="display mt-3 text-2xl">{p.name}</h3><p>{p.jobToBeDone}</p><details className="mt-4 text-xs"><summary className="cursor-pointer text-signal">Investigate this customer</summary><div className="mt-3"><span className="micro">DOES TODAY</span><p>{p.currentWorkaround}</p><span className="micro mt-4 block">BUYING TRIGGER</span><p>{p.buyingTrigger}</p><span className="micro mt-4 block text-risk">THE OBJECTION</span><p>{p.objection}</p></div></details></article>)}</div>
    </ExplainRegion>
    <ExplainRegion id="market-sizing" title="TAM and market sizing" section="market" aliases="TAM SAM SOM size sizing total addressable market" className="sizing-method">
      <div><span className="micro">SIZE THE OPPORTUNITY / NOT THE HYPE</span><h3>A market size is earned.</h3><p>{market.sizingMethod.approach}</p><ExplainButton target="market-sizing" label="Milo, explain TAM for this venture" /></div>
      <div><span className="micro">INPUTS STILL NEEDED</span><ol className="mt-4">{market.sizingMethod.inputsNeeded.map((input, i) => <li key={i}>{input}</li>)}</ol><p className="mt-4 text-xs">No market estimate is shown until you have the inputs. These are research requirements, not measured results.</p></div>
    </ExplainRegion>
  </>
}
