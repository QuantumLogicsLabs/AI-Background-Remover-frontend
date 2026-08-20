import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

const PERKS = [
  { emoji: '⚡', text: '100 free operations every day' },
  { emoji: '🎨', text: 'Background replacement & gradients' },
  { emoji: '✂️', text: 'Smart crop & image enhancement' },
  { emoji: '📦', text: 'Batch process up to 20 images' },
  { emoji: '🤖', text: 'AI design assistant & captions' },
  { emoji: '📥', text: 'PNG, JPEG & WebP export' },
]

// Password strength helper
function getStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: '',        color: 'bg-border',   width: 'w-0'    }
  if (pw.length < 6)   return { label: 'Weak',    color: 'bg-danger',   width: 'w-1/4'  }
  if (pw.length < 10)  return { label: 'Fair',    color: 'bg-amber-400',width: 'w-1/2'  }
  if (pw.length < 14)  return { label: 'Good',    color: 'bg-teal',     width: 'w-3/4'  }
  return                        { label: 'Strong', color: 'bg-teal',     width: 'w-full' }
}

export default function RegisterPage() {
  const { register }  = useAuth()
  const { showToast } = useToast()
  const navigate      = useNavigate()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [busy,     setBusy]     = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)

  const passwordMismatch = confirm.length > 0 && password !== confirm
  const passwordWeak     = password.length > 0 && password.length < 8
  const strength         = getStrength(password)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (passwordMismatch) { showToast('Passwords do not match.', 'error'); return }
    if (passwordWeak)     { showToast('Password must be at least 8 characters.', 'error'); return }
    setBusy(true)
    try {
      await register(name.trim(), email.trim(), password)
      showToast('Account created. Welcome!', 'success')
      navigate('/', { replace: true })
    } catch (err) {
      let msg = 'Registration failed. Please try again.'
      if (axios.isAxiosError(err)) {
        const data = err.response?.data
        if (typeof data === 'object' && data !== null) {
          if (typeof data.detail === 'string') {
            msg = data.detail
          } else if (Array.isArray(data.detail)) {
            msg = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
          }
        } else if (typeof data === 'string' && (data.includes('ECONNREFUSED') || data.includes('Internal Server Error'))) {
          msg = 'Cannot reach backend server. Make sure the backend is running on port 8000.'
        } else if (err.code === 'ERR_NETWORK' || !err.response) {
          msg = 'Cannot reach the server. Make sure the backend is running on port 8000.'
        } else if (err.response?.status && err.response.status >= 500) {
          msg = 'Server error. Please ensure the backend is running and try again.'
        }
      }
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex-1 flex items-stretch min-h-[calc(100vh-48px)]">

      {/* ── Left panel — marketing ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden
        bg-gradient-to-br from-[#6c2fe8] via-[#8b3cf7] to-[#b06ef5]
        flex-col justify-between p-12">

        {/* Background blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full
          bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full
          bg-magenta/20 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center
            justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.5 2a3.5 3.5 0 101.665 6.58L8.585 10l-1.42 1.42a3.5 3.5 0 101.414 1.414l1.42-1.42 1.42 1.42a3.5 3.5 0 101.414-1.414L11.415 10l1.42-1.42A3.5 3.5 0 0011.17 7.003L10 8.172 8.83 7.003A3.5 3.5 0 005.5 2z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="text-white font-display font-bold text-xl">BG.Remover</span>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-8">
          <div>
            <h2 className="text-4xl font-display font-bold text-white leading-tight">
              Start for free.<br />
              <span className="text-yellow-300">No credit card</span> needed.
            </h2>
            <p className="mt-3 text-white/80 text-base leading-relaxed">
              Join thousands of designers, marketers, and photographers who use BG.Remover every day.
            </p>
          </div>

          {/* Perks */}
          <ul className="flex flex-col gap-3">
            {PERKS.map(p => (
              <li key={p.text} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-base shrink-0">
                  {p.emoji}
                </span>
                <span className="text-white/90 text-sm">{p.text}</span>
              </li>
            ))}
          </ul>

          {/* Trust badge */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm
            rounded-xl px-4 py-3 border border-white/15 w-fit">
            <div className="flex -space-x-2">
              {['E','M','J','A'].map((l, i) => (
                <span key={i}
                  className="w-7 h-7 rounded-full border-2 border-white/30 flex items-center
                    justify-center text-xs font-bold text-white"
                  style={{ background: ['#e8336d','#8b3cf7','#2fbfb0','#f59e0b'][i] }}>
                  {l}
                </span>
              ))}
            </div>
            <p className="text-white/80 text-xs">
              <span className="text-white font-semibold">2,000+</span> users already joined
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10
        bg-page overflow-y-auto relative">

        {/* Subtle background treatment */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 80% 10%, rgba(139,60,247,0.08) 0%, transparent 55%),' +
              'radial-gradient(ellipse at 10% 90%, rgba(232,51,109,0.06) 0%, transparent 55%)',
          }}
        />
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border-strong) 1px, transparent 1px),' +
              'linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-1">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-magenta to-teal
              flex items-center justify-center shadow-glow-sm mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-6 h-6">
                <path fillRule="evenodd" d="M5.5 2a3.5 3.5 0 101.665 6.58L8.585 10l-1.42 1.42a3.5 3.5 0 101.414 1.414l1.42-1.42 1.42 1.42a3.5 3.5 0 101.414-1.414L11.415 10l1.42-1.42A3.5 3.5 0 0011.17 7.003L10 8.172 8.83 7.003A3.5 3.5 0 005.5 2z" clipRule="evenodd" />
              </svg>
            </span>
            <span className="font-display font-bold text-xl text-primary">BG<span className="text-magenta">.</span>Remover</span>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
              Create your account
            </h1>
            <p className="text-secondary text-sm">
              Free plan · 100 operations / day
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-surface p-7 flex flex-col gap-5 relative overflow-hidden"
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            {/* Accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-magenta via-teal to-magenta opacity-60 rounded-t-2xl" />
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-secondary">Display name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 00-11.215 0c-.22.578.254 1.139.872 1.139h9.47z" />
                    </svg>
                  </span>
                  <input id="name" type="text" autoComplete="name" required minLength={2}
                    value={name} onChange={e => setName(e.target.value)} disabled={busy}
                    placeholder="Your name"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-border bg-surface-raised
                      text-sm text-primary placeholder:text-muted
                      focus:outline-none focus:border-magenta focus:ring-1 focus:ring-magenta/30 disabled:opacity-50" />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-email" className="text-sm font-medium text-secondary">Email</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path d="M2.5 3A1.5 1.5 0 001 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0115 5.293V4.5A1.5 1.5 0 0013.5 3h-11z" />
                      <path d="M15 6.954L8.978 9.86a2.25 2.25 0 01-1.956 0L1 6.954V11.5A1.5 1.5 0 002.5 13h11a1.5 1.5 0 001.5-1.5V6.954z" />
                    </svg>
                  </span>
                  <input id="reg-email" type="email" autoComplete="email" required
                    value={email} onChange={e => setEmail(e.target.value)} disabled={busy}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-border bg-surface-raised
                      text-sm text-primary placeholder:text-muted
                      focus:outline-none focus:border-magenta focus:ring-1 focus:ring-magenta/30 disabled:opacity-50" />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-password" className="text-sm font-medium text-secondary">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8 1a3.5 3.5 0 00-3.5 3.5V7A1.5 1.5 0 003 8.5v5A1.5 1.5 0 004.5 15h7a1.5 1.5 0 001.5-1.5v-5A1.5 1.5 0 0011.5 7V4.5A3.5 3.5 0 008 1zm2 6V4.5a2 2 0 10-4 0V7h4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input id="reg-password" type={showPwd ? 'text' : 'password'} autoComplete="new-password"
                    required minLength={8} value={password}
                    onChange={e => setPassword(e.target.value)} disabled={busy}
                    placeholder="Min 8 characters"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-lg border bg-surface-raised
                      text-sm text-primary placeholder:text-muted
                      focus:outline-none focus:border-magenta focus:ring-1 focus:ring-magenta/30
                      disabled:opacity-50 ${passwordWeak ? 'border-danger' : 'border-border'}`} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}>
                    {showPwd
                      ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" /><path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" /></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z" clipRule="evenodd" /></svg>
                    }
                  </button>
                </div>
                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                    </div>
                    <span className="text-[10px] text-muted w-10 text-right">{strength.label}</span>
                  </div>
                )}
                {passwordWeak && <p className="text-xs text-danger">At least 8 characters required.</p>}
              </div>

              {/* Confirm */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirm" className="text-sm font-medium text-secondary">Confirm password</label>
                <input id="confirm" type={showPwd ? 'text' : 'password'} autoComplete="new-password"
                  required value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy}
                  placeholder="Repeat your password"
                  className={`w-full px-3.5 py-2.5 rounded-lg border bg-surface-raised
                    text-sm text-primary placeholder:text-muted
                    focus:outline-none focus:border-magenta focus:ring-1 focus:ring-magenta/30
                    disabled:opacity-50 ${passwordMismatch ? 'border-danger' : 'border-border'}`} />
                {passwordMismatch && <p className="text-xs text-danger">Passwords don't match.</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={busy || !name || !email || !password || !confirm || passwordMismatch || passwordWeak}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 mt-1
                  rounded-lg bg-gradient-to-r from-magenta to-teal
                  hover:opacity-90 text-white font-semibold text-sm
                  transition-all active:scale-95 shadow-sm
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {busy ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Creating account…
                  </>
                ) : (
                  <>
                    Create free account
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M2 8a.75.75 0 01.75-.75h8.69L8.22 4.03a.75.75 0 011.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06l3.22-3.22H2.75A.75.75 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-magenta hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
