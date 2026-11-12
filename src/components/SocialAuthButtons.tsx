import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useToast } from '../hooks/useToast'

type Provider = 'google' | 'github'

const LABELS: Record<Provider, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
}

const ICONS: Record<Provider, JSX.Element> = {
  google: (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 015.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  ),
}

/**
 * "Continue with Google / GitHub" buttons for the Login and Register pages.
 *
 * - Only renders providers the backend reports as configured (GET /api/auth/oauth/providers),
 *   so environments without OAuth keys look exactly as before.
 * - Navigates the whole browser to the backend, which runs the OAuth redirect flow.
 * - Shows backend-reported errors (?oauth_error=...) as a toast.
 */
export default function SocialAuthButtons() {
  const [enabled, setEnabled] = useState<Provider[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false
    axios
      .get<Record<Provider, boolean>>('/api/auth/oauth/providers', { timeout: 8000 })
      .then(res => {
        if (cancelled) return
        setEnabled((['google', 'github'] as Provider[]).filter(p => res.data[p]))
      })
      .catch(() => { /* backend unreachable or old backend — just hide the buttons */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const err = searchParams.get('oauth_error')
    if (!err) return
    showToast(err, 'error')
    const next = new URLSearchParams(searchParams)
    next.delete('oauth_error')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, showToast])

  if (enabled.length === 0) return null

  // Full-page navigation (not axios): the backend must set cookies and redirect.
  const base = (import.meta.env.VITE_API_BASE_URL ?? '') as string
  const go = (p: Provider) => { window.location.href = `${base}/api/auth/oauth/${p}` }

  return (
    <div className="flex flex-col gap-3">
      {enabled.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => go(p)}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-surface text-sm font-semibold text-primary hover:bg-surface-raised transition-colors"
        >
          {ICONS[p]}
          {LABELS[p]}
        </button>
      ))}
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-border" />
        or use email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
