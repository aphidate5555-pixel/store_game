'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { getMessages } from '@/lib/i18n'

/**
 * Errors from the app segment but not from the public group — in practice
 * /admin, which lives in (admin) and has no error boundary of its own.
 *
 * This file sits one level ABOVE the layout, so the dictionary is reachable
 * here. The message of the error is still never rendered: on the admin side it
 * can carry a PostgREST error string, and an administrator does not need to
 * read one to fix what they were doing.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const m = getMessages()

  useEffect(() => {
    console.error('[app]', error)
  }, [error])

  return (
    <main
      id="main"
      className="grid min-h-svh place-items-center bg-ink px-4 text-text"
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6">
        <h1 className="text-lg font-semibold text-text">{m.error.genericTitle}</h1>
        <p className="mt-2 text-sm text-text-2">{m.error.generic}</p>

        {error.digest ? (
          <p className="mt-3 text-xs text-text-3">รหัสอ้างอิง: {error.digest}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-on-primary focus-ring"
          >
            {m.error.reload}
          </button>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface-2 px-4 text-sm text-text hover:border-line-ctl focus-ring"
          >
            {m.nav.home}
          </Link>
        </div>
      </div>
    </main>
  )
}
