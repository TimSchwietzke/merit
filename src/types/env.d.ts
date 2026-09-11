/// <reference types="vite/client" />

/** The two variables from `.env.example`. Both are public by design, access
 *  control is Row Level Security in Postgres, never a hidden anon key. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
