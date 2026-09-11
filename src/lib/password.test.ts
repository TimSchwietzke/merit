import { describe, expect, it } from 'vitest'

import { MIN_PASSWORD, passwordProblem } from '@/lib/password'

describe('passwordProblem', () => {
  it('accepts a long enough password entered twice', () => {
    expect(passwordProblem('correct-horse', 'correct-horse')).toBeNull()
  })

  it('rejects one character below the minimum', () => {
    const short = 'x'.repeat(MIN_PASSWORD - 1)
    expect(passwordProblem(short, short)).toBe('tooShort')
  })

  it('accepts exactly the minimum', () => {
    const exact = 'x'.repeat(MIN_PASSWORD)
    expect(passwordProblem(exact, exact)).toBeNull()
  })

  it('reports a mismatch when the repeat differs', () => {
    expect(passwordProblem('correct-horse', 'correct-hors')).toBe('mismatch')
  })

  it('names the length first when both entries are short and different', () => {
    // Otherwise the user fixes the typo and is then told the password is too
    // short — two round trips for one form.
    expect(passwordProblem('abc', 'abd')).toBe('tooShort')
  })

  it('treats whitespace as part of the password', () => {
    // Trimming here would silently accept a password the sign-in form would
    // then reject, because Supabase does not trim it either.
    expect(passwordProblem('  spaced  ', '  spaced')).toBe('mismatch')
  })
})
