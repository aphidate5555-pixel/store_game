import 'server-only'

import { createSupabaseActionClient } from '@/lib/supabase/action'
import type { Database } from '@/lib/database.types'

type ProductRow = Database['public']['Tables']['products']['Row']
type GameRow = Database['public']['Tables']['games']['Row']

/**
 * Admin product listing.
 *
 * Not cached: this goes through the cookie-bound client and deliberately
 * includes hidden products, which the public catalogue must never see.
 */
export async function listProducts(filters: {
  q?: string
  game?: string
  status?: string
}): Promise<{ products: ProductRow[]; total: number }> {
  const db = await createSupabaseActionClient()

  let query = db
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.game) {
    // Resolved through the slug, which is what the URL carries.
    const { data: game } = await db
      .from('games')
      .select('id')
      .eq('slug', filters.game)
      .maybeSingle()
    if (game) query = query.eq('game_id', game.id)
  }

  if (filters.status === 'available' || filters.status === 'sold') {
    query = query.eq('status', filters.status)
  }

  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim().toLowerCase().replace(/[!%_]/g, (c) => `!${c}`)}%`
    query = query.ilike('search_text', term)
  }

  const { data, count, error } = await query
  if (error) return { products: [], total: 0 }

  return { products: (data ?? []) as ProductRow[], total: count ?? 0 }
}

export async function listGames(): Promise<GameRow[]> {
  const db = await createSupabaseActionClient()
  const { data, error } = await db.from('games').select('*').order('position', { ascending: true })
  if (error) return []
  return (data ?? []) as GameRow[]
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const db = await createSupabaseActionClient()
  const { data, error } = await db.from('products').select('*').eq('id', id).maybeSingle()
  if (error) return null
  return data as ProductRow | null
}
