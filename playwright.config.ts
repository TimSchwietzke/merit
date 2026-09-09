import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

/**
 * The visual harness only. It never reaches Supabase — `e2e/fixtures.ts` seeds
 * the session and answers the profile query locally — but the client is
 * constructed at import time from VITE_SUPABASE_URL, so the URL is read here to
 * derive the storage key supabase-js uses. Neither value is secret: the anon key
 * ships in the bundle by design (.env.example).
 */
const env = loadEnv('development', process.cwd(), 'VITE_')
const ref = (env.VITE_SUPABASE_URL ?? '').replace(/^https?:\/\//, '').split('.')[0] || 'localhost'

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: true,
  reporter: [['list']],
  // A capture that cannot settle in 20s is a hang, not a slow page. Failing
  // fast keeps a broken wait from stalling the whole matrix.
  timeout: 20_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    ...devices['Desktop Chrome'],
    channel: 'chromium-headless-shell',
    // A synthetic camera, auto-granted. Without it the scanner screen only ever
    // captures its no-permission state, and the viewport chrome — the frame and
    // the reticle §10.10 specifies — is never actually looked at.
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
  },
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    // Always a fresh server, always torn down: a stray dev server left holding
    // the port from an interrupted run gets silently reused otherwise, and then
    // every capture hangs against it.
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
  },
  metadata: { ref },
})

process.env.MERIT_SUPABASE_REF = ref
