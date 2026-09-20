'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button, IconLogout, IconSettings } from '@/components/ui/kit'
import { BrandMark } from '@/components/brand/BrandMark'
import { ThemeToggle } from '@/components/landing/ui/LandingChrome'
import { post } from '@/lib/client'

export interface SessionUser {
  id: string
  name: string
  email: string
  onboarded: boolean
}

/** Chrome shared by every signed-in page. */
export function AppShell({
  children,
  user,
  breadcrumb,
  actions,
  wide,
}: {
  children: React.ReactNode
  user: SessionUser | null
  breadcrumb?: React.ReactNode
  actions?: React.ReactNode
  wide?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)
  const ventureId = pathname.match(/^\/venture\/([^/]+)/)?.[1]
  const caseRoutes = [['', 'Investigation', 'The diagnosis & anatomy'], ['/research', 'Market intelligence', 'Sources, signals & gaps'], ['/validate', 'Validation lab', 'Turn uncertainty into proof'], ['/strategy', 'Strategy room', 'Model the way forward'], ['/report', 'Case report', 'The complete record']]

  async function signOut() {
    setSigningOut(true)
    try {
      await post('/api/auth/logout')
      router.push('/')
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className={`${ventureId ? 'case-shell' : 'grain'} relative min-h-screen bg-ink-800`}>
      <div className="grid-field pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />

      <header className="no-print sticky top-0 z-40 border-b border-[color:var(--rule)] bg-[rgb(var(--ink-800)/0.85)] backdrop-blur-xl">
        <div className={`mx-auto flex items-center justify-between gap-4 px-4 py-3 md:px-8 ${wide ? 'max-w-[1700px]' : 'max-w-[1500px]'}`}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <BrandMark href="/ventures" compact className="shrink-0" />
            {breadcrumb && (
              <>
                <span aria-hidden="true" className="hidden shrink-0 text-paper-sub sm:inline">
                  /
                </span>
                <div className="hidden min-w-0 flex-1 sm:block">{breadcrumb}</div>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {actions}
            <ThemeToggle className="mr-1 hidden sm:inline-flex" />
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={pathname === '/settings' ? 'page' : undefined}
              className="tap inline-flex items-center justify-center rounded-[3px] px-2.5 py-2 text-paper-dim transition-colors duration-150 hover:bg-[rgb(var(--paper)/0.05)] hover:text-paper"
            >
              <IconSettings size={15} />
            </Link>
            {user && (
              <Button variant="quiet" size="sm" onClick={signOut} disabled={signingOut} aria-label="Sign out">
                <IconLogout size={14} />
                <span className="hidden sm:inline">{signingOut ? 'Signing out' : 'Sign out'}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {ventureId && <aside className="case-sidebar no-print"><Link href="/ventures" className="case-back">← All ventures</Link><p className="micro">THE INVESTIGATION</p><nav aria-label="Case navigation">{caseRoutes.map(([suffix, label, desc], i) => <Link key={suffix} href={`/venture/${ventureId}${suffix}`} aria-current={pathname === `/venture/${ventureId}${suffix}` ? 'page' : undefined}><span className="case-nav-number">0{i + 1}</span><span>{label}<small>{desc}</small></span></Link>)}</nav><div className="sidebar-note"><span className="status-dot" /><span>Evidence before conviction.<small>Your private venture laboratory.</small></span></div></aside>}
      <main id="main" className={`relative mx-auto px-4 md:px-8 ${wide ? 'max-w-[1700px]' : 'max-w-[1500px]'}`}>
        {children}
      </main>
    </div>
  )
}

/** Redirects to onboarding when there is no session. */
export function useSession() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d: { user: SessionUser | null }) => {
        if (!alive) return
        if (!d.user) {
          router.replace('/onboarding')
          return
        }
        setUser(d.user)
      })
      .catch(() => {
        if (alive) router.replace('/onboarding')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [router])

  return { user, loading }
}
