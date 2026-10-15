#!/usr/bin/env node
/**
 * Fails CI if a privileged key ever reaches the repository or the bundle.
 *
 * The production application talks to Supabase with the anon key only. A
 * service_role key, or the JWT secret, in the tree would let anyone who
 * clones the project read and write every row, so the check is a hard gate
 * rather than a lint warning.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

const SCANNED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.sql',
  '.yml',
  '.yaml',
  '.toml',
  '.env',
])

const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.next',
  '.git',
  'playwright-report',
  'test-results',
  'out',
  'coverage',
])

/**
 * Matches the *value* of a privileged key, not the word itself. The rules and
 * the comments legitimately mention service_role, so a naive grep produces
 * false positives and the check gets ignored.
 */
const SECRET_VALUE_PATTERNS = [
  { name: 'service_role key', pattern: /service_role[_-]?key["']?\s*[:=]\s*["'][A-Za-z0-9._-]{20,}/i },
  { name: 'legacy JWT', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'supabase service key env', pattern: /SUPABASE_SERVICE_ROLE\s*=\s*\S+/ },
  { name: 'jwt secret env', pattern: /JWT_SECRET\s*=\s*\S+/ },
  { name: 'db password', pattern: /postgres(ql)?:\/\/[^:\s]+:[^@\s]+@/i },
]

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue
      yield* walk(join(dir, entry.name))
      continue
    }
    if (!entry.isFile()) continue
    const ext = extname(entry.name)
    if (!SCANNED_EXTENSIONS.has(ext) && !entry.name.startsWith('.env')) continue
    yield join(dir, entry.name)
  }
}

const findings = []

for await (const file of walk(ROOT)) {
  const info = await stat(file).catch(() => null)
  if (!info || info.size > 2_000_000) continue

  const contents = await readFile(file, 'utf8').catch(() => null)
  if (!contents) continue

  for (const { name, pattern } of SECRET_VALUE_PATTERNS) {
    if (pattern.test(contents)) {
      findings.push({ file: relative(ROOT, file), kind: name })
    }
  }
}

// .env.local is gitignored but still present on disk, so it is checked too.
const localEnv = join(ROOT, '.env.local')
const localExists = await stat(localEnv).then(() => true).catch(() => false)
if (localExists) {
  const contents = await readFile(localEnv, 'utf8')
  for (const { name, pattern } of SECRET_VALUE_PATTERNS) {
    if (pattern.test(contents)) {
      findings.push({ file: '.env.local', kind: name })
    }
  }
}

if (findings.length > 0) {
  console.error('✗ พบคีย์ที่มีสิทธิ์สูงในโปรเจกต์:')
  for (const finding of findings) {
    console.error(`  · ${finding.file} — ${finding.kind}`)
  }
  console.error('\nแอป production ต้องใช้เฉพาะ anon key เท่านั้น (F-16)')
  process.exit(1)
}

console.log('✓ ไม่พบ service_role / JWT secret ในโปรเจกต์')
