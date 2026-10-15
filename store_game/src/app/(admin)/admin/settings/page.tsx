import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { requireAdmin, loginHref } from '@/lib/auth/require-admin'
import { Forbidden } from '../../forbidden'
import { SettingsForm } from './settings-form'
import { fetchSiteConfig } from '@/lib/settings/query'
import { t } from '@/lib/i18n/th/admin'

export const metadata: Metadata = {
  title: 'ตั้งค่าร้าน',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.reason === 'no-session') redirect(loginHref('/admin/settings'))
    return <Forbidden email={undefined} />
  }

  const config = await fetchSiteConfig()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-text">{t('admin.settings.title')}</h1>
        <p className="mt-1 text-sm text-text-2">{t('admin.settings.subtitle')}</p>
      </header>

      <SettingsForm settings={config.settings} />
    </div>
  )
}
