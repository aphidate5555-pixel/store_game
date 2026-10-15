/**
 * The single import surface for Supabase types.
 *
 * Feature modules import from `@/lib/supabase/types` and never from
 * `@/lib/database.types` directly, so the underlying hand-written schema file
 * stays replaceable by a `supabase gen types` output later without touching a
 * single call site.
 */
import type { Database, Json } from '@/lib/database.types'

export type { Database, Json }

/** Row shape of one public table, e.g. `TableRow<'products'>`. */
export type TableRow<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Row']

/** Insert payload of one public table. */
export type TableInsert<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Insert']

/** Partial update payload of one public table. */
export type TableUpdate<TableName extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][TableName]['Update']

/** One of the three declared enums. */
export type EnumValue<EnumName extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][EnumName]

export type ProductCurrency = EnumValue<'product_currency'>
export type ProductStatus = EnumValue<'product_status'>
export type ProductBinding = EnumValue<'product_binding'>

/**
 * The row `search_products` returns, before the one-element array is unwrapped.
 *
 * Declared explicitly rather than derived: the Functions map holds
 * `{ Args, Returns }` objects, not callables, so ReturnType would not apply
 * even if the shape were right (F-01).
 */
export interface SearchProductsResult {
  items: Database['public']['Tables']['products']['Row'][]
  total: number
}

/**
 * Narrowing helper for a value that came back from a jsonb column.
 *
 * Several RPCs return `jsonb` (`get_site_shell`, `get_product_detail`), so the
 * only honest type at the boundary is `Json`. Each caller validates and casts
 * once, through this function, instead of scattering `as` casts through the
 * component tree.
 */
export function asJson<T>(value: Json | null | undefined): T | null {
  return value === null || value === undefined ? null : (value as T)
}
