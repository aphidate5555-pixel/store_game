import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * One config, two kinds of suite, separated by an explicit environment
 * docblock rather than by a projects array.
 *
 * `projects` arrived in Vitest 3; this project pins 2.1, so the split is done
 * the way 2.1 supports it. The unit files declare `jsdom` in a docblock and
 * the guard files declare `node`, which keeps the default here irrelevant to
 * either.
 *
 * The unit include deliberately excludes tests/guards: a unit test that can
 * reach the database passes on a laptop with a connection and fails on an
 * offline runner, and it starts depending on data it does not control.
 */

/**
 * Next.js loads `.env.local` for the app; Vitest does not. Without this the
 * guard suite read `process.env`, found nothing, and reported 21 skipped
 * tests as a green run — which is the failure mode the guards exist to
 * prevent. A guard that silently cannot run is worse than no guard.
 *
 * Real environment variables win over the file, so CI secrets are never
 * overridden by whatever happens to be on disk.
 */
function readLocalEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const name of ['.env.local', '.env']) {
    const path = fileURLToPath(new URL(name, import.meta.url))
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      if (process.env[key] !== undefined) continue
      out[key] = trimmed.slice(eq + 1).trim()
    }
  }
  return out
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Top level, because a `resolve` block nested under a workspace entry is
    // not inherited — and then every `@/` import fails to resolve.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    env: readLocalEnv(),
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/guards/**/*.test.ts',
    ],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
