import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

/**
 * Two credentials, and F-06 is the reason they are not one.
 *
 *   anonymous   the published anon key, over the Data API. This is what a
 *               visitor's browser holds, so it is what proves what a visitor
 *               can reach.
 *
 *   inspection  a direct Postgres connection. The schema introspection
 *               functions live in the `private` schema with EXECUTE revoked
 *               from public (F-07), so the anon key cannot call them at all —
 *               not with a valid JWT, not as an authenticated user, not ever.
 *
 * Reaching the same inspection result with the anon key would mean granting
 * it, and a grant that lets anyone enumerate every table and column is worse
 * than having no drift test.
 */
export interface GuardEnv {
  readonly anonUrl: string
  readonly anonKey: string
  readonly dbUrl: string | null
}

export function readGuardEnv(): GuardEnv {
  const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const dbUrl = process.env.SUPABASE_CI_DB_URL ?? null
  return { anonUrl, anonKey, dbUrl }
}

export const hasAnon = (env: GuardEnv): boolean => env.anonUrl !== '' && env.anonKey !== ''

export const hasInspection = (env: GuardEnv): boolean => env.dbUrl !== null && env.dbUrl !== ''

export function anonClient(env: GuardEnv): SupabaseClient<Database> {
  return createClient<Database>(env.anonUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export function missing(env: GuardEnv): string[] {
  const out: string[] = []
  if (!hasAnon(env)) out.push('NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!hasInspection(env)) out.push('SUPABASE_CI_DB_URL')
  return out
}

/** One line explaining why a suite is skipping. Printed, not swallowed. */
export function skipReason(env: GuardEnv, suite: string): string {
  return (
    `[guards] ข้าม ${suite} — ขาด ${missing(env).join(', ') || 'credential'} ` +
    '(ดู tests/guards/README.md)'
  )
}
