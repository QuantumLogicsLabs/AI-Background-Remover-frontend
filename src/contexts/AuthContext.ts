import { createContext, useContext } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  user_id:    string
  name:       string
  email:      string
  created_at: string
}

export interface AuthContextValue {
  user:          AuthUser | null
  token:         string | null
  loading:       boolean       // true while validating stored token on mount
  login:         (email: string, password: string) => Promise<void>
  register:      (name: string, email: string, password: string) => Promise<void>
  verifyEmail:        (email: string, code: string) => Promise<void>  // verifies + signs in
  resendVerification: (email: string) => Promise<void>
  logout:        () => Promise<void>
  refreshUser:   () => Promise<void>
  completeOAuthLogin: () => Promise<void>  // after Google/GitHub redirect
  updateProfile: (data: Partial<Pick<AuthUser, 'name' | 'email'>>) => void
}

// ── Context ────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null)

// ── useAuthContext (raw, internal use) ─────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}

