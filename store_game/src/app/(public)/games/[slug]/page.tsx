import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { ProductCard } from '@/components/product/product-card'
import { ToastProvider } from '@/components/ui/toast'
import { EmptyState } from '@/components/ui/empty-state'
import { getGameCards, getProductList } from '@/lib/catalog/queries'
import { fetchSiteConfig } from '@/lib/settings/query'
import { getMessages } from '@/lib/i18n'
import { SITE_URL } from '@/lib/catalog/seo'
import { WhatsAppCta } from '@/components/site/whatsapp-cta'

export const dynamic = 'force-dynamic'

/**
 * One game page.
 *
 * Reuses the catalogue query with the game facet rather than a second
 * implementation, so a game page and /products?game=… can never disagree
 * about which products are buyable.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const m = getMessages()
  const games = await getGameCards(48)
  const game = games.find((entry) => entry.slug === slug)

  if (!game) {
    return { title: m.empty.gameNotFoundTitle, robots: { index: false, follow: true } }
  }

  const url = `/games/${game.slug}`
  return {
    title: m.seo.gameTitle(game.name),
    description: m.seo.gameDescription(game.name),
    alternates: {
      canonical: url,
      languages: { 'th-TH': url, 'x-default': url },
    },
    openGraph: {
      type: 'website',
      locale: 'th_TH',
      title: m.seo.gameTitle(game.name),
      description: m.seo.gameDescription(game.name),
      url: `${SITE_URL}${url}`,
    },
  }
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [config, games, result] = await Promise.all([
    fetchSiteConfig(),
    getGameCards(48),
    getProductList({ game: slug }),
  ])

  const m = getMessages()
  const game = games.find((entry) => entry.slug === slug)

  // A disabled or unknown game 404s rather than rendering an empty page that
  // looks like a game with no products.
  if (!game) notFound()

  return (
    <ToastProvider>
      <SiteHeader settings={config.settings} sections={config.sections} />

      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        <nav aria-label="เส้นทาง" className="mb-4 text-sm text-text-3">
          <Link href="/games" className="underline underline-offset-4 focus-ring rounded">
            {m.footer.games}
          </Link>
        </nav>

        <header className="overflow-hidden rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-text sm:text-2xl">{game.name}</h1>
              {game.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-2">
                  {game.description}
                </p>
              ) : null}
            </div>
            <Link
              href={`/products?game=${encodeURIComponent(game.slug)}`}
              className="inline-flex min-h-10 items-center rounded-lg border border-line-ctl bg-surface-2 px-3.5 text-xs font-medium text-text hover:border-primary/50 focus-ring"
            >
              {m.filter.open}
            </Link>
          </div>
        </header>

        <p className="mt-4 text-sm text-text-3" aria-live="polite">
          {m.catalog.resultCount(result.items.length, result.total)}
        </p>

        {result.items.length === 0 ? (
          <EmptyState
            title={m.empty.categoryAvailableTitle(game.name)}
            body={m.empty.categoryAvailableBody}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  href="/products"
                  className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface-2 px-4 text-sm text-text hover:border-line-ctl focus-ring"
                >
                  {m.empty.categoryBrowseOthers}
                </Link>
              </div>
            }
          />
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {result.items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} store={config.settings} />
              </li>
            ))}
          </ul>
        )}

        <WhatsAppCta store={config.settings} />
      </main>

      <SiteFooter settings={config.settings} sections={config.sections} />
    </ToastProvider>
  )
}
