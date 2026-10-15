import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { requireAdmin, loginHref } from '@/lib/auth/require-admin'
import { Forbidden } from '../../forbidden'
import { AppearanceEditor } from './appearance-editor'
import { fetchSiteConfig } from '@/lib/settings/query'
import { t } from '@/lib/i18n/th/admin'

export const metadata: Metadata = {
  title: 'ปรับแต่งหน้าเว็บ',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminAppearancePage() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.reason === 'no-session') redirect(loginHref('/admin/appearance'))
    return <Forbidden email={undefined} />
  }

  const config = await fetchSiteConfig()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-text">{t('admin.appearance.title')}</h1>
        <p className="mt-1 text-sm text-text-2">{t('admin.appearance.subtitle')}</p>
      </header>

      <AppearanceEditor sections={config.sections} />
    </div>
  )
}
