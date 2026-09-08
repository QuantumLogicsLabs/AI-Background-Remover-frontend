import { useEffect, useRef } from 'react'
import UploadZone from '../components/UploadZone'
import ImageCanvas from '../components/ImageCanvas'
import DownloadButton from '../components/DownloadButton'
import EnhancementControls from '../components/EnhancementControls'
import SendToMenu from '../components/SendToMenu'
import { useEnhance } from '../hooks/useEnhance'
import { useActiveImage } from '../contexts/ActiveImageContext'

const FEATURE_CHIPS = [
  { label: 'Brightness & Contrast', icon: '☀️' },
  { label: 'Saturation',            icon: '🎨' },
  { label: 'Sharpening',            icon: '🔍' },
  { label: 'Noise Reduction',       icon: '✨' },
  { label: 'Auto White Balance',    icon: '⚖️' },
  { label: 'PNG output',            icon: '🖼️' },
]

export default function EnhancePage() {
  const {
    status,
    result,
    originalUrl,
    error,
    settings,
    updateSetting,
    resetSettings,
    enhance,
    reEnhance,
    reset,
    hasFile,
    loadFile,
  } = useEnhance()

  // ── Pipeline handoff: auto-load / stage if navigated via "Send to…" ────────────
  const { activeFile, activePreviewUrl } = useActiveImage()
  const lastHandledFileRef = useRef<File | null>(null)
  useEffect(() => {
    if (activeFile && activeFile !== lastHandledFileRef.current) {
      lastHandledFileRef.current = activeFile
      const cachedPreset = sessionStorage.getItem('enhance_preset_settings')
      if (cachedPreset) {
        sessionStorage.removeItem('enhance_preset_settings')
        try {
          const parsed = JSON.parse(cachedPreset)
          const mergedSettings = { ...settings, ...parsed }
          Object.entries(parsed).forEach(([key, val]) => {
            updateSetting(key as any, val)
          })
          // Auto-run with preset settings!
          enhance(activeFile, mergedSettings)
        } catch (_e) {
          loadFile(activeFile)
        }
      } else if (!hasFile) {
        // Normal staging
        loadFile(activeFile)
      }
    }
  }, [activeFile, settings, updateSetting, enhance, loadFile, hasFile])

  // Listen for AI assistant apply events
  useEffect(() => {
    const handlePresetEvent = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.type === 'apply_enhance') {
        const parsed = customEvent.detail.data
        const mergedSettings = { ...settings, ...parsed }
        Object.entries(parsed).forEach(([key, val]) => {
          updateSetting(key as any, val)
        })
        if (activeFile) {
          if (hasFile) {
            reEnhance(mergedSettings)
          } else {
            enhance(activeFile, mergedSettings)
          }
        }
      }
    }
    window.addEventListener('apply_ai_preset', handlePresetEvent)
    return () => window.removeEventListener('apply_ai_preset', handlePresetEvent)
  }, [activeFile, hasFile, settings, updateSetting, enhance, reEnhance])

  const isProcessing = status === 'uploading'
  const isDone       = status === 'success' && result !== null && originalUrl !== null

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-10">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="text-center flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-teal/30 bg-teal/8 text-xs font-medium text-teal">
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" aria-hidden="true" />
          AI Image Enhancement
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary leading-tight tracking-tight">
          Enhance Your Images{' '}
          <span className="text-gradient-brand">Beautifully</span>
        </h1>
        <p className="text-secondary text-base max-w-md leading-relaxed">
          Upload a photo, adjust the sliders, and hit <strong>Apply</strong> to
          see the difference — tweak as many times as you like without re-uploading.
        </p>
      </div>

      {/* ── Two-column layout (always visible once file is loaded) ──────── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left — upload / canvas ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Upload zone — only when no file yet */}
          {!isDone && !isProcessing && (
            activeFile && status === 'idle' ? (
              <div className="card p-6 flex flex-col items-center gap-4 text-center max-w-lg mx-auto animate-fade-up">
                <div className="relative w-full overflow-hidden rounded-xl border border-border bg-surface-raised flex items-center justify-center p-4 min-h-[300px]">
                  {activePreviewUrl && (
                    <img src={activePreviewUrl} className="max-w-full max-h-[400px] object-contain rounded-xl select-none" alt="Staged target" />
                  )}
                </div>
                <div className="flex gap-3 w-full justify-center">
                  <button
                    onClick={reset}
                    className="btn-ghost text-xs py-2 px-4"
                  >
                    Change Image
                  </button>
                  <button
                    onClick={() => enhance(activeFile)}
                    className="btn-primary text-xs py-2 px-6 font-bold shadow-md"
                  >
                    ✨ Enhance Image
                  </button>
                </div>
              </div>
            ) : (
              <UploadZone onFile={enhance} disabled={isProcessing} />
            )
          )}

          {/* Processing spinner */}
          {isProcessing && (
            <div role="status" aria-live="polite"
              className="flex flex-col items-center gap-4 py-12 animate-fade-up">
              <div className="relative w-14 h-14">
                <svg className="absolute inset-0 w-14 h-14 animate-spin text-teal"
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 56 56" aria-hidden="true">
                  <circle className="opacity-15" cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-80" fill="currentColor" d="M52 28a24 24 0 00-24-24v4a20 20 0 0120 20h4z" />
                </svg>
                <svg className="absolute inset-0 w-14 h-14 animate-spin text-magenta"
                  style={{ animationDuration: '2s', animationDirection: 'reverse' }}
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 56 56" aria-hidden="true">
                  <circle className="opacity-10" cx="28" cy="28" r="18" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-60" fill="currentColor" d="M46 28a18 18 0 00-18-18v3a15 15 0 0115 15h3z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-primary font-medium">Applying enhancements…</p>
                <p className="text-muted text-sm mt-0.5">Processing with current settings</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div role="alert"
              className="flex items-start gap-3 rounded-lg bg-surface border border-danger/40 px-4 py-3.5 animate-fade-up">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-danger">Enhancement failed</p>
                <p className="text-xs text-secondary mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Result canvas — compare view */}
          {isDone && (
            <div className="flex flex-col gap-4 animate-fade-up">
              <ImageCanvas
                originalUrl={originalUrl!}
                resultUrl={`/api/download/${result!.output_filename}`}
              />

              {/* Actions bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap
                p-4 bg-surface-raised rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
                    fill="currentColor" className="w-4 h-4 text-success shrink-0" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.844 4.574a.75.75 0 00-1.188-.918l-3.454 4.472-1.696-1.697a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.124-.096l4.024-5.07z" clipRule="evenodd" />
                  </svg>
                  Image enhanced
                  {result!.image_meta && (
                    <span className="text-muted text-xs">
                      · {result!.image_meta.width} × {result!.image_meta.height}px
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={reset} className="btn-ghost text-sm">
                    New image
                  </button>
                  <SendToMenu excludeRoute="/enhance" />
                  <DownloadButton
                    downloadUrl={`/api/download/${result!.output_filename}`}
                    filename={result!.output_filename}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Feature chips — only on first idle state */}
          {!isDone && !isProcessing && !hasFile && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <p className="text-xs text-muted uppercase tracking-widest font-medium">
                What we enhance
              </p>
              <ul className="flex flex-wrap justify-center gap-2" aria-label="Enhancement features">
                {FEATURE_CHIPS.map(({ label, icon }) => (
                  <li key={label} className="chip gap-1.5">
                    <span aria-hidden="true">{icon}</span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Right — controls panel (always visible) ───────────────────── */}
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4 self-start"
          aria-label="Enhancement controls">

          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <EnhancementControls
              settings={settings}
              onChange={updateSetting}
              onReset={resetSettings}
              disabled={isProcessing}
            />
          </div>

          {/* Apply / Re-apply button — shown once a file is loaded */}
          {hasFile && (
            <button
              onClick={reEnhance}
              disabled={isProcessing}
              className={`
                w-full flex items-center justify-center gap-2
                px-5 py-3 rounded-xl font-semibold text-sm
                transition-all duration-200
                ${!isProcessing
                  ? 'bg-magenta hover:bg-magenta-hover text-white shadow-sm hover:shadow-md active:scale-95'
                  : 'bg-surface-raised text-muted border border-border cursor-not-allowed'
                }
              `}
              aria-label="Apply current enhancement settings to image"
            >
              {isProcessing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg"
                    fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Applying…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                    fill="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                  </svg>
                  {isDone ? 'Re-apply Settings' : 'Apply Settings'}
                </>
              )}
            </button>
          )}

          {/* Tip — shown before first upload */}
          {!hasFile && (
            <div className="flex items-start gap-2.5 rounded-lg bg-surface-raised
              border border-border px-3.5 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
                fill="currentColor" className="w-4 h-4 text-teal shrink-0 mt-0.5" aria-hidden="true">
                <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-muted leading-relaxed">
                Upload an image, then adjust the sliders and hit
                <strong className="text-primary"> Apply Settings</strong> — you can
                tweak and re-apply as many times as you like without re-uploading.
              </p>
            </div>
          )}

          {/* Post-result tip */}
          {isDone && (
            <div className="flex items-start gap-2.5 rounded-lg bg-teal/5
              border border-teal/20 px-3.5 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
                fill="currentColor" className="w-4 h-4 text-teal shrink-0 mt-0.5" aria-hidden="true">
                <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-muted leading-relaxed">
                Change any slider and click
                <strong className="text-teal"> Re-apply Settings</strong> to
                update the result instantly. Use the <em>Compare</em> tab to
                see the difference.
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
