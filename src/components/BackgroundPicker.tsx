import { useCallback, useState, useRef } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import {
  BgSettings,
  BgType,
  GradientDir,
  BgFit,
  DEFAULT_BG_SETTINGS,
} from '../hooks/useReplaceBg'

// ── Types ──────────────────────────────────────────────────────────────────

interface BackgroundPickerProps {
  settings:  BgSettings
  onChange:  <K extends keyof BgSettings>(key: K, value: BgSettings[K]) => void
  onReset:   () => void
  disabled?: boolean
}

// ── Preset palettes ────────────────────────────────────────────────────────

const SOLID_PRESETS = [
  { label: 'White',       color: '#ffffff' },
  { label: 'Black',       color: '#000000' },
  { label: 'Slate',       color: '#1e293b' },
  { label: 'Cream',       color: '#fefce8' },
  { label: 'Sky',         color: '#e0f2fe' },
  { label: 'Mint',        color: '#d1fae5' },
  { label: 'Blush',       color: '#ffe4e6' },
  { label: 'Lavender',    color: '#ede9fe' },
  { label: 'Magenta',     color: '#e8336d' },
  { label: 'Teal',        color: '#2fbfb0' },
  { label: 'Gold',        color: '#f59e0b' },
  { label: 'Transparent', color: '#00000000' },
]

const GRADIENT_PRESETS: { label: string; start: string; end: string; dir: GradientDir }[] = [
  { label: 'Brand',    start: '#e8336d', end: '#2fbfb0', dir: 'diagonal'   },
  { label: 'Sunset',   start: '#f97316', end: '#e8336d', dir: 'vertical'   },
  { label: 'Ocean',    start: '#0ea5e9', end: '#2fbfb0', dir: 'horizontal' },
  { label: 'Forest',   start: '#16a34a', end: '#0ea5e9', dir: 'vertical'   },
  { label: 'Dusk',     start: '#7c3aed', end: '#e8336d', dir: 'diagonal'   },
  { label: 'Gold',     start: '#f59e0b', end: '#f97316', dir: 'horizontal' },
  { label: 'Night',    start: '#0f172a', end: '#1e293b', dir: 'vertical'   },
  { label: 'Peach',    start: '#fdba74', end: '#fda4af', dir: 'diagonal'   },
]

const DIR_OPTIONS: { value: GradientDir; label: string }[] = [
  { value: 'vertical',   label: '↕ Vertical'   },
  { value: 'horizontal', label: '↔ Horizontal' },
  { value: 'diagonal',   label: '↗ Diagonal'   },
]

const FIT_OPTIONS: { value: BgFit; label: string; desc: string }[] = [
  { value: 'cover',   label: 'Cover',   desc: 'Fill & crop' },
  { value: 'contain', label: 'Contain', desc: 'Letterbox'   },
  { value: 'stretch', label: 'Stretch', desc: 'Distort fit' },
]

// ── Tab bar ────────────────────────────────────────────────────────────────

const TABS: { value: BgType; label: string; icon: string }[] = [
  { value: 'solid',    label: 'Solid',    icon: '■'  },
  { value: 'gradient', label: 'Gradient', icon: '▦'  },
  { value: 'image',    label: 'Image',    icon: '🖼'  },
  { value: 'library',  label: 'Library',  icon: '🗂'  },
]

// ── Library data ───────────────────────────────────────────────────────────
// All images from Unsplash Source API — free, no-auth, served via CDN.
// Format: https://images.unsplash.com/photo-{id}?w=600&q=80&fit=crop
// The full-size URL (w=1920) is fetched when the user clicks to apply.

interface LibraryImage {
  id:       string   // Unsplash photo ID
  label:    string
  thumb:    string   // small thumbnail (w=300) for gallery display
  full:     string   // larger image (w=1200) sent to the API
}

interface LibraryCategory {
  key:    string
  label:  string
  icon:   string
  images: LibraryImage[]
}

function unsplash(id: string, label: string): LibraryImage {
  return {
    id,
    label,
    thumb: `https://images.unsplash.com/photo-${id}?w=300&h=200&fit=crop&q=75&auto=format`,
    full:  `https://images.unsplash.com/photo-${id}?w=1200&h=900&fit=crop&q=85&auto=format`,
  }
}

const LIBRARY_CATEGORIES: LibraryCategory[] = [
  {
    key: 'studio', label: 'Studio', icon: '🎨',
    images: [
      unsplash('1553356084-58ef4a67b2a7', 'Soft White Studio'),
      unsplash('1618005182384-a83a8bd57fbe', 'Light Grey Wall'),
      unsplash('1558618666-fcd25c85cd64', 'Marble Surface'),
      unsplash('1507003211169-0a1dd7228f2d', 'Warm Beige Texture'),
      unsplash('1604076913837-52ab5629fde9', 'Dark Concrete'),
      unsplash('1473186578172-c141e6798cf4', 'Wood Texture'),
    ],
  },
  {
    key: 'nature', label: 'Nature', icon: '🌿',
    images: [
      unsplash('1441974231531-c6227db76b6e', 'Green Forest'),
      unsplash('1506905925346-21bda4d32df4', 'Mountain Mist'),
      unsplash('1500534314209-a25ddb2bd429', 'Bright Sky'),
      unsplash('1448375240586-882707db888b', 'Autumn Leaves'),
      unsplash('1469474968028-56623f02e42e', 'Sunlit Meadow'),
      unsplash('1534274988757-a28bf1a57c17', 'Tropical Beach'),
    ],
  },
  {
    key: 'abstract', label: 'Abstract', icon: '✦',
    images: [
      unsplash('1557672172-298e090bd0f1', 'Purple Fluid'),
      unsplash('1567359781514-3b964e2b04d6', 'Blue Swirl'),
      unsplash('1519681393784-d120267933ba', 'Starry Night'),
      unsplash('1550684376-efcomment-a-blur', 'Bokeh Lights'),
      unsplash('1541701494587-cb58502866ab', 'Colorful Shapes'),
      unsplash('1543158181-e6f9f6712055', 'Golden Bokeh'),
    ],
  },
  {
    key: 'gradient', label: 'Gradients', icon: '🌈',
    images: [
      unsplash('1579546929518-9e396f3cc809', 'Pink Purple Gradient'),
      unsplash('1558591710-4b4a1ae0f665', 'Blue Gradient'),
      unsplash('1580196969807-cc6de06c05be', 'Teal Green Gradient'),
      unsplash('1620641788421-7a1c342ea42e', 'Dark Space Gradient'),
      unsplash('1636633762833-5d1658f1e29b', 'Orange Gradient'),
      unsplash('1497366216548-37526070297c', 'Office Minimal'),
    ],
  },
  {
    key: 'urban', label: 'Urban', icon: '🏙',
    images: [
      unsplash('1477959858617-67f85cf4f1df', 'City Skyline'),
      unsplash('1513635269975-59663e0ac1ad', 'Night Streets'),
      unsplash('1449824913935-59a10b8d2000', 'Buildings'),
      unsplash('1480714378408-67cf0d13bc1b', 'Busy Road'),
      unsplash('1542332213-9b5a5a3fad35', 'Office Interior'),
      unsplash('1497366811353-6870744d04b2', 'Modern Office'),
    ],
  },
  {
    key: 'seasonal', label: 'Seasonal', icon: '🍂',
    images: [
      unsplash('1418985991508-e47386d96a71', 'Winter Snow'),
      unsplash('1507003211169-0a1dd7228f2d', 'Spring Bloom'),
      unsplash('1470770841072-f978cf4d019e', 'Summer Sunset'),
      unsplash('1508739773434-c26b3d09e071', 'Autumn Path'),
      unsplash('1491002052546-bf38f186af56', 'Rainy Day'),
      unsplash('1534330207526-8e81f10ec6fc', 'Foggy Morning'),
    ],
  },
]

// ── Gradient preview helper ────────────────────────────────────────────────

function gradientStyle(start: string, end: string, dir: GradientDir): React.CSSProperties {
  const angles: Record<GradientDir, string> = {
    vertical:   'to bottom',
    horizontal: 'to right',
    diagonal:   'to bottom right',
  }
  return { background: `linear-gradient(${angles[dir]}, ${start}, ${end})` }
}

// ── Image drop zone (internal) ─────────────────────────────────────────────

interface BgDropZoneProps {
  file:     File | null
  onChange: (file: File | null) => void
  disabled: boolean
}

function BgDropZone({ file, onChange, disabled }: BgDropZoneProps) {
  const previewUrl = file ? URL.createObjectURL(file) : null

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0 || !accepted[0]) return
      onChange(accepted[0])
    },
    [onChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 20 * 1024 * 1024,
    maxFiles: 1,
    disabled,
  })

  return (
    <div className="flex flex-col gap-2">
      <div
        {...getRootProps()}
        className={`
          relative flex flex-col items-center justify-center gap-2
          min-h-[120px] rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-200 overflow-hidden
          ${isDragActive
            ? 'border-magenta bg-magenta/5'
            : 'border-border hover:border-magenta/50 bg-surface-raised'
          }
          ${disabled ? 'opacity-40 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />

        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Background preview"
            className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-60"
          />
        ) : null}

        <div className="relative z-10 text-center px-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`w-7 h-7 mx-auto mb-1 ${previewUrl ? 'text-white' : 'text-muted'}`}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M4.5 3h15M5.25 3v18M18.75 3v18" />
          </svg>
          <p className={`text-xs font-medium ${previewUrl ? 'text-white drop-shadow' : 'text-secondary'}`}>
            {previewUrl ? file!.name : 'Drop or click to choose background'}
          </p>
          {!previewUrl && (
            <p className="text-[10px] text-muted mt-0.5">JPEG, PNG, WebP · max 20 MB</p>
          )}
        </div>
      </div>

      {file && (
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="text-xs text-muted hover:text-danger transition-colors self-end"
        >
          Remove image
        </button>
      )}
    </div>
  )
}

// ── Library card ───────────────────────────────────────────────────────────

interface LibraryCardProps {
  image:       LibraryImage
  isSelected:  boolean
  isLoading:   boolean
  hasError:    boolean
  disabled:    boolean
  onSelect:    (image: LibraryImage) => void
}

function LibraryCard({ image, isSelected, isLoading, hasError, disabled, onSelect }: LibraryCardProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={() => onSelect(image)}
      aria-label={`Select ${image.label} background`}
      aria-pressed={isSelected}
      className={`
        relative w-full aspect-video rounded-lg overflow-hidden border-2
        transition-all duration-200 group
        focus:outline-none focus:ring-2 focus:ring-magenta focus:ring-offset-1
        ${isSelected
          ? 'border-magenta shadow-md scale-[1.02]'
          : 'border-border hover:border-magenta/50 hover:scale-[1.02]'
        }
        ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Thumbnail */}
      <img
        src={image.thumb}
        alt={image.label}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        onError={(e) => {
          // Fallback to a grey placeholder on load error
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-sm">
          <svg
            className="w-5 h-5 animate-spin text-magenta"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="w-4 h-4 text-danger" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
          </svg>
          <span className="text-[9px] text-danger font-medium">Failed</span>
        </div>
      )}

      {/* Selected checkmark */}
      {isSelected && !isLoading && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-magenta flex items-center justify-center shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor"
            className="w-3 h-3 text-white" aria-hidden="true">
            <path fillRule="evenodd" d="M9.5 3.5a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06L5 6.94l3.44-3.44a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Label on hover */}
      <div className="absolute inset-x-0 bottom-0 py-1 px-1.5 bg-gradient-to-t from-black/60 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-[9px] text-white font-medium truncate">{image.label}</p>
      </div>
    </button>
  )
}

// ── Library panel ──────────────────────────────────────────────────────────

interface LibraryPanelProps {
  selectedUrl:  string | null
  loadingId:    string | null
  errorIds:     Set<string>
  disabled:     boolean
  onSelect:     (image: LibraryImage) => void
}

function LibraryPanel({ selectedUrl, loadingId, errorIds, disabled, onSelect }: LibraryPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>(LIBRARY_CATEGORIES[0].key)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const currentCategory = LIBRARY_CATEGORIES.find(c => c.key === activeCategory)!

  // Filter images by search query across ALL categories when typing
  const searching = query.trim().length > 0
  const allImages = LIBRARY_CATEGORIES.flatMap(c => c.images)
  const filteredImages = searching
    ? allImages.filter(img =>
        img.label.toLowerCase().includes(query.toLowerCase()) ||
        LIBRARY_CATEGORIES.find(c => c.images.some(i => i.id === img.id))?.label
          .toLowerCase().includes(query.toLowerCase())
      )
    : currentCategory.images

  return (
    <div className="flex flex-col gap-3 animate-fade-up" role="tabpanel" aria-label="Background library">

      {/* Search bar */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          disabled={disabled}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search backgrounds…"
          aria-label="Search library backgrounds"
          className="
            w-full pl-8 pr-3 py-1.5 rounded-lg border border-border
            bg-surface-raised text-xs text-primary placeholder-text-muted
            focus:outline-none focus:border-magenta
            disabled:opacity-40 transition-colors
          "
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
            </svg>
          </button>
        )}
      </div>

      {/* Category tabs — hidden when searching */}
      {!searching && (
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide" role="tablist" aria-label="Background categories">
          {LIBRARY_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              role="tab"
              aria-selected={activeCategory === cat.key}
              disabled={disabled}
              onClick={() => setActiveCategory(cat.key)}
              className={`
                shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium
                transition-all whitespace-nowrap
                ${activeCategory === cat.key
                  ? 'bg-magenta text-white shadow-sm'
                  : 'bg-surface-raised border border-border text-muted hover:text-secondary hover:border-magenta/30'
                }
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              <span aria-hidden="true">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Search label */}
      {searching && (
        <p className="text-[10px] text-muted">
          {filteredImages.length === 0
            ? 'No results found'
            : `${filteredImages.length} result${filteredImages.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Image grid */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {filteredImages.map(img => (
            <LibraryCard
              key={img.id}
              image={img}
              isSelected={selectedUrl === img.full}
              isLoading={loadingId === img.id}
              hasError={errorIds.has(img.id)}
              disabled={disabled || (loadingId !== null && loadingId !== img.id)}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="text-2xl" aria-hidden="true">🔍</span>
          <p className="text-xs text-muted">No backgrounds match "{query}"</p>
        </div>
      )}

      {/* Attribution note */}
      <p className="text-[9px] text-muted text-center leading-relaxed">
        Photos from{' '}
        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer"
          className="underline hover:text-secondary transition-colors">
          Unsplash
        </a>
        {' '}· Free to use
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function BackgroundPicker({
  settings,
  onChange,
  onReset,
  disabled = false,
}: BackgroundPickerProps) {
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(DEFAULT_BG_SETTINGS)

  // ── Library state ────────────────────────────────────────────────────────
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [errorIds,  setErrorIds]  = useState<Set<string>>(new Set())

  // Listen for fit changes from the LibraryPanel (uses a custom event to avoid prop drilling)
  const handleLibraryFitEvent = useCallback((e: Event) => {
    const fit = (e as CustomEvent).detail as BgFit
    onChange('bgFit', fit)
  }, [onChange])

  // Attach / detach event listener when the Library tab is active
  // We do it unconditionally but it only fires when the library panel is mounted.
  if (typeof window !== 'undefined') {
    window.removeEventListener('__library_fit' as any, handleLibraryFitEvent)
    if (settings.bgType === 'library') {
      window.addEventListener('__library_fit' as any, handleLibraryFitEvent, { once: false })
    }
  }

  const handleLibrarySelect = useCallback(async (image: LibraryImage) => {
    if (loadingId) return  // another fetch in flight

    setLoadingId(image.id)
    setErrorIds(prev => { const s = new Set(prev); s.delete(image.id); return s })

    try {
      const res = await fetch(image.full, { mode: 'cors' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const ext  = blob.type === 'image/png' ? 'png' : 'jpg'
      const file = new File([blob], `library-${image.id}.${ext}`, { type: blob.type })

      // Store as bgFile so the existing replaceBackground API call picks it up
      onChange('bgFile',      file)
      onChange('libraryUrl',  image.full)
      // Keep bgType as 'library' so the Library tab stays selected
      // useReplaceBg.replaceBackground normalises 'library' → 'image' for the API
    } catch {
      setErrorIds(prev => new Set(prev).add(image.id))
    } finally {
      setLoadingId(null)
    }
  }, [loadingId, onChange])

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
          Background
        </h2>
        {hasChanges && (
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="text-xs text-muted hover:text-magenta transition-colors disabled:opacity-40"
          >
            Reset
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div
        className="flex items-center gap-1 bg-surface-raised border border-border rounded-lg p-1"
        role="tablist"
        aria-label="Background type"
      >
        {TABS.map(({ value, label, icon }) => (
          <button
            key={value}
            role="tab"
            aria-selected={settings.bgType === value}
            disabled={disabled}
            onClick={() => {
              onChange('bgType', value)
              // Clear library selection when switching away from library
              if (value !== 'library' && settings.bgType === 'library') {
                onChange('bgFile',     null)
                onChange('libraryUrl', null)
              }
            }}
            className={`
              flex-1 flex items-center justify-center gap-1
              px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all
              ${settings.bgType === value
                ? 'bg-magenta text-white shadow-sm'
                : 'text-muted hover:text-secondary hover:bg-surface'
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            <span aria-hidden="true">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Solid panel ─────────────────────────────────────────────────── */}
      {settings.bgType === 'solid' && (
        <div className="flex flex-col gap-3 animate-fade-up" role="tabpanel">

          {/* Preset swatches */}
          <div>
            <p className="text-xs text-muted mb-2">Presets</p>
            <div className="grid grid-cols-6 gap-1.5" role="listbox" aria-label="Colour presets">
              {SOLID_PRESETS.map(({ label, color }) => {
                const isActive = settings.solidColor === color
                const isTransparent = color === '#00000000'
                return (
                  <button
                    key={color}
                    role="option"
                    aria-selected={isActive}
                    aria-label={label}
                    disabled={disabled}
                    onClick={() => onChange('solidColor', color)}
                    title={label}
                    className={`
                      w-full aspect-square rounded-md border-2 transition-all
                      hover:scale-110 focus:outline-none focus:ring-2 focus:ring-magenta
                      ${isActive ? 'border-magenta scale-110 shadow-md' : 'border-border'}
                      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    style={
                      isTransparent
                        ? {
                            backgroundImage:
                              'linear-gradient(45deg,#ccc 25%,transparent 25%),' +
                              'linear-gradient(-45deg,#ccc 25%,transparent 25%),' +
                              'linear-gradient(45deg,transparent 75%,#ccc 75%),' +
                              'linear-gradient(-45deg,transparent 75%,#ccc 75%)',
                            backgroundSize: '8px 8px',
                            backgroundPosition: '0 0,0 4px,4px -4px,-4px 0',
                            backgroundColor: '#fff',
                          }
                        : { backgroundColor: color }
                    }
                  />
                )
              })}
            </div>
          </div>

          {/* Custom colour input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="solid-color-input" className="text-xs text-muted">
              Custom colour
            </label>
            <div className="flex items-center gap-2">
              <input
                id="solid-color-input"
                type="color"
                value={settings.solidColor.slice(0, 7)}   // <input type=color> needs 6-digit hex
                disabled={disabled}
                onChange={e => onChange('solidColor', e.target.value)}
                className="w-9 h-9 rounded-md border border-border cursor-pointer bg-transparent disabled:opacity-40"
                aria-label="Pick a custom colour"
              />
              <input
                type="text"
                value={settings.solidColor}
                disabled={disabled}
                maxLength={9}
                onChange={e => onChange('solidColor', e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-md border border-border bg-surface-raised text-sm font-mono text-primary focus:outline-none focus:border-magenta disabled:opacity-40"
                aria-label="Hex colour value"
                placeholder="#rrggbb"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Gradient panel ──────────────────────────────────────────────── */}
      {settings.bgType === 'gradient' && (
        <div className="flex flex-col gap-4 animate-fade-up" role="tabpanel">

          {/* Gradient preview */}
          <div
            className="w-full h-16 rounded-xl border border-border shadow-sm"
            style={gradientStyle(settings.gradientStart, settings.gradientEnd, settings.gradientDir)}
            aria-hidden="true"
          />

          {/* Presets */}
          <div>
            <p className="text-xs text-muted mb-2">Presets</p>
            <div className="grid grid-cols-4 gap-2">
              {GRADIENT_PRESETS.map(({ label, start, end, dir }) => {
                const isActive =
                  settings.gradientStart === start &&
                  settings.gradientEnd   === end   &&
                  settings.gradientDir   === dir
                return (
                  <button
                    key={label}
                    disabled={disabled}
                    onClick={() => {
                      onChange('gradientStart', start)
                      onChange('gradientEnd',   end)
                      onChange('gradientDir',   dir)
                    }}
                    title={label}
                    className={`
                      h-10 rounded-lg border-2 transition-all text-[10px] font-medium
                      hover:scale-105 focus:outline-none
                      ${isActive
                        ? 'border-magenta scale-105 shadow-md text-white'
                        : 'border-border text-transparent hover:text-white/80'
                      }
                      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    style={gradientStyle(start, end, dir)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom colours */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { id: 'grad-start', label: 'Start colour', key: 'gradientStart' },
                { id: 'grad-end',   label: 'End colour',   key: 'gradientEnd'   },
              ] as const
            ).map(({ id, label, key }) => (
              <div key={id} className="flex flex-col gap-1">
                <label htmlFor={id} className="text-xs text-muted">{label}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    id={id}
                    type="color"
                    value={settings[key]}
                    disabled={disabled}
                    onChange={e => onChange(key, e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent disabled:opacity-40"
                  />
                  <input
                    type="text"
                    value={settings[key]}
                    disabled={disabled}
                    maxLength={7}
                    onChange={e => onChange(key, e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1 rounded border border-border bg-surface-raised text-xs font-mono text-primary focus:outline-none focus:border-magenta disabled:opacity-40"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Direction */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted">Direction</p>
            <div className="flex gap-2">
              {DIR_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  disabled={disabled}
                  onClick={() => onChange('gradientDir', value)}
                  className={`
                    flex-1 py-1.5 rounded-md border text-xs font-medium transition-all
                    ${settings.gradientDir === value
                      ? 'bg-magenta border-magenta text-white'
                      : 'border-border text-secondary hover:border-magenta/40 hover:text-primary'
                    }
                    disabled:opacity-40 disabled:cursor-not-allowed
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Image panel ─────────────────────────────────────────────────── */}
      {settings.bgType === 'image' && (
        <div className="flex flex-col gap-4 animate-fade-up" role="tabpanel">
          <BgDropZone
            file={settings.bgFile}
            onChange={f => onChange('bgFile', f)}
            disabled={disabled}
          />

          {/* Fit mode */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted">Fit mode</p>
            <div className="flex gap-2">
              {FIT_OPTIONS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  disabled={disabled}
                  onClick={() => onChange('bgFit', value)}
                  className={`
                    flex-1 flex flex-col items-center py-2 rounded-lg border text-xs
                    transition-all
                    ${settings.bgFit === value
                      ? 'bg-magenta/10 border-magenta text-magenta'
                      : 'border-border text-secondary hover:border-magenta/40'
                    }
                    disabled:opacity-40 disabled:cursor-not-allowed
                  `}
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Library panel ────────────────────────────────────────────────── */}
      {settings.bgType === 'library' && (
        <LibraryPanel
          selectedUrl={settings.libraryUrl}
          loadingId={loadingId}
          errorIds={errorIds}
          disabled={disabled}
          onSelect={handleLibrarySelect}
        />
      )}

      {/* Fit mode — shown as an overlay row when Library tab is active and an image is loaded */}
      {settings.bgType === 'library' && settings.bgFile && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3 animate-fade-up">
          <p className="text-xs text-muted">Fit mode</p>
          <div className="flex gap-2">
            {FIT_OPTIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                disabled={disabled}
                onClick={() => onChange('bgFit', value)}
                className={`
                  flex-1 flex flex-col items-center py-2 rounded-lg border text-xs
                  transition-all
                  ${settings.bgFit === value
                    ? 'bg-magenta/10 border-magenta text-magenta'
                    : 'border-border text-secondary hover:border-magenta/40'
                  }
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                <span className="font-medium">{label}</span>
                <span className="text-[10px] opacity-70 mt-0.5">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
