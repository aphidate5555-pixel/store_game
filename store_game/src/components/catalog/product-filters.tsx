'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { getMessages } from '@/lib/i18n'
import { buildCatalogHref, CURRENCIES, SORT_KEYS, type CatalogQueryInput } from '@/lib/catalog/search-params'

type FilterKey = keyof ReturnType<typeof getMessages>['filter']

const SORT_LABEL: Record<(typeof SORT_KEYS)[number], TextFilterKey> = {
  newest: 'sortNewest',
  oldest: 'sortOldest',
  price_asc: 'sortPriceAsc',
  price_desc: 'sortPriceDesc',
}

const CURRENCY_LABEL: Record<(typeof CURRENCIES)[number], TextFilterKey> = {
  THB: 'currencyThb',
  LAK: 'currencyLak',
}

/**
 * Reads a label that is known to be a string.
 *
 * The filter group also holds functions (openWithCount), so indexing it with
 * a key union widens to `string | fn`. Narrowing here keeps the call sites
 * free of casts and turns a wrong key into a compile error above rather than
 * a function rendered into the DOM.
 */
type TextFilterKey = {
  [K in FilterKey]: ReturnType<typeof getMessages>['filter'][K] extends (...args: never[]) => string
    ? never
    : K
}[FilterKey]

function filterText(messages: ReturnType<typeof getMessages>, key: TextFilterKey): string {
  return messages.filter[key] as string
}

/**
 * Filter controls.
 *
 * The URL is the only state: every control navigates rather than filtering in
 * place, so the view is shareable, the back button works, and a crawler sees
 * the same page a visitor does.
 */
export function ProductFilters({
  query,
  onNavigate,
}: {
  query: CatalogQueryInput
  onNavigate: (href: string) => void
}) {
  const m = getMessages()
  const [open, setOpen] = useState(false)

  const activeCount =
    (query.game ? 1 : 0) +
    (query.status ? 1 : 0) +
    (query.min !== undefined ? 1 : 0) +
    (query.max !== undefined ? 1 : 0) +
    (query.sort !== 'newest' ? 1 : 0) +
    (query.currency !== 'THB' ? 1 : 0)

  const panel = (
    <div className="space-y-5">
      <fieldset>
        <legend className="text-sm font-medium text-text-2">{m.filter.currency}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CURRENCIES.map((currency) => (
            <button
              key={currency}
              type="button"
              aria-pressed={query.currency === currency}
              onClick={() => onNavigate(buildCatalogHref(query, { currency, page: 1 }))}
              className={[
                'min-h-11 rounded-lg border px-3 text-sm focus-ring',
                query.currency === currency
                  ? 'border-primary bg-primary/12 text-primary'
                  : 'border-line bg-surface-2 text-text-2 hover:border-line-ctl',
              ].join(' ')}
            >
              {m.filter.currencyThb === '' ? '' : filterText(m, CURRENCY_LABEL[currency])}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-text-3">{m.filter.currencyNote}</p>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-text-2">{m.filter.status}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['available', 'sold'] as const).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={query.status === status}
              onClick={() =>
                onNavigate(buildCatalogHref(query, { status: query.status === status ? undefined : status, page: 1 }))
              }
              className={[
                'min-h-11 rounded-lg border px-3 text-sm focus-ring',
                query.status === status
                  ? 'border-primary bg-primary/12 text-primary'
                  : 'border-line bg-surface-2 text-text-2 hover:border-line-ctl',
              ].join(' ')}
            >
              {status === 'available' ? m.filter.statusAvailable : m.filter.statusSold}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-text-2">{m.filter.priceRange}</legend>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={m.filter.minPrice}
            aria-label={m.filter.minPrice}
            defaultValue={query.min ?? ''}
            onBlur={(event) => {
              const raw = event.target.value
              const value = raw === '' ? undefined : Number(raw)
              onNavigate(buildCatalogHref(query, { min: value, page: 1 }))
            }}
            className="min-h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-base text-text focus-ring"
          />
          <span aria-hidden="true" className="text-text-3">
            –
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={m.filter.maxPrice}
            aria-label={m.filter.maxPrice}
            defaultValue={query.max ?? ''}
            onBlur={(event) => {
              const raw = event.target.value
              const value = raw === '' ? undefined : Number(raw)
              onNavigate(buildCatalogHref(query, { max: value, page: 1 }))
            }}
            className="min-h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-base text-text focus-ring"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-text-2">{m.filter.sort}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SORT_KEYS.map((sort) => (
            <button
              key={sort}
              type="button"
              aria-pressed={query.sort === sort}
              onClick={() => onNavigate(buildCatalogHref(query, { sort, page: 1 }))}
              className={[
                'min-h-11 rounded-lg border px-3 text-sm focus-ring',
                query.sort === sort
                  ? 'border-primary bg-primary/12 text-primary'
                  : 'border-line bg-surface-2 text-text-2 hover:border-line-ctl',
              ].join(' ')}
            >
              {filterText(m, SORT_LABEL[sort])}
            </button>
          ))}
        </div>
      </fieldset>

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={() => onNavigate('/products')}
          className="min-h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-text hover:border-line-ctl focus-ring"
        >
          {m.filter.clear}
        </button>
      ) : null}
    </div>
  )

  return (
    <>
      {/* Desktop: a sticky sidebar. */}
      <div className="hidden md:block">{panel}</div>

      {/* Mobile: a bottom sheet, because a long filter form does not fit a
          dropdown on a phone. */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="filter-sheet"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 px-4 text-sm text-text focus-ring"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          {activeCount > 0 ? m.filter.openWithCount(activeCount) : m.filter.open}
        </button>

        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          title={m.filter.open}
          labelledBy="filter-sheet"
          footer={
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-12 w-full rounded-lg bg-primary text-base font-medium text-on-primary focus-ring"
            >
              {m.filter.apply}
            </button>
          }
        >
          {panel}
        </BottomSheet>
      </div>
    </>
  )
}
