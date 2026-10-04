import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
// `vitest/config` rather than `vite` so the `test` block below is typed.
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Node for now: the tests that matter are the pure functions in lib/ and
    // in each feature. A DOM environment gets added with the first component
    // test that needs one, not in advance.
    environment: 'node',
    // `lib/supabase.ts` refuses to load without these, and some modules under
    // test import it without ever calling it. Placeholders, so a checkout with
    // no `.env` runs the suite; a test that really reached Supabase would fail
    // loudly against them, which is the point.
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:1',
      VITE_SUPABASE_ANON_KEY: 'unit-tests-do-not-call-supabase',
    },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'supabase/functions/**/*.test.ts'],
  },
})
