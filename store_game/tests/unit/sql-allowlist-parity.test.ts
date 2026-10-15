import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { EXTERNAL_HOSTS } from '@/lib/validation/url'

const SQL_PATH = join(process.cwd(), 'supabase', 'migrations', '01_extensions_and_helpers.sql')

/**
 * Extracts the host literals from the SQL helper.
 *
 * The SQL embeds them as single-quoted strings inside a plpgsql return
 * statement, so the reliable shape is the quoted run itself rather than a
 * parse of the SQL — a full parser here would be a second implementation of
 * the thing being checked.
 */
function hostsFromSql(source: string): Set<string> {
  const start = source.indexOf('create or replace function public.is_safe_social')
  expect(start, 'is_safe_social must exist in 01_extensions_and_helpers.sql').toBeGreaterThan(-1)

  const body = source.slice(start, source.indexOf('$$;', start))

  // The helper also quotes the scheme ('https') and the comparison operator,
  // so anything carrying a colon or a dot is filtered out: a host cannot
  // contain either.
  const candidates = body.match(/'[a-z0-9.-]+'/gi) ?? []
  return new Set(
    candidates
      .map((match) => match.slice(1, -1))
      .filter((value) => value.includes('.') && !value.includes(':')),
  )
}

const sqlSource = (() => {
  try {
    return readFileSync(SQL_PATH, 'utf8')
  } catch {
    return null
  }
})()

/**
 * C-13: the allowlist exists in two languages, and a host added to one but not
 * the other is a link that validates in the form and is rejected by the
 * database — or the reverse, which is worse: a value the column accepts and
 * the UI then renders as an anchor.
 *
 * Skips rather than fails when the migrations directory is absent, because
 * the published npm package and some CI checkouts do not carry it.
 */
const maybe = sqlSource === null ? describe.skip : describe

maybe('SQL / TypeScript allowlist parity', () => {
  it('every TypeScript host appears in the SQL helper', () => {
    const sqlHosts = hostsFromSql(sqlSource as string)
    for (const host of EXTERNAL_HOSTS) {
      expect(sqlHosts.has(host), `SQL is missing host: ${host}`).toBe(true)
    }
  })

  it('every SQL host appears in the TypeScript set', () => {
    const sqlHosts = hostsFromSql(sqlSource as string)
    const tsHosts = new Set<string>(EXTERNAL_HOSTS)
    for (const host of sqlHosts) {
      expect(tsHosts.has(host), `TypeScript is missing host: ${host}`).toBe(true)
    }
  })

  it('neither side carries a wildcard', () => {
    // A '*' in either list would silently re-open the allowlist.
    expect(EXTERNAL_HOSTS).not.toContain('*')
    for (const host of hostsFromSql(sqlSource as string)) {
      expect(host).not.toContain('*')
    }
  })
})
