import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { requireAdmin, loginHref } from '@/lib/auth/require-admin'
import { AdminShell } from '@/components/admin/admin-shell'
import { Forbidden } from './forbidden'

/**
 * The single admin gate (C-30).
 *
 * Every /admin/* route lives under this group, so the check cannot be
 * forgotten on a new page. Three outcomes:
 *
 *   no session  → redirect to the login form, carrying a validated `next`
 *   signed in, no grant → render the 403. Not a redirect: bouncing back to
 *                 the login form would loop, and saying the account has no
 *                 grant turns the form into an oracle for the roster (C-5).
 *   granted     → render the shell
 *
 * The admin area is NOT behind the maintenance gate, which lives in
 * (public)/layout.tsx. An administrator has to be able to reach the settings
 * page to turn maintenance off (C-26).
 */
export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const auth = await requireAdmin()

  if (!auth.ok) {
    if (auth.reason === 'no-session') {
      // The path is taken from the request the router is already on; the
      // login form re-validates it, and safeAdminNext drops anything that
      // does not start with /admin.
      redirect(loginHref('/admin'))
    }
    return <Forbidden email={undefined} />
  }

  return (
    <AdminShell email={auth.user.email ?? undefined} displayName={auth.user.user_metadata?.full_name}>
      {children}
    </AdminShell>
  )
}
