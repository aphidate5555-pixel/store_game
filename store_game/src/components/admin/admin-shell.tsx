'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { LayoutDashboard, Package, FolderTree, Settings, Palette, LogOut } from 'lucide-react'

import { t } from '@/lib/i18n/th/admin'
import { signOutAdmin } from '@/lib/auth/sign-in'

/**
 * The admin shell.
 *
 * Below `lg` the sidebar becomes a fixed bottom bar. The two never overlap:
 * the save bar is z-40 and the nav is z-30, and every page in the group
 * carries `pb-28 lg:pb-8` so the content clears both. That pairing is what
 * admin-mobile.spec.ts asserts.
 */
const NAV = [
  { href: '/admin', labelKey: 'admin.common.dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', labelKey: 'admin.common.products', icon: Package, exact: false },
  { href: '/admin/categories', labelKey: 'admin.common.categories', icon: FolderTree, exact: false },
  { href: '/admin/settings', labelKey: 'admin.common.settings', icon: Settings, exact: false },
  { href: '/admin/appearance', labelKey: 'admin.common.appearance', icon: Palette, exact: false },
] as const

export function AdminShell({
  children,
  email,
  displayName,
}: {
  children: ReactNode
  email?: string
  displayName?: string
}) {
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean): boolean =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <div className="min-h-svh bg-ink">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
      >
        {t('admin.common.skipToContent')}
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link href="/admin" className="text-sm font-semibold text-text focus-ring rounded">
            {t('admin.common.dashboard')}
          </Link>
          <span className="ml-auto truncate text-sm text-text-2">{displayName ?? email}</span>
          <form action={signOutAdmin}>
            <button
              type="submit"
              aria-label={t('admin.common.exitPanel')}
              className="grid size-11 place-items-center rounded-lg text-text-2 hover:bg-surface-2 hover:text-text focus-ring"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 pb-28 lg:pb-8">
        <nav aria-label={t('admin.common.mainNav')} className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20 py-6">
            <ul className="space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href, item.exact)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm focus-ring',
                        active
                          ? 'bg-primary/12 font-medium text-primary'
                          : 'text-text-2 hover:bg-surface-2 hover:text-text',
                      ].join(' ')}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {t(item.labelKey)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        <main id="admin-main" className="min-w-0 flex-1 py-6">
          {children}
        </main>
      </div>

      {/*
        z-30 puts the bar below the sticky save bar (z-40), and the content
        padding above clears its 64px height plus the safe area.
      */}
      <nav
        aria-label={t('admin.common.mainNav')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden"
      >
        <ul className="flex h-16 items-stretch pb-[env(safe-area-inset-bottom)]">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href, item.exact)
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex h-16 min-h-11 w-full flex-col items-center justify-center gap-0.5 text-[10px] focus-ring',
                    active ? 'text-primary' : 'text-text-3',
                  ].join(' ')}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="truncate px-0.5">{t(item.labelKey)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
