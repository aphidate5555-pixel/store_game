import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { OrderCta } from '@/components/product/order-cta'
import { StatusBadge } from '@/components/ui/badge'
import { ToastProvider } from '@/components/ui/toast'
import { ProductCard } from '@/components/product/product-card'
import { getProductDetailForBody, getProductDetailForMeta, coverImage } from '@/lib/catalog/queries'
import { fetchSiteConfig } from '@/lib/settings/query'
import { getMessages } from '@/lib/i18n'
import { formatPrice, priceValue } from '@/lib/format/money'
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
  const cover = coverImage(images)
  const sold = product.status === 'sold'

  return (
    <ToastProvider>
      <SiteHeader settings={settings} sections={config.sections} />

      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        <nav aria-label="เส้นทาง" className="mb-4 text-sm text-text-3">
          <Link href="/products" className="underline underline-offset-4 focus-ring rounded">
            {m.catalog.heading}
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <Link href={`/games/${game.slug}`} className="underline underline-offset-4 focus-ring rounded">
            {game.name}
          </Link>
        </nav>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            {cover ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface-2">
                <Image
                  src={productMediaUrl(cover.full_path) ?? ''}
                  alt={cover.alt ?? product.name}
                  fill
                  priority
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-xl border border-line bg-surface-2 text-sm text-text-3">
                ไม่มีรูปภาพ
              </div>
            )}

            {images.length > 1 ? (
              <ul className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
                {images.map((image) => (
                  <li key={image.id} className="shrink-0">
                    <div className="relative size-16 overflow-hidden rounded-lg border border-line bg-surface-2">
                      <Image
                        src={productMediaUrl(image.storage_path) ?? ''}
                        alt={image.alt ?? m.gallery.counter(image.position + 1, images.length)}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={product.status} />
              <span className="text-sm text-text-3">{product.product_code}</span>
            </div>

            <h1 className="mt-3 text-xl font-semibold text-text md:text-2xl">{product.name}</h1>

            <p className="mt-4 text-2xl font-bold text-primary">
              {formatPrice(product.price_amount, product.currency)}
            </p>

            {/*
              aria-disabled rather than disabled: a disabled button cannot be
              reached by a keyboard, so the reason a product is unavailable
              would be invisible to exactly the people most likely to want it.
            */}
            {sold ? (
              <div
                role="status"
                className="mt-6 rounded-lg border border-line bg-surface-2 p-4"
              >
                <p className="text-sm font-medium text-text">{m.product.soldNotice}</p>
                <p className="mt-1 text-sm text-text-2">{m.product.soldHint}</p>
              </div>
            ) : (
              <div className="mt-6">
                <OrderCta store={settings} productCode={product.product_code} />
              </div>
            )}

            <dl className="mt-8 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-text-3">{m.product.game}</dt>
                <dd className="text-text">
                  <Link
                    href={`/games/${game.slug}`}
                    className="underline underline-offset-4 focus-ring rounded"
                  >
                    {game.name}
                  </Link>
                </dd>
              </div>
              {product.rank ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-text-3">{m.product.rank}</dt>
                  <dd className="text-text">{product.rank}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-text-3">{m.product.heroCount}</dt>
                <dd className="text-text">{product.hero_count}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-3">{m.product.skinCount}</dt>
                <dd className="text-text">{product.skin_count}</dd>
              </div>
              {product.binding ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-text-3">{m.product.binding}</dt>
                  <dd className="text-text">
                    {product.binding === 'bound' ? m.product.bindingBound : m.product.bindingUnbound}
                  </dd>
                </div>
              ) : null}
            </dl>

            {product.description ? (
              <div className="mt-8 border-t border-line pt-6">
                <h2 className="text-sm font-semibold text-text">{m.product.description}</h2>
                {/* Administrator-authored: rendered as text, never as markup. */}
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-2">
                  {product.description}
                </p>
              </div>
            ) : null}
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
                  <ProductCard product={item} cover={null} imageCount={0} />
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
