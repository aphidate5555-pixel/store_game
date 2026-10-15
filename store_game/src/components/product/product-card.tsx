import Image from 'next/image'
import Link from 'next/link'

import { StatusBadge } from '@/components/ui/badge'
import { productMediaUrl } from '@/lib/storage/media-url'
import { formatPrice } from '@/lib/format/money'
import type { Database } from '@/lib/database.types'

type ProductRow = Database['public']['Tables']['products']['Row']
type ProductImageRow = Database['public']['Tables']['product_images']['Row']

/**
 * Every prop crossing the server/client boundary is a primitive. price_amount
 * is a bigint in the database and is formatted here, on the server, because
 * React cannot serialise a BigInt into a client payload and throws at the
 * boundary.
 */
export interface ProductCardProps {
  readonly product: ProductRow
  readonly cover: ProductImageRow | null
  readonly imageCount: number
}

export function ProductCard({ product, cover, imageCount }: ProductCardProps) {
  const href = `/products/${product.product_code}`
  const imageUrl = cover ? productMediaUrl(cover.storage_path) : null
  const price = formatPrice(product.price_amount, product.currency)

  return (
    <article className="group relative">
      <Link
        href={href}
        // The whole card is one link, so the accessible name has to name the
        // product rather than repeat every visible string.
        aria-label={`${product.name} รหัส ${product.product_code}`}
        className="focus-ring block rounded-xl"
      >
        <div className="bg-surface border border-line rounded-xl overflow-hidden transition-[border-color] duration-micro ease-out-soft group-hover:border-line-ctl group-focus-within:border-primary/40">
          <div className="relative aspect-[4/3] lg:aspect-[16/10] bg-surface-2">
            {imageUrl ? (
              <Image
                src={imageUrl}
                // The alt is the product name from the database, so it is
                // whatever the administrator typed — not a generic label.
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div aria-hidden="true" className="size-full grid place-items-center text-text-3 text-xs">
                ไม่มีรูปภาพ
              </div>
            )}

            <div className="absolute left-2 top-2">
              <StatusBadge status={product.status} size="sm" />
            </div>

            {imageCount > 1 ? (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 rounded-md bg-ink/80 px-1.5 py-0.5 text-xs text-text-2"
              >
                {imageCount}
              </span>
            ) : null}
          </div>

          <div className="p-3">
            {/* The badge is never the only place a status appears: the product
                name and the order button below carry it too. */}
            <p className="text-xs text-text-3">{product.product_code}</p>
            <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-text">{product.name}</h3>

            <p className="mt-2 text-sm font-semibold text-primary">{price}</p>

            {product.rank ? <p className="mt-0.5 text-xs text-text-3">{product.rank}</p> : null}
          </div>
        </div>
      </Link>
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
