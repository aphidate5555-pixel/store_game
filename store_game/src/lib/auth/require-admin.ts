import type { User } from '@supabase/supabase-js'

import { safeAdminNext } from '@/lib/validation/url'
import { createServerClient } from '@/lib/supabase/server'

/**
 * The authorisation gate for every /admin route and every Server Action (C-5).
 *
 * The three outcomes are deliberately distinct:
 *
 *   no-session  → the visitor has not signed in, so sending them to the login
 *                 form is both correct and harmless.
 *   not-admin   → the visitor HAS signed in but holds no admin grant. They
 *                 must see a 403 page. Redirecting them back to the login form
 *                 would create a redirect loop, and telling them the account
 *                 is "not an administrator" turns the form into an oracle that
 *                 enumerates public.admins (C-10).
 *   ok          → proceed.
 *
 * Middleware is NOT an enforcement layer; it can be bypassed. RLS is the layer
 * that actually holds.
 */
export type AdminAuth =
  | { readonly ok: true; readonly user: User }
  | { readonly ok: false; readonly reason: 'no-session' }
  | { readonly ok: false; readonly reason: 'not-admin' }

export async function requireAdmin(): Promise<AdminAuth> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, reason: 'no-session' }

  // Re-checked through RLS as a second, independent layer.
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) return { ok: false, reason: 'not-admin' }

  return { ok: true, user }
}

/**
 * Server Actions cannot render a 403 page — they have no response to write to.
 * They therefore throw, and the Thai string is what the user sees.
 */
export async function requireAdminAction(context: string): Promise<User> {
  const auth = await requireAdmin()
  if (!auth.ok) {
    throw new Error(`ไม่มีสิทธิ์เข้าถึง${context}`)
  }
  return auth.user
}

/** The redirect target for the no-session case, with `next` validated. */
export function loginHref(currentPath: string): string {
  const next = safeAdminNext(currentPath)
  return next ? `/admin/login?next=${encodeURIComponent(next)}` : '/admin/login'
}
