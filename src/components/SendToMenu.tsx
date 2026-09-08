/**
 * SendToMenu
 *
 * A polished "Send to…" dropdown button that appears in result action bars.
 * It lists compatible Studio tools the user can forward the current output to
 * with a single click — no re-uploading required.
 *
 * Props:
 *   excludeRoute — the current page's route, excluded from the options list
 *   disabled     — forwarded to the trigger button (e.g. while processing)
 */

import { useState, useRef, useEffect } from 'react'
import { useStudioOutput } from '../hooks/useStudioOutput'
import { useActiveImage }  from '../contexts/ActiveImageContext'

// ── Tool registry ─────────────────────────────────────────────────────────────

interface ToolEntry {
  route: string
  label: string
  icon:  string
  color: string
}

const ALL_TOOLS: ToolEntry[] = [
  { route: '/',           label: 'Remove BG',   icon: '✂️',  color: 'text-magenta' },
  { route: '/enhance',    label: 'Enhance',      icon: '✨',  color: 'text-teal'    },
  { route: '/replace-bg', label: 'Replace BG',   icon: '🖼️', color: 'text-magenta' },
  { route: '/recolor-and-eraser', label: 'Recolor & Eraser', icon: '🎨',  color: 'text-violet'  },
  { route: '/shadow',     label: 'Shadow & Glow',icon: '💡',  color: 'text-amber'   },
  { route: '/smart-crop', label: 'Smart Crop',   icon: '🔲',  color: 'text-teal'    },
  { route: '/ai-analysis',label: 'AI Tools',     icon: '🤖',  color: 'text-violet'  },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface SendToMenuProps {
  /** Route of the current page — this option will be hidden */
  excludeRoute: string
  /** Disable the button (e.g. while another operation is in progress) */
  disabled?: boolean
}

export default function SendToMenu({ excludeRoute, disabled = false }: SendToMenuProps) {
  const { pipelineOutput }    = useActiveImage()
  const { sendTo, isSending } = useStudioOutput()
  const [open, setOpen]       = useState(false)
  const menuRef               = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const tools     = ALL_TOOLS.filter(t => t.route !== excludeRoute)
  const isDisabled = disabled || isSending || !pipelineOutput

  const handleSend = async (route: string) => {
    setOpen(false)
    await sendTo(route)
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        id={`send-to-menu-${excludeRoute.replace('/', '') || 'home'}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Send result to another tool"
        disabled={isDisabled}
        onClick={() => setOpen(prev => !prev)}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-150 border
          ${isDisabled
            ? 'border-border text-muted bg-surface-raised cursor-not-allowed opacity-60'
            : 'border-teal/40 text-teal bg-teal/8 hover:bg-teal/15 hover:border-teal/60 active:scale-95 cursor-pointer'
          }
        `}
      >
        {isSending ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin shrink-0" xmlns="http://www.w3.org/2000/svg"
              fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Sending…
          </>
        ) : (
          <>
            {/* Arrow-right icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
              fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
              <path fillRule="evenodd"
                d="M2 8a.75.75 0 01.75-.75h8.69L9.22 5.03a.75.75 0 011.06-1.06l3.5 3.5a.75.75 0 010 1.06l-3.5 3.5a.75.75 0 11-1.06-1.06l2.22-2.22H2.75A.75.75 0 012 8z"
                clipRule="evenodd" />
            </svg>
            Send to…
            {/* Chevron */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
              fill="currentColor"
              className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
              aria-hidden="true">
              <path fillRule="evenodd"
                d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z"
                clipRule="evenodd" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          aria-label="Send result to tool"
          className="
            absolute right-0 bottom-full mb-2 z-50
            min-w-[180px] py-1.5
            bg-surface border border-border
            rounded-xl shadow-xl
            animate-fade-up
          "
        >
          <p className="px-3 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted border-b border-border mb-1">
            Send result to
          </p>
          {tools.map(tool => (
            <button
              key={tool.route}
              role="menuitem"
              onClick={() => handleSend(tool.route)}
              className="
                w-full flex items-center gap-2.5 px-3 py-2
                text-sm text-secondary
                hover:bg-surface-raised hover:text-primary
                transition-colors duration-100
              "
            >
              <span className="text-base leading-none" aria-hidden="true">{tool.icon}</span>
              <span className={`font-medium ${tool.color}`}>{tool.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
