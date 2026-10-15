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
    console.warn(skipReason(env, 'settings column parity'))
  })
}

/**
 * The 24 columns of store_settings, in ordinal order.
 *
 * This list is written out rather than derived, because the point is to
 * notice when the database gains or loses a column. Deriving it from the TS
 * type would compare the type against itself and pass forever.
 */
const EXPECTED_COLUMNS = [
  'id',
  'store_name',
  'store_description',
  'logo_path',
  'favicon_path',
  'default_og_image_path',
  'primary_color',
  'accent_color',
  'whatsapp_number',
  'facebook_url',
  'tiktok_url',
  'instagram_url',
  'footer_text',
  'footer_disclaimer',
  'floating_whatsapp_enabled',
  'floating_whatsapp_text',
  'business_hours',
  'maintenance_mode',
  'maintenance_message',
  'seo_title',
  'seo_description',
  'default_currency',
  'version',
  'updated_at',
] as const

interface ColumnRow {
  column_name: string
}

maybe('store_settings matches the declared contract', () => {
  let client: Client

  beforeAll(async () => {
    client = new Client({ connectionString: env.dbUrl as string, ssl: { rejectUnauthorized: false } })
    await client.connect()
  })

  it('has exactly the expected columns, in order', async () => {
    const { rows } = await client.query<ColumnRow>(
      `select a.attname::text as column_name
         from pg_attribute a
         join pg_class c on c.oid = a.attrelid
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'store_settings'
          and a.attnum > 0
          and not a.attisdropped
        order by a.attnum`,
    )

    expect(rows.map((row) => row.column_name)).toEqual([...EXPECTED_COLUMNS])
  })

  it('holds no column removed by contract', async () => {
    // C-1 and C-11. whatsapp_link in particular: a stored link cannot be
    // proven to match the phone number, so the two could disagree.
    const { rows } = await client.query<ColumnRow>(
      `select a.attname::text as column_name
         from pg_attribute a
         join pg_class c on c.oid = a.attrelid
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'store_settings'
          and a.attname = any($1)`,
      [['whatsapp_link', 'shop_name', 'nav_items', 'hero_title', 'hero_cta_url']],
    )

    expect(rows).toEqual([])
  })

  it('agrees with the TypeScript type on every column', async () => {
    const { rows } = await client.query<ColumnRow>(
      `select a.attname::text as column_name
         from pg_attribute a
         join pg_class c on c.oid = a.attrelid
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'store_settings'
          and a.attnum > 0
          and not a.attisdropped
        order by a.attnum`,
    )

    const fromDatabase = rows.map((row) => row.column_name).sort()
    const fromTypes = Object.keys(
      ({} as Database['public']['Tables']['store_settings']['Row']) as Record<string, unknown>,
    ).sort()

    // The type is a compile-time claim; this is the runtime one. A migration
    // applied without regenerating the types is what makes them differ.
    expect(fromDatabase).toEqual(fromTypes)
  })
})
