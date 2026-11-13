import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import type { AuthUser } from '../contexts/AuthContext'
import { NAME_MAX, cleanName, cleanEmail, validateName, validateGoogleEmail } from '../utils/validation'
import { getApiErrorMessage } from '../utils/apiError'

interface Props {
  onSaved?:   () => void
  onCancel?:  () => void
  idPrefix?:  string
}

const inputBase =
  'w-full px-3.5 py-2.5 rounded-lg border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 disabled:opacity-50'
const ok  = 'border-border focus:border-magenta focus:ring-magenta/30'
const bad = 'border-danger/60 focus:border-danger focus:ring-danger/30'
const ghostBtn =
  'px-4 py-2.5 rounded-lg text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-raised border border-border transition-colors disabled:opacity-40'

export default function ProfileForm({ onSaved, onCancel, idPrefix = 'profile' }: Props) {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()

  // ── Name ──
  const [name, setName] = useState(user?.name ?? '')
  const [nameTouched, setNameTouched] = useState(false)
  const [nameBusy, setNameBusy] = useState(false)
  const nameChanged = cleanName(name) !== (user?.name ?? '')
  const nameErr = nameChanged ? validateName(name) : null

  async function saveName(e: FormEvent) {
    e.preventDefault()
    setNameTouched(true)
    if (!nameChanged || nameErr || nameBusy) return
    setNameBusy(true)
    try {
      const res = await axios.patch<AuthUser>('/api/auth/profile', { name: cleanName(name) })
      updateProfile({ name: res.data.name })
      setName(res.data.name)
      setNameTouched(false)
      showToast('Name updated successfully!', 'success')
      onSaved?.()
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to update name.'), 'error')
    } finally {
      setNameBusy(false)
    }
  }

  // ── Email (two steps: send code, then confirm) ──
  const [emailStep, setEmailStep] = useState<'idle' | 'enter' | 'code'>('idle')
  const [newEmail, setNewEmail]   = useState('')
  const [code, setCode]           = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailBusy, setEmailBusy]   = useState(false)

  function resetEmailFlow() {
    setEmailStep('idle'); setNewEmail(''); setCode(''); setEmailError(null)
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    const clientErr = validateGoogleEmail(newEmail)
    if (clientErr) { setEmailError(clientErr); return }
    if (cleanEmail(newEmail) === (user?.email ?? '').toLowerCase()) {
      setEmailError('That is already your email address.')
      return
    }
    setEmailBusy(true)
    setEmailError(null)
    try {
      await axios.post('/api/auth/email-change', { email: cleanEmail(newEmail) })
      setEmailStep('code')
      showToast(`We sent a 6-digit code to ${cleanEmail(newEmail)}.`, 'success')
    } catch (err) {
      setEmailError(getApiErrorMessage(err, 'Could not send the code.'))
    } finally {
      setEmailBusy(false)
    }
  }

  async function confirmCode(e: FormEvent) {
    e.preventDefault()
    if (code.length !== 6 || emailBusy) return
    setEmailBusy(true)
    setEmailError(null)
    try {
      const res = await axios.post<AuthUser>('/api/auth/email-change/confirm', { code })
      updateProfile({ email: res.data.email })
      showToast('Email updated successfully!', 'success')
      resetEmailFlow()
      onSaved?.()
    } catch (err) {
      setEmailError(getApiErrorMessage(err, 'Could not verify the code.'))
      setCode('')
    } finally {
      setEmailBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Name */}
      <form onSubmit={saveName} noValidate className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium text-secondary">Display name</label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          autoComplete="name"
          value={name}
          maxLength={NAME_MAX + 20}
          disabled={nameBusy}
          placeholder="Your name"
          onChange={e => setName(e.target.value)}
          onBlur={() => setNameTouched(true)}
          aria-invalid={nameTouched && !!nameErr}
          className={`${inputBase} ${nameTouched && nameErr ? bad : ok}`}
        />
        <p className={`text-xs ${nameTouched && nameErr ? 'text-danger' : 'text-muted'}`}>
          {nameTouched && nameErr ? nameErr : `2–${NAME_MAX} characters. Letters, numbers, spaces and . ' - _`}
        </p>
        <div className="flex justify-end gap-2 pt-1.5">
          {onCancel && <button type="button" onClick={onCancel} className={ghostBtn}>Close</button>}
          <button type="submit" disabled={!nameChanged || !!nameErr || nameBusy} className="btn-primary text-xs py-2.5 px-5">
            {nameBusy ? 'Saving...' : 'Save name'}
          </button>
        </div>
      </form>

      <div className="border-t border-border/60" />

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-secondary">Email address</span>

        {emailStep === 'idle' && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-border bg-surface-raised">
            <span className="text-sm text-primary truncate">{user?.email}</span>
            <button type="button" onClick={() => setEmailStep('enter')} className="text-xs font-semibold text-magenta hover:underline shrink-0">
              Change
            </button>
          </div>
        )}

        {emailStep === 'enter' && (
          <form onSubmit={sendCode} noValidate className="flex flex-col gap-1.5">
            <input
              id={`${idPrefix}-new-email`}
              type="email"
              autoFocus
              autoComplete="email"
              inputMode="email"
              value={newEmail}
              disabled={emailBusy}
              placeholder="new.address@gmail.com"
              onChange={e => { setNewEmail(e.target.value); setEmailError(null) }}
              aria-label="New email address"
              className={`${inputBase} ${emailError ? bad : ok}`}
            />
            <p className={`text-xs ${emailError ? 'text-danger' : 'text-muted'}`} role={emailError ? 'alert' : undefined}>
              {emailError ?? 'Must be a Google (Gmail) address. We will send a code to confirm it.'}
            </p>
            <div className="flex justify-end gap-2 pt-1.5">
              <button type="button" onClick={resetEmailFlow} disabled={emailBusy} className={ghostBtn}>Cancel</button>
              <button type="submit" disabled={emailBusy || !newEmail.trim()} className="btn-primary text-xs py-2.5 px-5">
                {emailBusy ? 'Sending...' : 'Send code'}
              </button>
            </div>
          </form>
        )}

        {emailStep === 'code' && (
          <form onSubmit={confirmCode} noValidate className="flex flex-col gap-1.5">
            <p className="text-xs text-secondary">
              Enter the 6-digit code we sent to <span className="font-semibold text-primary">{cleanEmail(newEmail)}</span>.
            </p>
            <input
              id={`${idPrefix}-email-code`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={code}
              disabled={emailBusy}
              placeholder="••••••"
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setEmailError(null) }}
              aria-label="Verification code"
              className={`${inputBase} text-center text-xl font-mono tracking-[0.4em] ${emailError ? bad : ok}`}
            />
            {emailError && <p className="text-xs text-danger" role="alert">{emailError}</p>}
            <div className="flex justify-end gap-2 pt-1.5">
              <button type="button" onClick={resetEmailFlow} disabled={emailBusy} className={ghostBtn}>Cancel</button>
              <button type="submit" disabled={emailBusy || code.length !== 6} className="btn-primary text-xs py-2.5 px-5">
                {emailBusy ? 'Verifying...' : 'Confirm email'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}