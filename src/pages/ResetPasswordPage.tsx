import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useToast } from '../hooks/useToast'

export default function ResetPasswordPage() {
  const { showToast } = useToast()
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const token         = params.get('token') ?? ''

  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy,        setBusy]        = useState(false)
  const [done,        setDone]        = useState(false)

  // Inline validation
  const tooShort    = password.length > 0 && password.length < 8
  const mismatch    = confirm.length > 0 && password !== confirm
  const canSubmit   = !busy && password.length >= 8 && password === confirm && token

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        new_password: password,
      })
      setDone(true)
      showToast('Password reset successfully! You can now sign in.', 'success')
      // Redirect to login after 3 s
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Failed to reset password. Please try again.'
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  // ── No token in URL ──────────────────────────────────────────────────────
  if (!token) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm flex flex-col gap-8">
          <div className="text-center flex flex-col gap-2">
            <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
              Invalid Link
            </h1>
            <p className="text-secondary text-sm">
              This reset link is missing or malformed.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm flex flex-col items-center gap-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-12 h-12 text-muted"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm text-secondary text-center">
              Please use the link sent to your email, or request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="w-full text-center px-5 py-2.5 rounded-lg bg-magenta hover:bg-magenta-hover
                text-white font-semibold text-sm transition-all active:scale-95"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Header */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
            Set New Password
          </h1>
          <p className="text-secondary text-sm">
            {done
              ? 'Redirecting you to sign in…'
              : 'Choose a strong password for your account.'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm flex flex-col gap-5">

          {done ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center gap-5 py-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(224,64,251,0.12)' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-8 h-8 text-magenta"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm text-secondary text-center leading-relaxed">
                Your password has been reset successfully.<br />
                Redirecting to sign in…
              </p>
              <Link
                to="/login"
                className="text-sm font-medium text-magenta hover:underline"
              >
                Go to Sign In now
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

              {/* New Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rp-password" className="text-sm font-medium text-secondary">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="rp-password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={busy}
                    placeholder="Min. 8 characters"
                    className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border bg-surface-raised
                      text-sm text-primary placeholder:text-muted
                      focus:outline-none focus:ring-1 disabled:opacity-50
                      ${tooShort
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-border focus:border-magenta focus:ring-magenta/30'}`}
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
                {tooShort && (
                  <p className="text-xs text-red-400 mt-0.5">Password must be at least 8 characters.</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rp-confirm" className="text-sm font-medium text-secondary">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="rp-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    disabled={busy}
                    placeholder="Re-enter password"
                    className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border bg-surface-raised
                      text-sm text-primary placeholder:text-muted
                      focus:outline-none focus:ring-1 disabled:opacity-50
                      ${mismatch
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-border focus:border-magenta focus:ring-magenta/30'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? (
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
                {mismatch && (
                  <p className="text-xs text-red-400 mt-0.5">Passwords do not match.</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
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
                    Resetting…
                  </>
                ) : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-secondary">
          Back to{' '}
          <Link to="/login" className="font-medium text-magenta hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
