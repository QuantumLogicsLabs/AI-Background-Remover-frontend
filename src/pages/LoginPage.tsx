import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function LoginPage() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await login(email.trim(), password)
      showToast('Successfully signed in.', 'success')
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Login failed. Please check your credentials.'
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Header */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
            Welcome back
          </h1>
          <p className="text-secondary text-sm">
            Sign in to access your workspace.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm flex flex-col gap-5">

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-secondary">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={busy}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface-raised
                  text-sm text-primary placeholder:text-muted
                  focus:outline-none focus:border-magenta focus:ring-1 focus:ring-magenta/30
                  disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-secondary">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-magenta hover:underline"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={busy}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-border bg-surface-raised
                    text-sm text-primary placeholder:text-muted
                    focus:outline-none focus:border-magenta focus:ring-1 focus:ring-magenta/30
                    disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                      <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy || !email || !password}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5
                rounded-lg bg-magenta hover:bg-magenta-hover text-white font-semibold text-sm
                transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                disabled:hover:bg-magenta disabled:active:scale-100 mt-1"
            >
              {busy ? (
                <>
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg"
                    fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-magenta hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
