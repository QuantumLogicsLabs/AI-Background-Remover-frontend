import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../hooks/useAuth'
import axios from 'axios'

// ── Nav item definitions ───────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    to: '/', label: 'Upload', end: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <path d="M8.75 2.75a.75.75 0 00-1.5 0v5.69L5.03 6.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 8.44V2.75z" />
        <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z" />
      </svg>
    ),
  },
  {
    to: '/enhance', label: 'Enhance', end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <path fillRule="evenodd" d="M8 1.5a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1A.75.75 0 018 1.5zM3.05 3.05a.75.75 0 011.06 0l.707.707A.75.75 0 113.757 4.82l-.707-.707a.75.75 0 010-1.062zm9.9 0a.75.75 0 010 1.06l-.706.708a.75.75 0 11-1.061-1.061l.707-.707a.75.75 0 011.06 0zM8 6a2 2 0 100 4A2 2 0 008 6zm-5.5 2a.75.75 0 000 1.5h1a.75.75 0 000-1.5h-1zm10 0a.75.75 0 000 1.5h1a.75.75 0 000-1.5h-1zm-2.136 3.728a.75.75 0 011.061 0l.707.707a.75.75 0 01-1.06 1.06l-.708-.706a.75.75 0 010-1.061zm-6.728 0a.75.75 0 010 1.06l-.707.708a.75.75 0 01-1.06-1.061l.707-.707a.75.75 0 011.06 0zM8 12.75a.75.75 0 01.75.75v1a.75.75 0 01-1.5 0v-1a.75.75 0 01.75-.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/replace-bg', label: 'Replace BG', end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <path d="M2.5 3.5A1.5 1.5 0 014 2h8a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0112 14H4a1.5 1.5 0 01-1.5-1.5v-9zm1.5 0v5.396l1.542-1.23a.75.75 0 01.93 0L8 9.197l2.197-1.75a.75.75 0 01.93 0L12.5 8.5V3.5a.5.5 0 00-.5-.5H4a.5.5 0 00-.5.5zm8.5 5.836l-1.373-1.098-2.197 1.75a.75.75 0 01-.93 0L6 8.736 4 10.303V12.5a.5.5 0 00.5.5h7a.5.5 0 00.5-.5v-2.664zM7 6.25a1.25 1.25 0 112.5 0 1.25 1.25 0 01-2.5 0z" />
      </svg>
    ),
  },
  {
    to: '/recolor', label: 'Recolor', end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM5.5 8a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/smart-crop', label: 'Smart Crop', end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <path fillRule="evenodd" d="M4.5 2a.75.75 0 01.75.75V4h5.25a2.75 2.75 0 012.75 2.75v5.25h1.25a.75.75 0 010 1.5H13v.25a.75.75 0 01-1.5 0V13H4.75A2.75 2.75 0 012 10.25V5a.75.75 0 010-1.5h.25V2.75A.75.75 0 014.5 2zM3.5 5v5.25c0 .69.56 1.25 1.25 1.25H11.5V6.75c0-.69-.56-1.25-1.25-1.25H3.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/batch', label: 'Batch', end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v2A1.5 1.5 0 0112.5 7h-9A1.5 1.5 0 012 5.5v-2zm1.5 0v2h9v-2h-9zM2 9.5A1.5 1.5 0 013.5 8h9A1.5 1.5 0 0114 9.5v2A1.5 1.5 0 0112.5 13h-9A1.5 1.5 0 012 11.5v-2zm1.5 0v2h9v-2h-9z" />
      </svg>
    ),
  },
  {
    to: '/history', label: 'History', end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
        <path fillRule="evenodd" d="M1 8a7 7 0 1114 0A7 7 0 011 8zm7.75-4.25a.75.75 0 00-1.5 0V8c0 .199.079.39.22.53l2.25 2.25a.75.75 0 101.06-1.06L8.75 7.94V3.75z" clipRule="evenodd" />
      </svg>
    ),
  },
]

// ── Reusable nav link with icon ────────────────────────────────────────────
function AppNavLink({ to, label, end, icon }: { to: string; label: string; end?: boolean; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
         transition-all duration-150 whitespace-nowrap select-none
         focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/50 ${
           isActive
             ? 'text-magenta bg-magenta/8 font-semibold'
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
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-0.5 rounded-full bg-gradient-to-r from-magenta to-teal"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </NavLink>
  )
}

// ── Quota bar inside the user dropdown ────────────────────────────────────
// `refreshKey` is bumped each time the dropdown opens so the bar always
// re-fetches fresh data rather than showing stale counts.
function QuotaBar({ refreshKey }: { refreshKey: number }) {
  const [quota, setQuota] = useState<{ used: number; limit: number; disabled: boolean } | null>(null)

  useEffect(() => {
    axios.get('/api/auth/quota')
      .then(r => setQuota(r.data))
      .catch(() => {/* non-fatal */})
  }, [refreshKey]) // re-run whenever the dropdown is opened

  if (!quota || quota.disabled || quota.limit === 0) return null

  const pct  = Math.min(100, Math.round((quota.used / quota.limit) * 100))
  const color = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-amber-400' : 'bg-teal'

  return (
    <div className="px-4 py-2.5 border-b border-border">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted">Daily usage</span>
        <span className="text-xs font-medium text-secondary">
          {quota.used} <span className="text-muted">/ {quota.limit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={quota.used}
          aria-valuemin={0}
          aria-valuemax={quota.limit}
          aria-label="Daily quota usage"
        />
      </div>
      {pct >= 90 && (
        <p className="text-[10px] text-danger mt-1">
          Almost at your daily limit — resets at midnight UTC.
        </p>
      )}
    </div>
  )
}

// ── User menu ──────────────────────────────────────────────────────────────
function UserMenu() {
  const { user, logout }         = useAuth()
  const navigate                 = useNavigate()
  const [open, setOpen]          = useState(false)
  // Incremented each time the dropdown opens — passed to QuotaBar so it
  // always re-fetches fresh quota data rather than showing stale counts.
  const [quotaKey, setQuotaKey]  = useState(0)
  const menuRef                  = useRef<HTMLDivElement>(null)

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

  const initial = user.name.charAt(0).toUpperCase()

  function toggleOpen() {
    setOpen(v => {
      const next = !v
      if (next) setQuotaKey(k => k + 1) // bump key on every open
      return next
    })
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggleOpen}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg
          hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/50"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User menu"
      >
        {/* Avatar with gradient ring on active */}
        <span className={`w-7 h-7 rounded-full text-white text-xs font-bold
          flex items-center justify-center shrink-0 select-none transition-all
          ${open
            ? 'bg-gradient-to-br from-magenta to-teal ring-2 ring-magenta/30'
            : 'bg-magenta'
          }`}>
          {initial}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
          className={`w-3 h-3 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true">
          <path fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z"
            clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border
            bg-surface shadow-lg z-50 overflow-hidden animate-fade-up"
          role="menu"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-magenta to-teal
              text-white text-sm font-bold flex items-center justify-center shrink-0 select-none">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{user.name}</p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
          </div>

          {/* Quota bar — refreshKey bumped on every open so data is always fresh */}
          <QuotaBar refreshKey={quotaKey} />

          {/* Actions */}
          <div className="p-1" role="none">
            <button
              onClick={() => { setOpen(false); navigate('/settings') }}
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                text-secondary hover:text-primary hover:bg-surface-raised transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                className="w-4 h-4 shrink-0" aria-hidden="true">
                <path fillRule="evenodd"
                  d="M6.955 1.45A.5.5 0 017.452 1h1.096a.5.5 0 01.497.45l.17 1.699a5.01 5.01 0 011.322.55l1.423-.866a.5.5 0 01.605.083l.775.775a.5.5 0 01.083.605l-.866 1.423c.23.418.4.865.55 1.322l1.699.17a.5.5 0 01.45.497v1.096a.5.5 0 01-.45.497l-1.699.17a5.014 5.014 0 01-.55 1.322l.866 1.423a.5.5 0 01-.083.605l-.775.775a.5.5 0 01-.605.083l-1.423-.866a5.014 5.014 0 01-1.322.55l-.17 1.699a.5.5 0 01-.497.45H7.452a.5.5 0 01-.497-.45l-.17-1.699a5.014 5.014 0 01-1.322-.55l-1.423.866a.5.5 0 01-.605-.083l-.775-.775a.5.5 0 01-.083-.605l.866-1.423a5.014 5.014 0 01-.55-1.322L1.45 8.549A.5.5 0 011 8.052V6.956a.5.5 0 01.45-.497l1.699-.17c.15-.457.32-.904.55-1.322l-.866-1.423a.5.5 0 01.083-.605l.775-.775a.5.5 0 01.605-.083l1.423.866a5.01 5.01 0 011.322-.55l.17-1.699zM8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                  clipRule="evenodd" />
              </svg>
              Settings
            </button>

            <div className="my-1 border-t border-border" role="separator" />

            <button
              onClick={() => { setOpen(false); logout().then(() => navigate('/login')) }}
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                text-secondary hover:text-danger hover:bg-danger/5 transition-colors text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                className="w-4 h-4 shrink-0" aria-hidden="true">
                <path fillRule="evenodd"
                  d="M2 4.75A2.75 2.75 0 014.75 2h3a2.75 2.75 0 012.75 2.75v.5a.75.75 0 01-1.5 0v-.5c0-.69-.56-1.25-1.25-1.25h-3c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h3c.69 0 1.25-.56 1.25-1.25v-.5a.75.75 0 011.5 0v.5A2.75 2.75 0 017.75 14h-3A2.75 2.75 0 012 11.25v-6.5zm9.47.47a.75.75 0 011.06 0l2.25 2.25a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 11-1.06-1.06l.97-.97H5.25a.75.75 0 010-1.5h7.19l-.97-.97a.75.75 0 010-1.06z"
                  clipRule="evenodd" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Mobile nav drawer ──────────────────────────────────────────────────────
function MobileNavDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw]
          bg-surface border-r border-border shadow-2xl flex flex-col
          md:hidden animate-slide-in-left"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2 focus:outline-none"
            aria-label="Home"
          >
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500
              dark:from-amber-400 dark:to-pink-500
              flex items-center justify-center shrink-0 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                className="w-[15px] h-[15px]" aria-hidden="true">
                <circle cx="6" cy="6" r="2.5" />
                <circle cx="6" cy="18" r="2.5" />
                <path d="M8.12 8.12 20 4" />
                <path d="M8.5 15.5 20 20" />
                <path d="M8.12 8.12 12 12" />
                <path d="M12 12 8.5 15.5" />
              </svg>
            </span>
            <span className="font-display font-bold text-base text-primary">
              BG<span className="text-violet-500 dark:text-amber-400">.</span>Remover
            </span>
          </Link>

          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised
              transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
              className="w-4 h-4" aria-hidden="true">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Mobile navigation">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                 transition-colors mb-0.5
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/50 ${
                   isActive
                     ? 'bg-magenta/10 text-magenta font-semibold'
                     : 'text-secondary hover:text-primary hover:bg-surface-raised'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-magenta' : 'text-muted'}>
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}

// ── Main Navbar ────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, loading } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border glass bg-surface/90">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">

        {/* Hamburger button — mobile only, logged-in only */}
        {user && (
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg
              text-secondary hover:text-primary hover:bg-surface-raised transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/50 shrink-0"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
              className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd"
                d="M2 4.75A.75.75 0 012.75 4h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 3.5A.75.75 0 012.75 7.5h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 8.25zm0 3.5a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
                clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 group focus:outline-none shrink-0"
          aria-label="AI Background Remover home"
        >
          <span className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500
            dark:from-amber-400 dark:to-pink-500
            flex items-center justify-center shrink-0
            transition-transform group-hover:scale-105 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              className="w-[15px] h-[15px]" aria-hidden="true">
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="6" cy="18" r="2.5" />
              <path d="M8.12 8.12 20 4" />
              <path d="M8.5 15.5 20 20" />
              <path d="M8.12 8.12 12 12" />
              <path d="M12 12 8.5 15.5" />
            </svg>
          </span>
          <span className="font-display font-bold text-base leading-none text-primary
            group-hover:text-violet-500 dark:group-hover:text-amber-400 transition-colors">
            <span className="hidden sm:inline">BG<span className="text-violet-500 dark:text-amber-400">.</span>Remover</span>
            <span className="sm:hidden text-violet-500 dark:text-amber-400 font-black">BG.</span>
          </span>
        </Link>

        {/* Feature nav — desktop only, logged-in only */}
        {user && (
          <nav
            className="hidden md:flex items-center gap-0.5 flex-1 justify-center"
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map(item => (
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

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          {!loading && (
            user ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-secondary
                    hover:text-primary hover:bg-surface-raised transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold
                    bg-gradient-to-r from-magenta to-teal hover:opacity-90
                    text-white transition-opacity shadow-sm"
                >
                  Get started
                </Link>
              </div>
            )
          )}
        </div>

      </div>

      {/* Mobile nav drawer — replaces the old horizontal scroll bar */}
      {user && (
        <MobileNavDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </header>
  )
}
