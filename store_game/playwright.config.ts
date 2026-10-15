import { defineConfig, devices } from '@playwright/test'

/**
 * The locale and time zone are pinned so a date rendered by the app cannot
 * differ between the developer's machine and CI. Without them a test that
 * asserts on a formatted timestamp passes locally and fails on a server
 * running in UTC.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // One sign-in, reused through storage state. A missing credential is a
  // warning here and a skip in the admin tests, not a failure.
  globalSetup: './playwright.global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100',
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'iPhone 14', use: { ...devices['iPhone 14'] } },
  ],

  // A production build rather than `next dev`: dev mode renders the fallback
  // shell for client components, which would make several assertions pass for
  // the wrong reason.
  webServer: {
    command: 'node scripts/e2e-build-and-start.mjs',
    url: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
