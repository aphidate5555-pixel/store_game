import type { Metadata } from 'next'

/**
 * Shown instead of the storefront while maintenance is on, and also when the
 * site configuration cannot be read at all.
 *
 * The second case is why this screen is fail-closed. A database that is
 * briefly unreachable must not cause the catalogue to be served: the previous
 * behaviour read a column that did not exist, treated the error as "not in
 * maintenance", and served the full catalogue during an outage.
 */
export const metadata: Metadata = {
  title: 'กำลังปรับปรุง',
  description: 'เว็บไซต์กำลังปรับปรุงอยู่ชั่วคราว',
  // F-12: the noindex signal is metadata, because a layout cannot write
  // response headers. robots.ts additionally disallows everything while
  // maintenance is on.
  robots: { index: false, follow: false, nocache: true },
}

export function MaintenanceScreen({
  message,
  isError = false,
}: {
  message?: string
  isError?: boolean
}) {
  return (
    <main
      id="main"
      className="min-h-svh grid place-items-center px-4 py-16"
      data-maintenance={isError ? 'error' : 'on'}
    >
      <div className="max-w-md text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-6 size-14 rounded-2xl border border-line bg-surface-2"
        />

        <h1 className="text-xl font-semibold text-text">เว็บไซต์กำลังปรับปรุง</h1>

        <p className="mt-3 text-base text-text-2">
          {message ?? 'ขออภัยในความไม่สะดวก เว็บไซต์ยังไม่พร้อมให้บริการในขณะนี้'}
        </p>

        {/*
          No automatic retry timer. A visitor who is told to come back later
          and is then silently reloaded into a half-rendered page is worse
          than one who is asked to try again on their own terms.
        */}
        {/* A full document request, not a client navigation: the gate is
            decided on the server, and a Link would not re-run it. */}
        <a
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface-2 px-4 text-sm font-medium text-text hover:border-line-ctl focus-ring"
        >
          ลองโหลดใหม่
        </a>
      </div>
    </main>
  )
}
