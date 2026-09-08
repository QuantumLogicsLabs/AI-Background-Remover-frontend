import { useState, useRef, useEffect } from 'react'
import { useUpload } from '../hooks/useUpload'
import UploadZone from '../components/UploadZone'
import QualityToggle from '../components/QualityToggle'
import ShadowControls, { ShadowSettings } from '../components/ShadowControls'
import CanvasErrorBoundary from '../components/CanvasErrorBoundary'
import SendToMenu from '../components/SendToMenu'
import { useActiveImage } from '../contexts/ActiveImageContext'

const DEFAULT_SETTINGS: ShadowSettings = {
  enabled: true,
  type: 'shadow',
  color: '#000000',
  blur: 15,
  offsetX: 10,
  offsetY: 10,
  opacity: 50,
}

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${opacity / 100})`
}

type ExportFormat = 'png' | 'webp'
type PreviewBg = 'transparent' | 'white' | 'black'

const PREVIEW_BG: Record<PreviewBg, { label: string; className: string }> = {
  transparent: { label: 'Transparent', className: 'bg-checker' },
  white:       { label: 'White',       className: 'bg-white'   },
  black:       { label: 'Black',       className: 'bg-black'   },
}

export default function ShadowPage() {
  const { status, result, originalUrl, error, quality, setQuality, upload, reset: resetUpload } = useUpload()
  const [settings, setSettings]       = useState<ShadowSettings>(DEFAULT_SETTINGS)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png')
  const [previewBg, setPreviewBg]     = useState<PreviewBg>('transparent')
  const imgRef = useRef<HTMLImageElement>(null)

  // ── Pipeline handoff: auto-load if navigated via "Send to…" ────────────
  const { activeFile } = useActiveImage()
  // Pipeline handoff: auto-load if navigated via "Send to…" — runs once on mount only
  const didAutoUploadRef = useRef(false)
  useEffect(() => {
    if (!didAutoUploadRef.current && activeFile && status === 'idle') {
      didAutoUploadRef.current = true
      upload(activeFile)
    }
  }, [activeFile, status, upload])

  const isUploading = status === 'uploading'
  const isDone = status === 'success' && result !== null && originalUrl !== null

  const updateSettings = (updates: Partial<ShadowSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  const resetSettings = () => setSettings(DEFAULT_SETTINGS)

  const handleDownload = () => {
    if (!result || !imgRef.current) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const padding = 120
    canvas.width  = imgRef.current.naturalWidth  + padding * 2
    canvas.height = imgRef.current.naturalHeight + padding * 2

    if (settings.enabled) {
      ctx.shadowBlur    = settings.blur
      ctx.shadowOffsetX = settings.type === 'shadow' ? settings.offsetX : 0
      ctx.shadowOffsetY = settings.type === 'shadow' ? settings.offsetY : 0
      ctx.shadowColor   = hexToRgba(settings.color, settings.opacity)
    }

    ctx.drawImage(imgRef.current, padding, padding)

    const mimeType   = exportFormat === 'webp' ? 'image/webp' : 'image/png'
    const ext        = exportFormat === 'webp' ? '.webp' : '.png'
    const baseName   = result.output_filename.replace(/\.png$/i, '').replace(/\.webp$/i, '')
    const downloadName = `shadow_${baseName}${ext}`

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = downloadName
      a.click()
      URL.revokeObjectURL(url)
    }, mimeType, exportFormat === 'webp' ? 0.95 : undefined)
  }

  // Build CSS filter for live preview
  const filterStyle: React.CSSProperties = {}
  if (settings.enabled) {
    const offsetX = settings.type === 'shadow' ? settings.offsetX : 0
    const offsetY = settings.type === 'shadow' ? settings.offsetY : 0
    filterStyle.filter = `drop-shadow(${offsetX}px ${offsetY}px ${settings.blur}px ${hexToRgba(settings.color, settings.opacity)})`
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">Subject Shadow &amp; Glow</h1>
        <p className="text-secondary mt-2">
          Add realistic drop shadows or glowing outlines to your extracted subjects.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left: Upload / Canvas */}
        <div className="flex-1 w-full flex flex-col gap-5">
          {!isDone ? (
            <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full">
              <UploadZone onFile={upload} disabled={isUploading} />

              {!isUploading && (
                <div className="flex justify-center">
                  <QualityToggle value={quality} onChange={setQuality} disabled={isUploading} />
                </div>
              )}

              {isUploading && (
                <div className="flex justify-center py-8">
                  <div className="relative w-14 h-14">
                    <svg className="absolute inset-0 w-14 h-14 animate-spin text-magenta"
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 56 56">
                      <circle className="opacity-15" cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-80" fill="currentColor" d="M52 28a24 24 0 00-24-24v4a20 20 0 0120 20h4z" />
                    </svg>
                  </div>
                </div>
              )}

              {error && (
                <div role="alert" className="text-danger text-sm text-center bg-surface border border-danger/30 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex items-start gap-2.5 rounded-lg bg-surface-raised border border-border px-3.5 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                  className="w-4 h-4 text-teal shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-muted leading-relaxed">
                  Upload any photo — we'll remove the background first, then you can add a
                  <strong className="text-primary"> Drop Shadow</strong> or
                  <strong className="text-primary"> Outer Glow</strong> using the controls on the right.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-fade-up">

              {/* Preview background toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-medium">Preview Background</span>
                <div className="flex items-center gap-1 p-0.5 bg-surface-raised rounded-lg border border-border">
                  {(Object.entries(PREVIEW_BG) as [PreviewBg, typeof PREVIEW_BG[PreviewBg]][]).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setPreviewBg(key)}
                      title={val.label}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        previewBg === key
                          ? 'bg-surface text-primary shadow-sm'
                          : 'text-muted hover:text-secondary'
                      }`}
                    >
                      {/* Color dot */}
                      <span className={`w-3 h-3 rounded-full border border-border/60 shrink-0 ${val.className}`} />
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview canvas */}
              <CanvasErrorBoundary name="Shadow Preview Canvas">
              <div
                className={`relative w-full overflow-hidden rounded-xl border border-border shadow-md flex items-center justify-center p-10 transition-colors ${PREVIEW_BG[previewBg].className}`}
                style={{ minHeight: 400 }}
              >
                <img
                  ref={imgRef}
                  src={`/api/download/${result!.output_filename}`}
                  alt="Extracted subject with shadow/glow effect"
                  className="max-h-[500px] object-contain transition-all duration-300"
                  style={filterStyle}
                  crossOrigin="anonymous"
                />
              </div>
              </CanvasErrorBoundary>

              {/* Actions bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-surface-raised rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                    className="w-4 h-4 text-success shrink-0">
                    <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.844 4.574a.75.75 0 00-1.188-.918l-3.454 4.472-1.696-1.697a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.124-.096l4.024-5.07z" clipRule="evenodd" />
                  </svg>
                  Effect applied
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Format switcher */}
                  <div className="flex p-0.5 bg-surface rounded-lg border border-border">
                    <button
                      onClick={() => setExportFormat('png')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        exportFormat === 'png'
                          ? 'bg-magenta text-white shadow-sm'
                          : 'text-muted hover:text-secondary'
                      }`}
                    >
                      PNG
                    </button>
                    <button
                      onClick={() => setExportFormat('webp')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        exportFormat === 'webp'
                          ? 'bg-magenta text-white shadow-sm'
                          : 'text-muted hover:text-secondary'
                      }`}
                    >
                      WebP
                    </button>
                  </div>

                  <button onClick={resetUpload} className="btn-ghost text-sm">
                    New Image
                  </button>

                  <SendToMenu excludeRoute="/shadow" />

                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-magenta hover:bg-magenta-hover text-white rounded-lg transition-colors shadow-sm active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path d="M8.75 2.75a.75.75 0 00-1.5 0v5.69L5.03 6.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 8.44V2.75z" />
                      <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z" />
                    </svg>
                    Download {exportFormat.toUpperCase()}
                  </button>
                </div>
              </div>

              {/* Contextual tip */}
              <p className="text-xs text-muted text-center">
                {previewBg === 'transparent'
                  ? 'Tip: Switch to White or Black background to see your shadow more clearly.'
                  : previewBg === 'black'
                  ? 'Tip: Try a bright color (e.g. white or yellow) for the glow effect on dark backgrounds.'
                  : 'Tip: White background is great for checking drop shadow edges.'}
              </p>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <ShadowControls
              settings={settings}
              onChange={updateSettings}
              onReset={resetSettings}
              disabled={!isDone}
            />
          </div>

          {!isDone && (
            <p className="text-xs text-muted text-center px-2">
              Upload your photo first — controls will activate once the background is removed.
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}
