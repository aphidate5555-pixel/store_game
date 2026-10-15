import Link from 'next/link'

import { ProductCard } from '@/components/product/product-card'
import { getMessages } from '@/lib/i18n'
import { sectionPayload } from '@/lib/catalog/site-content'
import type { Database } from '@/lib/database.types'
import type { Variant } from '@/lib/home/variants'
import { VARIANT_CONFIG } from '@/lib/home/variants'

type ProductRow = Database['public']['Tables']['products']['Row']
type SectionRow = Database['public']['Tables']['site_sections']['Row']

/**
 * The featured shelf.
 *
 * Variant B renders it as a horizontal snap rail rather than a grid — the one
 * genuinely different layout among the three concepts. The product data, the
 * cards and the query are identical; only the wrapper changes.
 *
 * search_products does not return image rows, so the cards are rendered
 * without a cover here. The catalogue page and the product page fetch their
 * own covers. A card with no image shows a labelled placeholder rather than a
 * broken image frame.
 */
export function FeaturedProducts({
  products,
  sections,
  variant,
}: {
  products: ProductRow[]
  sections: readonly SectionRow[]
  variant: Variant
}) {
  const m = getMessages()
  const payload = sectionPayload(sections, 'featured_products')
  const config = VARIANT_CONFIG[variant]

  const title =
    typeof payload.title === 'string' && payload.title ? payload.title : m.featured.heading
  const count = typeof payload.count === 'number' ? payload.count : 8
  const shown = products.slice(0, Math.min(Math.max(count, 0), 24))

  if (shown.length === 0) return null

  const card = (product: ProductRow) => (
    <ProductCard product={product} cover={null} imageCount={0} />
  )

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <Link
          href="/products"
          className="shrink-0 text-sm text-primary underline underline-offset-4 focus-ring rounded"
        >
          {m.action.viewAll}
        </Link>
      </div>

      {config.featured.layout === 'rail' ? (
        <ul
          // A horizontally scrollable region needs a role and a label, or a
          // keyboard user has no indication that it scrolls at all.
          role="region"
          aria-label={m.featured.regionLabel}
          tabIndex={0}
          className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-none pb-2"
        >
          {shown.map((product) => (
            <li key={product.id} className="w-2/5 shrink-0 snap-start sm:w-1/3 lg:w-1/5">
              {card(product)}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {shown.map((product) => (
            <li key={product.id}>{card(product)}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
