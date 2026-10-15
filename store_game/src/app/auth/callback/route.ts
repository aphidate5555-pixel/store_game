import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { safeAdminNext } from '@/lib/validation/url'
import { createServerClient } from '@/lib/supabase/server'

/**
 * PKCE callback.
 *
 * The code_verifier lives in a cookie written by the @supabase/ssr browser
 * client at sign-in time (C-25). Without that cookie the server-side
 * exchangeCodeForSession call always fails, which is why the e2e suite fires
 * this route for real instead of only using signInWithPassword.
 *
 * `next` is validated twice: safeInternal rejects control characters, spaces,
 * backslashes and protocol-relative prefixes, and the extra admin scope check
 * makes sure a crafted link cannot bounce an authenticated administrator to
 * another part of the site (C-6).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  const safeNext = safeAdminNext(nextParam) ?? '/admin'

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_code`)
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // The message is deliberately not surfaced: it would reveal whether a code
    // existed and how far the exchange got.
    return NextResponse.redirect(`${origin}/admin/login?error=invalid_code`)
  }

  return NextResponse.redirect(`${origin}${safeNext}`)
}
