import Link from 'next/link'

/**
 * The brand mark.
 *
 * A monogram plus a two-voice wordmark, used identically on the landing page
 * and inside the product so the two read as one system.
 *
 * The symbol is a specimen hexagon — the same six-sided module shape the Atlas
 * instruments are cut from — opened along a vertical incision, with a lit node
 * at the point of entry. One half is filled and one is drawn, because the whole
 * product is about the difference between the part you have examined and the
 * part you have only assumed. On hover the halves part by a hair and the node
 * comes up: the mark performs the thing it depicts.
 *
 * The wordmark pairs Archivo for `Venture` with Instrument Serif italic for
 * `Autopsy`, the same voice-shift the landing headlines use for the word that
 * carries the meaning.
 */

export function Monogram({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Left half — examined: filled, with the section rules drawn on it. */}
      <g className="origin-center transition-transform duration-[420ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-x-[0.9px]">
        <path
          d="M14 2.6 4.3 8.3v11.4L14 25.4Z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M7.4 12.1h3.9M7.4 15.2h2.4"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>

      {/* Right half — assumed: drawn only. */}
      <g className="origin-center transition-transform duration-[420ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-[0.9px]">
        <path
          d="M14 2.6 23.7 8.3v11.4L14 25.4Z"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
          strokeDasharray="2.6 2.2"
          opacity="0.72"
        />
      </g>

      {/* The point of entry. */}
      <circle
        cx="14"
        cy="2.6"
        r="2.05"
        className="fill-action transition-[r,opacity] duration-[420ms] ease-out"
        opacity="0.9"
      />
    </svg>
  )
}

/**
 * The full lockup. `compact` drops the eyebrow for tight bars; `href` makes it
 * a link (omit inside a page that is already the destination).
 */
export function BrandMark({
  href = '/',
  compact = false,
  className = '',
}: {
  href?: string | null
  compact?: boolean
  className?: string
}) {
  const inner = (
    <>
      <Monogram size={compact ? 24 : 28} className="shrink-0 text-paper" />
      <span className="flex flex-col leading-none">
        <span className="flex items-baseline gap-[0.3em] whitespace-nowrap">
          <span
            className={`font-sans font-semibold tracking-[-0.035em] text-paper ${
              compact ? 'text-[15px]' : 'text-[17px]'
            }`}
          >
            Venture
          </span>
          <span
            className={`display italic text-paper ${compact ? 'text-[16.5px]' : 'text-[19px]'}`}
          >
            Autopsy
          </span>
        </span>
        {!compact && (
          <span className="mt-[5px] hidden font-mono text-[8.5px] uppercase tracking-[0.34em] text-paper-faint transition-colors duration-300 group-hover:text-paper-dim sm:block">
            Validation lab
          </span>
        )}
      </span>
    </>
  )

  const cls = `tap group inline-flex items-center gap-2.5 outline-offset-4 ${className}`

  if (!href) return <span className={cls}>{inner}</span>
  return (
    <Link href={href} className={cls} aria-label="Venture Autopsy — validation lab">
      {inner}
    </Link>
  )
}
