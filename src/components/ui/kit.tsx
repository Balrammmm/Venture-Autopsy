'use client'

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import type { Evidence } from '@/lib/atlas-types'

/* ------------------------------------------------------------------ *
 * Icons — one drawn set, 1.5 stroke, currentColor. No emoji, no glyphs.
 * ------------------------------------------------------------------ */

type IconProps = { className?: string; size?: number }

const icon = (path: ReactNode) =>
  function Icon({ className = '', size = 16 }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={className}
      >
        {path}
      </svg>
    )
  }

export const IconArrow = icon(<><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>)
export const IconBack = icon(<><path d="M20 12H5" /><path d="m11 18-6-6 6-6" /></>)
export const IconRefresh = icon(<><path d="M20 11a8 8 0 1 0-1.6 6" /><path d="M20 4v7h-7" /></>)
export const IconPencil = icon(<><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 6.5 3 3" /></>)
export const IconClose = icon(<><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>)
export const IconCheck = icon(<path d="m4 12.5 5 5L20 7" />)
export const IconPrint = icon(<><path d="M7 9V3h10v6" /><path d="M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M7 15h10v6H7z" /></>)
export const IconDownload = icon(<><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>)
export const IconTrash = icon(<><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7l1 13h10l1-13" /></>)
export const IconArchive = icon(<><path d="M3 7h18v3H3z" /><path d="M5 10v9h14v-9" /><path d="M10 14h4" /></>)
export const IconKey = icon(<><circle cx="8" cy="12" r="4" /><path d="M12 12h9" /><path d="M17 12v4" /><path d="M20 12v3" /></>)
export const IconSearch = icon(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>)
export const IconLink = icon(<><path d="M10 13a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.6 5.7" /><path d="M14 11a4 4 0 0 0-5.7 0L5.5 13.8a4 4 0 1 0 5.7 5.7l1.2-1.2" /></>)
export const IconAlert = icon(<><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4.5" /><path d="M12 17.4v.2" /></>)
export const IconPlus = icon(<><path d="M12 5v14" /><path d="M5 12h14" /></>)
export const IconFlask = icon(<><path d="M9 3v6.5L4.5 18A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.8-3L15 9.5V3" /><path d="M8 3h8" /><path d="M7.5 15h9" /></>)
export const IconTarget = icon(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" /></>)
export const IconMap = icon(<><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" /><path d="M9 4v14" /><path d="M15 6v14" /></>)
export const IconRoute = icon(<><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.5" /></>)
export const IconLayers = icon(<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>)
export const IconSettings = icon(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>)
export const IconSpark = icon(<path d="M12 3.5 13.9 9a3 3 0 0 0 1.9 1.9l5.5 1.9-5.5 1.9A3 3 0 0 0 13.9 17L12 22.5 10.1 17a3 3 0 0 0-1.9-1.9L2.7 12.8l5.5-1.9A3 3 0 0 0 10.1 9L12 3.5Z" />)
export const IconLogout = icon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>)

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const base =
  'tap inline-flex items-center justify-center gap-2 font-medium select-none cursor-pointer ' +
  'transition-[background-color,color,border-color,transform,opacity] duration-150 ease-out ' +
  'active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100'

const variants: Record<string, string> = {
  primary:
    'bg-lime text-ink-900 border border-lime hover:enabled:bg-[#D6FF57] hover:enabled:border-[#D6FF57] shadow-[0_2px_12px_-3px_rgba(200,251,46,0.4)]',
  ghost:
    'border border-[rgba(243,238,226,0.18)] text-paper hover:enabled:border-[rgba(243,238,226,0.42)] hover:enabled:bg-[rgba(243,238,226,0.04)]',
  quiet: 'text-paper-dim hover:enabled:text-paper hover:enabled:bg-[rgba(243,238,226,0.05)] border border-transparent',
  danger: 'border border-[rgba(255,90,31,0.4)] text-ember hover:enabled:bg-ember-wash hover:enabled:border-ember',
}

const sizes: Record<string, string> = {
  sm: 'h-8 px-3 text-[12.5px] rounded-[3px]',
  md: 'h-10 px-4 text-[13.5px] rounded-[3px]',
  lg: 'h-12 px-6 text-[15px] rounded-[3px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', size = 'md', className = '', ...rest },
  ref,
) {
  return <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest} />
})

export function Chip({
  children,
  onClick,
  active,
  className = '',
  disabled,
  title,
  as = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
  disabled?: boolean
  title?: string
  as?: 'button' | 'span'
}) {
  const cls = `tap inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors duration-150 ease-out ${
    active
      ? 'border-lime bg-lime-wash text-lime'
      : 'border-[rgba(243,238,226,0.16)] text-paper-dim'
  } ${as === 'button' ? 'cursor-pointer hover:border-[rgba(243,238,226,0.38)] hover:text-paper disabled:cursor-not-allowed disabled:opacity-45' : ''} ${className}`

  if (as === 'span') {
    return (
      <span className={cls} title={title}>
        {children}
      </span>
    )
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={cls}>
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ *
 * Evidence labelling — the integrity rule, made visible everywhere.
 * ------------------------------------------------------------------ */

const EVIDENCE_LABEL: Record<Evidence, string> = {
  sourced: 'Sourced',
  user_provided: 'Your evidence',
  hypothesis: 'Hypothesis',
}

const EVIDENCE_TONE: Record<Evidence, string> = {
  sourced: 'border-lime/45 text-lime',
  user_provided: 'border-[rgba(243,238,226,0.34)] text-paper-dim',
  hypothesis: 'border-[rgba(243,238,226,0.2)] text-paper-faint',
}

export function EvidenceTag({ evidence, className = '' }: { evidence: Evidence | string; className?: string }) {
  const key = (['sourced', 'user_provided', 'hypothesis'].includes(evidence) ? evidence : 'hypothesis') as Evidence
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${EVIDENCE_TONE[key]} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`h-1 w-1 rounded-full ${key === 'sourced' ? 'bg-lime' : key === 'user_provided' ? 'bg-paper-dim' : 'bg-paper-faint'}`}
      />
      {EVIDENCE_LABEL[key]}
    </span>
  )
}

export function IntegrityNote({ evidence, className = '' }: { evidence: string; className?: string }) {
  return (
    <p className={`max-w-measure text-[12.5px] leading-relaxed text-paper-faint ${className}`}>
      {evidence === 'sourced' ? (
        <>
          Claims marked <span className="text-lime">Sourced</span> trace to a link with a timestamp. Everything else
          is a hypothesis derived from your description — not researched, not verified, and not a fact.
        </>
      ) : evidence === 'user_provided' ? (
        <>
          This was analysed against the evidence <span className="text-paper-dim">you supplied</span>. Nothing here
          was independently researched; treat unmarked claims as hypotheses to test.
        </>
      ) : (
        <>
          Every claim here is a <span className="text-paper-dim">hypothesis derived from your description</span>. No
          market data, competitor list, price or feasibility judgement has been researched. They are written to be
          tested, not believed.
        </>
      )}
    </p>
  )
}

/* ------------------------------------------------------------------ *
 * Form controls
 * ------------------------------------------------------------------ */

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={`w-full resize-y rounded-[3px] border border-[rgba(243,238,226,0.16)] bg-[rgba(243,238,226,0.03)] px-3.5 py-3 text-[14.5px] leading-relaxed text-paper transition-colors duration-150 ease-out placeholder:text-paper-faint hover:border-[rgba(243,238,226,0.28)] focus:border-lime/60 focus:outline-none ${className}`}
        {...rest}
      />
    )
  },
)

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`h-11 w-full rounded-[3px] border border-[rgba(243,238,226,0.16)] bg-[rgba(243,238,226,0.03)] px-3.5 text-[14px] text-paper transition-colors duration-150 ease-out placeholder:text-paper-faint hover:border-[rgba(243,238,226,0.28)] focus:border-lime/60 focus:outline-none ${className}`}
      {...rest}
    />
  )
})

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className = '',
}: {
  label: string
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label mb-1.5 block">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12.5px] text-ember">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-paper-faint">{hint}</p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function ScoreBar({
  value,
  max = 5,
  tone = 'lime',
  label,
}: {
  value: number
  max?: number
  tone?: 'lime' | 'ember'
  label: string
}) {
  const v = Math.max(0, Math.min(max, Math.round(value)))
  return (
    <span className="inline-flex items-center gap-2">
      <span className="sr-only">{`${label}: ${v} of ${max}`}</span>
      <span aria-hidden="true" className="flex gap-[3px]">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`h-[3px] w-4 rounded-full ${
              i < v ? (tone === 'ember' ? 'bg-ember' : 'bg-lime') : 'bg-[rgba(243,238,226,0.14)]'
            }`}
          />
        ))}
      </span>
      <span aria-hidden="true" className="num font-mono text-[11px] text-paper-faint">
        {v}/{max}
      </span>
    </span>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.22" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function Rule({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-[color:var(--rule)] ${className}`} />
}

/* ------------------------------------------------------------------ *
 * States
 * ------------------------------------------------------------------ */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-[3px] ${className}`} aria-hidden="true" />
}

export function ErrorNote({
  title,
  message,
  hint,
  onRetry,
  className = '',
}: {
  title?: string
  message: string
  hint?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div role="alert" className={`border-l-2 border-ember bg-ember-wash px-4 py-3.5 ${className}`}>
      <p className="flex items-center gap-2 text-[13.5px] text-paper">
        <IconAlert size={14} className="shrink-0 text-ember" />
        {title || 'That did not work'}
      </p>
      <p className="mt-1 max-w-measure text-[13px] leading-relaxed text-paper-dim">{message}</p>
      {hint && <p className="mt-1 max-w-measure text-[12.5px] leading-relaxed text-paper-faint">{hint}</p>}
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="mt-3">
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  action,
  className = '',
}: {
  title: string
  body: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`rule-t py-14 text-center ${className}`}>
      <p className="display text-[1.6rem] leading-tight text-paper">{title}</p>
      <p className="mx-auto mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-paper-faint">{body}</p>
      {action && <div className="mt-6 flex justify-center gap-2">{action}</div>}
    </div>
  )
}
