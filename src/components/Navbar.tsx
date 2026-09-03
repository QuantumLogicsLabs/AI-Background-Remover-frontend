import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../hooks/useAuth'
import { useThemeSettings, AccentTheme } from '../contexts/ThemeSettingsContext'
import Tooltip from './Tooltip'
import axios from 'axios'

// ── Nav item definitions ───────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    to: '/', label: 'Remove/Replace BG', end: true,
    icon: (<span className="w-3.5 h-3.5 shrink-0 text-base leading-none">✂️</span>),
  },
  {
    to: '/enhance', label: 'Enhance', end: false,
    icon: (<span className="w-3.5 h-3.5 shrink-0 text-base leading-none">✨</span>),
  },
  {
    to: '/shadow', label: 'Shadow/Glow', end: false,
    icon: (<span className="w-3.5 h-3.5 shrink-0 text-base leading-none">💡</span>),
  },
  {
    to: '/recolor-and-eraser', label: 'Recolor & Eraser', end: false,
    icon: (<span className="w-3.5 h-3.5 shrink-0 text-base leading-none">✨</span>),
  },

  {
    to: '/smart-crop', label: 'Smart Crop', end: false,
    icon: (<span className="w-3.5 h-3.5 shrink-0 text-base leading-none">🔲</span>),
  },
  {
    to: '/batch', label: 'Batch', end: false,
    icon: (<span className="w-3.5 h-3.5 shrink-0 text-base leading-none">📁</span>),
  },
  {
    to: '/history', label: 'History', end: false,
    icon: (<span className="w-3.5 h-3.5 shrink-0 text-base leading-none">🕐</span>),
  },
]

function AppNavLink({ to, label, end, icon }: { to: string; label: string; end?: boolean; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
         transition-all duration-150 whitespace-nowrap select-none
         focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/50 ${
           isActive
             ? 'text-magenta bg-magenta/10 font-semibold shadow-xs'
             : 'text-secondary hover:text-primary hover:bg-surface-raised'
         }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? 'text-magenta' : 'text-muted group-hover:text-primary'}>
            {icon}
          </span>
          {label}
          {isActive && (
            <span
              className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-gradient-to-r from-magenta to-teal"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </NavLink>
  )
}

function QuotaBar({ refreshKey }: { refreshKey: number }) {
  const [quota, setQuota] = useState<{ used: number; limit: number; disabled: boolean } | null>(null)

  useEffect(() => {
    axios.get('/api/auth/quota')
      .then(r => setQuota(r.data))
      .catch(() => {})
  }, [refreshKey])

  if (!quota || quota.disabled || quota.limit === 0) return null

  const pct = Math.min(100, Math.round((quota.used / quota.limit) * 100))
  const color = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success'

  return (
    <div className="px-4 py-2.5 border-b border-border bg-surface-raised">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-muted font-medium">Daily AI Quota</span>
        <span className="text-xs font-mono font-medium text-secondary">
          {quota.used} <span className="text-muted">/ {quota.limit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const { accent, setAccent } = useThemeSettings()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [quotaKey, setQuotaKey] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U'

  function toggleOpen() {
    setOpen(v => {
      const next = !v
      if (next) setQuotaKey(k => k + 1)
      return next
    })
  }

  const ACCENTS: { id: AccentTheme; label: string; color: string }[] = [
    { id: 'gold',    label: 'Gold',         color: '#F59E0B' },
    { id: 'cyber',   label: 'Cyber',        color: '#EC4899' },
    { id: 'sapphire',label: 'Sapphire',     color: '#3B82F6' },
    { id: 'sunset',  label: 'Sunset',       color: '#F97316' },
    { id: 'rose',    label: 'Rose Quartz',  color: '#FB7185' },
    { id: 'arctic',  label: 'Arctic Ice',   color: '#22D3EE' },
    { id: 'emerald', label: 'Emerald',      color: '#10B981' },
    { id: 'crimson', label: 'Crimson',      color: '#EF4444' },
    { id: 'violet',  label: 'Violet Dream', color: '#A855F7' },
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggleOpen}
        className="flex items-center gap-1.5 p-0.5 rounded-xl border border-transparent hover:border-border hover:bg-surface-raised transition-all duration-200 focus:outline-none active:scale-95"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User menu"
      >
        <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-magenta to-magenta-hover text-white text-xs font-bold flex items-center justify-center shrink-0 select-none shadow-xs ring-1 ring-magenta/30">
          {initial}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
          className={`w-3.5 h-3.5 text-muted transition-transform duration-200 mr-1 ${open ? 'rotate-180 text-primary' : ''}`}
          aria-hidden="true">
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-surface shadow-2xl z-50 overflow-hidden glass-modal animate-scale-in"
          role="menu"
        >
          {/* User info */}
          <div className="px-4 py-3.5 border-b border-border flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-magenta text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-sm">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary truncate">{user.name}</p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
          </div>

          <QuotaBar refreshKey={quotaKey} />

          {/* Quick Accent Switcher */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Accent Theme</span>
              <span className="text-[11px] font-mono text-muted capitalize">{accent}</span>
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              {ACCENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAccent(item.id)}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    accent === item.id ? 'scale-125 ring-2 ring-magenta/50 border-white' : 'border-border hover:scale-110'
                  }`}
                  style={{ backgroundColor: item.color }}
                  title={item.label}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-1.5 space-y-0.5" role="none">
            <button
              onClick={() => { setOpen(false); navigate('/settings') }}
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-secondary hover:text-primary hover:bg-surface-raised transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-muted">
                <path fillRule="evenodd" d="M6.955 1.45A.5.5 0 017.452 1h1.096a.5.5 0 01.497.45l.17 1.699a5.01 5.01 0 011.322.55l1.423-.866a.5.5 0 01.605.083l.775.775a.5.5 0 01.083.605l-.866 1.423c.23.418.4.865.55 1.322l1.699.17a.5.5 0 01.45.497v1.096a.5.5 0 01-.45.497l-1.699.17a5.014 5.014 0 01-.55 1.322l.866 1.423a.5.5 0 01-.083.605l-.775.775a.5.5 0 01-.605.083l-1.423-.866a5.014 5.014 0 01-1.322.55l-.17 1.699a.5.5 0 01-.497.45H7.452a.5.5 0 01-.497-.45l-.17-1.699a5.014 5.014 0 01-1.322-.55l-1.423.866a.5.5 0 01-.605-.083l-.775-.775a.5.5 0 01-.083-.605l.866-1.423a5.014 5.014 0 01-.55-1.322L1.45 8.549A.5.5 0 011 8.052V6.956a.5.5 0 01.45-.497l1.699-.17c.15-.457.32-.904.55-1.322l-.866-1.423a.5.5 0 01.083-.605l.775-.775a.5.5 0 01.605-.083l1.423.866a5.01 5.01 0 011.322-.55l.17-1.699zM8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
              </svg>
              Settings & Preferences
            </button>

            <button
              onClick={() => { setOpen(false); logout().then(() => navigate('/login')) }}
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M2 4.75A2.75 2.75 0 014.75 2h3a2.75 2.75 0 012.75 2.75v.5a.75.75 0 01-1.5 0v-.5c0-.69-.56-1.25-1.25-1.25h-3c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h3c.69 0 1.25-.56 1.25-1.25v-.5a.75.75 0 011.5 0v.5A2.75 2.75 0 017.75 14h-3A2.75 2.75 0 012 11.25v-6.5zm9.47.47a.75.75 0 011.06 0l2.25 2.25a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 11-1.06-1.06l.97-.97H5.25a.75.75 0 010-1.5h7.19l-.97-.97a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, loading } = useAuth()
  const { setIsShortcutsOpen, isOnline } = useThemeSettings()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/85 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left Side: Brand */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 group focus:outline-none shrink-0"
            aria-label="AI Background Remover home"
          >
            <span className="relative w-8 h-8 rounded-xl bg-magenta text-white flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="6" cy="6" r="2.5" />
                <circle cx="6" cy="18" r="2.5" />
                <path d="M8.12 8.12 20 4" />
                <path d="M8.5 15.5 20 20" />
                <path d="M8.12 8.12 12 12" />
                <path d="M12 12 8.5 15.5" />
              </svg>
            </span>
            <span className="font-display font-bold text-base leading-none text-primary">
              BG<span className="text-magenta">.</span>Remover
            </span>
          </Link>
        </div>

        {/* Feature Nav: Desktop */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <AppNavLink
                key={item.to}
                to={item.to}
                label={item.label}
                end={item.end}
                icon={item.icon}
              />
            ))}
          </nav>
        )}

        {/* Right side Actions */}
        <div className="flex items-center gap-2.5">
          {!isOnline && (
            <span className="px-2 py-0.5 rounded-full bg-danger/15 text-danger border border-danger/30 text-[10px] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
              Offline
            </span>
          )}

          <Tooltip content="Keyboard Shortcuts" shortcut="?" position="bottom">
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-border bg-surface hover:bg-surface-raised hover:border-border-strong text-secondary hover:text-primary transition-all duration-200 active:scale-95 shadow-xs"
              aria-label="Keyboard Shortcuts"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect width="20" height="14" x="2" y="5" rx="3" />
                <line x1="6" x2="6.01" y1="9" y2="9" />
                <line x1="10" x2="10.01" y1="9" y2="9" />
                <line x1="14" x2="14.01" y1="9" y2="9" />
                <line x1="18" x2="18.01" y1="9" y2="9" />
                <line x1="8" x2="16" y1="15" y2="15" />
              </svg>
            </button>
          </Tooltip>

          <ThemeToggle />

          {!loading && (
            user ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-secondary hover:text-primary hover:bg-surface-raised transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-xs py-1.5 px-3.5"
                >
                  Get started
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  )
}

