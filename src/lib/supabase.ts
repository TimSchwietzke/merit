import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail at startup with a sentence that names the fix, rather than at the first
// query with a stack trace from inside the library.
if (!url || !anonKey) {
  throw new Error(
    'Supabase is not configured. Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

/**
 * The one Supabase client. The anon key is public and belongs in the bundle;
 * the service-role key never appears in client code (CLAUDE.md hard rule 2).
 *
 * On storage: supabase-js keeps the session in `localStorage`. This is the one
 * exception to hard rule 4 and DESIGN.md §17, and it is deliberate — the rule
 * is about *application* data, and GOAL.md §8 already assumes the auth session
 * token exists ("as long as the only cookie/token is the auth session, no
 * cookie banner is required"). `sessionStorage` would sign the user out every
 * time they close the tab, which is the wrong trade for an app opened between
 * two sets. Nothing else in Merit goes near it.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
