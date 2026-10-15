import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient, Session, User } from '@supabase/supabase-js'

import { getEnv } from '@/lib/env/schema'
import type { Database } from '@/lib/database.types'
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS, type SessionCookieBag } from './keys'

/**
 * The cookie-bound client, for authentication and the admin area only (§2.2
 * rule 2).
 *
 * Two hard rules apply to every caller:
 *  - the result of a query made here is **never** cached. `cookies()` makes the
 *    render dynamic and throws if such a query is wrapped in `unstable_cache`,
 *    which is the correct outcome (rule 5 of §5, C-26).
 *  - it is not used for public catalog reads. Those go through
 *    `getPublicDb()` in `public-client.ts` so nothing user-specific can reach
 *    a shared cache entry.
 *
 * Server Components cannot write cookies, so `setAll` is guarded there. That
 * is not a shortcut: the token refresh actually happens in the middleware,
 * which runs before the render and *can* write. A component that tries to
 * rotate the session is a bug worth surfacing, and it is surfaced by letting
 * the error propagate once the middleware has already refreshed.
 */

/**
 * The request's cookie bag, as a single-signature shape.
 *
 * Next.js 15 made `cookies()` return a Promise, and the value it resolves to
 * declares `set` with a union of rest-tuple overloads. Casting once here gives
 * every caller below one honest signature instead of a cast at each write.
 */
export async function requestCookieBag(): Promise<SessionCookieBag> {
  return (await cookies()) as unknown as SessionCookieBag
}

export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const env = getEnv()
  const store = await requestCookieBag()

  return createSupabaseServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return store.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              store.set(name, value, { ...AUTH_COOKIE_OPTIONS, ...options })
            }
          } catch {
            // Server Component: cookies are read-only here. The middleware
            // already refreshed the session for this request, so dropping the
            // write loses nothing, and swallowing it keeps an ordinary page
            // render from failing over a duplicate refresh.
          }
        },
      },
      // Both the cookie name and the in-memory storage key derive from the
      // shared constant, so the middleware and this client can never disagree.
      cookieOptions: { ...AUTH_COOKIE_OPTIONS, name: AUTH_COOKIE },
    },
  )
}

/**
 * The authenticated user, verified against the auth server.
 *
 * `getUser()` revalidates the JWT; `getSession()` would only decode it, which
 * is exactly the shortcut that lets a forged-but-well-formed cookie through
 * `requireAdmin()`.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}

/** The current session, for the few call sites that need the token itself. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}

/**
 * Signs a user out and clears every session cookie.
 *
 * Callable from a Server Action only: the cookie write is the point, and in a
 * Server Component it would be silently skipped, leaving the user apparently
 * signed in with a token nothing will ever invalidate.
 */
export async function signOut(): Promise<void> {
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
}
