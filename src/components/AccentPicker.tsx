import { useThemeSettings, ACCENT_OPTIONS, type AccentTheme } from '../contexts/ThemeSettingsContext'
import { useToast } from '../hooks/useToast'

interface Props {
  /** 'grid' = compact 2x2 (navbar / sidebar). 'cards' = full-width rows (settings). */
  variant?: 'grid' | 'cards'
}

function Swatch({ primary, secondary, size }: { primary: string; secondary: string; size: string }) {
  return (
    <span
      className={`${size} rounded-full shrink-0 border border-white/30 shadow-sm`}
      style={{ background: `linear-gradient(135deg, ${primary} 50%, ${secondary} 50%)` }}
      aria-hidden="true"
    />
  )
}

export default function AccentPicker({ variant = 'grid' }: Props) {
  const { accent, setAccent } = useThemeSettings()
  const { showToast } = useToast()

  function pick(id: AccentTheme, name: string) {
    if (id === accent) return
    setAccent(id)
    if (variant === 'cards') showToast(`Theme changed to ${name}`, 'info')
  }

  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Accent theme">
        {ACCENT_OPTIONS.map(o => {
          const selected = accent === o.id
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => pick(o.id, o.name)}
              className={`p-4 rounded-xl border text-left transition-all duration-150 flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/50 ${
                selected
                  ? 'border-magenta bg-magenta/10 shadow-sm ring-1 ring-magenta/40'
                  : 'border-border bg-surface-raised hover:border-border-strong hover:bg-surface'
              }`}
            >
              <Swatch primary={o.primary} secondary={o.secondary} size="w-9 h-9" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-primary">{o.name}</span>
                <span className="block text-xs text-muted">{o.pair} · {o.desc}</span>
              </span>
              {selected && <span className="text-[10px] font-bold text-magenta uppercase tracking-wider">Active</span>}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Accent theme">
      {ACCENT_OPTIONS.map(o => {
        const selected = accent === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => pick(o.id, o.name)}
            title={`${o.name} (${o.pair})`}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/50 ${
              selected
                ? 'border-magenta bg-magenta/10 text-primary'
                : 'border-border text-secondary hover:text-primary hover:bg-surface-raised'
            }`}
          >
            <Swatch primary={o.primary} secondary={o.secondary} size="w-4 h-4" />
            <span className="truncate">{o.name}</span>
          </button>
        )
      })}
    </div>
  )
}