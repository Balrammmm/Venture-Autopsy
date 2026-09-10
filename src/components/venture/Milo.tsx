'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Button, Chip, IconClose, IconTrash, Spinner } from '@/components/ui/kit'
import { ApiError, api, del, post } from '@/lib/client'
import { useMiloRoam } from './useMiloRoam'

export type MiloMood = 'idle' | 'alert' | 'wary' | 'thinking' | 'pleased' | 'asleep'

const EASE = [0.23, 1, 0.32, 1] as const

/* ------------------------------------------------------------------ *
 * The fox. Geometric and mechanical — a small instrument, not a mascot.
 * ------------------------------------------------------------------ */

function MiloFox({ mood, size = 46 }: { mood: MiloMood; size?: number }) {
  const reduce = useReducedMotion()
  const [blink, setBlink] = useState(false)
  const asleep = mood === 'asleep'
  const accent = mood === 'wary' ? 'rgb(var(--risk))' : 'rgb(var(--action-text))'

  useEffect(() => {
    if (reduce || asleep) return
    let t: number
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true)
        window.setTimeout(() => setBlink(false), 110)
        loop()
      }, 2800 + Math.random() * 4200)
    }
    loop()
    return () => clearTimeout(t)
  }, [reduce, asleep])

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* Orbital ring — he is an instrument in the lab. */}
      <motion.g
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        style={{ originX: '50%', originY: '50%' }}
      >
        <ellipse cx="24" cy="24" rx="21.5" ry="8.5" stroke={accent} strokeOpacity="0.32" strokeWidth="1" transform="rotate(-22 24 24)" />
        <circle cx="44.5" cy="16.5" r="1.7" fill={accent} opacity="0.9" />
      </motion.g>

      {/* Tail */}
      <motion.path
        d="M13 30.5c-4.2 1.4-6.3 4-5.8 7.2 2.6-1.6 5.2-2.6 7.8-2.6"
        stroke={accent}
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
        animate={reduce ? {} : { rotate: mood === 'pleased' ? [0, -16, 0, 12, 0] : [0, -8, 0, 6, 0] }}
        transition={{ duration: mood === 'pleased' ? 1.6 : 4.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '15px', originY: '30px' }}
      />

      <motion.g
        animate={
          reduce
            ? {}
            : mood === 'thinking'
              ? { rotate: [0, -5, 3, 0] }
              : mood === 'alert'
                ? { y: [0, -1.6, 0] }
                : {}
        }
        transition={{ duration: mood === 'thinking' ? 2.4 : 1.9, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '24px', originY: '26px' }}
      >
        {/* Tall cat ears. They flatten when wary and droop when asleep. */}
        <motion.path
          d="M15.8 19.8 13.2 10.4l8.4 5.2"
          fill={accent}
          fillOpacity="0.92"
          animate={reduce ? {} : { rotate: mood === 'wary' ? -26 : asleep ? -14 : 0 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }}
          style={{ originX: '17px', originY: '19px' }}
        />
        <motion.path
          d="M32.2 19.8 34.8 10.4l-8.4 5.2"
          fill={accent}
          fillOpacity="0.92"
          animate={reduce ? {} : { rotate: mood === 'wary' ? 26 : asleep ? 14 : 0 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }}
          style={{ originX: '31px', originY: '19px' }}
        />
        {/* Head — rounder and wider than a fox's, machined from one plate. */}
        <path
          d="M24 14.6c6.9 0 10.6 4.3 10.6 9.7 0 5.9-4.7 9.8-10.6 9.8S13.4 30.2 13.4 24.3c0-5.4 3.7-9.7 10.6-9.7Z"
          fill="rgb(var(--ink-800))"
          stroke={accent}
          strokeWidth="1.5"
        />
        <path d="M17.2 20.9h13.6" stroke={accent} strokeOpacity="0.26" strokeWidth="0.9" />

        {/* Eyes. Closed arcs when asleep, otherwise blinking discs. */}
        {asleep ? (
          <g>
            <path d="M18.2 24.6q2.1 1.9 4.2 0" stroke={accent} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M25.6 24.6q2.1 1.9 4.2 0" stroke={accent} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          <motion.g animate={{ scaleY: blink ? 0.1 : 1 }} transition={{ duration: 0.09 }} style={{ originY: '24.2px' }}>
            <circle cx="20.1" cy="24.2" r="1.85" fill={accent} />
            <circle cx="27.9" cy="24.2" r="1.85" fill={accent} />
          </motion.g>
        )}

        {/* Muzzle and whiskers — the cat tell. */}
        <path d="M24 27.4v1.7" stroke={accent} strokeOpacity="0.6" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M22.6 30.2q1.4 1.2 2.8 0" stroke={accent} strokeOpacity="0.75" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <g stroke={accent} strokeOpacity="0.42" strokeWidth="0.85" strokeLinecap="round">
          <path d="M13.6 27.4 8.8 26.4M13.6 29.2l-4.4 1.3" />
          <path d="M34.4 27.4l4.8-1M34.4 29.2l4.4 1.3" />
        </g>

        {/* Sleep marks. */}
        {asleep && !reduce && (
          <motion.g
            animate={{ opacity: [0, 1, 0], y: [0, -5, -9] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeOut' }}
          >
            <text x="35" y="14" fontSize="7" fontFamily="var(--font-mono), monospace" fill={accent} opacity="0.8">
              z
            </text>
          </motion.g>
        )}
      </motion.g>
    </svg>
  )
}

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
}: {
  ventureId: string
  context?: string
  mood?: MiloMood
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

  // Reduced motion pins him too, and the room being open stops him wandering
  // out from under his own panel.
  const roam = useMiloRoam({ calm: calm || Boolean(reduce), paused: open })

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
        <motion.button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={open ? 'Close the Founder Room' : 'Open the Founder Room with Milo'}
          className="pointer-events-auto flex h-[60px] w-[60px] cursor-pointer items-center justify-center rounded-full border border-[rgb(var(--paper)/0.16)] bg-[rgb(var(--ink-700)/0.9)] backdrop-blur-md transition-colors duration-200 ease-out hover:border-action/50"
          animate={reduce || roam.state === 'sleeping' ? {} : { y: [0, -5, 0] }}
          transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
          whileTap={{ scale: 0.94 }}
          style={{ boxShadow: 'var(--shadow-lift)' }}
        >
          <MiloFox mood={displayMood} />
          {effectiveMood === 'wary' && !open && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-risk"
              style={{ boxShadow: '0 0 0 3px rgb(var(--ink-700))' }}
            />
          )}
        </motion.button>

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
                <MiloFox mood={effectiveMood} size={28} />
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
