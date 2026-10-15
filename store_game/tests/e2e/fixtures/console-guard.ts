import { test as base, type Page } from '@playwright/test'

/**
 * Fails a test when the public storefront logs an error.
 *
 * The exemptions matter. A console error is usually a real defect, but a few
 * are expected states of this project rather than bugs:
 *
 *   - the catalogue is empty because the seed has not been run
 *   - the browser is offline, which is one of the states the error strip in
 *     the catalogue exists to handle
 *   - a Supabase request failed for either of those reasons
 *
 * Without the exemptions the suite would have to be silenced wholesale in
 * exactly the situation it was written to catch.
 */
const ALLOWED_PATTERNS = [
  /Failed to load resource/i,
  /net::ERR_INTERNET_DISCONNECTED/i,
  /net::ERR_NETWORK_CHANGED/i,
  /Fetch API cannot load/i,
  /the server responded with a status of 4\d\d/i,
]

function isExempt(text: string): boolean {
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(text))
}

export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use) => {
      const problems: string[] = []

      const onConsole = (message: { type: () => string; text: () => string }): void => {
        if (message.type() !== 'error') return
        const text = message.text()
        if (isExempt(text)) return
        problems.push(text)
      }

      const onFailure = (error: Error): void => {
        if (isExempt(error.message)) return
        problems.push(error.message)
      }

      page.on('console', onConsole)
      page.on('pageerror', onFailure)

      await use()

      page.off('console', onConsole)
      page.off('pageerror', onFailure)

      if (problems.length > 0) {
        // Deduplicated: one broken fetch often produces the same message
        // several times, and four identical lines bury the real one.
        const unique = [...new Set(problems)]
        throw new Error(`หน้าเว็บมี console error:\n- ${unique.join('\n- ')}`)
      }
    },
    { auto: true },
  ],
})

export const expect = base.expect

/** Reads the robots directives the page itself emitted. */
export async function robotsMeta(page: Page): Promise<{ noindex: boolean; nofollow: boolean }> {
  const content = await page
    .locator('head meta[name="robots"]')
    .first()
    .getAttribute('content')
    .catch(() => null)

  if (!content) return { noindex: false, nofollow: false }

  const value = content.toLowerCase()
  return {
    noindex: value.includes('noindex'),
    nofollow: value.includes('nofollow'),
  }
}

/** Reads the canonical URL the page declared. */
export async function canonicalHref(page: Page): Promise<string | null> {
  return page.locator('head link[rel="canonical"]').first().getAttribute('href').catch(() => null)
}
