'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const LINKS: [string, string][] = [
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
  ['Contact', '/contact'],
  ['Source on GitHub', 'https://github.com/Balrammmm/Venture-Autopsy'],
]

/**
 * The legal links, kept out of the cinematic ending.
 *
 * A single small glyph in the corner opens them. They exist, they are one tap
 * away and they are keyboard reachable — they simply do not get to interrupt
 * the last thing the page says.
 */
export function LegalMenu() {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div ref={wrap} className="no-print fixed bottom-4 left-4 z-40 lg:bottom-5 lg:left-5">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Legal and source links"
        className="tap flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--rule)] bg-[rgb(var(--ink-800)/0.72)] text-paper-faint backdrop-blur-md transition-colors duration-200 hover:border-action/50 hover:text-paper"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4.5M12 8.2v.2" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: 'bottom left' }}
            className="absolute bottom-11 left-0 min-w-[180px] rounded-[4px] border border-[color:var(--rule)] bg-[rgb(var(--ink-700)/0.96)] p-1.5 backdrop-blur-xl"
          >
            {LINKS.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                onClick={() => setOpen(false)}
                className="tap flex items-center justify-between rounded-[3px] px-3 py-2 text-[13px] text-paper-dim transition-colors duration-150 hover:bg-[rgb(var(--paper)/0.06)] hover:text-paper"
              >
                {label}
                {href.startsWith('http') && (
                  <span aria-hidden="true" className="text-[11px] text-paper-sub">
                    ↗
                  </span>
                )}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
