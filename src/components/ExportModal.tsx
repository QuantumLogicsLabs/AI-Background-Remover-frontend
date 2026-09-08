import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useBrandKit } from '../contexts/BrandKitContext'

// ── Types ──────────────────────────────────────────────────────────────────

type ExportFormat = 'png' | 'jpeg' | 'webp'

interface FormatOption {
  id:          ExportFormat
  label:       string
  ext:         string
  icon:        string
  description: string
  lossless:    boolean
}

export interface ExportModalProps {
  downloadUrl: string
  filename:    string
  isOpen:      boolean
  onClose:     () => void
}

// ── Constants ──────────────────────────────────────────────────────────────

const FORMATS: FormatOption[] = [
  { id: 'png',  label: 'PNG',  ext: '.png',  icon: '🖼️', description: 'Lossless · keeps transparency', lossless: true  },
  { id: 'jpeg', label: 'JPEG', ext: '.jpg',  icon: '📷', description: 'Smaller · best for photos',     lossless: false },
  { id: 'webp', label: 'WebP', ext: '.webp', icon: '⚡', description: 'Best compression · modern',      lossless: false },
]

const DEFAULT_QUALITY = 90

// ── Size estimator ─────────────────────────────────────────────────────────

function estimateSize(format: ExportFormat, quality: number): string {
  if (format === 'png') return 'Lossless — varies by content'
  const factor = format === 'jpeg'
    ? 0.05 + (quality / 100) * 0.55
    : 0.03 + (quality / 100) * 0.40
  const bytes = 1_000_000 * factor
  return bytes > 1_000_000
    ? `~${(bytes / 1_000_000).toFixed(1)} MB`
    : `~${Math.round(bytes / 1000)} KB`
}

// ── ExportModal ────────────────────────────────────────────────────────────

export default function ExportModal({ downloadUrl, filename, isOpen, onClose }: ExportModalProps) {
  const { brandKit } = useBrandKit();
  const [format,  setFormat]  = useState<ExportFormat>(brandKit.defaultExportFormat || 'png')
  const [quality, setQuality] = useState(DEFAULT_QUALITY)

  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dlRef    = useRef<HTMLAnchorElement>(null)

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setFormat(brandKit.defaultExportFormat || 'png')
      setQuality(DEFAULT_QUALITY)
      setTimeout(() => closeRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return
    const els = modalRef.current.querySelectorAll<HTMLElement>(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    )
    const first = els[0], last = els[els.length - 1]
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus() } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus() } }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [isOpen])

  // Build URL & filename
  const buildUrl = useCallback(() => {
    const base = downloadUrl.split('?')[0]
    const p = new URLSearchParams({ format })
    if (format !== 'png') p.set('quality', String(quality))
    return `${base}?${p}`
  }, [downloadUrl, format, quality])

  
  const handleDownload = async (e: React.MouseEvent) => {
    if (!brandKit.watermark.enabled) return; // let default href work
    
    e.preventDefault();
    const url = buildUrl();
    const finalFilename = buildFilename();
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      
      ctx.drawImage(img, 0, 0);
      
      ctx.globalAlpha = brandKit.watermark.opacity;
      
      const margin = Math.min(canvas.width, canvas.height) * 0.05;
      
      if (brandKit.watermark.type === 'image' && brandKit.watermark.image) {
        const wmImg = new Image();
        wmImg.src = brandKit.watermark.image;
        await new Promise((resolve) => { wmImg.onload = resolve; });
        
        // Scale watermark to max 20% of image size
        const scale = (Math.min(canvas.width, canvas.height) * 0.2) / Math.max(wmImg.width, wmImg.height);
        const w = wmImg.width * scale;
        const h = wmImg.height * scale;
        
        let x = canvas.width - w - margin;
        let y = canvas.height - h - margin;
        
        if (brandKit.watermark.position.includes('left')) x = margin;
        if (brandKit.watermark.position.includes('top')) y = margin;
        if (brandKit.watermark.position === 'center') {
          x = (canvas.width - w) / 2;
          y = (canvas.height - h) / 2;
        }
        
        ctx.drawImage(wmImg, x, y, w, h);
      } else if (brandKit.watermark.type === 'text' && brandKit.watermark.text) {
        const fontSize = Math.max(16, Math.min(canvas.width, canvas.height) * 0.05);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        let x = canvas.width - margin;
        let y = canvas.height - margin;
        
        if (brandKit.watermark.position.includes('left')) {
          ctx.textAlign = 'left';
          x = margin;
        }
        if (brandKit.watermark.position.includes('top')) {
          ctx.textBaseline = 'top';
          y = margin;
        }
        if (brandKit.watermark.position === 'center') {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          x = canvas.width / 2;
          y = canvas.height / 2;
        }
        
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        ctx.fillText(brandKit.watermark.text, x, y);
      }
      
      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const q = format === 'png' ? undefined : quality / 100;
      
      const blobUrl = canvas.toDataURL(mimeType, q);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      onClose();
    } catch (_err) {
      // Watermark canvas failed — fall back to direct download
      window.location.href = url;
      onClose();
    }
  };

  const buildFilename = () => {
    const exts: Record<ExportFormat, string> = { png: '.png', jpeg: '.jpg', webp: '.webp' }
    return filename.replace(/\.[^.]+$/, '') + exts[format]
  }

  const currentFmt   = FORMATS.find(f => f.id === format)!
  const isLossless   = currentFmt.lossless
  const sizeEstimate = estimateSize(format, quality)

  if (!isOpen) return null

  // Portal renders at document.body — escapes any CSS transform ancestor
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      {/* ── Modal panel — wide 2-column layout ─────────────────────────── */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl animate-fade-up overflow-hidden"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.55)' }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-magenta/10 border border-magenta/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-magenta" aria-hidden="true">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
            </div>
            <div>
              <h2 id="export-modal-title" className="text-base font-display font-bold text-primary leading-tight">
                Export Image
              </h2>
              <p className="text-xs text-muted">Choose format &amp; quality, then download</p>
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={(e) => { if (brandKit.watermark.enabled) handleDownload(e); else onClose(); }}
            aria-label="Close export dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-surface-raised transition-colors focus:outline-none focus:shadow-focus"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* ── Body — 2 columns ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 divide-x divide-border">

          {/* LEFT — Format tabs ────────────────────────────────────────── */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-3">Format</p>
            <div className="flex gap-3" role="radiogroup" aria-label="Export format">
              {FORMATS.map(fmt => {
                const active = format === fmt.id
                return (
                  <button
                    key={fmt.id}
                    role="radio"
                    aria-checked={active}
                    id={`export-format-${fmt.id}`}
                    onClick={() => setFormat(fmt.id)}
                    className={`
                      flex-1 flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2
                      text-center transition-all duration-150 focus:outline-none focus:shadow-focus
                      ${active
                        ? 'border-magenta bg-magenta/8 text-magenta shadow-sm'
                        : 'border-border bg-surface-raised text-secondary hover:border-border-strong hover:text-primary'
                      }
                    `}
                  >
                    <span className="text-2xl leading-none" aria-hidden="true">{fmt.icon}</span>
                    <span className="text-sm font-bold">{fmt.label}</span>
                    <span className="text-[10px] font-mono opacity-60">{fmt.ext}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-muted text-center">{currentFmt.description}</p>
          </div>

          {/* RIGHT — Quality + size ──────────────────────────────────────── */}
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Quality row */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-semibold uppercase tracking-widest ${isLossless ? 'text-muted' : 'text-secondary'}`}>
                  Quality
                </p>
                {isLossless ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-raised border border-border text-[11px] text-muted font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Lossless — N/A
                  </span>
                ) : (
                  <span className="font-mono text-2xl font-bold text-primary tabular-nums leading-none">
                    {quality}<span className="text-sm font-medium text-muted">%</span>
                  </span>
                )}
              </div>

              <input
                id="export-quality-slider"
                type="range"
                min={1} max={100} step={1}
                value={quality}
                onChange={e => setQuality(Number(e.target.value))}
                disabled={isLossless}
                aria-label="Export quality"
                aria-valuemin={1} aria-valuemax={100} aria-valuenow={quality}
                aria-disabled={isLossless}
                className={`w-full ${isLossless ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  background: isLossless
                    ? undefined
                    : `linear-gradient(to right, var(--accent-magenta) 0%, var(--accent-magenta) ${quality}%, var(--border-strong) ${quality}%, var(--border-strong) 100%)`,
                }}
              />

              {!isLossless ? (
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-muted">Low</span>
                  <span className="text-xs text-muted">High</span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted text-center">PNG is lossless — quality does not apply</p>
              )}
            </div>

            {/* Size estimate */}
            <div className="flex items-center gap-2.5 rounded-lg bg-teal/5 border border-teal/20 px-3 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-teal shrink-0" aria-hidden="true">
                <path d="M3 3.5A1.5 1.5 0 014.5 2h4.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 01.439 1.061V12.5A1.5 1.5 0 0111.5 14h-7A1.5 1.5 0 013 12.5v-9z" />
              </svg>
              <div>
                <p className="text-[10px] text-teal/70 font-medium uppercase tracking-wide">Est. file size</p>
                <p className="text-sm font-semibold text-primary">{sizeEstimate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-border bg-surface-raised flex items-center justify-between gap-4">
          <p className="text-xs text-muted truncate min-w-0">
            Saves as{' '}
            <span className="font-mono font-medium text-secondary">{buildFilename()}</span>
          </p>
          <a
            ref={dlRef}
            href={buildUrl()}
            download={buildFilename()}
            onClick={(e) => { if (brandKit.watermark.enabled) handleDownload(e); else onClose(); }}
            className="
              shrink-0 inline-flex items-center gap-2 px-6 py-2.5
              rounded-xl font-bold text-sm text-white
              bg-magenta hover:bg-magenta-hover
              shadow-md hover:shadow-lg
              transition-all duration-200 active:scale-[0.98]
              focus:outline-none focus:shadow-focus
            "
            aria-label={`Download as ${currentFmt.label}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Download {currentFmt.label}
            {!isLossless && (
              <span className="text-xs font-normal opacity-80 bg-white/20 px-1.5 py-0.5 rounded-md">
                {quality}%
              </span>
            )}
          </a>
        </div>
      </div>
    </div>,
    document.body
  )
}
