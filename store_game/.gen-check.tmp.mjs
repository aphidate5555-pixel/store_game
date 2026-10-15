import fs from 'node:fs'
let src = fs.readFileSync('scripts/generate-rebuild.mjs', 'utf8')
src = src.replace(
  "writeFileSync('supabase/migrations/REBUILD.sql', teardown + parts + restore)",
  "writeFileSync('.rebuild-expected.tmp.sql', teardown + parts + restore)",
)
fs.writeFileSync('.gen-check-inner.tmp.mjs', src)