import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { requireAdmin, loginHref } from '@/lib/auth/require-admin'
import { Forbidden } from '../../forbidden'
import { AdminProductList } from './product-list'
import { listProducts, listGames } from './products-data'
import { t } from '@/lib/i18n/th/admin'

export const metadata: Metadata = {
  title: 'จัดการสินค้า',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; game?: string; status?: string }>
}) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.reason === 'no-session') redirect(loginHref('/admin/products'))
    return <Forbidden email={undefined} />
  }

  const sp = await searchParams
  const [products, games] = await Promise.all([listProducts(sp), listGames()])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">{t('admin.products.title')}</h1>
          <p className="mt-1 text-sm text-text-2">{t('admin.products.subtitle')}</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-on-primary focus-ring"
        >
          {t('admin.products.new')}
        </Link>
      </header>

      <AdminProductList products={products.products} games={games} filters={sp} />
    </div>
  )
}
