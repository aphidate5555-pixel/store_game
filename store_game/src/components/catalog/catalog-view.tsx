'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Search, X } from 'lucide-react'

import { ProductCard } from '@/components/product/product-card'
import { ProductGridClient } from '@/components/catalog/product-grid-client'
import { ProductFilters } from '@/components/catalog/product-filters'
import { Pagination } from '@/components/catalog/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { getMessages } from '@/lib/i18n'
import { buildCatalogHref } from '@/lib/catalog/search-params'
import type { ProductListResult } from '@/lib/catalog/queries'
import type { EnrichedProduct, GameCard } from '@/lib/catalog/product-utils'
import type { WhatsAppStore } from '@/lib/catalog/whatsapp'

/**
 * The catalogue body.
 *
 * Includes a live search bar (by product code, product name, or game name),
 * category filter pills, sidebar/sheet filters, loading transition feedback,
 * and empty/error states.
 */
export function CatalogView({
  result,
  games = [],
  store,
}: {
  result: ProductListResult
  games?: readonly GameCard[]
  store?: WhatsAppStore | null
}) {
  const m = getMessages()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(result.query.q ?? '')

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href, { scroll: false })
    })
  }

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchInput.trim()
    navigate(buildCatalogHref(result.query, { q: trimmed || undefined, page: 1 }))
  }

  const handleClearSearch = () => {
    setSearchInput('')
    navigate(buildCatalogHref(result.query, { q: undefined, page: 1 }))
  }

  const grid = useMemo(() => {
    if (result.items.length === 0) {
      return (
        <EmptyState
          title={result.query.q || result.query.game ? m.empty.searchTitle : m.empty.catalogTitle}
          body={result.query.q || result.query.game ? m.empty.searchBody : m.empty.catalogBody}
          action={
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                navigate('/products')
              }}
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface-2 px-4 text-sm font-medium text-text hover:border-line-ctl focus-ring"
            >
              {m.filter.clear}
            </button>
          }
        />
      )
    }

    return (
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {result.items.map((product: EnrichedProduct) => (
          <li key={product.id}>
            <ProductCard product={product} store={store} />
          </li>
        ))}
      </ul>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.items, result.query.q, result.query.game, store, m])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-text sm:text-2xl">{m.catalog.heading}</h1>
            <p className="mt-1 text-sm text-text-2">{m.catalog.description}</p>
          </div>
          <p className="text-sm font-medium text-text-3" aria-live="polite">
            {isPending
              ? m.states.loadingProducts
              : m.catalog.resultCount(result.items.length, result.total)}
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} role="search" className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={m.search.placeholder}
              aria-label={m.search.label}
              className="min-h-11 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-9 text-sm text-text placeholder:text-text-3 focus-ring"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label={m.search.clear}
                className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-text-3 hover:bg-surface-3 hover:text-text focus-ring"
              >
                <X size={15} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:brightness-95 focus-ring"
          >
            {m.search.submit}
          </button>
        </form>
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

      <div className="grid gap-6 md:grid-cols-[17rem_1fr]">
        <aside className="hidden md:block">
          <div className="sticky top-20">
            <ProductFilters query={result.query} games={games} onNavigate={navigate} />
          </div>
        </aside>

        <div>
          <div className="mb-4 md:hidden">
            <ProductFilters query={result.query} games={games} onNavigate={navigate} />
          </div>

          <div className={isPending ? 'opacity-60 transition-opacity' : ''}>
            <ProductGridClient
              initial={grid}
              errorMessage={m.error.filterStrip}
              retryLabel={m.error.filterRetry}
            >
              {grid}
            </ProductGridClient>
          </div>

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
