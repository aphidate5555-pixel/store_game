'use client'

import { useEffect } from 'react'

/**
 * Warns before unsaved work is thrown away.
 *
 * `beforeunload` alone is not enough in the App Router: it fires when the tab
 * closes or reloads, but NOT when a link is followed, because that is a
 * client-side navigation with no document unload. The previous version
 * therefore lost a half-filled appearance card silently on every internal
 * link click.
 *
 * Three interception points are needed:
 *   1. capture-phase click on a[href]  — covers <Link> and plain anchors
 *   2. history.pushState / replaceState — covers programmatic navigation
 *   3. popstate                       — covers the back and forward buttons
 *
 * Every patched function is restored on unmount, so mounting this hook twice
 * cannot leave a permanently wrapped history object behind.
 */

interface GuardOptions {
  readonly when: boolean
  readonly message?: string
}

const DEFAULT_MESSAGE = 'คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก'

function isModifiedLeftClick(event: MouseEvent): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

function isExternalLink(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true
  // closest() is typed as returning Element, so the anchor properties have to
  // be narrowed explicitly rather than assumed.
  const found = target.closest('a[href]')
  if (!(found instanceof HTMLAnchorElement)) return found === null ? false : true
  if (found.target && found.target !== '_self') return true
  if (found.hasAttribute('download')) return true
  const href = found.getAttribute('href') ?? ''
  // A pure fragment does not navigate away, so it must not trigger the guard.
  if (href.startsWith('#')) return true
  try {
    return new URL(found.href, window.location.href).origin !== window.location.origin
  } catch {
    return true
  }
}

export function useUnsavedChangesGuard({ when, message = DEFAULT_MESSAGE }: GuardOptions): void {
  useEffect(() => {
    if (!when) return

    const confirmLeave = (): boolean => window.confirm(message)

    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
      event.returnValue = message
    }

    const onClick = (event: MouseEvent): void => {
      if (isModifiedLeftClick(event)) return
      if (isExternalLink(event.target)) return
      if (!confirmLeave()) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onPopState = (): void => {
      if (confirmLeave()) return
      // The history entry has already moved. Pushing the previous entry back
      // is the only way to keep the user on the form.
      window.history.pushState(null, '', window.location.href)
    }

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function patchedPushState(...args: Parameters<History['pushState']>) {
      if (!confirmLeave()) return
      return originalPushState.apply(this, args)
    }

    window.history.replaceState = function patchedReplaceState(
      ...args: Parameters<History['replaceState']>
    ) {
      // replaceState is used by the router for the same URL, so it must not
      // block; only a URL change is a real navigation away.
      const [nextUrl] = args
      if (typeof nextUrl === 'string' && nextUrl !== window.location.href && !confirmLeave()) return
      return originalReplaceState.apply(this, args)
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [when, message])
}
