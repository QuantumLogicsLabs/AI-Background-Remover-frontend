import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../hooks/useAuth'
import { useThemeSettings, AccentTheme } from '../contexts/ThemeSettingsContext'
import Tooltip from './Tooltip'

// ── Primary nav items (always visible) ────────────────────────────────────
const NAV_ITEMS = [
  { to: '/',                   label: 'Remove BG',  end: true,  icon: '✂️' },
  { to: '/enhance',            label: 'Enhance',    end: false, icon: '✨' },
  { to: '/shadow',             label: 'Shadow',     end: false, icon: '💡' },
  { to: '/recolor-and-eraser', label: 'Recolor',    end: false, icon: '🎨' },
  { to: '/smart-crop',         label: 'Crop',       end: false, icon: '🔲' },
  { to: '/batch',              label: 'Batch',      end: false, icon: '📁' },
  { to: '/history',            label: 'History',    end: false, icon: '🕐' },
  { to: '/ai-analysis',        label: 'AI Analysis',end: false, icon: '🔍' },
  { to: '/similarity-search',  label: 'Similar',    end: false, icon: '🔗' },
]

function AppNavLink({ to, label, end, icon }: { to: string; label: string; end?: boolean; icon: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
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
          <span className={`text-sm leading-none ${isActive ? 'text-magenta' : 'text-muted'}`}>
            {icon}
          </span>
          <span className="hidden lg:inline">{label}</span>
          {isActive && (
            <span
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-gradient-to-r from-magenta to-teal"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </NavLink>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const { accent, setAccent } = useThemeSettings()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
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
    setOpen(v => !v)
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
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/85 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left Side: Brand */}
        <div className="flex items-center gap-3 shrink-0">
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
          <div className="hidden md:flex min-w-0 flex-1 justify-center">
            <nav className="flex items-center gap-0.5 py-1" aria-label="Main navigation">
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
          </div>
        )}

        {/* Right side Actions */}
        <div className="flex items-center gap-2 shrink-0">
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

          {/* Settings icon */}
          {user && (
            <Tooltip content="Settings" position="bottom">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 active:scale-95 shadow-xs ${
                  location.pathname === '/settings'
                    ? 'border-magenta/50 bg-magenta/10 text-magenta'
                    : 'border-border bg-surface hover:bg-surface-raised hover:border-border-strong text-secondary hover:text-primary'
                }`}
                aria-label="Settings"
              >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
            </Tooltip>
          )}

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

