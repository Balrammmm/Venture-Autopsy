import type { Metadata, Viewport } from 'next'
import { Archivo, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import '@/styles/globals.css'
import '@/styles/investigation.css'
import { themeScript } from '@/components/landing/theme/theme-script'
import { ThemeProvider } from '@/components/landing/theme/ThemeProvider'

const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const sans = Archivo({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Venture Autopsy — engineer the idea before it engineers you',
    template: '%s · Venture Autopsy',
  },
  description:
    'Take a raw business idea from thought to research to validation to launch plan. Assumptions ranked by what breaks if they are false, the cheapest way to test each one, and an honest verdict.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: 'rgb(var(--ink-800))' },
    { media: '(prefers-color-scheme: light)', color: '#F2EBDD' },
  ],
  colorScheme: 'dark light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The theme script writes data-theme before paint, so the server markup
    // and the first client render legitimately differ on this attribute.
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/*
          The theme lives at the root, not inside the landing page, so a reader
          who switches to the parchment theme and then signs in stays in it.
          Landing and product are one system or they are two products.
        */}
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[3px] focus:bg-action focus:px-4 focus:py-2 focus:text-[13px] focus:font-medium focus:text-action-ink"
          >
            Skip to content
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
