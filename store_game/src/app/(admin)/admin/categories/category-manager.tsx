'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { formatCount } from '@/lib/format/number'
import { t } from '@/lib/i18n/th/admin'
import {
  deleteCategoryAction,
  setCategoryEnabledAction,
  reorderCategoriesAction,
  upsertCategoryAction,
  type CategoryResult,
} from './actions'
import type { Database } from '@/lib/database.types'

type GameRow = Database['public']['Tables']['games']['Row']

export interface CategoryWithCount extends GameRow {
  product_count: number
  available_count: number
}

/**
 * Category management.
 *
 * The reorder buttons are real buttons, not a drag handle alone: a drag-only
 * control is unusable with a keyboard and on a phone, and the movement is
 * announced through the aria-live region (the reorder messages in the map).
 */
export function CategoryManager({
  categories,
  games,
}: {
  categories: CategoryWithCount[]
  games: GameRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<CategoryResult | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const run = (fn: () => Promise<CategoryResult>) => {
    setResult(null)
    startTransition(async () => {
      const outcome = await fn()
      setResult(outcome)
      if (outcome.ok) router.refresh()
    })
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= categories.length) return

    const next = [...categories]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(target, 0, moved)

    setAnnouncement(
      t('admin.common.reorderMoved', {
        item: moved.name,
        from: index + 1,
        to: target + 1,
      }),
    )

    run(() => reorderCategoriesAction(next.map((game) => game.id)))
  }

  return (
    <div className="space-y-4">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {result && !result.ok ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 p-4"
        >
          <p className="text-sm text-text">{result.message}</p>
          {result.code === 'delete_blocked' ? (
            <>
              <p className="mt-2 text-sm text-text-2">
                {t('admin.categories.bulkMoveCta')}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-text-3">
                {result.products.slice(0, 8).map((product) => (
                  <li key={product.id}>
                    {product.product_code} — {product.name}
                  </li>
                ))}
              </ul>
              <BulkMoveForm
                fromGameId={editing ?? ''}
                games={games.filter((game) => game.id !== editing)}
                onDone={() => {
                  setResult(null)
                  router.refresh()
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <CategoryEditor
          category={categories.find((game) => game.id === editing) ?? null}
          onDone={() => {
            setEditing(null)
            router.refresh()
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary focus-ring"
        >
          {t('admin.categories.new')}
        </button>
      )}

      {categories.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center">
          <p className="text-sm font-medium text-text">{t('admin.categories.empty')}</p>
          <p className="mt-1 text-sm text-text-2">{t('admin.categories.emptyBody')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {categories.map((category, index) => (
            <li key={category.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">{category.name}</p>
                  <p className="mt-0.5 text-xs text-text-3">/{category.slug}</p>
                  <p className="mt-1 text-sm text-text-2">
                    {t('admin.categories.productCount', {
                      available: formatCount(category.available_count),
                      total: formatCount(category.product_count),
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    disabled={pending || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={t('admin.common.reorderUp', { item: category.name })}
                    className="grid size-11 place-items-center rounded-lg border border-line text-text-2 hover:border-line-ctl focus-ring disabled:opacity-40"
                  >
                    <ChevronUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={pending || index === categories.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={t('admin.common.reorderDown', { item: category.name })}
                    className="grid size-11 place-items-center rounded-lg border border-line text-text-2 hover:border-line-ctl focus-ring disabled:opacity-40"
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(category.id)}
                    className="min-h-11 rounded-lg border border-line px-3 text-sm text-text hover:border-line-ctl focus-ring"
                  >
                    {t('admin.common.edit')}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        setCategoryEnabledAction(category.id, !category.is_enabled),
                      )
                    }
                    className="min-h-11 rounded-lg border border-line px-3 text-sm text-text hover:border-line-ctl focus-ring disabled:opacity-50"
                  >
                    {category.is_enabled ? t('admin.common.disable') : t('admin.common.enable')}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setEditing(category.id)
                      run(() => deleteCategoryAction(category.id))
                    }}
                    className="min-h-11 rounded-lg border border-danger/40 px-3 text-sm text-danger focus-ring disabled:opacity-50"
                  >
                    {t('admin.common.delete')}
                  </button>
                </div>
              </div>

              {!category.is_enabled ? (
                <p className="mt-2 text-xs text-text-3">{t('admin.categories.fieldEnabledHint')}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-text-3">{t('admin.categories.lastOneHint')}</p>
    </div>
  )
}

function CategoryEditor({
  category,
  onDone,
}: {
  category: CategoryWithCount | null
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<CategoryResult | null>(null)

  const FIELD =
    'min-h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-base text-text focus-ring'

  return (
    <form
      action={(formData: FormData) => {
        startTransition(async () => {
          const outcome = await upsertCategoryAction(null, formData)
          setResult(outcome)
          if (outcome.ok) onDone()
        })
      }}
      className="space-y-4 rounded-xl border border-line bg-surface p-4"
    >
      <h2 className="text-base font-semibold text-text">
        {category ? t('admin.categories.edit') : t('admin.categories.new')}
      </h2>

      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      <div>
        <label htmlFor="categoryName" className="block text-sm font-medium text-text-2">
          {t('admin.categories.fieldName')}
        </label>
        <input
          id="categoryName"
          name="name"
          required
          maxLength={80}
          defaultValue={category?.name ?? ''}
          aria-describedby="categoryName-hint"
          className={`mt-1.5 ${FIELD}`}
        />
        <p id="categoryName-hint" className="mt-1.5 text-sm text-text-3">
          {t('admin.categories.fieldNameHint')}
        </p>
      </div>

      <div>
        <label htmlFor="categorySlug" className="block text-sm font-medium text-text-2">
          {t('admin.categories.fieldSlug')}
        </label>
        <input
          id="categorySlug"
          name="slug"
          required
          maxLength={80}
          defaultValue={category?.slug ?? ''}
          placeholder="mobile-legends"
          aria-describedby="categorySlug-hint"
          className={`mt-1.5 ${FIELD} font-mono`}
        />
        <p id="categorySlug-hint" className="mt-1.5 text-sm text-text-3">
          {t('admin.categories.fieldSlugHint')}
        </p>
      </div>

      <div>
        <label htmlFor="categoryDescription" className="block text-sm font-medium text-text-2">
          {t('admin.categories.fieldDescription')}
        </label>
        <textarea
          id="categoryDescription"
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={category?.description ?? ''}
          aria-describedby="categoryDescription-hint"
          className={`mt-1.5 py-2.5 ${FIELD}`}
        />
        <p id="categoryDescription-hint" className="mt-1.5 text-sm text-text-3">
          {t('admin.categories.fieldImageHint')}
        </p>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="is_enabled"
          defaultChecked={category?.is_enabled ?? true}
          aria-describedby="categoryEnabled-hint"
          className="size-5 rounded border-line"
        />
        {t('admin.categories.fieldEnabled')}
      </label>
      <p id="categoryEnabled-hint" className="text-sm text-text-3">
        {t('admin.categories.fieldEnabledHint')}
      </p>

      {result && !result.ok ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-text">
          {result.message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 flex-1 rounded-lg bg-primary text-sm font-medium text-on-primary focus-ring disabled:opacity-60"
        >
          {pending ? t('errors.save.saving') : t('admin.common.save')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 rounded-lg border border-line px-4 text-sm text-text focus-ring"
        >
          {t('admin.common.cancel')}
        </button>
      </div>
    </form>
  )
}

function BulkMoveForm({
  fromGameId,
  games,
  onDone,
}: {
  fromGameId: string
  games: GameRow[]
  onDone: () => void
}) {
  const [target, setTarget] = useState('')
  const [pending, startTransition] = useTransition()

  if (fromGameId === '' || games.length === 0) return null

  return (
    <form
      action={() => {
        startTransition(async () => {
          const { bulkMoveProductsAction } = await import('./actions')
          const outcome = await bulkMoveProductsAction(fromGameId, target)
          if (outcome.ok) onDone()
        })
      }}
      className="mt-3 flex flex-wrap items-center gap-2"
    >
      <label htmlFor="moveTarget" className="text-sm text-text-2">
        {t('admin.categories.bulkMoveTitle', { count: '' })}
      </label>
      <select
        id="moveTarget"
        value={target}
        onChange={(event) => setTarget(event.target.value)}
        className="min-h-11 rounded-lg border border-line bg-surface-2 px-3 text-base text-text focus-ring"
      >
        <option value="">{t('admin.categories.bulkMoveNoTarget')}</option>
        {games.map((game) => (
          <option key={game.id} value={game.id}>
            {game.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || target === ''}
        className="min-h-11 rounded-lg border border-line bg-surface-2 px-3 text-sm text-text focus-ring disabled:opacity-50"
      >
        {t('admin.categories.bulkMoveCta')}
      </button>
    </form>
  )
}
