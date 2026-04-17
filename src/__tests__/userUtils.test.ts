import { describe, it, expect } from 'vitest'
import { isAnonymousUser, getUserType } from '@/lib/userUtils'
import type { User } from '@supabase/supabase-js'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-id',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
    is_anonymous: false,
    email: undefined,
    phone: undefined,
    identities: [],
    ...overrides,
  } as User
}

describe('isAnonymousUser', () => {
  it('returns true when is_anonymous flag is true', () => {
    const user = makeUser({ is_anonymous: true })
    expect(isAnonymousUser(user)).toBe(true)
  })

  it('returns false when user has email', () => {
    const user = makeUser({ email: 'test@example.com', is_anonymous: false })
    expect(isAnonymousUser(user)).toBe(false)
  })

  it('returns false when user has phone', () => {
    const user = makeUser({ phone: '+819012345678', is_anonymous: false })
    expect(isAnonymousUser(user)).toBe(false)
  })

  it('returns false when user has OAuth identity', () => {
    const user = makeUser({
      is_anonymous: false,
      identities: [{ id: 'google-id', provider: 'google' } as never],
    })
    expect(isAnonymousUser(user)).toBe(false)
  })

  it('returns true when no email, phone, or identities (fallback)', () => {
    // Handles case where is_anonymous is undefined (old Supabase versions)
    const user = makeUser({ is_anonymous: undefined as never })
    expect(isAnonymousUser(user)).toBe(true)
  })

  it('returns true for freshly created anonymous user', () => {
    const user = makeUser({ is_anonymous: true, identities: [] })
    expect(isAnonymousUser(user)).toBe(true)
  })
})

describe('getUserType', () => {
  it('returns anonymous for null user', () => {
    expect(getUserType(null, false)).toBe('anonymous')
  })

  it('returns anonymous for anonymous user', () => {
    const user = makeUser({ is_anonymous: true })
    expect(getUserType(user, false)).toBe('anonymous')
  })

  it('returns registered for logged-in non-premium user', () => {
    const user = makeUser({ email: 'user@example.com', is_anonymous: false, identities: [{ id: '1' } as never] })
    expect(getUserType(user, false)).toBe('registered')
  })

  it('returns premium for logged-in premium user', () => {
    const user = makeUser({ email: 'user@example.com', is_anonymous: false, identities: [{ id: '1' } as never] })
    expect(getUserType(user, true)).toBe('premium')
  })

  it('anonymous user is never premium even if isPremium=true', () => {
    const user = makeUser({ is_anonymous: true })
    expect(getUserType(user, true)).toBe('anonymous')
  })
})
