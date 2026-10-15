'use client'

import { useEffect, useState } from 'react'

/**
 * Copy-feedback for an input field: green for a moment, then back to neutral.
 *
 * Deliberately not the global toast. The toast announces politely and stacks
 * in a viewport, which is the wrong channel for "the code you just copied is
 * on your clipboard" — a field-level message sits next to the button that
 * caused it.
 */
export type CopyState = 'idle' | 'copied' | 'failed'

export function useCopyState(timeout = 2000): [CopyState, (next: CopyState) => void] {
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = setTimeout(() => setState('idle'), timeout)
    return () => clearTimeout(timer)
  }, [state, timeout])

  return [state, setState]
}
