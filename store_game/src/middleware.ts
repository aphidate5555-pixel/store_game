import { NextResponse, type NextRequest } from 'next/server'

import { AUTH_COOKIE, hasAuthCookie } from '@/lib/supabase/keys'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Session refresh only — this is not an authorisation layer (C-24).
 *
 * The matcher is deliberately narrow. A catch-all middleware would attach
 * Set-Cookie to every public request, including RSC payloads and prefetches,
 * which destroys the data cache the public catalogue depends on. Public
 * routes never touch a cookie here.
 *
 * The matcher also keeps the redirect behaviour testable: an unauthenticated
 * GET /admin must answer 307, not 200 (acceptance check in §14).
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (!hasAuthCookie(request.cookies.getAll())) {
    return NextResponse.next()
  }
  return updateSession(request)
}

export const config = {
  matcher: ['/admin/:path*', '/auth/callback'],
}

export { AUTH_COOKIE }
