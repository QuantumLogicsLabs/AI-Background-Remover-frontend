import { describe, it, expect } from 'vitest'
import {
  ALLOWED_EMAIL_DOMAINS,
  cleanName,
  cleanEmail,
  validateName,
  validateEmail,
  validateGoogleEmail,
} from '../validation'

// Built from the configured list so these tests still pass if someone sets
// VITE_ALLOWED_EMAIL_DOMAINS in their .env.
const GOOD_DOMAIN = ALLOWED_EMAIL_DOMAINS[0]

describe('cleanName / cleanEmail', () => {
  it('trims and collapses whitespace in names', () => {
    expect(cleanName('  Ali   Noor ')).toBe('Ali Noor')
  })

  it('trims and lowercases emails', () => {
    expect(cleanEmail('  User@Gmail.COM ')).toBe('user@gmail.com')
  })
})

describe('validateName', () => {
  it.each(['Alice', 'Al', "O'Brien", 'Jean-Luc', 'José', 'Ali  ce', 'user_01'])(
    'accepts %s',
    (value) => {
      expect(validateName(value)).toBeNull()
    },
  )

  it('requires a name', () => {
    expect(validateName('   ')).toMatch(/required/i)
  })

  it('enforces the minimum length', () => {
    expect(validateName('A')).toMatch(/at least/i)
  })

  it('enforces the maximum length', () => {
    expect(validateName('x'.repeat(81))).toMatch(/or fewer/i)
  })

  it('rejects unusual characters', () => {
    expect(validateName('Bob <script>')).toMatch(/letters, numbers/i)
  })
})

describe('validateEmail', () => {
  it('accepts a normal address', () => {
    expect(validateEmail('a@b.co')).toBeNull()
  })

  it.each(['', 'bad', 'a b@c.com', 'a@b'])('rejects %j', (value) => {
    expect(validateEmail(value)).not.toBeNull()
  })

  it('rejects very long addresses', () => {
    expect(validateEmail(`${'a'.repeat(250)}@b.co`)).toMatch(/too long/i)
  })
})

describe('ALLOWED_EMAIL_DOMAINS', () => {
  it('is a non-empty list of trimmed, lowercase domains', () => {
    expect(ALLOWED_EMAIL_DOMAINS.length).toBeGreaterThan(0)
    for (const domain of ALLOWED_EMAIL_DOMAINS) {
      expect(domain).toBe(domain.trim().toLowerCase())
      expect(domain).not.toBe('')
    }
  })
})

describe('validateGoogleEmail', () => {
  it('accepts an address on an allowed domain', () => {
    expect(validateGoogleEmail(`user@${GOOD_DOMAIN}`)).toBeNull()
  })

  it('ignores letter case and surrounding spaces', () => {
    expect(validateGoogleEmail(`  USER@${GOOD_DOMAIN.toUpperCase()} `)).toBeNull()
  })

  it('rejects addresses on other domains', () => {
    expect(validateGoogleEmail('user@not-allowed.example')).toMatch(/Only Google/i)
  })

  it('reports format problems before domain problems', () => {
    expect(validateGoogleEmail('not-an-email')).toMatch(/valid email/i)
  })

  it('reports an empty field as required', () => {
    expect(validateGoogleEmail('')).toMatch(/required/i)
  })
})