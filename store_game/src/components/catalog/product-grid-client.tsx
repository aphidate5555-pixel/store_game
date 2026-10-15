'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

/**
 * Keeps the last good grid on screen when a filter fetch fails.
 *
 * The requirement from the copy layer is that a failed filter must not clear
 * the grid: an empty grid is read as "the shop has no products", which is a
 * different and much more alarming statement than "the request failed". So
 * this holds the most recent children and only swaps them out when a new
 * successful render arrives.
 *
 * It is a client leaf for that reason — the server sends the first page and
 * subsequent navigations happen through the router.
 */
export function ProductGridClient({
  initial,
  children,
  errorMessage,
  retryLabel,
}: {
  initial: ReactNode
  children?: ReactNode
  errorMessage: string
  retryLabel: string
}) {
  const [lastGood, setLastGood] = useState<ReactNode>(initial)
  const [hasError, setHasError] = useState(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    // The first effect run carries the server-rendered children, which are
    // already correct; only later updates count as a new result.
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    if (children !== undefined) {
      setLastGood(children)
      setHasError(false)
    }
  }, [children])

  return (
    <div>
      {hasError ? (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3"
        >
          <TriangleAlert size={18} className="shrink-0 text-warning" aria-hidden="true" />
          <p className="flex-1 text-sm text-text">{errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-lg border border-line bg-surface-2 px-3 text-sm font-medium text-text hover:border-line-ctl focus-ring"
          >
            {retryLabel}
          </button>
        </div>
      ) : null}

      {/* The grid is never unmounted on failure — that is the whole point. */}
      <div data-stale={hasError ? 'true' : undefined}>{children ?? lastGood}</div>
    </div>
  )
}
