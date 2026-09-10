'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Kinetic type, driven by CSS rather than JavaScript.
 *
 * The on-load reveal is a stylesheet animation, so the words arrive without
 * any script running. The scroll-triggered variants render at their final,
 * fully legible state and only replay as an animation once an observer adds
 * the play class — if that never happens, the text is simply there.
 *
 * Reduced motion disables every keyframe and leaves plain text.
 */

/** Plays a class when the element first enters the viewport. */
function usePlayOnView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [played, setPlayed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || played) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPlayed(true)
          io.disconnect()
        }
      },
      { rootMargin: '-15% 0px -15% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [played])

  return { ref, cls: played ? 'kt-play' : '' }
}

/** Words rise into place on load. Pure CSS — no script required. */
export function KineticLine({
  text,
  delay = 0,
  className = '',
  as: Tag = 'span',
}: {
  text: string
  delay?: number
  className?: string
  as?: 'span' | 'div'
}) {
  const words = text.split(' ')
  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <span className="kt-word" style={{ animationDelay: `${delay + i * 0.05}s` }}>
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </Tag>
  )
}

/** Words slide in from alternating sides once the line is on screen. */
export function KineticSlide({
  text,
  className = '',
  accent,
}: {
  text: string
  className?: string
  accent?: string
}) {
  const { ref, cls } = usePlayOnView<HTMLParagraphElement>()
  const words = text.split(' ')

  return (
    <p ref={ref} className={`${cls} ${className}`}>
      {words.map((word, i) => {
        const isAccent = accent ? word.replace(/[.,]/g, '').toLowerCase() === accent.toLowerCase() : false
        return (
          <span
            key={i}
            className={`inline-block align-bottom ${i % 2 === 0 ? 'kt-slide-l' : 'kt-slide-r'} ${
              isAccent ? 'italic text-lime' : ''
            }`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </p>
  )
}

/** Letters scatter and reassemble once, on entry. */
export function KineticWord({ word, className = '' }: { word: string; className?: string }) {
  const { ref, cls } = usePlayOnView<HTMLSpanElement>()

  return (
    // Per-character spans: label the whole word so it is announced as a word.
    <span ref={ref} aria-label={word} className={`inline-block ${cls} ${className}`}>
      {word.split('').map((ch, i) => {
        const seed = ((i * 2654435761) % 1000) / 1000
        return (
          <span
            key={i}
            aria-hidden="true"
            className="kt-char inline-block"
            style={
              {
                animationDelay: `${i * 0.03}s`,
                '--kt-x': `${(seed - 0.5) * 24}px`,
                '--kt-y': `${(seed - 0.5) * 52}px`,
                '--kt-r': `${(seed - 0.5) * 28}deg`,
              } as React.CSSProperties
            }
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        )
      })}
    </span>
  )
}

/** Letters stretch wide then snap to their true width. The closing line. */
export function KineticResolve({
  text,
  className = '',
  delay = 0,
}: {
  text: string
  className?: string
  delay?: number
}) {
  const { ref, cls } = usePlayOnView<HTMLSpanElement>()

  return (
    <span ref={ref} aria-label={text} className={`inline-block ${cls} ${className}`}>
      {text.split('').map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="kt-stretch inline-block"
          style={{ animationDelay: `${delay + i * 0.035}s`, transformOrigin: 'center' }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}
