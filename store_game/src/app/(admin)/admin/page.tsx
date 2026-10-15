import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { requireAdmin, loginHref } from '@/lib/auth/require-admin'
import { Forbidden } from '../forbidden'
import { getDashboardStats, getRecentProducts } from './dashboard-data'
import { fetchSiteConfig } from '@/lib/settings/query'
import { t } from '@/lib/i18n/th/admin'
import { formatCount, formatDateTime } from '@/lib/format/number'
import { StatusBadge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'แดชบอร์ด',
  robots: { index: false, follow: false },
}

export default async function AdminDashboardPage() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    if (auth.reason === 'no-session') redirect(loginHref('/admin'))
    return <Forbidden email={undefined} />
  }

  const [stats, recent, config] = await Promise.all([
    getDashboardStats(),
    getRecentProducts(8),
    fetchSiteConfig(),
  ])

  const name =
    typeof auth.user.user_metadata?.full_name === 'string' && auth.user.user_metadata.full_name
      ? auth.user.user_metadata.full_name
      : null

  const cards = stats
    ? [
        { label: t('admin.dashboard.statProducts'), value: stats.products_total, hint: t('admin.dashboard.statProductsHint') },
        { label: t('admin.dashboard.statAvailable'), value: stats.products_available, hint: t('admin.dashboard.statAvailableHint') },
        { label: t('admin.dashboard.statSold'), value: stats.products_sold, hint: t('admin.dashboard.statSoldHint') },
        { label: t('admin.dashboard.statCategories'), value: stats.categories_enabled, hint: t('admin.dashboard.statCategoriesHint') },
      ]
    : []

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-text">
          {name ? t('admin.dashboard.greeting', { name }) : t('admin.dashboard.greetingFallback')}
        </h1>
        <p className="mt-1 text-sm text-text-2">{t('admin.dashboard.subtitle')}</p>
      </header>

      <p
        className={[
          'rounded-lg border px-4 py-3 text-sm',
          config.maintenanceMode
            ? 'border-warning/40 bg-warning/10 text-text'
            : 'border-line bg-surface text-text-2',
        ].join(' ')}
      >
        {config.maintenanceMode
          ? t('admin.dashboard.maintenanceOn')
          : t('admin.dashboard.maintenanceOff')}
      </p>

      {stats === null ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-text">
          {t('admin.dashboard.statsError')}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <li key={card.label} className="rounded-xl border border-line bg-surface p-4">
              <p className="text-sm text-text-2">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-text">{formatCount(card.value)}</p>
              <p className="mt-1 text-xs text-text-3">{card.hint}</p>
            </li>
          ))}
        </ul>
      )}

      {/*
        Stated plainly, because the counter above looks like a revenue figure
        and it is not: nothing records an order.
      */}
      <p className="text-xs text-text-3">{t('admin.dashboard.noSalesData')}</p>

      <section>
        <h2 className="text-base font-semibold text-text">{t('admin.dashboard.quickActions')}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {[
            { href: '/admin/products', label: t('admin.dashboard.quickAddProduct') },
            { href: '/admin/categories', label: t('admin.dashboard.quickAddCategory') },
            { href: '/admin/settings', label: t('admin.dashboard.quickSettings') },
            { href: '/admin/appearance', label: t('admin.dashboard.quickAppearance') },
          ].map((action) => (
            <li key={action.href}>
              <Link
                href={action.href}
                className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface-2 px-4 text-sm text-text hover:border-line-ctl focus-ring"
              >
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-text">{t('admin.dashboard.recentAdded')}</h2>

        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-text-3">{t('admin.dashboard.recentEmpty')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-text-3">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t('admin.products.columnCode')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t('admin.products.columnName')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t('admin.products.columnStatus')}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t('admin.products.columnUpdated')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((product) => (
                  <tr key={product.id} className="border-b border-line/60">
                    <td className="py-2 pr-4 text-text-3">{product.product_code}</td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-text underline underline-offset-4 focus-ring rounded"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={product.status} size="sm" />
                    </td>
                    <td className="py-2 text-text-3">{formatDateTime(product.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
