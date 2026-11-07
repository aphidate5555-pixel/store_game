import Link from 'next/link'
import { Eye, MessageCircle, Shield, Sparkles, Trophy } from 'lucide-react'

import { StatusBadge } from '@/components/ui/badge'
import { ImageWithFallback, ProductArtworkFallback } from '@/components/ui/image-with-fallback'
import { productMediaUrl } from '@/lib/storage/media-url'
import { formatCodePrice, formatPrice, getProductPrices } from '@/lib/format/money'
import { safeWhatsAppUrl, type WhatsAppStore } from '@/lib/catalog/whatsapp'
import { getMessages } from '@/lib/i18n'
import type { EnrichedProduct, ProductImageRow } from '@/lib/catalog/product-utils'

/**
 * Every prop crossing the server/client boundary is a primitive or plain object.
 * Dual prices (`LAK` and `THB`) are resolved and formatted without automatic
 * currency conversion.
 */
export interface ProductCardProps {
  readonly product: EnrichedProduct
  readonly cover?: ProductImageRow | null
  readonly imageCount?: number
  readonly store?: WhatsAppStore | null
}

export function ProductCard({
  product,
  cover,
  imageCount,
  store,
}: ProductCardProps) {
  const m = getMessages()
  const href = `/products/${product.product_code}`

  const resolvedCover = cover !== undefined ? cover : (product.cover ?? null)
  const resolvedCount = imageCount !== undefined ? imageCount : (product.image_count ?? 0)
  const gameName = product.game_name ?? null

  const imageUrl = resolvedCover ? productMediaUrl(resolvedCover.storage_path) : null
  const prices = getProductPrices(product)
  const primaryFormatted = formatPrice(product.price_amount, product.currency)

  const isSold = product.status === 'sold'
  const waHref = !isSold && store ? safeWhatsAppUrl(store, product.product_code, product.name) : null

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-[border-color,transform] duration-micro ease-out-soft hover:-translate-y-0.5 hover:border-primary/50 focus-within:border-primary/60">
      <Link
        href={href}
        aria-label={`${product.name} รหัส ${product.product_code}`}
        className="focus-ring block"
      >
        <div className="relative aspect-[4/3] lg:aspect-[16/10] overflow-hidden bg-surface-2">
          <ImageWithFallback
            src={imageUrl}
            alt={product.name}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            fallback={<ProductArtworkFallback code={product.product_code} gameName={gameName} />}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent"
          />

          <div className="absolute left-2.5 top-2.5">
            <StatusBadge status={product.status} size="sm" />
          </div>

          {resolvedCount > 1 ? (
            <span
              aria-hidden="true"
              className="absolute right-2.5 top-2.5 rounded-md border border-line bg-ink/85 px-1.5 py-0.5 text-[11px] font-medium text-text-2 backdrop-blur-xs"
            >
              {resolvedCount}
            </span>
          ) : null}

          {gameName ? (
            <span className="absolute bottom-2 left-2.5 max-w-[85%] truncate rounded-md border border-line/80 bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-accent backdrop-blur-xs">
              {gameName}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-mono text-xs font-medium text-text-3">
              {product.product_code}
            </p>
            {product.rank ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-accent/12 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                <Trophy size={10} aria-hidden="true" />
                {product.rank}
              </span>
            ) : null}
          </div>

          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-text group-hover:text-primary">
            <Link href={href} className="focus-ring rounded">
              {product.name}
            </Link>
          </h3>

          {/* Key account highlights */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-3">
            {product.hero_count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Sparkles size={11} className="text-primary" aria-hidden="true" />
                {m.product.heroCount} {product.hero_count}
              </span>
            ) : null}
            {product.skin_count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Shield size={11} className="text-accent" aria-hidden="true" />
                {m.product.skinCount} {product.skin_count}
              </span>
            ) : null}
          </div>

          {/* Dual-Currency Pricing Box (THB & LAK) */}
          <div className="mt-3 space-y-1 rounded-lg border border-line bg-surface-2/80 p-2">
            {prices.thb !== null ? (
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[11px] font-medium text-text-3">THB</span>
                <span className="truncate text-sm font-bold text-primary">
                  {formatCodePrice(prices.thb, 'THB')}
                </span>
              </div>
            ) : null}
            {prices.lak !== null ? (
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[11px] font-medium text-text-3">LAK</span>
                <span className="truncate text-xs font-semibold text-accent">
                  {formatCodePrice(prices.lak, 'LAK')}
                </span>
              </div>
            ) : null}
            {prices.thb === null && prices.lak === null ? (
              <p className="text-sm font-bold text-primary">{primaryFormatted}</p>
            ) : null}
          </div>
        </div>

        {/* Action buttons: View Details + WhatsApp Order */}
        <div className="mt-3 flex flex-col gap-1.5 sm:flex-row">
          <Link
            href={href}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line-ctl bg-surface-2 px-2.5 text-xs font-medium text-text transition-colors duration-micro hover:border-primary/50 hover:bg-surface-3 focus-ring"
          >
            <Eye size={13} aria-hidden="true" />
            <span className="truncate">{m.action.viewDetails}</span>
          </Link>

          {!isSold ? (
            waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${m.product.whatsappOrder} ${product.product_code}`}
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-semibold text-on-primary transition-[background-color,filter] duration-micro hover:brightness-95 focus-ring"
              >
                <MessageCircle size={13} aria-hidden="true" />
                <span className="truncate">WhatsApp</span>
              </a>
            ) : (
              <Link
                href={href}
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-semibold text-on-primary transition-[background-color,filter] duration-micro hover:brightness-95 focus-ring"
              >
                <MessageCircle size={13} aria-hidden="true" />
                <span className="truncate">{m.action.orderNow}</span>
              </Link>
            )
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-line bg-surface-2/50 px-2.5 text-xs font-medium text-text-3"
            >
              {m.status.sold}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

/** The cover is position 0 (F-05). */
export function coverOf(images: readonly ProductImageRow[]): ProductImageRow | null {
  for (const image of images) {
    if (image.position === 0) return image
  }
  return null
}
