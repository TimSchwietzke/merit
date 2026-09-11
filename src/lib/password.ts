/** Shortest password Merit accepts. Supabase's own floor is six; eight is the
 *  current NIST minimum and the difference costs the user two keystrokes. */
export const MIN_PASSWORD = 8

export type PasswordProblem = 'tooShort' | 'mismatch' | null

/**
 * What is wrong with a new password, or null if nothing is.
 *
 * Order matters: a password typed identically wrong twice should be told it is
 * too short, not that it matches. Checking length first means the message
 * names the thing the user has to change.
 */
export function passwordProblem(next: string, repeat: string): PasswordProblem {
  if (next.length < MIN_PASSWORD) return 'tooShort'
  if (next !== repeat) return 'mismatch'
  return null
}
