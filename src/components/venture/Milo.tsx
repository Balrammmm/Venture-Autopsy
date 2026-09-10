'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Button, Chip, IconClose, IconTrash, Spinner } from '@/components/ui/kit'
import { ApiError, api, del, post } from '@/lib/client'
import { useMiloRoam } from './useMiloRoam'
import { MiloCat } from './MiloCat'

export type MiloMood = 'idle' | 'alert' | 'wary' | 'thinking' | 'pleased' | 'asleep'

const EASE = [0.23, 1, 0.32, 1] as const

/* ------------------------------------------------------------------ */

const ACTIONS: { id: string; label: string; when?: string[] }[] = [
  { id: 'challenge', label: 'Challenge this assumption', when: ['assumptions', 'genome'] },
  { id: 'cheapest', label: 'Design the cheapest experiment', when: ['assumptions', 'validate'] },
  { id: 'interviews', label: 'Generate interview questions', when: ['validate', 'market'] },
  { id: 'pricing', label: 'Stress-test the pricing', when: ['model', 'strategy'] },
  { id: 'pivots', label: 'Compare pivot options', when: ['pivots'] },
  { id: 'pitch', label: 'Turn this into a one-page pitch' },
  { id: 'explain', label: 'Explain this visual' },
  { id: 'sevendays', label: 'Build my next seven days', when: ['launch', 'strategy'] },
  { id: 'research', label: 'Summarise the research', when: ['research', 'market'] },
  { id: 'launch', label: 'Build a launch plan', when: ['launch', 'strategy'] },
  { id: 'biggestrisk', label: 'Find the biggest risk', when: ['assumptions', 'genome', 'validate'] },
  { id: 'competitors', label: 'Analyse competitors from my evidence', when: ['research', 'market'] },
  { id: 'score', label: 'Explain this score', when: ['genome', 'verdict'] },
  { id: 'summarise', label: 'Summarise the venture' },
]

interface Message {
  id: string
  role: string
  content: string
  action?: string | null
  createdAt: string
}

const ACTION_LABEL: Record<string, string> = Object.fromEntries(ACTIONS.map((a) => [a.id, a.label]))

export function Milo({
  ventureId,
  context,
  mood = 'idle',
  ask,
}: {
  ventureId: string
  context?: string
  mood?: MiloMood
  /**
   * A request from the page: "ask Milo about this". `about` is either an
   * action id or `explain:<subject>`. `at` is a timestamp, so asking the same
   * thing twice still fires.
   */
  ask?: { about: string; at: number } | null
}) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<ApiError | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Calm mode is remembered, because someone who turns it off wants it off.
  const [calm, setCalm] = useState(false)
  useEffect(() => {
    try {
      setCalm(localStorage.getItem('va_milo_calm') === '1')
    } catch {
      /* private mode — he simply roams */
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('va_milo_calm', calm ? '1' : '0')
    } catch {
      /* nothing to persist to */
    }
  }, [calm])

  /*
    Taming. Hovering over him builds trust and decays when you leave him alone.
    Past 0.55 he purrs; past 0.75 his tail goes up and he stops fleeing the
    cursor, because a cat that knows you does not run away. Bonding is
    remembered so he greets you already friendly next time.
  */
  const trust = useRef(0)
  const [bonded, setBonded] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem('va_milo_bond') === '1') {
        trust.current = 0.8
        setBonded(true)
      }
    } catch {
      /* private mode — he starts shy every time */
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      // Decays slowly; petting is handled by the pointer handlers below.
      trust.current = Math.max(bonded ? 0.7 : 0, trust.current - dt * 0.06)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [bonded])

  const pet = useCallback(() => {
    trust.current = Math.min(1, trust.current + 0.05)
    if (trust.current > 0.9 && !bonded) {
      setBonded(true)
      try {
        localStorage.setItem('va_milo_bond', '1')
      } catch {
        /* nothing to persist to */
      }
    }
  }, [bonded])

  // Reduced motion pins him too, and the room being open stops him wandering
  // out from under his own panel.
  const roam = useMiloRoam({ calm: calm || Boolean(reduce), paused: open, trust })

  const effectiveMood: MiloMood = busy ? 'thinking' : mood
  const displayMood: MiloMood = busy ? 'thinking' : roam.state === 'sleeping' ? 'asleep' : mood

  useEffect(() => {
    if (!open || loaded) return
    api<{ messages: Message[] }>(`/api/ventures/${ventureId}/milo`)
      .then((d) => setMessages(d.messages))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [open, loaded, ventureId])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [messages, busy, reduce])

  /**
   * One path for both a preset action and a typed question — the optimistic
   * message differs only in what it says, and the body differs only in which
   * field carries the ask.
   */
  async function send(input: { action: string } | { prompt: string }) {
    if (busy) return
    const label = 'action' in input ? (ACTION_LABEL[input.action] ?? input.action) : input.prompt
    if (!label.trim()) return

    setBusy(true)
    setError(null)
    const optimistic: Message = {
      id: `local-${Date.now()}`,
      role: 'founder',
      content: label,
      createdAt: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])
    try {
      const res = await post<{ message: Message }>(`/api/ventures/${ventureId}/milo`, { ...input, context })
      setMessages((m) => [...m, res.message])
    } catch (err) {
      setError(err as ApiError)
      setMessages((m) => m.filter((x) => x.id !== optimistic.id))
      // Give the question back rather than losing what they typed.
      if ('prompt' in input) setDraft(input.prompt)
    } finally {
      setBusy(false)
    }
  }

  const run = (actionId: string) => send({ action: actionId })

  function submitDraft() {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    void send({ prompt: text })
  }

  async function clear() {
    await del(`/api/ventures/${ventureId}/milo`).catch(() => {})
    setMessages([])
    setError(null)
  }

  /*
    "Ask Milo about this" from anywhere on the page. He opens, and either runs
    the named action or asks about the named subject in plain words — so the
    answer always arrives in the same conversation rather than a side channel.
  */
  const lastAsk = useRef(0)
  useEffect(() => {
    if (!ask || ask.at === lastAsk.current) return
    lastAsk.current = ask.at
    setOpen(true)
    const [head, ...rest] = ask.about.split(':')
    const subject = rest.join(':')
    if (head === 'explain' && subject) {
      void send({ prompt: `Explain "${subject}" in this venture: what it means here, how strong the evidence is, and what I should do about it next.` })
    } else if (ACTION_LABEL[ask.about]) {
      void send({ action: ask.about })
    } else {
      void send({ prompt: ask.about })
    }
    // `send` is stable enough for this: it only reads refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask])

  const suggested = context ? ACTIONS.filter((a) => a.when?.includes(context)) : []
  const others = ACTIONS.filter((a) => !suggested.includes(a))

  return (
    <>
      {/*
        Milo roams the margin. The wrapper is what moves — it is fixed at the
        origin and translated each frame, and only the button inside it takes
        pointer events, so nothing he passes over becomes unclickable.
      */}
      <div
        ref={roam.el}
        className="no-print pointer-events-none fixed left-0 top-0 z-40"
        style={{ willChange: 'transform' }}
      >
        {/*
          No disc around him — he is a creature standing on the page, not an
          icon in a bubble. The button is the cat.
        */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          onPointerEnter={pet}
          onPointerMove={pet}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={open ? 'Close the Founder Room' : 'Open the Founder Room with Milo'}
          className="tap pointer-events-auto relative flex cursor-pointer items-center justify-center rounded-full transition-transform duration-200 ease-out active:scale-95"
        >
          <MiloCat motion={roam.motion} mood={displayMood} trust={trust} />
          {effectiveMood === 'wary' && !open && (
            <span
              aria-hidden="true"
              className="absolute -top-1 right-2 h-2.5 w-2.5 rounded-full bg-risk"
              style={{ boxShadow: '0 0 0 3px rgb(var(--ink-800))' }}
            />
          )}
        </button>

        {/* Calm mode: parks him in the corner for good. */}
        {!open && (
          <button
            type="button"
            onClick={() => setCalm((c) => !c)}
            aria-pressed={calm}
            title={calm ? 'Let Milo roam' : 'Keep Milo still'}
            aria-label={calm ? 'Let Milo roam' : 'Keep Milo still'}
            className="tap pointer-events-auto absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--rule)] bg-[rgb(var(--ink-800))] text-[9px] text-paper-sub opacity-0 transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100 hover:opacity-100"
          >
            {calm ? '↻' : '⏸'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Founder Room"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.24, ease: EASE }}
            style={{ transformOrigin: 'bottom right', boxShadow: 'var(--shadow-lift)' }}
            className="no-print fixed bottom-[88px] right-3 z-40 flex max-h-[min(660px,78vh)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[4px] border border-[rgb(var(--paper)/0.14)] bg-ink-700/96 backdrop-blur-xl sm:right-5 sm:w-[410px] md:bottom-[104px] md:right-7"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--rule)] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <MiloCat motion={roam.motion} mood={effectiveMood} trust={trust} size={44} />
                <div>
                  <p className="text-[13.5px] leading-tight text-paper">Founder Room</p>
                  <p className="text-[11px] leading-tight text-paper-sub">
                    {busy ? 'Milo is working' : context ? `Looking at ${context}` : 'Milo is listening'}
                  </p>
                </div>
              </div>
              <Button
                ref={closeRef}
                variant="quiet"
                size="sm"
                onClick={() => {
                  setOpen(false)
                  triggerRef.current?.focus()
                }}
                aria-label="Close the Founder Room"
              >
                <IconClose size={14} />
              </Button>
            </header>

            <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && !busy && (
                <p className="max-w-[34ch] py-2 text-[13.5px] leading-[1.6] text-paper-dim">
                  Pick something below. I read your actual atlas — the assumptions, the pivots, the evidence you have
                  attached — and I will tell you when I am guessing.
                </p>
              )}

              <div className="space-y-3">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.26, ease: EASE }}
                    className={m.role === 'founder' ? 'flex justify-end' : ''}
                  >
                    {m.role === 'founder' ? (
                      <p className="max-w-[82%] rounded-[3px] border border-action/40 bg-action-wash px-3 py-2 text-[13px] leading-[1.5] text-action-text">
                        {m.content}
                      </p>
                    ) : (
                      <div className="max-w-[94%] whitespace-pre-wrap rounded-[3px] border border-[rgb(var(--paper)/0.12)] bg-[rgb(var(--paper)/0.03)] px-3.5 py-3 text-[13.5px] leading-[1.62] text-paper-dim">
                        {m.content}
                      </div>
                    )}
                  </motion.div>
                ))}

                {busy && (
                  <div className="flex items-center gap-2.5 px-1 py-2 text-[13px] text-paper-faint">
                    <Spinner />
                    Reading the atlas
                  </div>
                )}

                {error && (
                  <div role="alert" className="border-l-2 border-risk bg-risk-wash px-3 py-2.5 text-[13px] leading-relaxed text-paper-dim">
                    {error.message}
                    {error.hint && <span className="mt-1 block text-paper-faint">{error.hint}</span>}
                  </div>
                )}
              </div>
            </div>

            <footer className="shrink-0 border-t border-[color:var(--rule)] px-4 py-3.5">
              {/*
                Ask anything. Enter sends, Shift+Enter breaks the line — the
                convention people already have in their fingers.
              */}
              <form
                className="mb-3.5 flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  submitDraft()
                }}
              >
                <label htmlFor="milo-ask" className="sr-only">
                  Ask Milo about this venture
                </label>
                <textarea
                  id="milo-ask"
                  rows={1}
                  value={draft}
                  disabled={busy}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = `${Math.min(112, e.target.scrollHeight)}px`
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      submitDraft()
                    }
                  }}
                  placeholder="Ask Milo anything about this venture…"
                  maxLength={2000}
                  className="max-h-28 min-h-[42px] flex-1 resize-none rounded-[3px] border border-[rgb(var(--paper)/0.16)] bg-[rgb(var(--paper)/0.03)] px-3 py-2.5 text-[13.5px] leading-[1.5] text-paper transition-colors duration-150 placeholder:text-paper-faint hover:border-[rgb(var(--paper)/0.28)] focus:border-action/60 focus:outline-none disabled:opacity-50"
                />
                <Button type="submit" size="sm" disabled={busy || !draft.trim()} aria-label="Send to Milo">
                  {busy ? <Spinner /> : 'Ask'}
                </Button>
              </form>

              {suggested.length > 0 && (
                <>
                  <p className="label mb-2">For what you are looking at</p>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {suggested.map((a) => (
                      <Chip key={a.id} active onClick={() => run(a.id)} disabled={busy}>
                        {a.label}
                      </Chip>
                    ))}
                  </div>
                </>
              )}
              <p className="label mb-2">{suggested.length ? 'Anything else' : 'What do you need'}</p>
              <div className="flex flex-wrap gap-1.5">
                {others.map((a) => (
                  <Chip key={a.id} onClick={() => run(a.id)} disabled={busy}>
                    {a.label}
                  </Chip>
                ))}
              </div>
              {messages.length > 0 && (
                <Button variant="quiet" size="sm" className="mt-3" onClick={clear} disabled={busy}>
                  <IconTrash size={12} />
                  Clear this room
                </Button>
              )}
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
