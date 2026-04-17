import type { User } from '@supabase/supabase-js'

export type UserType = 'anonymous' | 'registered' | 'premium'

/**
 * Detects anonymous Supabase users reliably.
 * Checks is_anonymous flag first, then falls back to checking
 * that the user has no email, phone, or linked identities.
 */
export function isAnonymousUser(user: User): boolean {
  if (user.is_anonymous === true) return true
  const hasCredential = Boolean(user.email) || Boolean(user.phone)
  const hasIdentity = (user.identities?.length ?? 0) > 0
  return !hasCredential && !hasIdentity
}

export function getUserType(user: User | null, isPremium: boolean): UserType {
  if (!user || isAnonymousUser(user)) return 'anonymous'
  if (isPremium) return 'premium'
  return 'registered'
}
