import type { Metadata } from 'next'

import { CatalogView } from '@/components/catalog/catalog-view'
import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { ToastProvider } from '@/components/ui/toast'
import { getProductList } from '@/lib/catalog/queries'
import { fetchSiteConfig } from '@/lib/settings/query'
import { getMessages } from '@/lib/i18n'
import { SITE_URL } from '@/lib/catalog/seo'
import type { RawSearchParams } from '@/lib/catalog/search-params'

export const dynamic = 'force-dynamic'

/**
 * Facet URLs are noindex.
 *
 * /products?currency=LAK&min=100 is the same catalogue as /products with
 * different filters. Letting them be indexed is how one shop ends up with
 * hundreds of thin pages competing against each other, and against the
 * canonical page they are supposed to reinforce.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}): Promise<Metadata> {
  const sp = await searchParams
  const m = getMessages()
  const isFacet = Object.keys(sp ?? {}).length > 0

  return {
    title: m.catalog.heading,
    description: m.catalog.description,
    alternates: {
      canonical: '/products',
      languages: { 'th-TH': '/products', 'x-default': '/products' },
    },
    openGraph: {
      type: 'website',
      locale: 'th_TH',
      title: m.catalog.heading,
      description: m.catalog.description,
      url: `${SITE_URL}/products`,
    },
    robots: isFacet ? { index: false, follow: true } : { index: true, follow: true },
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const [sp, config] = await Promise.all([searchParams, fetchSiteConfig()])
  const result = await getProductList(sp)

  return (
    <ToastProvider>
      <SiteHeader settings={config.settings} sections={config.sections} />
      <main id="main">
        <CatalogView result={result} />
      </main>
      <SiteFooter settings={config.settings} sections={config.sections} />
    </ToastProvider>
  )
}
