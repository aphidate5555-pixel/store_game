import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { requireAdmin, loginHref } from '@/lib/auth/require-admin'
import { Forbidden } from '../../forbidden'
import { CategoryManager, type CategoryWithCount } from './category-manager'
import { listGames } from '../products/products-data'
import { createSupabaseActionClient } from '@/lib/supabase/action'
import { t } from '@/lib/i18n/th/admin'

export const metadata: Metadata = {
  title: 'จัดการหมวดหมู่เกม',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * The counts are computed here rather than with two extra round trips per
 * category: a list of ten categories with an N+1 would issue eleven queries
 * for one page.
 */
async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const db = await createSupabaseActionClient()

  const { data, error } = await db
    .from('games')
    .select('*, products(count, status)')
    .order('position', { ascending: true })

  if (error) return []

  return ((data ?? []) as unknown as (CategoryWithCount & {
    products: { count: number; status: 'available' | 'sold' }[]
  })[]).map((game) => {
    const products = game.products ?? []
    return {
      ...game,
      product_count: products.length,
      available_count: products.filter((product) => product.status === 'available').length,
      products: undefined,
    } as unknown as CategoryWithCount
  })
}

export default async function AdminCategoriesPage() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.reason === 'no-session') redirect(loginHref('/admin/categories'))
    return <Forbidden email={undefined} />
  }

  const [categories, games] = await Promise.all([listCategoriesWithCounts(), listGames()])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-text">{t('admin.categories.title')}</h1>
        <p className="mt-1 text-sm text-text-2">{t('admin.categories.subtitle')}</p>
      </header>

      <CategoryManager categories={categories} games={games} />
    </div>
  )
}
