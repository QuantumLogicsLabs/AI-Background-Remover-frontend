import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useToast } from '../hooks/useToast'

export default function ForgotPasswordPage() {
  const { showToast } = useToast()

  const [email,     setEmail]     = useState('')
  const [busy,      setBusy]      = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await axios.post('/api/auth/forgot-password', { email: email.trim() })
      setSubmitted(true)
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Something went wrong. Please try again.'
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
            Forgot Password
          </h1>
          <p className="text-secondary text-sm">
            {submitted
              ? 'Check your inbox for the reset link.'
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm flex flex-col gap-5">

          {submitted ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center gap-5 py-2">
              {/* Animated check icon */}
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
                  style={{ animation: 'fadeInUp 0.4s ease both' }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div className="text-center flex flex-col gap-1">
                <p className="text-sm text-secondary leading-relaxed">
                  If <span className="text-primary font-medium">{email}</span> is registered,
                  you'll receive a password reset email within a few minutes.
                </p>
                <p className="text-xs text-muted mt-1">
                  Don't see it? Check your spam folder.
                </p>
              </div>

              <button
                onClick={() => { setSubmitted(false); setEmail('') }}
                className="text-sm font-medium text-magenta hover:underline"
              >
                Try a different email
              </button>
            </div>
          ) : (
            /* ── Form state ── */
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fp-email" className="text-sm font-medium text-secondary">
                  Email address
                </label>
                <input
                  id="fp-email"
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

              {/* Submit */}
              <button
                type="submit"
                disabled={busy || !email}
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
                    Sending…
                  </>
                ) : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-secondary">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-magenta hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
