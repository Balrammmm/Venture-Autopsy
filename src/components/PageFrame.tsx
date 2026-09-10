import Link from 'next/link'
import { BrandMark } from '@/components/brand/BrandMark'

/**
 * The frame for standing pages — privacy, terms, contact. Same chrome and
 * measure as the product, without the app shell's session requirements.
 */
export function PageFrame({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string
  title: string
  lede?: string
  children: React.ReactNode
}) {
  return (
    <div className="grain relative min-h-screen bg-ink-800">
      <div className="grid-field pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

      <header className="relative border-b border-[color:var(--rule)]">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-5 py-5 md:px-8">
          <BrandMark href="/" compact />
          <Link
            href="/"
            className="tap inline-flex items-center text-[13px] text-paper-dim transition-colors duration-150 hover:text-action-text"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main id="main" className="relative mx-auto max-w-[900px] px-5 py-14 md:px-8 md:py-20">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-action-text">{eyebrow}</p>
        <h1 className="display mt-4 text-[clamp(2.2rem,5vw,3.2rem)] leading-[1.04] tracking-display text-paper">
          {title}
        </h1>
        {lede && <p className="mt-5 max-w-[58ch] text-[16px] leading-[1.72] text-paper-dim">{lede}</p>}

        <div className="mt-12 max-w-[68ch] space-y-9">{children}</div>
      </main>

      <footer className="relative border-t border-[color:var(--rule)]">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-x-7 gap-y-3 px-5 py-8 md:px-8">
          {[
            ['Privacy', '/privacy'],
            ['Terms', '/terms'],
            ['Contact', '/contact'],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="tap inline-flex items-center text-[13px] text-paper-faint transition-colors duration-150 hover:text-action-text"
            >
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-paper">{heading}</h2>
      <div className="mt-3 space-y-3 text-[14.5px] leading-[1.75] text-paper-dim">{children}</div>
    </section>
  )
}
