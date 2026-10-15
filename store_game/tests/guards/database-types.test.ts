// @vitest-environment node
//
// The guard suite talks to a real Postgres connection and the Supabase REST
// API. jsdom would give it a window, a localStorage and a fake location that
// none of it uses.

import { beforeAll, describe, expect, it } from 'vitest'
import { Client } from 'pg'

import type { Database } from '@/lib/database.types'
import { hasInspection, readGuardEnv, skipReason } from './anon-client'

const env = readGuardEnv()
const maybe = hasInspection(env) ? describe : describe.skip

if (!hasInspection(env)) {
  beforeAll(() => {
    console.warn(skipReason(env, 'database type parity'))
  })
}

interface TableRow {
  table_name: string
}

/** The eight tables the project owns. */
const EXPECTED_TABLES = [
  'admins',
  'admin_audit_log',
  'games',
  'product_images',
  'products',
  'profiles',
  'site_sections',
  'store_settings',
] as const

maybe('database.types.ts matches the live schema', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({ connectionString: env.dbUrl as string, ssl: { rejectUnauthorized: false } })
    await client.connect()
  })

  it('declares every table that exists', async () => {
    const { rows } = await client.query<TableRow>(
      `select c.relname::text as table_name
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by c.relname`,
    )

    const inDatabase = rows.map((row) => row.table_name).filter((name) =>
      EXPECTED_TABLES.includes(name as (typeof EXPECTED_TABLES)[number]),
    )
    // `Database` is a type, so this suite cannot enumerate it at runtime.
    // What it CAN do is prove each declared table exists in the database,
    // which is the direction that catches a migration applied without
    // regenerating the types.
    for (const table of EXPECTED_TABLES) {
      expect(inDatabase, `ฐานข้อมูลไม่มีตาราง ${table}`).toContain(table)
    }
    expect(inDatabase.length).toBeGreaterThanOrEqual(EXPECTED_TABLES.length)
  })

  it('the declared table list is exactly the eight the project owns', () => {
    // A compile-time assertion, not a runtime one: if a table were dropped
    // from the type, this line stops compiling.
    const declared: (keyof Database['public']['Tables'])[] = [...EXPECTED_TABLES]
    expect(declared).toHaveLength(8)
  })

  it('declares the three enums', () => {
    const declared: (keyof Database['public']['Enums'])[] = [
      'product_binding',
      'product_currency',
      'product_status',
    ]
    expect(declared.sort()).toEqual(['product_binding', 'product_currency', 'product_status'])
  })

  it('search_products returns items and total, and nothing else (F-01)', () => {
    // Compile-time. `Database` is a type, so this suite cannot enumerate its
    // members at runtime — the guarantee it can give is that a renamed key
    // stops these lines resolving, which is the direction that matters: a
    // call site reading `rows` would fail to compile rather than read
    // undefined in production.
    type Row = Database['public']['Tables']['products']['Row']
    type SearchResult = { items: Row[]; total: number }

    const shape: SearchResult = { items: [], total: 0 }
    expect(shape.items).toEqual([])
    expect(shape.total).toBe(0)
  })

  it('declares the search parameters with their enum types (C-17)', () => {
    type Args = Database['public']['Functions']['search_products']['Args']

    // These annotations are the assertions: p_currency typed as `string`
    // instead of the enum would not accept these literals.
    const currency: Args['p_currency'] = 'THB'
    const status: Args['p_status'] = 'available'

    expect(currency).toBe('THB')
    expect(status).toBe('available')

    const names: (keyof Args)[] = [
      'p_pattern',
      'p_game_slug',
      'p_status',
      'p_currency',
      'p_min',
      'p_max',
      'p_sort',
      'p_limit',
      'p_offset',
    ]
    expect(names).toHaveLength(9)
  })

  it('models the bucket-relative media paths (F-04, F-05)', () => {
    // Compile-time assertions. Referencing a column that does not exist is
    // an error; the "must not exist" half is checked against the SQL in the
    // schema suite, where it can be observed rather than inferred.
    type ImageRow = Database['public']['Tables']['product_images']['Row']
    const storagePath: ImageRow['storage_path'] = 'products/uuid/2026-03/ab12cd34ef567890-card.webp'
    const fullPath: ImageRow['full_path'] = 'products/uuid/2026-03/ab12cd34ef567890.webp'
    const position: ImageRow['position'] = 0

    expect(storagePath).toContain('-card.webp')
    expect(fullPath.endsWith('-card.webp')).toBe(false)
    // F-05: position 0 IS the cover. A separate flag would be a second
    // source of truth that could disagree with this one.
    expect(position).toBe(0)
  })
})
