import { describe, expect, it } from 'vitest'

import { authErrorKey } from '@/features/auth/auth-errors'

/**
 * The shapes below are the ones `@supabase/supabase-js` actually returns, not
 * invented ones, that is the whole value of this test. If a Supabase upgrade
 * renames a code, this fails instead of the UI quietly falling back to the
 * generic message for every failure.
 */
describe('authErrorKey', () => {
  it('maps a wrong password to the credentials message', () => {
    expect(authErrorKey({ name: 'AuthApiError', status: 400, code: 'invalid_credentials' })).toBe(
      'auth.errors.invalidCredentials',
    )
  })

  it('maps an unconfirmed address to the same message, not a distinct one', () => {
    // Telling the two apart would confirm to an attacker that the address
    // exists, so both resolve to one string.
    expect(authErrorKey({ name: 'AuthApiError', status: 400, code: 'email_not_confirmed' })).toBe(
      'auth.errors.invalidCredentials',
    )
  })

  it('maps a failed fetch to offline rather than to bad credentials', () => {
    expect(authErrorKey({ name: 'AuthRetryableFetchError', status: 0 })).toBe('auth.errors.offline')
  })

  it('prefers offline over the 400 fallback when both could match', () => {
    // A retryable fetch error can carry a status; the network branch runs first
    // or a gym with no signal reads as "wrong password".
    expect(authErrorKey({ name: 'AuthRetryableFetchError', status: 400 })).toBe('auth.errors.offline')
  })

  it('maps rate limiting by code and by bare status', () => {
    expect(authErrorKey({ status: 429, code: 'over_request_rate_limit' })).toBe('auth.errors.rateLimited')
    expect(authErrorKey({ status: 429 })).toBe('auth.errors.rateLimited')
  })

  it('falls back for anything unrecognised, including non-objects', () => {
    expect(authErrorKey({ name: 'AuthApiError', status: 500 })).toBe('auth.errors.unknown')
    expect(authErrorKey(null)).toBe('auth.errors.unknown')
    expect(authErrorKey('boom')).toBe('auth.errors.unknown')
    expect(authErrorKey(undefined)).toBe('auth.errors.unknown')
  })
})
