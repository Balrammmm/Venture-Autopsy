'use client'

import { use, useState } from 'react'
import { AppShell, useSession } from '@/components/AppShell'
import { ModuleEmpty, ModuleFrame, VentureNav } from '@/components/venture/Chrome'
import { MarketTerrain } from '@/components/venture/modules/MarketTerrain'
import { Milo } from '@/components/venture/Milo'
import { useVenture } from '@/components/venture/useVenture'
import {
  Button,
  Chip,
  EmptyState,
  ErrorNote,
  EvidenceTag,
  IconAlert,
  IconCheck,
  IconLink,
  IconPlus,
  IconSearch,
  IconTrash,
  Input,
  Skeleton,
  Spinner,
  Textarea,
} from '@/components/ui/kit'

const KINDS = ['url', 'competitor', 'review', 'interview', 'survey', 'note'] as const

const CHECKLIST = [
  'Find three products already solving this and write down what they charge.',
  'Read twenty reviews or forum complaints from the people you named as the customer.',
  'Talk to five of them about the last time the problem actually bit.',
  'Find one number that proves the market exists, and note where it came from.',
  'Check whether anything regulatory constrains how this can be sold.',
]

function ResearchPage({ id }: { id: string }) {
  const { user } = useSession()
  const v = useVenture(id)

  const [kind, setKind] = useState<(typeof KINDS)[number]>('url')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [snippet, setSnippet] = useState('')
  const [saving, setSaving] = useState(false)
  const [researching, setResearching] = useState(false)
  const [researchNote, setResearchNote] = useState<string | null>(null)

  async function add() {
    if (!snippet.trim()) return
    setSaving(true)
    const okDone = await v.addSource({
      kind,
      title: title.trim() || kind,
      url: url.trim() || undefined,
      snippet: snippet.trim(),
    })
    setSaving(false)
    if (okDone) {
      setTitle('')
      setUrl('')
      setSnippet('')
    }
  }

  async function research() {
    setResearching(true)
    setResearchNote(null)
    const res = await v.runResearch()
    setResearching(false)
    if (res) {
      setResearchNote(
        res.grounded
          ? `Added ${res.added} source${res.added === 1 ? '' : 's'} with real links. Regenerate a module to have it re-judged against them.`
          : 'The grounded pass returned no usable sources, so nothing was marked as sourced. Everything stays a hypothesis.',
      )
    }
  }

  if (v.loading) {
    return (
      <AppShell user={user} wide breadcrumb={<Skeleton className="h-4 w-40" />}>
        <div className="space-y-6 py-12" aria-busy="true">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-[280px]" />
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

  const { venture, sections, sectionMeta, sources } = v.data
  const grounded = sources.filter((s) => s.evidence === 'sourced')

  return (
    <AppShell user={user} wide breadcrumb={<span className="truncate text-[14px] text-paper-dim">{venture.title}</span>}>
      <div className="rule-b sticky top-[57px] z-30 bg-ink-800/85 pt-6 backdrop-blur-xl">
        <VentureNav id={id} />
      </div>

      {v.actionError && (
        <ErrorNote className="mt-6" message={v.actionError.message} hint={v.actionError.hint} onRetry={v.clearActionError} />
      )}

      <ModuleFrame
        id="market"
        name="Market Terrain"
        blurb="Who is out there, what already occupies the ground, and the questions you have not answered."
        evidence={sectionMeta.market?.evidence}
        version={sectionMeta.market?.version}
        onRegenerate={sections.market ? (i) => v.regenerate('market', i) : undefined}
        busy={v.busySection === 'market'}
      >
        {sections.market ? (
          <MarketTerrain market={sections.market} />
        ) : (
          <ModuleEmpty onAnalyse={() => v.analyse(false)} analysing={v.analysing} />
        )}
      </ModuleFrame>

      {/* Evidence desk */}
      <section id="evidence" className="rule-t scroll-mt-28 py-12 md:py-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 className="display text-[clamp(1.7rem,3.2vw,2.5rem)] leading-[1.02] text-paper">Evidence desk</h2>
            <p className="mt-1.5 max-w-measure text-[13.5px] text-paper-faint">
              Only what is here can be marked as more than a hypothesis. Attach what you actually find.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={research} disabled={researching} className="no-print">
            {researching ? <Spinner /> : <IconSearch size={13} />}
            {researching ? 'Searching' : 'Run grounded search'}
          </Button>
        </div>

        {researchNote && (
          <p className="mb-6 border-l-2 border-lime bg-lime-wash px-4 py-3 text-[13.5px] leading-relaxed text-paper-dim" role="status">
            {researchNote}
          </p>
        )}

        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* Composer */}
          <div>
            <p className="label mb-2.5">Attach what you found</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <Chip key={k} active={k === kind} onClick={() => setKind(k)}>
                  {k}
                </Chip>
              ))}
            </div>

            <label htmlFor="src-title" className="label mb-1.5 block">
              Label
            </label>
            <Input
              id="src-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'interview' ? 'Call notes — three landlords' : 'What this is'}
              className="mb-3"
            />

            <label htmlFor="src-url" className="label mb-1.5 block">
              URL <span className="normal-case tracking-normal text-paper-sub">optional</span>
            </label>
            <Input
              id="src-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className="mb-3"
            />

            <label htmlFor="src-snippet" className="label mb-1.5 block">
              What it says
            </label>
            <Textarea
              id="src-snippet"
              rows={6}
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
              placeholder="Paste the actual text — the review, the quote, the pricing page, the interview note. The analysis may only cite what is here."
            />

            <Button variant="primary" size="md" className="mt-3" onClick={add} disabled={saving || !snippet.trim()}>
              {saving ? <Spinner /> : <IconPlus size={14} />}
              Attach evidence
            </Button>

            <p className="mt-4 flex gap-2.5 border-l-2 border-[rgba(243,238,226,0.2)] pl-4 text-[12.5px] leading-relaxed text-paper-faint">
              <IconAlert size={13} className="mt-0.5 shrink-0" />
              <span>
                Evidence you paste is marked <span className="text-paper-dim">your evidence</span>, not{' '}
                <span className="text-lime">sourced</span>. Only the grounded search, which returns a real link and a
                timestamp, can produce a sourced claim.
              </span>
            </p>
          </div>

          {/* Checklist + list */}
          <div>
            <p className="label mb-3">Go and find these</p>
            <ol className="mb-10 space-y-2.5">
              {CHECKLIST.map((c, i) => (
                <li key={i} className="flex gap-3 text-[13.5px] leading-[1.58] text-paper-dim">
                  <span aria-hidden="true" className="num mt-[2px] shrink-0 font-mono text-[10.5px] text-paper-sub">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {c}
                </li>
              ))}
            </ol>

            <p className="label mb-3">
              Attached ({sources.length}
              {grounded.length > 0 ? ` · ${grounded.length} sourced` : ''})
            </p>

            {sources.length === 0 ? (
              <EmptyState
                title="No evidence yet"
                body="Everything in this atlas is currently a hypothesis. Attach a review, a call note or a pricing page and regenerate a module to have it re-judged."
              />
            ) : (
              <ul className="space-y-0">
                {sources.map((s) => (
                  <li key={s.id} className="rule-t flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-lime">{s.kind}</span>
                        <p className="text-[14px] text-paper">{s.title}</p>
                        <EvidenceTag evidence={s.evidence} />
                      </div>
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1.5 break-all text-[12.5px] text-paper-faint underline decoration-[rgba(243,238,226,0.24)] transition-colors duration-150 hover:text-lime"
                        >
                          <IconLink size={12} />
                          {s.url}
                        </a>
                      )}
                      <p className="mt-1.5 line-clamp-3 max-w-measure text-[13px] leading-[1.55] text-paper-dim">
                        {s.snippet}
                      </p>
                      <p className="num mt-1.5 font-mono text-[10.5px] text-paper-sub">
                        retrieved {new Date(s.retrievedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => v.deleteSource(s.id)}
                      aria-label={`Remove ${s.title}`}
                      className="no-print shrink-0"
                    >
                      <IconTrash size={13} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {sources.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-5"
                onClick={() => v.regenerate('market')}
                disabled={v.busySection === 'market'}
              >
                {v.busySection === 'market' ? <Spinner /> : <IconCheck size={13} />}
                Re-judge the terrain against this evidence
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="pb-24" />
      <Milo ventureId={id} context="market" mood="idle" />
    </AppShell>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ResearchPage id={id} />
}
