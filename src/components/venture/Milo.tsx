'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ApiError, api } from '@/lib/client'
import { IconClose, Spinner } from '@/components/ui/kit'
import { EXPLAIN_EVENT, readContext, resolveTarget, useLastInspection, type ViewContext } from './investigation/Explain'
import { MiloCompanion, type CompanionState } from './investigation/MiloCompanion'

export type MiloMood = 'idle' | 'alert' | 'wary' | 'thinking' | 'pleased' | 'asleep'
interface Message { id: string; role: string; content: string; action?: string | null; context?: string | null; createdAt: string }
interface Guide { el: HTMLElement; title: string; rect: { x: number; y: number; width: number; height: number } }
const SPRING = { type: 'spring' as const, stiffness: 260, damping: 28 }
const LABELS: Record<string, string> = { research: 'Market intelligence', market: 'Market intelligence', genome: 'Venture anatomy', assumptions: 'Risk exposure', pivots: 'Alternate futures', model: 'Business model', machine: 'Model simulator', validate: 'Validation lab', verdict: 'The diagnosis', report: 'Case report', launch: 'Launch plan' }

function MessageText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part)}</>
}

export function Milo({ ventureId, context = 'genome', mood = 'idle', ask }: {
  ventureId: string; context?: string; mood?: MiloMood; ask?: { about: string; at: number } | null
}) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [guide, setGuide] = useState<Guide | null>(null)
  const [view, setView] = useState<ViewContext | null>(null)
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [travelling, setTravelling] = useState(false)
  const [pet, setPet] = useState(false)
  const [calm, setCalm] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  const [viewport, setViewport] = useState({ width: 1200, height: 800 })
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dockRef = useRef<HTMLButtonElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)
  const alive = useRef(true)
  const lastInspection = useLastInspection()
  const latest = useRef({ context, guide })
  latest.current = { context, guide }
  const petTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyPromise = useRef<Promise<void> | null>(null)
  const request = useRef<AbortController | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const lastAsk = useRef(0)

  useEffect(() => {
    alive.current = true
    const resize = () => setViewport({ width: innerWidth, height: innerHeight })
    resize()
    window.addEventListener('resize', resize)
    try { setCalm(localStorage.getItem('va_milo_calm') === '1') } catch {}
    return () => { alive.current = false; window.removeEventListener('resize', resize); request.current?.abort(); if (petTimer.current) clearTimeout(petTimer.current) }
  }, [])

  const loadHistory = useCallback(() => {
    if (historyPromise.current) return historyPromise.current
    setHistoryLoading(true)
    historyPromise.current = api<{ messages: Message[] }>(`/api/ventures/${ventureId}/milo`)
      .then(d => { if (alive.current) setMessages(d.messages) })
      .catch(err => { if (alive.current) setError(err as ApiError); historyPromise.current = null })
      .finally(() => { if (alive.current) { setHistoryLoading(false); setHistoryReady(true) } })
    return historyPromise.current
  }, [ventureId])

  useEffect(() => { if (open) { void loadHistory(); inputRef.current?.focus({ preventScroll: true }) } }, [open, loadHistory])
  useEffect(() => {
    const log = logRef.current
    if (!log) return
    const reply = !busy && messages.at(-1)?.role === 'milo' ? log.querySelector<HTMLElement>('.milo-message:last-of-type') : null
    const top = reply ? reply.getBoundingClientRect().top - log.getBoundingClientRect().top + log.scrollTop - 16 : log.scrollHeight
    log.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
  }, [messages, busy, reduce])

  const endGuide = useCallback(() => {
    setGuide(null)
    setTravelling(false)
    returnFocus.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (latest.current.guide) endGuide()
      else { setOpen(false); dockRef.current?.focus({ preventScroll: true }) }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [open, endGuide])

  // Register changes in what the founder can actually see; keep the selection if still visible.
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const el = latest.current.guide?.el ?? resolveTarget('', undefined, lastInspection.current)
        const next = readContext(el, latest.current.context)
        setView(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    document.addEventListener('click', update)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', update); document.removeEventListener('click', update) }
  }, [context, lastInspection])

  const beginGuide = useCallback((el: HTMLElement | null) => {
    if (!el) return
    returnFocus.current = document.activeElement as HTMLElement
    // Open only explicit disclosure ancestors, preserving the module's own controls.
    let ancestor: HTMLElement | null = el
    while (ancestor) { if (ancestor instanceof HTMLDetailsElement) ancestor.open = true; ancestor = ancestor.parentElement }
    setTravelling(!reduce && !calm)
    el.scrollIntoView({ behavior: reduce || calm ? 'auto' : 'smooth', block: 'start' })
    const r = el.getBoundingClientRect()
    setGuide({ el, title: el.dataset.miloTitle || 'This part of the investigation', rect: { x: r.x, y: r.y, width: r.width, height: r.height } })
    setView(readContext(el, latest.current.context))
  }, [reduce, calm])

  useEffect(() => {
    if (!guide) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!guide.el.isConnected) { setGuide(null); return }
        const r = guide.el.getBoundingClientRect()
        setGuide(g => g ? { ...g, rect: { x: r.x, y: r.y, width: r.width, height: r.height } } : null)
      })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(guide.el)
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', measure); window.removeEventListener('resize', measure) }
  }, [guide?.el])

  const send = useCallback(async (prompt: string, target?: string, guided = false) => {
    if (!prompt.trim() || busyRef.current) return
    busyRef.current = true; setBusy(true); setError(null); setOpen(true)
    const el = resolveTarget(prompt, target, lastInspection.current)
    const screen = readContext(el, latest.current.context)
    setView(screen)
    if (guided || /\b(explain|why|walk me|show me)\b/i.test(prompt)) beginGuide(el)
    await loadHistory()
    if (!alive.current) { busyRef.current = false; return }
    const local: Message = { id: `local-${Date.now()}`, role: 'founder', content: prompt, createdAt: new Date().toISOString() }
    setMessages(m => [...m, local])
    request.current = new AbortController()
    try {
      const res = await api<{ message: Message }>(`/api/ventures/${ventureId}/milo`, { method: 'POST', signal: request.current.signal, body: JSON.stringify({ prompt, context: screen.section, view: screen }) })
      if (alive.current) setMessages(m => [...m, res.message])
    } catch (err) {
      if (!alive.current) return
      setError(err as ApiError)
      setMessages(m => m.filter(x => x.id !== local.id))
      setDraft(prompt)
    } finally {
      busyRef.current = false
      if (alive.current) setBusy(false)
    }
  }, [ventureId, beginGuide, loadHistory, lastInspection])

  useEffect(() => {
    const onExplain = (event: Event) => {
      const { target, prompt } = (event as CustomEvent<{ target: string; prompt?: string }>).detail
      const el = resolveTarget('', target)
      void send(prompt || `Explain ${el?.dataset.miloTitle ?? target} for this venture. What does it mean, what is actually supported, and what should I do next?`, target, true)
    }
    window.addEventListener(EXPLAIN_EVENT, onExplain)
    return () => window.removeEventListener(EXPLAIN_EVENT, onExplain)
  }, [send])
  useEffect(() => {
    if (!ask || ask.at === lastAsk.current) return
    lastAsk.current = ask.at
    const prompt = ask.about.startsWith('explain:') ? `Explain ${ask.about.slice(8)} in this venture.` : ({ score: 'Why is this venture readiness score low?', biggestrisk: 'What is the biggest risk in this venture?', nextstep: 'What should I test next?', explain: 'Explain this part of the venture analysis.' }[ask.about] || ask.about)
    void send(prompt, undefined, true)
  }, [ask, send])

  async function clearConversation() {
    if (busyRef.current || clearing) return
    setClearing(true)
    try {
      await loadHistory()
      await api(`/api/ventures/${ventureId}/milo`, { method: 'DELETE' })
      if (alive.current) { setMessages([]); setConfirmClear(false); setError(null) }
    } catch (err) { if (alive.current) setError(err as ApiError) }
    finally { if (alive.current) setClearing(false) }
  }

  function toggleCalm() {
    setCalm(c => { try { localStorage.setItem('va_milo_calm', c ? '0' : '1') } catch {} return !c })
  }
  function petMilo() { setPet(true); if (petTimer.current) clearTimeout(petTimer.current); petTimer.current = setTimeout(() => setPet(false), 1500) }
  const state: CompanionState = travelling ? 'navigating' : busy ? 'thinking' : pet ? 'excited' : guide ? 'pointing' : draft ? 'listening' : error || mood === 'wary' ? 'concerned' : open && messages.length ? 'explaining' : 'idle'
  const title = view?.title || LABELS[context] || context
  const g = guide?.rect
  const viewportWidth = viewport.width
  const viewportHeight = viewport.height
  const mobile = viewportWidth < 650
  const focusRect = g ? { left: Math.max(8, g.x - 6), top: Math.max(118, g.y - 6), width: Math.min(viewportWidth - Math.max(8, g.x - 6) - 8, g.width + 12), height: Math.max(45, Math.min(g.y + g.height + 6, viewportHeight - (mobile ? 280 : 100)) - Math.max(118, g.y - 6)) } : null
  const characterPosition = focusRect && !mobile ? { left: Math.min(viewportWidth - 108, focusRect.left + focusRect.width - 90), top: Math.max(115, focusRect.top - 70) } : { left: viewportWidth - (mobile ? 92 : 114), top: viewportHeight - (mobile ? 100 : 122) }

  return <div className="milo-system no-print">
    <AnimatePresence>{focusRect && <motion.div key="focus" className="milo-focus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={focusRect} transition={{ duration: reduce ? 0 : .35 }}><span className="milo-focus-caption">MILO IS LOOKING HERE</span></motion.div>}</AnimatePresence>
    <motion.div className="milo-body" onAnimationComplete={() => setTravelling(false)} initial={false} animate={characterPosition} transition={reduce || calm ? { duration: 0 } : { type: 'spring', stiffness: 110, damping: 21 }}>
      <button ref={dockRef} onClick={() => { if (guide) endGuide(); setOpen(o => !o) }} onPointerEnter={petMilo} aria-expanded={open} aria-label={open ? 'Close Milo' : 'Ask Milo'} className="milo-avatar-button">
        <MiloCompanion state={state} size={mobile ? 78 : 96} still={calm} />
      </button>
      {!open && <span className="milo-dock-label">Ask Milo <span>↗</span></span>}
    </motion.div>
    <AnimatePresence>{open && <motion.aside key="conversation" className={`milo-conversation ${guide ? 'is-guiding' : ''}`} aria-label="Milo venture companion" style={guide && !mobile && g ? { maxHeight: Math.max(280, Math.min(460, viewportHeight - (g.y + g.height) - 42)) } : undefined} initial={reduce ? false : { opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={SPRING}>
      <header><div className="milo-name"><span className="status-dot" /><strong>Milo</strong><span>Your venture companion</span></div><button aria-label="Close Milo panel" onClick={() => { endGuide(); setOpen(false); dockRef.current?.focus({ preventScroll: true }) }}><IconClose size={15} /></button></header>
      <div className="milo-context"><span className="micro">{guide ? 'GUIDED EXPLANATION' : 'IN CONTEXT'}</span><span>{title}</span>{guide && <button onClick={endGuide}>Done ↗</button>}</div>
      <div className="milo-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions">
        {historyLoading && <div className="milo-thinking"><Spinner /> Opening our conversation</div>}
        {historyReady && !messages.length && !busy && <div className="milo-welcome"><span className="micro">A SECOND PAIR OF EYES.</span><h3>Let’s get to<br /><em>the interesting part.</em></h3><p>I can explain what you’re looking at, challenge the assumptions, or help decide what to test next.</p><div className="milo-suggestions">
          <button onClick={() => send('Explain this chart and what I should take away from it.', undefined, true)}>Walk me through this view <span>↗</span></button>
          <button onClick={() => send('What is the single biggest risk in this venture?')}>Find the weakest link <span>↗</span></button>
          <button onClick={() => send('What is the cheapest useful thing I can test this week?')}>Help me choose the next test <span>↗</span></button>
        </div></div>}
        {messages.map(m => <div key={m.id} className={`milo-message ${m.role === 'founder' ? 'from-founder' : 'from-milo'}`}><span className="micro">{m.role === 'founder' ? 'YOU' : m.action === 'saved-analysis' ? 'MILO / SAVED ANALYSIS' : 'MILO'}</span><p><MessageText text={m.content} /></p></div>)}
        {busy && <div className="milo-thinking"><span className="thinking-dots"><i /><i /><i /></span> Reading this part of your case</div>}
        {error && <div className="milo-error" role="alert"><strong>Milo couldn’t complete that request.</strong><p>{error.message}</p>{error.hint && <p>{error.hint}</p>}<span>Your question is back in the composer. You can retry it.</span></div>}
      </div>
      <footer>{confirmClear && <div className="milo-clear-confirm"><p>Delete this venture’s conversation? Analysis and evidence stay saved.</p><button disabled={busy || clearing} onClick={clearConversation}>{clearing ? 'Clearing…' : 'Delete conversation'}</button><button onClick={() => setConfirmClear(false)}>Keep it</button></div>}<form onSubmit={e => { e.preventDefault(); if (draft.trim() && !busy) { const q = draft; setDraft(''); void send(q) } }}>
        <label className="sr-only" htmlFor="milo-ask">Ask Milo</label><textarea ref={inputRef} id="milo-ask" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Why is this score low?" maxLength={2000} rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy && draft.trim()) { const q = draft; setDraft(''); void send(q) } } }} />
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Send to Milo">{busy ? <Spinner /> : '↑'}</button>
      </form><div className="milo-footer-meta"><button disabled={busy || clearing || !messages.length} onClick={() => setConfirmClear(true)}>Clear conversation</button><button onClick={toggleCalm} aria-pressed={calm}>{calm ? 'Motion paused' : 'Pause motion'}</button></div></footer>
    </motion.aside>}</AnimatePresence>
  </div>
}
