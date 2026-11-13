import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { getApiErrorMessage } from '../utils/apiError'

const RESEND_SECONDS = 60

interface Props {
  email:      string
  onVerified: () => void
  onBack:     () => void
}

export default function VerifyEmailForm({ email, onVerified, onBack }: Props) {
  const { verifyEmail, resendVerification } = useAuth()
  const { showToast } = useToast()

  const [code, setCode]         = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)
  const submitting = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function submit(value: string) {
    if (value.length !== 6 || submitting.current) return
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      await verifyEmail(email, value)
      showToast('Email verified. Welcome!', 'success')
      onVerified()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Verification failed. Please try again.'))
      setCode('')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    setError(null)
    if (digits.length === 6) void submit(digits)   // auto-submit when complete (also works on paste)
  }

  async function handleResend() {
    if (cooldown > 0) return
    try {
      await resendVerification(email)
      setCooldown(RESEND_SECONDS)
      setError(null)
      showToast('A new code is on its way.', 'info')
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not resend the code.'), 'error')
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void submit(code)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Check your email</h2>
        <p className="text-sm text-secondary">
          We sent a 6-digit code to <span className="font-semibold text-primary break-all">{email}</span>.
          It expires in 10 minutes.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="verify-code" className="text-xs font-semibold text-secondary uppercase tracking-wider">
          Verification code
        </label>
        <input
          id="verify-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          disabled={busy}
          placeholder="••••••"
          onChange={e => handleChange(e.target.value)}
          aria-invalid={!!error}
          className={`w-full px-3.5 py-3 rounded-lg border bg-surface text-center text-2xl font-mono tracking-[0.5em] text-primary placeholder:text-muted focus:outline-none disabled:opacity-50 ${
            error ? 'border-danger focus:border-danger' : 'border-border focus:border-magenta'
          }`}
        />
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>

      <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full py-2.5 text-sm">
        {busy ? 'Verifying…' : 'Verify email'}
      </button>

      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={onBack} className="text-secondary hover:text-primary transition-colors">
          ← Use a different email
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="font-medium text-magenta disabled:text-muted disabled:cursor-not-allowed hover:underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  )
}