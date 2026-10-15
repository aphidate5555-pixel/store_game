'use client'

import { useEffect, useState } from 'react'

/**
 * Debounced mirror of a value.
 *
 * Used by the catalogue search box. The delay is what keeps a five-character
 * query from issuing five RPC calls as the customer types, and the URL is not
 * rewritten until the pause — so the back button still steps through the
 * searches that were actually made.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
