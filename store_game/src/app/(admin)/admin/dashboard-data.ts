import 'server-only'

import { createSupabaseActionClient } from '@/lib/supabase/action'
import type { Json } from '@/lib/database.types'

export interface DashboardStats {
  products_total: number
  products_available: number
  products_sold: number
  products_hidden: number
  categories_total: number
  categories_enabled: number
}

export interface RecentProduct {
  id: string
  product_code: string
  name: string
  status: 'available' | 'reserved' | 'sold'
  is_visible: boolean
  updated_at: string
  created_at: string
}

/**
 * Dashboard reads.
 *
 * Deliberately NOT cached. These go through the cookie-bound client, and
 * wrapping a function that reads cookies() in unstable_cache throws at build
 * time — and would publish one administrator's data to every visitor if it
 * did not.
 *
 * The counters come from admin_dashboard_stats_gate() rather than a count
 * query, because public.admins and public.admin_audit_log carry no SELECT
 * grant (C-33) and the roster is not something a client should be able to
 * derive anyway.
 */
export async function getDashboardStats(): Promise<DashboardStats | null> {
  const db = await createSupabaseActionClient()
  const { data, error } = await db.rpc('admin_dashboard_stats_gate')
  if (error || !data) return null

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, Json> | undefined
  if (!row || typeof row !== 'object') return null

  return {
    products_total: Number(row.products_total ?? 0),
    products_available: Number(row.products_available ?? 0),
    products_sold: Number(row.products_sold ?? 0),
    products_hidden: Number(row.products_hidden ?? 0),
    categories_total: Number(row.categories_total ?? 0),
    categories_enabled: Number(row.categories_enabled ?? 0),
  }
}

export async function getRecentProducts(limit = 8): Promise<RecentProduct[]> {
  const db = await createSupabaseActionClient()
  const { data, error } = await db
    .from('products')
    .select('id, product_code, name, status, is_visible, updated_at, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 20))

  if (error) return []
  return (data ?? []) as RecentProduct[]
}
