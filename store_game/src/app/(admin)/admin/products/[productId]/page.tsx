import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { requireAdmin, loginHref } from '@/lib/auth/require-admin'
import { Forbidden } from '../../../forbidden'
import { ProductForm } from '../product-form'
import { getProduct, listGames } from '../products-data'
import { t } from '@/lib/i18n/th/admin'
import type { Database } from '@/lib/database.types'

export const metadata: Metadata = {
  title: 'แก้ไขสินค้า',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const isNew = (value: string): boolean => value === 'new'

export default async function ProductFormPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params

  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.reason === 'no-session') redirect(loginHref(`/admin/products/${productId}`))
    return <Forbidden email={undefined} />
  }

  const creating = isNew(productId)
  const [product, games] = await Promise.all([
    creating ? Promise.resolve(null) : getProduct(productId),
    listGames(),
  ])

  // A missing id is a 404 rather than a redirect: the URL was wrong, not the
  // session.
  if (!creating && !product) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text">
        {creating ? t('admin.products.new') : t('admin.products.edit')}
      </h1>

      <ProductForm
        product={product as Database['public']['Tables']['products']['Row'] | null}
        games={games}
      />
    </div>
  )
}
