import Link from 'next/link'

import { getMessages } from '@/lib/i18n'

export default function NotFound() {
  const m = getMessages()

  return (
    <main id="main" className="grid min-h-svh place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="text-sm text-text-3">404</p>
        <h1 className="mt-2 text-lg font-semibold text-text">{m.error.notFoundTitle}</h1>
        <p className="mt-2 text-sm text-text-2">{m.error.notFoundBody}</p>

        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-on-primary focus-ring"
        >
          {m.error.notFoundCta}
        </Link>
      </div>
    </main>
  )
}
