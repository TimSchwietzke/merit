/**
 * Maps whatever `supabase.auth` threw onto one i18n key.
 *
 * A pure function rather than a `switch` inside the component, so it can be
 * tested against the shapes the library actually returns (CLAUDE.md: logic
 * that decides something lives outside components and gets a test).
 *
 * The voice rule applies to what these keys resolve to: name what failed and
 * what to do, in one sentence, without apology (DESIGN.md §14).
 */
export type AuthErrorKey =
  | 'auth.errors.invalidCredentials'
  | 'auth.errors.rateLimited'
  | 'auth.errors.offline'
  | 'auth.errors.unknown'

/** Supabase returns `code` on newer errors and only `status` on older ones, so
 *  both are read. Nothing here assumes a message string — those are English,
 *  server-side, and not stable enough to match on. */
interface AuthErrorish {
  code?: string
  status?: number
  name?: string
}

export function authErrorKey(error: unknown): AuthErrorKey {
  if (error === null || typeof error !== 'object') return 'auth.errors.unknown'

  const { code, status, name } = error as AuthErrorish

  // A failed fetch has no HTTP status at all — the request never landed.
  if (code === 'network_error' || name === 'AuthRetryableFetchError' || name === 'TypeError') {
    return 'auth.errors.offline'
  }

  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429) {
    return 'auth.errors.rateLimited'
  }

  // `invalid_credentials` covers both a wrong password and an address with no
  // account. Saying which would tell an attacker whether the address exists.
  if (code === 'invalid_credentials' || code === 'email_not_confirmed' || status === 400) {
    return 'auth.errors.invalidCredentials'
  }

  return 'auth.errors.unknown'
}
