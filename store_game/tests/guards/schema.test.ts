// @vitest-environment node
//
// The guard suite talks to a real Postgres connection and the Supabase REST
// API. jsdom would give it a window, a localStorage and a fake location that
// none of it uses.

import { beforeAll, describe, expect, it } from 'vitest'
import { Client } from 'pg'

import type { Database } from '@/lib/database.types'
import {
  anonClient,
  hasAnon,
  hasInspection,
  readGuardEnv,
  skipReason,
} from './anon-client'

const env = readGuardEnv()

/**
 * Schema drift, over a direct connection.
 *
 * This suite cannot run through the Data API. `private.tables_missing_rls()`
 * and its siblings exist precisely so that an anonymous caller CANNOT reach
 * them (F-06, F-07) — a guard test that used the anon key would either have
 * to be granted that access, or assert nothing.
 */
const maybe = hasInspection(env) ? describe : describe.skip

if (!hasInspection(env)) {
  beforeAll(() => {
    console.warn(skipReason(env, 'schema drift'))
  })
}

interface Row {
  table_name: string
  rls_enabled: boolean
  rls_forced: boolean
}

maybe('every table has RLS enabled', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({ connectionString: env.dbUrl as string, ssl: { rejectUnauthorized: false } })
    await client.connect()
  })

  it('no table in the public schema is left readable', async () => {
    const { rows } = await client.query<Row>(
      `select c.relname::text as table_name,
              c.relrowsecurity  as rls_enabled,
              c.relforcerowsecurity as rls_forced
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by c.relname`,
    )

    const unguarded = rows.filter((row) => !row.rls_enabled).map((row) => row.table_name)
    // A table with RLS disabled is world-readable through the Data API. This
    // is the assertion that catches a migration that stopped halfway.
    expect(unguarded, 'ตารางที่ยังไม่ได้เปิด row level security').toEqual([])
  })

  it('finds the expected number of tables', async () => {
    const { rows } = await client.query<{ count: string }>(
      `select count(*)::text as count
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'`,
    )
    // 8 project tables. A drop that left 7 would still pass the RLS check.
    expect(Number(rows[0]?.count)).toBeGreaterThanOrEqual(8)
  })

  it('keeps the private schema unreachable from the Data API', async () => {
    const { rows } = await client.query<{ has_schema_privilege: boolean }>(
      `select has_schema_privilege('anon', 'private', 'USAGE') as has_schema_privilege`,
    )
    expect(rows[0]?.has_schema_privilege).toBe(false)
  })

  it('revokes EXECUTE on the introspection functions from PUBLIC', async () => {
    const { rows } = await client.query<{ count: string }>(
      `select count(*)::text as count
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'private'
          and p.proname in ('schema_tables', 'schema_columns', 'tables_missing_rls')
          and has_function_privilege('public', p.oid, 'EXECUTE')`,
    )
    expect(Number(rows[0]?.count)).toBe(0)
  })
})

/**
 * Anonymous behaviour, over the Data API with the published key.
 *
 * These are the assertions that say what a visitor's browser cannot do, as
 * opposed to what the database intends.
 */
const anon = hasAnon(env) ? describe : describe.skip

if (!hasAnon(env)) {
  beforeAll(() => {
    console.warn(skipReason(env, 'anonymous behaviour'))
  })
}

anon('an anonymous visitor is confined', () => {
  const db = () => anonClient(env)

  it('cannot read the administrator roster', async () => {
    const { data, error } = await db().from('admins').select('*').limit(1)
    // C-33: no SELECT grant at all, so the failure is a permission error
    // rather than an empty result.
    expect(error).not.toBeNull()
    expect(data ?? []).toEqual([])
  })

  it('cannot read the audit log', async () => {
    const { data, error } = await db().from('admin_audit_log').select('*').limit(1)
    expect(error).not.toBeNull()
    expect(data ?? []).toEqual([])
  })

  it('cannot write a product', async () => {
    const { error } = await db()
      .from('products')
      .insert({
        product_code: 'ANON-TEST-1',
        name: 'ทดสอบ',
        game_id: '00000000-0000-0000-0000-000000000000',
        price_amount: 1,
      })

    expect(error).not.toBeNull()
  })

  it('cannot update the settings row', async () => {
    const { error } = await db()
      .from('store_settings')
      .update({ store_name: 'ถูกเปลี่ยนโดยไม่มีสิทธิ์' })
      .eq('id', true)

    expect(error).not.toBeNull()
  })

  it('cannot delete the settings row', async () => {
    // No delete grant and no DELETE policy (C-4), plus the deny_delete
    // trigger as a third layer.
    const { error } = await db().from('store_settings').delete().eq('id', true)
    expect(error).not.toBeNull()
  })

  it('reports is_admin() as false rather than erroring', async () => {
    const { data, error } = await db().rpc('is_admin')
    expect(error).toBeNull()
    expect(data).toBe(false)
  })

  it('cannot read hidden products through the public listing', async () => {
    const { data } = await db().rpc('search_products', {
      p_pattern: null,
      p_game_slug: null,
      p_status: null,
      p_currency: 'THB',
      p_min: null,
      p_max: null,
      p_sort: 'newest',
      p_limit: 100,
      p_offset: 0,
    })

    const items = (data as { items: Database['public']['Tables']['products']['Row'][] }[] | null)?.[0]
      ?.items
    expect(items ?? []).toSatisfy((rows: { is_visible: boolean }[]) =>
      rows.every((row) => row.is_visible),
    )
  })

  it('cannot reach the schema introspection through the Data API', async () => {
    // F-07 in action, and the reason this assertion is written the way it
    // is: `tables_missing_rls` exists ONLY in the private schema, so it is
    // absent from the generated RPC type. That absence is compile-time
    // proof the function is unreachable, which is stronger than a runtime
    // "permission denied" — a denied call would mean the function IS
    // exposed and merely locked down.
    //
    // The runtime check is therefore made against a name that is a string,
    // bypassing the typed client on purpose.
    const untyped = db() as unknown as {
      rpc: (name: string, args?: Record<string, unknown>) => Promise<{ error: unknown }>
    }

    const { error } = await untyped.rpc('tables_missing_rls')
    expect(error, 'private schema functions ต้องไม่ถูกเปิดผ่าน Data API').not.toBeNull()
  })
})
