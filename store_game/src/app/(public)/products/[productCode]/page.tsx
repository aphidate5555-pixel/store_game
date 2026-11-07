import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CheckCircle2, ShieldCheck } from 'lucide-react'

import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { OrderCta } from '@/components/product/order-cta'
import { ProductGallery } from '@/components/product/product-gallery'
import { StatusBadge } from '@/components/ui/badge'
import { ToastProvider } from '@/components/ui/toast'
import { ProductCard } from '@/components/product/product-card'
import { getProductDetailForBody, getProductDetailForMeta, coverImage } from '@/lib/catalog/queries'
import { fetchSiteConfig } from '@/lib/settings/query'
import { getMessages } from '@/lib/i18n'
import { formatCodePrice, formatPrice, getProductPrices, priceValue } from '@/lib/format/money'
import { productMediaUrl } from '@/lib/storage/media-url'
import { ldJson } from '@/lib/catalog/ldjson'
import { absolute, SITE_URL, storeName } from '@/lib/catalog/seo'

export const dynamic = 'force-dynamic'

/**
 * Product page.
 *
 * Two index rules, and they are not the same (C-9):
 *   is_visible = false  → noindex, follow. The page is gone.
 *   status = 'sold'     → still indexable, with OutOfStock in the structured
 *                         data, because it can come back. A noindex on every
 *                         sale would throw away the ranking and wait for a
 *                         recrawl to regain it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ productCode: string }>
}): Promise<Metadata> {
  const { productCode } = await params
  const m = getMessages()
  const detail = await getProductDetailForMeta(productCode)

  if (!detail) {
    return { title: m.product.notFoundTitle, robots: { index: false, follow: true } }
  }

  const { product, game, images } = detail
  const cover = coverImage(images)
  const image = cover ? absolute(productMediaUrl(cover.full_path)) : undefined
  const url = `/products/${product.product_code}`
  const price = formatPrice(product.price_amount, product.currency)

  const title = `${product.name} (${product.product_code}) — เกม${game.name}`
  const description = [
    product.name,
    `รหัส ${product.product_code}`,
    price,
    product.rank ?? m.product.rankUnknown,
    `${m.product.heroCount} ${product.hero_count}`,
    `${m.product.skinCount} ${product.skin_count}`,
    game.name,
    m.whatsapp.manualHint,
  ].join(' · ')

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { 'th-TH': url, 'x-default': url },
    },
    openGraph: {
      type: 'website',
      locale: 'th_TH',
      title,
      description,
      url,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: product.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    // The raw number, never the formatted one: a comma in a meta tag is
    // not a valid price.
    other: {
      'product:price:amount': priceValue(product.price_amount),
      'product:price:currency': product.currency,
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productCode: string }>
}) {
  const { productCode } = await params
  const [detail, config] = await Promise.all([
    getProductDetailForBody(productCode),
    fetchSiteConfig(),
  ])

  const m = getMessages()
  const settings = config.settings

  if (!detail) notFound()

  const { product, game, images, related } = detail
  const sold = product.status === 'sold'
  const reserved = product.status === 'reserved'
  const prices = getProductPrices(product)

  const terms = [
    m.product.termsItem1,
    m.product.termsItem2,
    m.product.termsItem3,
    m.product.termsItem4,
  ]

  return (
    <ToastProvider>
      <SiteHeader settings={settings} sections={config.sections} />

      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        <nav aria-label="เส้นทาง" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-text-3">
          <Link href="/products" className="underline underline-offset-4 hover:text-text focus-ring rounded">
            {m.catalog.heading}
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/games/${game.slug}`}
            className="underline underline-offset-4 hover:text-text focus-ring rounded"
          >
            {game.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-mono text-text-2">{product.product_code}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ProductGallery
              images={images}
              productName={product.name}
              productCode={product.product_code}
              gameName={game.name}
            />

            {product.description ? (
              <section className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <h2 className="text-base font-bold text-text">{m.product.description}</h2>
                {/* Administrator-authored: rendered as text, never as markup. */}
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-2">
                  {product.description}
                </p>
              </section>
            ) : null}

            {/* Purchase Terms & Warranty Card */}
            <section className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-accent" aria-hidden="true" />
                <h2 className="text-base font-bold text-text">{m.product.termsHeading}</h2>
              </div>
              <ul className="mt-3 space-y-2.5">
                {terms.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-text-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {settings.footer_disclaimer ? (
                <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-text-3">
                  {settings.footer_disclaimer}
                </p>
              ) : null}
            </section>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={product.status} />
                <span className="rounded-md border border-line bg-surface-2 px-2.5 py-1 font-mono text-xs font-semibold text-text-2">
                  {m.product.code}: {product.product_code}
                </span>
              </div>

              <h1 className="mt-3 text-xl font-bold leading-snug text-text md:text-2xl">
                {product.name}
              </h1>

              {/* Dual-Currency Price Display */}
              <div className="mt-5 grid gap-3 rounded-xl border border-line bg-surface-2 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-text-3">{m.product.priceThb}</p>
                  <p className="mt-1 text-xl font-bold text-primary">
                    {prices.thb !== null
                      ? formatCodePrice(prices.thb, 'THB')
                      : product.currency === 'THB'
                        ? formatPrice(product.price_amount, 'THB')
                        : m.product.priceNotSet}
                  </p>
                </div>
                <div className="border-t border-line pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  <p className="text-xs font-medium text-text-3">{m.product.priceLak}</p>
                  <p className="mt-1 text-lg font-bold text-accent">
                    {prices.lak !== null
                      ? formatCodePrice(prices.lak, 'LAK')
                      : product.currency === 'LAK'
                        ? formatPrice(product.price_amount, 'LAK')
                        : m.product.priceNotSet}
                  </p>
                </div>
              </div>

              {sold ? (
                <div
                  role="status"
                  className="mt-6 rounded-xl border border-danger/40 bg-danger/10 p-4"
                >
                  <p className="text-sm font-semibold text-danger">{m.product.soldNotice}</p>
                  <p className="mt-1 text-sm text-text-2">{m.product.soldHint}</p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {reserved ? (
                    <div
                      role="status"
                      className="rounded-xl border border-warning/40 bg-warning/10 p-3.5"
                    >
                      <p className="text-xs font-semibold text-warning">{m.product.reservedNotice}</p>
                      <p className="mt-0.5 text-xs text-text-2">{m.product.reservedHint}</p>
                    </div>
                  ) : null}
                  <OrderCta
                    store={settings}
                    productCode={product.product_code}
                    productName={product.name}
                  />
                  <p className="text-center text-xs text-text-3">{m.whatsapp.manualHint}</p>
                </div>
              )}

              <div className="mt-6 border-t border-line pt-5">
                <h2 className="text-xs font-semibold tracking-wider text-text-3 uppercase">
                  {m.product.specsHeading}
                </h2>
                <dl className="mt-3 divide-y divide-line text-sm">
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-text-3">{m.product.game}</dt>
                    <dd className="font-medium text-text">
                      <Link
                        href={`/games/${game.slug}`}
                        className="text-primary underline underline-offset-4 focus-ring rounded"
                      >
                        {game.name}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-text-3">{m.product.code}</dt>
                    <dd className="font-mono font-medium text-text">{product.product_code}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-text-3">{m.product.rank}</dt>
                    <dd className="font-medium text-accent">
                      {product.rank || m.product.rankUnknown}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-text-3">{m.product.heroCount}</dt>
                    <dd className="font-medium text-text">{product.hero_count}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-text-3">{m.product.skinCount}</dt>
                    <dd className="font-medium text-text">{product.skin_count}</dd>
                  </div>
                  {product.binding ? (
                    <div className="flex justify-between gap-4 py-2.5">
                      <dt className="text-text-3">{m.product.binding}</dt>
                      <dd className="font-medium text-text">
                        {product.binding === 'bound'
                          ? m.product.bindingBound
                          : m.product.bindingUnbound}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>
          </div>
        </div>

        <script
          type="application/ld+json"
          /* eslint-disable-next-line react/no-danger -- the single JSON-LD block; ldJson escapes <, >, & and U+2028/9 */
          dangerouslySetInnerHTML={{
            __html: ldJson({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              sku: product.product_code,
              description: product.description ?? undefined,
              category: game.name,
              image: images.map((image) => absolute(productMediaUrl(image.full_path))),
              brand: { '@type': 'Brand', name: game.name },
              offers: {
                '@type': 'Offer',
                url: `${SITE_URL}/products/${product.product_code}`,
                price: priceValue(product.price_amount),
                priceCurrency: product.currency,
                availability:
                  product.status === 'available'
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
                itemCondition: 'https://schema.org/NewCondition',
                seller: { '@type': 'Organization', name: storeName(settings) },
              },
            }),
          }}
        />

        {/*
          A sold product still links onward. Leaving the visitor on a dead
          end is what a noindex-free product page without this section becomes.
        */}
        {related.length > 0 ? (
          <section className="mt-12 border-t border-line pt-8">
            <h2 className="text-lg font-semibold text-text">{m.product.related}</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {related.map((item) => (
                <li key={item.id}>
                  <ProductCard product={item} store={settings} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <SiteFooter settings={settings} sections={config.sections} />
    </ToastProvider>
  )
}
