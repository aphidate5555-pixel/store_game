#!/usr/bin/env node
/**
 * Builds the app and starts it in production mode for the e2e suite.
 *
 * `next dev` is not usable here: in development the client bundle ships a
 * fallback shell for server components, so an assertion like "the product
 * grid rendered these rows" can pass for the wrong reason. A production
 * build makes the tests exercise the same HTML a visitor receives.
 */
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const PORT = process.env.E2E_PORT ?? '3100'
const HOST = '127.0.0.1'

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} → exit ${code}`))
    })
  })
}

console.log('▸ กำลัง build …')
await run('npx', ['next', 'build'])

console.log(`▸ กำลัง start บนพอร์ต ${PORT} …`)

const server = spawn('npx', ['next', 'start', '--hostname', HOST, '--port', PORT], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, NODE_ENV: 'production' },
})

// Wait for the port to answer before handing control back to Playwright.
let ready = false
for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const response = await fetch(`http://${HOST}:${PORT}/`)
    if (response.status > 0) {
      ready = true
      break
    }
  } catch {
    // not listening yet
  }
  await delay(1000)
}

if (!ready) {
  console.error('✕ เซิร์ฟเวอร์ไม่ยอมรับการเชื่อมต่อภายใน 60 วินาที')
  server.kill()
  process.exit(1)
}

console.log(`✓ พร้อมที่ http://${HOST}:${PORT}`)

const shutdown = () => {
  server.kill()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

server.on('exit', (code) => process.exit(code ?? 0))
