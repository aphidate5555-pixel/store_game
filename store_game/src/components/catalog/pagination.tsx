'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { getMessages } from '@/lib/i18n'
import { buildCatalogHref, type CatalogQueryInput } from '@/lib/catalog/search-params'

/**
 * Pagination.
 *
 * A window rather than first/last/next/previous: a catalogue of any size
 * rendered as a row of page numbers overflows on a 320px screen, and the
 * current position is announced in the label instead.
 */
export function Pagination({
  page,
  pageCount,
  query,
  onNavigate,
}: {
  page: number
  pageCount: number
  query: CatalogQueryInput
  onNavigate: (href: string) => void
}) {
  const m = getMessages()

  const windowSize = 2
  const start = Math.max(1, page - windowSize)
  const end = Math.min(pageCount, page + windowSize)
  const pages: number[] = []
  for (let i = start; i <= end; i += 1) pages.push(i)

  const button =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm focus-ring'

  return (
    <nav aria-label={m.catalog.heading} className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <button
          type="button"
          onClick={() => onNavigate(buildCatalogHref(query, { page: page - 1 }))}
          className={`${button} border-line bg-surface-2 text-text hover:border-line-ctl`}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:ml-1">{m.catalog.previous}</span>
        </button>
      ) : null}

      {pages.map((value) => (
        <button
          key={value}
          type="button"
          aria-current={value === page ? 'page' : undefined}
          aria-label={`${m.catalog.page(value, pageCount)}`}
          onClick={() => onNavigate(buildCatalogHref(query, { page: value }))}
          className={[
            button,
            value === page
              ? 'border-primary bg-primary text-on-primary'
              : 'border-line bg-surface-2 text-text hover:border-line-ctl',
          ].join(' ')}
        >
          {value}
        </button>
      ))}

      {page < pageCount ? (
        <button
          type="button"
          onClick={() => onNavigate(buildCatalogHref(query, { page: page + 1 }))}
          className={`${button} border-line bg-surface-2 text-text hover:border-line-ctl`}
        >
          <span className="sr-only sm:not-sr-only sm:mr-1">{m.catalog.next}</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      ) : null}
    </nav>
  )
}
