import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getEnv } from '@/lib/env/schema'
import type { Database } from '@/lib/database.types'
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS } from './keys'
import { requestCookieBag } from './server'

/**
 * The client for Server Actions (§2.2 flow: `Server Actions → Zod → UPDATE →
 * write_audit() → invalidate*()`).
 *
 * It is bound to cookies exactly like `createServerClient()` in `server.ts`,
 * with one difference that matters: **cookie writes are mandatory**. A Server
 * Action runs in a context where `cookies().set()` is permitted, and when
 * Supabase rotates a refresh token during a long editing session, that write
 * is the only thing that makes the new token persist. Swallowing the error
 * here would leave the user on a page whose session is about to die — the
 * exact failure described in 10.3 of the plan.
 *
 * Hence there is no try/catch around `setAll`: if a write fails here the
 * action must fail loudly rather than report a save that will not survive a
 * refresh.
 */

export async function createSupabaseActionClient(): Promise<SupabaseClient<Database>> {
  const env = getEnv()
  const store = await requestCookieBag()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return store.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, { ...AUTH_COOKIE_OPTIONS, ...options })
          }
        },
      },
      cookieOptions: { ...AUTH_COOKIE_OPTIONS, name: AUTH_COOKIE },
    },
  )
}

/**
 * The acting user's id, for the `admin_user_id` column of `write_audit()`.
 *
 * Every write path needs one, so this is the single place that produces it.
 * It throws in Thai instead of returning null, because `admin_user_id` is
 * NOT NULL: an unauthenticated write is a bug, not an empty log line.
 */
export async function requireActionUserId(): Promise<string> {
  const supabase = await createSupabaseActionClient()
  const { data, error } = await supabase.auth.getUser()
  const user = data.user

  if (error || !user) {
    throw new Error('เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง')
  }

  return user.id
}
