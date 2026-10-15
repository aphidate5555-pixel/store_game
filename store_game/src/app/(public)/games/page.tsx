import type { Metadata } from 'next'

import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { CategoryGrid } from '@/components/site/category-grid'
import { ToastProvider } from '@/components/ui/toast'
import { getGameCards } from '@/lib/catalog/queries'
import { fetchSiteConfig } from '@/lib/settings/query'
import { getMessages } from '@/lib/i18n'
import { SITE_URL } from '@/lib/catalog/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const m = getMessages()
  return {
    title: m.seo.gamesTitle,
    description: m.seo.gamesDescription,
    alternates: {
      canonical: '/games',
      languages: { 'th-TH': '/games', 'x-default': '/games' },
    },
    openGraph: {
      type: 'website',
      locale: 'th_TH',
      title: m.seo.gamesTitle,
      description: m.seo.gamesDescription,
      url: `${SITE_URL}/games`,
    },
  }
}

export default async function GamesPage() {
  const [config, games] = await Promise.all([fetchSiteConfig(), getGameCards(48)])

  return (
    <ToastProvider>
      <SiteHeader settings={config.settings} sections={config.sections} />
      <main id="main">
        <CategoryGrid games={games} sections={config.sections} />
      </main>
      <SiteFooter settings={config.settings} sections={config.sections} />
    </ToastProvider>
  )
}
