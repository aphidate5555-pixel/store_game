'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { getMessages } from '@/lib/i18n'

/**
 * Catches errors in the public segment.
 *
 * The visitor sees Thai copy and a retry button. The error's own message is
 * never rendered: on a storefront it can carry a Supabase error string, a
 * table name or a fragment of a query, none of which belongs on screen. The
 * details go to the console, where they are readable by whoever has a
 * terminal open.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const m = getMessages()

  useEffect(() => {
    console.error('[public]', error)
  }, [error])

  return (
    <main id="main" className="grid min-h-svh place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold text-text">{m.error.genericTitle}</h1>
        <p className="mt-2 text-sm text-text-2">{m.error.generic}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-on-primary focus-ring"
          >
            {m.error.reload}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface-2 px-4 text-sm text-text hover:border-line-ctl focus-ring"
          >
            {m.error.goHome}
          </Link>
        </div>
      </div>
    </main>
  )
}
