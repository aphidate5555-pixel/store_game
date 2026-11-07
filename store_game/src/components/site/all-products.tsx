import Link from 'next/link'

import { ProductCard } from '@/components/product/product-card'
import { getMessages } from '@/lib/i18n'
import { sectionPayload } from '@/lib/catalog/site-content'
import type { EnrichedProduct } from '@/lib/catalog/product-utils'
import type { WhatsAppStore } from '@/lib/catalog/whatsapp'
import type { Database } from '@/lib/database.types'

type SectionRow = Database['public']['Tables']['site_sections']['Row']

/**
 * The "everything else" block on the homepage.
 *
 * per_page is clamped here as well as in the Server Action: the payload comes
 * from the database and could hold a value written before a limit existed.
 */
export function AllProducts({
  products,
  sections,
  store,
}: {
  products: EnrichedProduct[]
  sections: readonly SectionRow[]
  store?: WhatsAppStore | null
}) {
  const m = getMessages()
  const payload = sectionPayload(sections, 'all_products')
  const perPage = typeof payload.per_page === 'number' ? payload.per_page : 16

  const limit = Math.min(Math.max(perPage, 4), 48)
  const shown = products.slice(0, limit)
  if (shown.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-text">{m.allProducts.heading}</h2>
        <Link
          href="/products"
          className="shrink-0 text-sm text-primary underline underline-offset-4 focus-ring rounded"
        >
          {m.action.viewAll}
        </Link>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {shown.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} store={store} />
          </li>
        ))}
      </ul>
    </section>
  )
}
