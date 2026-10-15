import Link from 'next/link'

import { getMessages } from '@/lib/i18n'
import { signOutAdmin } from '@/lib/auth/sign-in'

/**
 * 403 for a signed-in visitor who is not an administrator (C-5).
 *
 * Deliberately not a redirect. Sending them back to /admin/login creates a
 * loop, and saying the account "is not an administrator" turns the login
 * form into an oracle that enumerates public.admins. The wording is the same
 * whatever the reason, so nothing about the roster leaks.
 */
export function Forbidden({ email }: { email?: string }) {
  const m = getMessages()

  return (
    <main id="main" className="grid min-h-svh place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6">
        <h1 className="text-lg font-semibold text-text">403</h1>
        <h2 className="mt-2 text-base font-medium text-text">{m.error.forbiddenTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-2">{m.error.forbiddenBody}</p>

        {/*
          The address is shown because the person is already signed in as it.
          That is their own information, not a disclosure about any other
          account.
        */}
        {email ? (
          <p className="mt-4 text-sm text-text-3">{m.error.forbiddenLoggedInAs(email)}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface-2 px-4 text-sm text-text hover:border-line-ctl focus-ring"
          >
            {m.error.forbiddenBackHome}
          </Link>
          <form action={signOutAdmin}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-on-primary focus-ring"
            >
              {m.error.forbiddenLogout}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
