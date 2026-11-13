import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import type { AuthUser } from '../contexts/AuthContext'
import {
  NAME_MAX, EMAIL_MAX,
  cleanName, cleanEmail, validateName, validateEmail,
} from '../utils/validation'

interface Props {
  onSaved?: () => void
  onCancel?: () => void
  idPrefix?: string
}

type FieldErrors = { name?: string; email?: string }

function parseApiError(err: unknown): { field?: 'name' | 'email'; message: string } {
  if (!axios.isAxiosError(err)) return { message: 'Failed to update profile.' }
  if (!err.response) return { message: 'Network error. Check your connection and try again.' }

  const detail = err.response.data?.detail
  if (err.response.status === 409) return { field: 'email', message: String(detail || 'That email is already in use.') }
  if (typeof detail === 'string') return { message: detail }
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as { loc?: unknown[]; msg?: string }
    const field = first.loc?.includes('email') ? 'email' : first.loc?.includes('name') ? 'name' : undefined
    return { field, message: first.msg || 'Invalid value.' }
  }
  return { message: 'Failed to update profile.' }
}

function Spinner() {
  return (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default function ProfileForm({ onSaved, onCancel, idPrefix = 'profile' }: Props) {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()

  const [name, setName]   = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [touched, setTouched] = useState({ name: false, email: false })
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)

  const nameChanged  = cleanName(name)   !== (user?.name ?? '')
  const emailChanged = cleanEmail(email) !== (user?.email ?? '').toLowerCase()

  // Only validate fields the user actually changed
  const nameErr  = nameChanged  ? validateName(name)   : null
  const emailErr = emailChanged ? validateEmail(email) : null

  const shownNameErr  = serverErrors.name  ?? (touched.name  ? nameErr  : null)
  const shownEmailErr = serverErrors.email ?? (touched.email ? emailErr : null)

  const canSubmit = (nameChanged || emailChanged) && !nameErr && !emailErr && !busy

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ name: true, email: true })
    if (!canSubmit) return

    const payload: { name?: string; email?: string } = {}
    if (nameChanged)  payload.name  = cleanName(name)
    if (emailChanged) payload.email = cleanEmail(email)

    setBusy(true)
    setServerErrors({})
    try {
      const res = await axios.patch<AuthUser>('/api/auth/profile', payload)
      updateProfile({ name: res.data.name, email: res.data.email })
      setName(res.data.name)
      setEmail(res.data.email)
      setTouched({ name: false, email: false })
      showToast('Profile updated successfully!', 'success')
      onSaved?.()
    } catch (err) {
      const { field, message } = parseApiError(err)
      if (field) setServerErrors({ [field]: message })
      else showToast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  function handleReset() {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setTouched({ name: false, email: false })
    setServerErrors({})
  }

  const inputBase =
    'w-full px-3.5 py-2.5 rounded-lg border bg-surface-raised text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 disabled:opacity-50'
  const ok  = 'border-border focus:border-magenta focus:ring-magenta/30'
  const bad = 'border-danger/60 focus:border-danger focus:ring-danger/30'

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium text-secondary">Display name</label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          autoComplete="name"
          autoFocus
          value={name}
          maxLength={NAME_MAX + 20}
          disabled={busy}
          placeholder="Your name"
          onChange={e => { setName(e.target.value); setServerErrors(s => ({ ...s, name: undefined })) }}
          onBlur={() => setTouched(t => ({ ...t, name: true }))}
          aria-invalid={!!shownNameErr}
          aria-describedby={`${idPrefix}-name-msg`}
          className={`${inputBase} ${shownNameErr ? bad : ok}`}
        />
        <p id={`${idPrefix}-name-msg`} className={`text-xs ${shownNameErr ? 'text-danger' : 'text-muted'}`} role={shownNameErr ? 'alert' : undefined}>
          {shownNameErr ?? `2–${NAME_MAX} characters. Letters, numbers, spaces and . ' - _`}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-email`} className="text-sm font-medium text-secondary">Email address</label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          maxLength={EMAIL_MAX}
          disabled={busy}
          placeholder="you@example.com"
          onChange={e => { setEmail(e.target.value); setServerErrors(s => ({ ...s, email: undefined })) }}
          onBlur={() => setTouched(t => ({ ...t, email: true }))}
          aria-invalid={!!shownEmailErr}
          aria-describedby={`${idPrefix}-email-msg`}
          className={`${inputBase} ${shownEmailErr ? bad : ok}`}
        />
        <p id={`${idPrefix}-email-msg`} className={`text-xs ${shownEmailErr ? 'text-danger' : 'text-muted'}`} role={shownEmailErr ? 'alert' : undefined}>
          {shownEmailErr ?? (emailChanged ? 'You will use this address to sign in from now on.' : 'Used to sign in and for account emails.')}
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel ?? handleReset}
          disabled={busy || (!onCancel && !nameChanged && !emailChanged)}
          className="px-4 py-2.5 rounded-lg text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-raised border border-border transition-colors disabled:opacity-40"
        >
          {onCancel ? 'Cancel' : 'Reset'}
        </button>
        <button type="submit" disabled={!canSubmit} className="btn-primary text-xs py-2.5 px-5">
          {busy && <Spinner />}
          {busy ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}