import type { Metadata } from 'next'

import { LoginForm } from './login-form'
import { t } from '@/lib/i18n/th/admin'
import { safeAdminNext } from '@/lib/validation/url'
import { fetchSiteConfig } from '@/lib/settings/query'
import type { NextRequest } from 'next/server'

/** Never indexed: the admin area has no business in a search result. */
export const metadata: Metadata = {
  title: 'เข้าสู่ระบบผู้ดูแล',
  robots: { index: false, follow: false, nocache: true },
}

const ERROR_MESSAGE: Record<string, string> = {
  missing_code: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  invalid_code: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const sp = await searchParams

  // `next` is scoped to /admin on the way in, so a crafted link cannot use the
  // login form as an open redirect (C-6).
  const next = safeAdminNext(sp.next ?? '') ?? '/admin'
  const initialError = sp.error ? (ERROR_MESSAGE[sp.error] ?? null) : null

  // Shown on the login form, and true even during maintenance — an
  // administrator has to be able to sign in to turn it off (C-26).
  let maintenance = false
  try {
    const config = await fetchSiteConfig()
    maintenance = config.maintenanceMode
  } catch {
    maintenance = true
  }

  return (
    <main id="main" className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-line bg-surface p-6">
          <h1 className="text-lg font-semibold text-text">{t('admin.login.title')}</h1>
          <p className="mt-1 text-sm text-text-2">{t('admin.login.subtitle')}</p>

          <div className="mt-6">
            <LoginForm next={next} initialError={initialError} />
          </div>
        </div>

        {maintenance ? (
          <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2 text-center text-xs text-text-2">
            {t('admin.login.maintenanceReachable')}
          </p>
        ) : null}
      </div>
    </main>
  )
}

export type { NextRequest }
