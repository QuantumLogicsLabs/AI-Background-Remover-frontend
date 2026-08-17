import { useState, type FormEvent, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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

export default function LoginPage() {
  const { login }    = useAuth()
  const { showToast } = useToast()
  const navigate     = useNavigate()
  const location     = useLocation()
  const from         = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await login(email.trim(), password)
      showToast('Successfully signed in.', 'success')
      navigate(from, { replace: true })
    } catch (err) {
      let msg = 'Login failed. Please check your credentials.'
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.detail) {
          msg = String(err.response.data.detail)
        } else if (err.code === 'ERR_NETWORK' || !err.response) {
          msg = 'Cannot reach the server. Make sure the backend is running on port 8000.'
        }
      }
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex-1 flex items-stretch min-h-[calc(100vh-48px)] select-none">

      {/* ── Left panel — marketing (Visible on desktop) ───────────────────── */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-8 lg:w-[60%] xl:w-[65%] relative overflow-hidden
        bg-[#FAF9F7] dark:bg-[#0d0d0d] p-12 flex-col justify-between border-r border-border/40">

        {/* Ambient curves / blobs */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] pointer-events-none opacity-40 dark:opacity-20 translate-x-12 -translate-y-12">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-violet-400 dark:fill-amber-500">
            <path d="M42.7,-73C54.3,-67.5,62,-54.6,69.5,-41.4C77,-28.1,84.4,-14.1,84.1,-0.2C83.8,13.7,75.8,27.4,67.6,39.6C59.3,51.8,50.8,62.6,39.4,70C28.1,77.4,14.1,81.4,-0.4,82C-14.8,82.6,-29.6,79.8,-42.6,73.1C-55.6,66.4,-66.7,55.8,-74.6,43.2C-82.5,30.6,-87.2,15.3,-87.3,-0.1C-87.4,-15.5,-82.9,-30.9,-75.1,-43.9C-67.4,-56.9,-56.3,-67.4,-43.5,-72.3C-30.8,-77.2,-15.4,-76.5,-0.3,-76C14.8,-75.5,29.6,-75.2,42.7,-73Z" transform="translate(100 100)" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-[550px] h-[550px] pointer-events-none opacity-50 dark:opacity-25 translate-x-24 translate-y-24">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full fill-violet-500 dark:fill-amber-600">
            <path d="M45.2,-76.3C58.4,-70.5,68.9,-57.4,75.7,-42.8C82.5,-28.3,85.6,-12.2,85.9,4.2C86.2,20.6,83.8,37.3,75.4,50.3C67.1,63.3,52.8,72.6,37.6,77.7C22.3,82.8,6.2,83.6,-10.1,81.8C-26.4,80,-42.9,75.6,-56.2,67.2C-69.5,58.8,-79.6,46.3,-84.9,31.7C-90.2,17.1,-90.7,0.4,-87.8,-15.3C-84.9,-31.1,-78.6,-45.8,-68,-56.5C-57.5,-67.2,-42.7,-73.9,-28.5,-78.4C-14.2,-83,0.3,-85.4,14.6,-83.4C28.8,-81.4,45.2,-76.3,45.2,-76.3Z" transform="translate(100 100)" />
          </svg>
        </div>

        {/* Column 1: Marketing Copy */}
        <div className="col-span-5 flex flex-col justify-between relative z-10 h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <svg className="w-10 h-8 text-violet-600 dark:text-amber-500" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="stripes" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="1.5" />
                </pattern>
                <mask id="intersection">
                  <circle cx="32" cy="16" r="13" fill="white" />
                </mask>
              </defs>
              <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="32" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" className="opacity-60" />
              <circle cx="16" cy="16" r="13" fill="url(#stripes)" mask="url(#intersection)" />
            </svg>
            <div className="flex items-baseline">
              <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">Removing</span>
              <span className="font-display font-bold text-lg text-violet-600 dark:text-amber-500 tracking-tight">Background.io</span>
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
              {FEATURES.map(f => (
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
              className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize bg-checker shadow-inner select-none select-none"
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
              <span className="absolute top-3 right-3 bg-violet-600 dark:bg-amber-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-sm">
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
      <div className="flex-1 flex items-center justify-center px-6 py-12
        bg-page relative overflow-hidden">

        {/* Subtle background pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 80% 20%, rgba(139,60,247,0.08) 0%, transparent 60%),' +
              'radial-gradient(ellipse at 20% 80%, rgba(232,51,109,0.06) 0%, transparent 60%)',
          }}
        />
        {/* Faint grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border-strong) 1px, transparent 1px),' +
              'linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 w-full max-w-sm flex flex-col gap-8">

          {/* Mobile logo (hidden on lg where left panel shows) */}
          <div className="lg:hidden flex flex-col items-center gap-1">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-magenta to-teal
              flex items-center justify-center shadow-glow-sm mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="white" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </span>
            <span className="font-display font-bold text-xl text-primary">Removing<span className="text-magenta">.</span>io</span>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-display font-bold text-primary tracking-tight">
              Welcome back
            </h1>
            <p className="text-secondary text-sm">
              Sign in to access your workspace.
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-surface p-8 flex flex-col gap-5 relative overflow-hidden"
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            {/* Accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-magenta via-teal to-magenta opacity-60 rounded-t-2xl" />
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-secondary">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path d="M2.5 3A1.5 1.5 0 001 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0115 5.293V4.5A1.5 1.5 0 0013.5 3h-11z" />
                      <path d="M15 6.954L8.978 9.86a2.25 2.25 0 01-1.956 0L1 6.954V11.5A1.5 1.5 0 002.5 13h11a1.5 1.5 0 001.5-1.5V6.954z" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={busy}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-border bg-surface-raised
                      text-sm text-primary placeholder:text-muted
                      focus:outline-none focus:border-magenta focus:ring-1 focus:ring-magenta/30
                      disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-secondary">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8 1a3.5 3.5 0 00-3.5 3.5V7A1.5 1.5 0 003 8.5v5A1.5 1.5 0 004.5 15h7a1.5 1.5 0 001.5-1.5v-5A1.5 1.5 0 0011.5 7V4.5A3.5 3.5 0 008 1zm2 6V4.5a2 2 0 10-4 0V7h4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={busy}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-border bg-surface-raised
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
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 mt-1
                  rounded-lg bg-gradient-to-r from-magenta to-teal
                  hover:opacity-90 text-white font-semibold text-sm
                  transition-all active:scale-95 shadow-sm
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
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
                ) : (
                  <>
                    Sign in
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
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-magenta hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}