import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../hooks/useAuth'
import ProfileForm from './ProfileForm'

interface Props {
  open: boolean
  onClose: () => void
}

// Rendered in a portal because the navbar's backdrop-filter would otherwise
// trap a position:fixed overlay inside the header.
export default function ProfileModal({ open, onClose }: Props) {
  const { user } = useAuth()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !user) return null

  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U'

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-up"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl glass-modal animate-scale-in overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-full bg-magenta text-white text-sm font-bold flex items-center justify-center shrink-0">
              {initial}
            </span>
            <div className="min-w-0">
              <h2 id="profile-modal-title" className="text-base font-bold text-primary">Edit profile</h2>
              <p className="text-xs text-muted truncate">Update your account details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface-raised transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <ProfileForm idPrefix="modal" onSaved={onClose} onCancel={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  )
}