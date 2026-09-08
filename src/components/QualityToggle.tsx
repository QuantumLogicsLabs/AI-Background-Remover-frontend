import type { Quality } from '../hooks/useUpload'

interface QualityToggleProps {
  value:    Quality
  onChange: (q: Quality) => void
  disabled?: boolean
}

/**
 * Three-option pill toggle for selecting background-removal quality:
 *   fast     — ISNet (default, quickest)
 *   standard — U²-Net human seg (portrait-optimised, best for people)
 *   quality  — BiRefNet (best edge detail for anything, slower)
 */
export default function QualityToggle({ value, onChange, disabled }: QualityToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-secondary uppercase tracking-widest">
        Quality
      </p>
      <div
        role="radiogroup"
        aria-label="Background removal quality"
        className={`
          flex flex-row rounded-lg border border-border bg-surface-raised p-0.5 gap-0.5
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {(
          [
            {
              id:          'fast' as Quality,
              label:       'Fast',
              description: 'ISNet · quick results',
              accent:      'text-teal',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
                  fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                  <path d="M9.765 2.996A7.012 7.012 0 009 3a7 7 0 100 14 7.012 7.012 0 00.765-.004A1.002 1.002 0 009 16V9a1 1 0 010-2V2a1.002 1.002 0 00.765-.004zM14.5 8a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0zm-7-4.243a.75.75 0 011.06 0l2.121 2.121a.75.75 0 010 1.06L8.56 9.06a.75.75 0 01-1.06-1.06l.47-.47H5.5a.75.75 0 010-1.5h2.47L7.5 5.56a.75.75 0 010-1.06l.53-.532-.53-.53V3.757z"/>
                </svg>
              ),
            },
            {
              id:          'standard' as Quality,
              label:       'Standard',
              description: 'U²-Net · best for people',
              accent:      'text-magenta',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
                  fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                  <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 00-11.215 0c-.22.578.254 1.139.872 1.139h9.47z"/>
                </svg>
              ),
            },
            {
              id:          'quality' as Quality,
              label:       'Quality',
              description: 'BiRefNet · best edges',
              accent:      'text-purple-400',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
                  fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                  <path fillRule="evenodd" d="M9.808 4.057a.75.75 0 01.92-.527l2.963.991a.75.75 0 01-.394 1.446l-1.048-.35L14 9.208a.75.75 0 01-.13.838L11 13H5a.75.75 0 010-1.5h5.586l2.207-2.207-1.44-2.997-1.047.35a.75.75 0 11-.474-1.425l-.024-.164zM4.492 9.19a.75.75 0 01-.55.055L1.979 8.254a.75.75 0 11.394-1.446l1.048.35L1 5.042A.75.75 0 011.13 4.2L4 1.25h.75a.75.75 0 010 1.5H4.414L2.207 4.957l1.44 2.997 1.047-.35a.75.75 0 11.474 1.425l.024.162z" clipRule="evenodd"/>
                </svg>
              ),
            },
          ] as const
        ).map(opt => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.id)}
              disabled={disabled}
              title={opt.description}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs
                transition-all duration-150 select-none
                ${active
                  ? 'bg-surface shadow-sm text-primary font-semibold border border-border'
                  : 'text-secondary hover:text-primary'
                }
              `}
            >
              <span className={`shrink-0 ${active ? opt.accent : 'text-muted'}`}>
                {opt.icon}
              </span>
              <span className="leading-none">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
