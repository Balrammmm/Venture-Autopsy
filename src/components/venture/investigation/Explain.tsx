'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export interface ViewContext {
  page: string
  section: string
  targetId?: string
  title?: string
  visibleText?: string
}

export const EXPLAIN_EVENT = 'venture:explain'
export function askAbout(target: string, prompt?: string) {
  window.dispatchEvent(new CustomEvent(EXPLAIN_EVENT, { detail: { target, prompt } }))
}

/** A small, explicit contract between analysis components and the companion. */
export function ExplainRegion({ id, title, section, aliases = '', children, className = '' }: {
  id: string; title: string; section: string; aliases?: string; children: ReactNode; className?: string
}) {
  return <div id={id} data-milo-target={id} data-milo-title={title} data-milo-section={section}
    data-milo-aliases={aliases} className={className}>{children}</div>
}

export function ExplainButton({ target, label = 'Explain with Milo' }: { target: string; label?: string }) {
  return <button type="button" className="explain-button" onClick={() => askAbout(target)}>
    <span aria-hidden="true">↗</span> {label}
  </button>
}

export function targets() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-milo-target]'))
    .filter(el => el.getClientRects().length > 0)
}

export function resolveTarget(question: string, explicit?: string, last?: HTMLElement | null) {
  const all = targets()
  if (explicit) {
    const exact = all.find(el => el.dataset.miloTarget === explicit || el.id === explicit)
    if (exact) return exact
  }
  const q = question.toLowerCase()
  const ranked = all.map(el => {
    const words = `${el.dataset.miloTitle} ${el.dataset.miloAliases}`.toLowerCase().split(/[^a-z0-9]+/)
    const hits = words.filter(w => w.length > 2 && new RegExp(`\\b${w}\\b`).test(q)).length
    const r = el.getBoundingClientRect()
    const visible = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 80))
    return { el, score: hits * 100 + (el === last && visible > 40 ? 30 : 0) + Math.min(20, visible / 20) }
  }).sort((a, b) => b.score - a.score)
  return ranked[0]?.el ?? null
}

export function readContext(el: HTMLElement | null, fallback: string): ViewContext {
  return {
    page: location.pathname,
    section: el?.dataset.miloSection || fallback,
    targetId: el?.dataset.miloTarget,
    title: el?.dataset.miloTitle,
    // Only registered product content, never the entire document or chat history.
    visibleText: el?.innerText.replace(/Explain with Milo/g, '').trim().slice(0, 7000),
  }
}

export function useLastInspection() {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const inspect = (e: Event) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-milo-target]')
      if (el) ref.current = el
    }
    document.addEventListener('pointerdown', inspect, true)
    document.addEventListener('focusin', inspect, true)
    return () => {
      document.removeEventListener('pointerdown', inspect, true)
      document.removeEventListener('focusin', inspect, true)
    }
  }, [])
  return ref
}
