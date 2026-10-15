import fs from 'fs'
import path from 'path'

const root = process.cwd()
function walk(d, o = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(e.name)) continue
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p, o)
    else if (/\.(ts|tsx)$/.test(e.name)) o.push(p)
  }
  return o
}
const files = walk(path.join(root, 'src'))
const re = /from\s+['"]([^'"]+)['"]/g
const zone = (f) => {
  const r = path.relative(path.join(root, 'src'), f).split(path.sep).join('/')
  if (r.startsWith('app/(admin)')) return 'app/(admin)'
  if (r.startsWith('app/(public)')) return 'app/(public)'
  if (r.startsWith('app/(auth)')) return 'app/(auth)'
  if (r.startsWith('app/')) return 'app/root'
  if (r.startsWith('lib/')) return 'lib/' + r.split('/')[1]
  if (r.startsWith('components/')) return 'components/' + r.split('/')[1]
  if (r.startsWith('hooks/')) return 'hooks'
  return 'other:' + r
}
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  const from = zone(f)
  let m
  while ((m = re.exec(src))) {
    const spec = m[1]
    if (!spec.startsWith('@/')) continue
    const target = path.join(root, 'src', spec.slice(2))
    const cands = [target, ...['.ts', '.tsx'].map((e) => target + e), ...['.ts', '.tsx'].map((e) => path.join(target, 'index' + e))]
    const hit = cands.find((c) => fs.existsSync(c) && fs.statSync(c).isFile())
    if (!hit) {
      console.log(`MISSING ${path.relative(root, f)} -> ${spec}`)
      continue
    }
    const to = zone(hit)
    if (from === to) continue
    if (to.startsWith('app/') || from.startsWith('app/')) {
      console.log(`X-SCOPE ${path.relative(root, f)} [${from}] -> ${spec} [${to}]`)
    }
  }
}
