import { useState, type FormEvent, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

import handbagOriginal from '../assets/handbag_original.jpg'
import handbagRemoved from '../assets/handbag_removed.jpg'

// ── Feature bullets shown on the left panel ────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.904-4.474a9.003 9.003 0 001.378-10.42c-.53-.942-1.378-1.688-2.385-2.079a9.003 9.003 0 00-11.458 5.617A8.997 8.997 0 009.813 15.904z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 .714-.11 1.4-.313 2.05M9 16.5v.01" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.542 10.158A3 3 0 1010.5 12h.01" />
      </svg>
    ),
    title: 'AI Powered Technology',
    desc: 'Deep learning models trained on millions of images',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.9 2.9m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    title: 'High Quality Results',
    desc: 'Crisp transparent PNG output at full resolution',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Super Fast Processing',
    desc: 'Results in seconds, not minutes',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: 'Download Transparent PNG',
    desc: 'Ready for any design tool or platform',
  },
]

// Password strength helper
function getStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: '', color: 'bg-border', width: 'w-0' }
  if (pw.length < 6) return { label: 'Weak', color: 'bg-danger', width: 'w-1/4' }
  if (pw.length < 10) return { label: 'Fair', color: 'bg-amber-400', width: 'w-1/2' }
  if (pw.length < 14) return { label: 'Good', color: 'bg-teal', width: 'w-3/4' }
  return { label: 'Strong', color: 'bg-teal', width: 'w-full' }
}

export default function RegisterPage() {
  const { register } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  // ── Comparison Slider State & Logic ──────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(position)
  }

  const handleMouseDown = () => setIsDragging(true)
  const handleTouchStart = () => setIsDragging(true)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      handleMove(e.clientX)
    }
    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX)
    }
  }

  useEffect(() => {
    const handleTouchEnd = () => setIsDragging(false)
    if (isDragging) {
      window.addEventListener('touchend', handleTouchEnd)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
    }
    return () => {
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchmove', handleTouchMove, { passive: false } as EventListenerOptions)
    }
  }, [isDragging])

  const passwordMismatch = confirm.length > 0 && password !== confirm
  const passwordWeak = password.length > 0 && password.length < 8
  const strength = getStrength(password)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (passwordMismatch) {
      showToast('Passwords do not match.', 'error')
      return
    }
    if (passwordWeak) {
      showToast('Password must be at least 8 characters.', 'error')
      return
    }
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
    <main className="flex-1 flex items-stretch min-h-screen select-none">
      {/* ── Left panel — marketing (Visible on desktop, identical to LoginPage) ───────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-8 lg:w-[60%] xl:w-[65%] relative overflow-hidden bg-[#FAF9F7] dark:bg-[#0d0d0d] p-12 flex-col justify-between border-r border-border/40">
        {/* Ambient curves / blobs */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] pointer-events-none opacity-40 dark:opacity-20 translate-x-12 -translate-y-12">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-violet-400 dark:fill-amber-500">
            <path
              d="M42.7,-73C54.3,-67.5,62,-54.6,69.5,-41.4C77,-28.1,84.4,-14.1,84.1,-0.2C83.8,13.7,75.8,27.4,67.6,39.6C59.3,51.8,50.8,62.6,39.4,70C28.1,77.4,14.1,81.4,-0.4,82C-14.8,82.6,-29.6,79.8,-42.6,73.1C-55.6,66.4,-66.7,55.8,-74.6,43.2C-82.5,30.6,-87.2,15.3,-87.3,-0.1C-87.4,-15.5,-82.9,-30.9,-75.1,-43.9C-67.4,-56.9,-56.3,-67.4,-43.5,-72.3C-30.8,-77.2,-15.4,-76.5,-0.3,-76C14.8,-75.5,29.6,-75.2,42.7,-73Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-[550px] h-[550px] pointer-events-none opacity-50 dark:opacity-25 translate-x-24 translate-y-24">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-violet-500 dark:fill-amber-600">
            <path
              d="M45.2,-76.3C58.4,-70.5,68.9,-57.4,75.7,-42.8C82.5,-28.3,85.6,-12.2,85.9,4.2C86.2,20.6,83.8,37.3,75.4,50.3C67.1,63.3,52.8,72.6,37.6,77.7C22.3,82.8,6.2,83.6,-10.1,81.8C-26.4,80,-42.9,75.6,-56.2,67.2C-69.5,58.8,-79.6,46.3,-84.9,31.7C-90.2,17.1,-90.7,0.4,-87.8,-15.3C-84.9,-31.1,-78.6,-45.8,-68,-56.5C-57.5,-67.2,-42.7,-73.9,-28.5,-78.4C-14.2,-83,0.3,-85.4,14.6,-83.4C28.8,-81.4,45.2,-76.3,45.2,-76.3Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>

        {/* Column 1: Marketing Copy */}
        <div className="col-span-5 flex flex-col justify-between relative z-10 h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#7C3AED] dark:bg-[#F59E0B] text-white flex items-center justify-center shrink-0 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="6" cy="6" r="2.5" />
                <circle cx="6" cy="18" r="2.5" />
                <path d="M8.12 8.12 20 4" />
                <path d="M8.5 15.5 20 20" />
                <path d="M8.12 8.12 12 12" />
                <path d="M12 12 8.5 15.5" />
              </svg>
            </span>
            <div className="flex items-baseline gap-0.5">
              <span className="font-display font-bold text-xl text-slate-900 dark:text-white tracking-tight">BG</span>
              <span className="font-display font-bold text-xl text-[#7C3AED] dark:text-[#F59E0B] tracking-tight">.</span>
              <span className="font-display font-bold text-xl text-slate-900 dark:text-white tracking-tight">Remover</span>
            </div>
          </div>

          {/* Hero text */}
          <div className="flex flex-col gap-8 my-auto pr-4">
            <div>
              <h2 className="text-4xl xl:text-5xl font-display font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                Remove Background<br />
                <span className="text-violet-600 dark:text-amber-500">in One Click</span>
              </h2>
              <p className="mt-4 text-slate-900 dark:text-white font-bold text-base tracking-wide">
                AI-Powered. Fast. Accurate.
              </p>
              <p className="mt-2 text-slate-500 dark:text-secondary text-sm leading-relaxed max-w-sm">
                RemovingBackground.io uses advanced AI technology to instantly remove image backgrounds with perfect precision.
              </p>
            </div>

            {/* Feature list */}
            <ul className="flex flex-col gap-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-violet-100 dark:bg-amber-950/20 text-violet-600 dark:text-amber-500 flex items-center justify-center shrink-0">
                    {f.icon}
                  </span>
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold leading-none">{f.title}</p>
                    <p className="text-slate-400 dark:text-secondary text-[11px] mt-1 leading-none">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 2: Drag Slider & Interactive Preview Card */}
        <div className="col-span-7 flex items-center justify-center relative min-h-[450px]">
          {/* Arrow curve pointing to the card */}
          <div className="absolute left-[-60px] top-[40%] w-[160px] h-[100px] pointer-events-none hidden xl:block text-violet-400 dark:text-amber-500/40">
            <svg viewBox="0 0 100 60" fill="none" className="w-full h-full stroke-current" strokeWidth="2" strokeDasharray="4 3">
              <path d="M10,50 Q45,20 85,35" strokeLinecap="round" />
              <path d="M85,35 L76,33 M85,35 L81,43" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
            {/* Round overlap icon badge */}
            <div className="absolute top-[18px] left-[40px] w-9 h-9 rounded-full bg-white dark:bg-surface shadow-md flex items-center justify-center border border-slate-100 dark:border-border">
              <svg className="w-5 h-4 text-violet-600 dark:text-amber-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" />
                <circle cx="32" cy="16" r="12" stroke="currentColor" strokeWidth="3" className="opacity-60" />
              </svg>
            </div>
          </div>

          {/* Sparkles / Magnifying overlay */}
          <div className="absolute bottom-6 right-6 w-12 h-12 bg-white/10 dark:bg-surface-raised/20 backdrop-blur rounded-2xl border border-white/20 flex items-center justify-center text-white/50 z-20 pointer-events-none shadow-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.5l2 2m0-2l-2 2" />
            </svg>
          </div>

          {/* Main Card */}
          <div className="w-full max-w-[420px] bg-white dark:bg-surface rounded-[24px] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-border/60 relative z-10 flex flex-col gap-3">
            {/* Interactive Slider Area */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize bg-checker shadow-inner select-none"
            >
              {/* Bottom Layer: Original Image */}
              <img
                src={handbagOriginal}
                alt="Original handbag mockup"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Top Layer: Background Removed Image (Clipped) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
              >
                <img
                  src={handbagRemoved}
                  alt="Handbag background removed mockup"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              </div>

              {/* Slider Line & Handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(0,0,0,0.3)] z-20 pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center border border-slate-200/80 z-30">
                  <span className="text-slate-600 font-extrabold text-[10px] tracking-tighter select-none">&lt; &gt;</span>
                </div>
              </div>

              {/* Badges */}
              <span className="absolute top-3 left-3 bg-black/40 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md backdrop-blur-sm shadow-sm">
                Original
              </span>
              <span className="absolute top-3 right-3 bg-[#7C3AED] dark:bg-[#F59E0B] text-white text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-sm">
                Background Removed
              </span>

              {/* Expand Icon */}
              <div className="absolute bottom-3 right-3 bg-black/40 hover:bg-black/60 text-white/90 p-1.5 rounded-lg backdrop-blur-sm shadow-sm transition-colors cursor-pointer pointer-events-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — Form ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-page relative overflow-hidden">
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 80% 20%, rgba(139,60,247,0.08) 0%, transparent 60%),' +
              'radial-gradient(ellipse at 20% 80%, rgba(232,51,109,0.06) 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-primary tracking-tight">
              Create your account
            </h1>
            <p className="text-secondary text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#7C3AED] dark:text-[#F59E0B] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-name" className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                autoComplete="name"
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-sm text-primary placeholder:text-muted focus:outline-none focus:border-magenta disabled:opacity-50"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-email" className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-sm text-primary placeholder:text-muted focus:outline-none focus:border-magenta disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-border bg-surface text-sm text-primary placeholder:text-muted focus:outline-none focus:border-magenta disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  disabled={busy}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors text-xs"
                >
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="flex flex-col gap-1 mt-1 animate-fade-up">
                  <div className="h-1 w-full bg-surface-raised rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300`} />
                  </div>
                  <span className="text-[10px] text-muted self-end">{strength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-confirm" className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type={showPwd ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={busy}
                className={`w-full px-3.5 py-2.5 rounded-lg border bg-surface text-sm text-primary placeholder:text-muted focus:outline-none disabled:opacity-50 ${
                  passwordMismatch ? 'border-danger focus:border-danger' : 'border-border focus:border-magenta'
                }`}
              />
              {passwordMismatch && <p className="text-xs text-danger">Passwords do not match.</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy || !name.trim() || !email.trim() || !password || passwordMismatch}
              className="btn-primary w-full py-3 mt-2 font-bold text-sm shadow-md"
            >
              {busy ? 'Creating Account…' : 'Create Free Account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
