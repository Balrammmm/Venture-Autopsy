'use client'

import { useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * The landing page's two calls to action.
 *
 * Primary is a tactile filled control: a layered plate that lifts on hover,
 * compresses on press, and moves its arrow. Secondary is a drawn outline that
 * fills from the left. Both track the pointer slightly — a magnetic pull of a
 * few pixels, cancelled under reduced motion — and both keep a visible focus
 * ring that is never removed.
 */

function useMagnet(strength = 7) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLButtonElement>(null)

  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType === 'touch' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    ref.current.style.setProperty('--mx', `${dx * strength}px`)
    ref.current.style.setProperty('--my', `${dy * (strength * 0.5)}px`)
  }

  const onLeave = () => {
    if (!ref.current) return
    ref.current.style.setProperty('--mx', '0px')
    ref.current.style.setProperty('--my', '0px')
  }

  return { ref, onPointerMove: onMove, onPointerLeave: onLeave }
}

function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 12h14" />
      <path d="m12 6 6 6-6 6" />
    </svg>
  )
}

function Spark({ className = '' }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3.5 13.9 9a3 3 0 0 0 1.9 1.9l5.5 1.9-5.5 1.9A3 3 0 0 0 13.9 17L12 22.5 10.1 17a3 3 0 0 0-1.9-1.9L2.7 12.8l5.5-1.9A3 3 0 0 0 10.1 9L12 3.5Z" />
    </svg>
  )
}

export function PrimaryCta({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const magnet = useMagnet(7)

  return (
    <button
      type="button"
      onClick={onClick}
      {...magnet}
      className={`group tap relative isolate inline-flex h-14 items-center gap-3 rounded-[4px] px-7 text-[15.5px] font-semibold tracking-[-0.01em] text-action-ink outline-offset-4 transition-transform duration-200 ease-out will-change-transform active:translate-y-[1px] ${className}`}
      style={{ transform: 'translate3d(var(--mx, 0), var(--my, 0), 0)' }}
    >
      {/* Depth plate sitting under the face. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-[3px] top-[3px] -z-10 rounded-[4px] bg-action-deep transition-all duration-200 ease-out group-hover:-bottom-[5px] group-active:-bottom-[1px]"
      />
      {/* The face. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 rounded-[4px] bg-action transition-colors duration-200 ease-out group-hover:brightness-[1.06]"
      />
      {/* A soft sheen that sweeps once on hover. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden rounded-[4px]"
      >
        <span className="absolute inset-y-0 -left-full w-1/2 skew-x-[-18deg] bg-white/25 transition-transform duration-700 ease-out group-hover:translate-x-[320%]" />
      </span>

      <span className="relative">{children}</span>
      <Arrow className="relative transition-transform duration-200 ease-out group-hover:translate-x-1" />
    </button>
  )
}

export function SecondaryCta({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const magnet = useMagnet(5)

  return (
    <button
      type="button"
      onClick={onClick}
      {...magnet}
      className={`group tap relative isolate inline-flex h-14 items-center gap-2.5 overflow-hidden rounded-[4px] border border-[color:var(--rule-strong)] px-6 text-[15px] font-medium text-paper outline-offset-4 transition-[border-color,transform] duration-200 ease-out will-change-transform hover:border-intel active:translate-y-[1px] ${className}`}
      style={{ transform: 'translate3d(var(--mx, 0), var(--my, 0), 0)' }}
    >
      {/* Fills from the left rather than simply tinting. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 origin-left scale-x-0 bg-intel-wash transition-transform duration-300 ease-out group-hover:scale-x-100"
      />
      <Spark className="relative text-intel transition-transform duration-300 ease-out group-hover:rotate-[18deg] group-hover:scale-110" />
      <span className="relative">{children}</span>
    </button>
  )
}

/** A quieter inline action, used inside the atlas detail panel. */
export function InlineCta({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group tap inline-flex items-center gap-2 text-[13.5px] font-medium text-action-text outline-offset-4 transition-colors duration-150 hover:text-paper ${className}`}
    >
      <span className="relative">
        {children}
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-action transition-transform duration-300 ease-out group-hover:scale-x-100"
        />
      </span>
      <Arrow className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
    </button>
  )
}
