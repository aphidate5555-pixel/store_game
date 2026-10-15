import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { getEnv } from '@/lib/env/schema'
import type { Database } from '@/lib/database.types'
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS, hasAuthCookie, type SessionCookieBag } from './keys'
import { safeAdminNext } from '@/lib/validation/url'

/**
 * Session refresh for the admin area only (C-24).
 *
 * The matcher in `src/middleware.ts` is deliberately narrow —
 * `['/admin/:path*', '/auth/callback']` — so the storefront pays nothing for
 * this file. That narrowness is what makes the eager `getUser()` below
 * affordable.
 *
 * Why refresh here and not in `requireAdmin()`: by the time a Server Component
 * renders, the response headers are already committed, so a token rotated
 * during this request cannot be written back. The middleware is the last
 * place where `Set-Cookie` still works. Anything a rotated token would have
 * invalidated — an in-flight admin save — is protected by the re-auth modal in
 * 10.3 rather than by this file.
 */

/** Where an anonymous visitor to `/admin/*` is sent. */
const LOGIN_PATH = '/admin/login'

/** The only callback route that must never be redirected away (C-25). */
const AUTH_CALLBACK_PATH = '/auth/callback'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // `NextResponse.next({ request })` forwards the (possibly rewritten)
  // headers onward, so a cookie set below is visible to the Server Component
  // that renders next in the same pass.
  let response = NextResponse.next({ request })

  if (request.nextUrl.pathname === AUTH_CALLBACK_PATH) {
    // The PKCE handler in src/app/auth/callback/route.ts owns its own
    // redirect; bouncing it to the login page would drop the code exchange.
    return response
  }

  // Cheap negative filter: skip the network round trip for the anonymous
  // visitors who make up most of /admin traffic. A true here is a hint to
  // verify, never a proof of a session.
  if (!hasAuthCookie(request.cookies)) {
    return redirectToLogin(request)
  }

  const env = getEnv()

  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          // Written twice on purpose. Onto the request, so the Server
          // Component rendered later in this same pass already sees the
          // refreshed token; and onto the response, so the browser stores it.
          // Writing only the response would leave this render reading a token
          // that no longer exists, which is the "saved but kicked out" bug.
          const requestCookies = request.cookies as unknown as SessionCookieBag
          requestCookies.set(name, value, { ...AUTH_COOKIE_OPTIONS, ...options })

          response = NextResponse.next({ request })
          const responseCookies = response.cookies as unknown as SessionCookieBag
          responseCookies.set(name, value, { ...AUTH_COOKIE_OPTIONS, ...options })
        }
      },
    },
    cookieOptions: { ...AUTH_COOKIE_OPTIONS, name: AUTH_COOKIE },
  })

  // getUser() revalidates the JWT against the auth server. getSession() would
  // merely decode the cookie, which is not an authorisation check.
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    // Fail-closed, the same posture as the maintenance gate (C-26): a network
    // error and an expired session look identical here, and neither may render
    // an admin page.
    return redirectToLogin(request)
  }

  // Membership in `admins` is deliberately NOT checked here. C-33 revokes the
  // `select` grant on that table, so the query is impossible from here, and
  // C-5 assigns the "signed in but not an admin" case to a 403 page rather
  // than a redirect. This file only answers "is there a live session".
  return response
}

/**
 * Sends an anonymous or expired visitor to the login page, preserving the
 * original path so the admin lands back where they were.
 *
 * The `next` value is filtered by `safeAdminNext()`, which keeps only paths
 * matching `^/admin(?:/|$)` (C-6). Without that filter this is an open
 * redirect: `/admin/login?next=https://evil.example` would bounce an
 * authenticated admin off-site the moment they signed in.
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = LOGIN_PATH
  loginUrl.search = ''

  // The login page itself must not redirect to itself, or a stale `next` turns
  // the login form into a loop.
  if (request.nextUrl.pathname !== LOGIN_PATH) {
    const next = safeAdminNext(request.nextUrl.pathname + request.nextUrl.search)
    if (next) loginUrl.searchParams.set('next', next)
  }

  return NextResponse.redirect(loginUrl)
}
