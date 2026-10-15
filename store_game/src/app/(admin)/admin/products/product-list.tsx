'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { StatusBadge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/format/money'
import { formatCount, formatDateTime } from '@/lib/format/number'
import { t } from '@/lib/i18n/th/admin'
import { setProductStatusAction, deleteProductAction } from './actions'
import type { Database } from '@/lib/database.types'

type ProductRow = Database['public']['Tables']['products']['Row']
type GameRow = Database['public']['Tables']['games']['Row']

/**
 * The product table.
 *
 * Below `md` it becomes a card list: a six-column table on a 375px screen
 * either scrolls sideways or squeezes every cell to unreadable widths, and
 * the product code and name are what matter on a phone.
 */
export function AdminProductList({
  products,
  games,
  filters,
}: {
  products: ProductRow[]
  games: GameRow[]
  filters: { q?: string; game?: string; status?: string }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const gameName = new Map(games.map((game) => [game.id, game.name]))

  const applyStatus = (product: ProductRow, status: 'available' | 'sold') => {
    setError(null)
    startTransition(async () => {
      const result = await setProductStatusAction(product.id, product.product_code, status)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.refresh()
    })
  }

  const remove = (product: ProductRow) => {
    if (!window.confirm(t('admin.products.deleteConfirmBody', { productId: product.product_code }))) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await deleteProductAction(product.id)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <form action="/admin/products" className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={filters.q ?? ''}
          placeholder={t('admin.products.searchPlaceholder')}
          aria-label={t('admin.products.searchPlaceholder')}
          className="min-h-11 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-base text-text focus-ring"
        />
        <select
          name="game"
          defaultValue={filters.game ?? ''}
          aria-label={t('admin.products.filterGame')}
          className="min-h-11 rounded-lg border border-line bg-surface-2 px-3 text-base text-text focus-ring"
        >
          <option value="">{t('admin.products.filterGame')}</option>
          {games.map((game) => (
            <option key={game.id} value={game.slug}>
              {game.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filters.status ?? ''}
          aria-label={t('admin.products.filterStatus')}
          className="min-h-11 rounded-lg border border-line bg-surface-2 px-3 text-base text-text focus-ring"
        >
          <option value="">{t('admin.products.filterStatus')}</option>
          <option value="available">{t('admin.products.statusAvailable')}</option>
          <option value="sold">{t('admin.products.statusSold')}</option>
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-line bg-surface-2 px-4 text-sm text-text hover:border-line-ctl focus-ring"
        >
          {t('admin.common.save')}
        </button>
      </form>

      <p className="text-sm text-text-3" aria-live="polite">
        {t('admin.products.resultCount', {
          count: formatCount(products.length),
          total: formatCount(products.length),
        })}
      </p>

      {error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-text">
          {error}
        </p>
      ) : null}

      {products.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center">
          <p className="text-sm font-medium text-text">{t('admin.products.empty')}</p>
          <p className="mt-1 text-sm text-text-2">{t('admin.products.emptyBody')}</p>
        </div>
      ) : (
        <>
          {/* Desktop: a table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-text-3">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t('admin.products.columnCode')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t('admin.products.columnName')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t('admin.products.columnGame')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t('admin.products.columnPrice')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t('admin.products.columnStatus')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t('admin.products.columnUpdated')}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t('admin.products.columnActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-line/60">
                    <td className="py-2 pr-4 text-text-3">{product.product_code}</td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-text underline underline-offset-4 focus-ring rounded"
                      >
                        {product.name}
                      </Link>
                      {!product.is_visible ? (
                        <span className="ml-2 text-xs text-warning">
                          {t('admin.products.visibilityHidden')}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4 text-text-2">{gameName.get(product.game_id) ?? '—'}</td>
                    <td className="py-2 pr-4 text-text">
                      {formatPrice(product.price_amount, product.currency)}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={product.status} size="sm" />
                    </td>
                    <td className="py-2 pr-4 text-text-3">{formatDateTime(product.updated_at)}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            applyStatus(product, product.status === 'available' ? 'sold' : 'available')
                          }
                          className="min-h-11 rounded-lg border border-line px-2 text-xs text-text hover:border-line-ctl focus-ring disabled:opacity-50"
                        >
                          {product.status === 'available'
                            ? t('admin.products.setSold')
                            : t('admin.products.setAvailable')}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => remove(product)}
                          className="min-h-11 rounded-lg border border-danger/40 px-2 text-xs text-danger focus-ring disabled:opacity-50"
                        >
                          {t('admin.common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: a card list with a full-width edit action. */}
          <ul className="space-y-3 md:hidden">
            {products.map((product) => (
              <li key={product.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-text-3">{product.product_code}</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-text">{product.name}</p>
                  </div>
                  <StatusBadge status={product.status} size="sm" />
                </div>

                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-3">{t('admin.products.columnGame')}</dt>
                    <dd className="truncate text-text-2">{gameName.get(product.game_id) ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-3">{t('admin.products.columnPrice')}</dt>
                    <dd className="text-text">
                      {formatPrice(product.price_amount, product.currency)}
                    </dd>
                  </div>
                  {!product.is_visible ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-text-3">{t('admin.products.columnStatus')}</dt>
                      <dd className="text-warning">{t('admin.products.visibilityHidden')}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line bg-surface-2 text-sm text-text focus-ring"
                  >
                    {t('admin.common.edit')}
                  </Link>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      applyStatus(product, product.status === 'available' ? 'sold' : 'available')
                    }
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line text-sm text-text focus-ring disabled:opacity-50"
                  >
                    {product.status === 'available'
                      ? t('admin.products.setSold')
                      : t('admin.products.setAvailable')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
