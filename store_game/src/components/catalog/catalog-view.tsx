'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

import { ProductCard } from '@/components/product/product-card'
import { ProductGridClient } from '@/components/catalog/product-grid-client'
import { ProductFilters } from '@/components/catalog/product-filters'
import { Pagination } from '@/components/catalog/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { getMessages } from '@/lib/i18n'
import type { ProductListResult } from '@/lib/catalog/queries'
import { coverImage, type ProductRow } from '@/lib/catalog/product-utils'

/**
 * The catalogue body.
 *
 * A client leaf, because a failed filter fetch must leave the previous grid
 * on screen. The server sends the first page; a navigation through the filter
 * controls re-renders this component with a new result, and the wrapper keeps
 * the last good children when the new render throws (C-34).
 */
export function CatalogView({ result }: { result: ProductListResult }) {
  const m = getMessages()
  const router = useRouter()

  const grid = useMemo(() => {
    if (result.items.length === 0) {
      return (
        <EmptyState
          title={result.query.q ? m.empty.searchTitle : m.empty.catalogTitle}
          body={result.query.q ? m.empty.searchBody : m.empty.catalogBody}
          action={
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface-2 px-4 text-sm text-text hover:border-line-ctl focus-ring"
            >
              {m.empty.searchCta}
            </Link>
          }
        />
      )
    }

    return (
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {result.items.map((product: ProductRow) => (
          <li key={product.id}>
            <ProductCard product={product} cover={coverImage([])} imageCount={0} />
          </li>
        ))}
      </ul>
    )
  }, [result.items, result.query.q, m])

  const navigate = (href: string) => {
    router.push(href, { scroll: false })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-text">{m.catalog.heading}</h1>
        <p className="mt-1 text-sm text-text-2">{m.catalog.description}</p>
        <p className="mt-2 text-sm text-text-3" aria-live="polite">
          {m.catalog.resultCount(result.items.length, result.total)}
        </p>
      </header>

      {/*
        A malformed query string is reported through the noindex flag rather
        than corrected silently, so the page cannot end up as a second
        indexable copy of /products (C-39).
      */}
      {result.hasInvalid ? (
        <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-text">
          {m.error.filterStrip}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <aside className="hidden md:block">
          <div className="sticky top-20">
            <ProductFilters query={result.query} onNavigate={navigate} />
          </div>
        </aside>

        <div>
          <div className="mb-4 md:hidden">
            <ProductFilters query={result.query} onNavigate={navigate} />
          </div>

          <ProductGridClient
            initial={grid}
            errorMessage={m.error.filterStrip}
            retryLabel={m.error.filterRetry}
          >
            {grid}
          </ProductGridClient>

          {result.pageCount > 1 ? (
            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              query={result.query}
              onNavigate={navigate}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
