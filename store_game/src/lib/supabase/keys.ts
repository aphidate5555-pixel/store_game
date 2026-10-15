/**
 * The one place that knows the auth cookie's name (C-24, C-25).
 *
 * The middleware in `src/middleware.ts` and every server client in
 * `src/lib/supabase/server.ts` must agree on this string, otherwise the
 * middleware refreshes a session the server cannot read and the admin bounces
 * between the login page and the dashboard.
 *
 * `@supabase/ssr` derives the cookie name from `cookieOptions.name` and, in
 * 0.5.x, allows `auth.storageKey` to override it. We set both to the same
 * constant so the cookie name and the in-memory storage key can never diverge.
 */
import type { CookieOptions } from '@supabase/ssr'

/**
 * The cookie surface every caller in this directory needs.
 *
 * Next's own cookie bags (`RequestCookies`, `ResponseCookies`,
 * `ReadonlyRequestCookies`) declare `set` with a union of rest-tuple overloads,
 * which no single call signature is assignable to. This interface is the one
 * shape all four call sites — `cookies()`, `request.cookies`, `response.cookies`
 * — are cast to, so the adaptation happens once per file instead of at every
 * write. `CookieOptions` is `@supabase/ssr`'s own type, so the values passed
 * here are already the ones its `SetAllCookies` handler produced.
 */
export interface SessionCookieBag {
  getAll: () => Array<{ name: string; value: string }>
  set: (name: string, value: string, options?: CookieOptions) => void
}


/** Storage key / cookie name for the Supabase auth session. */
export const AUTH_COOKIE = 'store-game-auth'

/**
 * Chunked-cookie suffix. A large session is split by `@supabase/ssr` into
 * `store-game-auth.0`, `store-game-auth.1`, … so a presence check that looks
 * only at the unsuffixed name reports "signed out" for a signed-in user.
 */
const CHUNK_SEPARATOR = '.'

/**
 * True when the request carries an auth cookie of any size.
 *
 * Used by the middleware to skip `getUser()` — a network round trip plus a
 * full JWT verification — on the large majority of `/admin/*` requests that
 * belong to anonymous visitors. A positive result is never treated as proof of
 * a valid session; only `getUser()` may conclude that (C-24).
 */
export function hasAuthCookie(cookies: {
  getAll: () => Array<{ name: string }>
}): boolean
export function hasAuthCookie(cookies: ReadonlyArray<{ name: string }>): boolean
export function hasAuthCookie(
  cookies: { getAll: () => Array<{ name: string }> } | ReadonlyArray<{ name: string }>,
): boolean {
  // Accepts both shapes on purpose: the NextRequest cookie store exposes
  // getAll(), and a plain array is what a caller that already holds the list
  // has. Two call sites should not need two differently named functions.
  const list: ReadonlyArray<{ name: string }> = Array.isArray(cookies)
    ? (cookies as ReadonlyArray<{ name: string }>)
    : (cookies as { getAll: () => Array<{ name: string }> }).getAll()

  for (const cookie of list) {
    if (cookie.name === AUTH_COOKIE) return true
    if (cookie.name.startsWith(`${AUTH_COOKIE}${CHUNK_SEPARATOR}`)) return true
  }
  return false
}

/**
 * Cookie attributes applied to every session write.
 *
 * `httpOnly` keeps the session out of reach of any script on the page, and
 * `sameSite: 'lax'` still sends the cookie on the top-level navigation that
 * the PKCE callback depends on (C-25) while blocking cross-site POSTs.
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
} as const
