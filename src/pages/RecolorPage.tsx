/**
 * Magic Recolor Page
 *
 * Flow:
 *   1. User uploads an image  →  displayed on RecolorCanvas
 *   2. User picks a target colour and brush size
 *   3. User paints over the region to recolour
 *   4. User clicks "Apply Recolor" → POST /api/recolor
 *   5. Result shown alongside the original; user can download or repaint
 */

import { useRef, useCallback } from 'react'
import UploadZone from '../components/UploadZone'
import DownloadButton from '../components/DownloadButton'
import RecolorCanvas, { type RecolorCanvasHandle } from '../components/RecolorCanvas'
import { useRecolor, COLOR_PRESETS } from '../hooks/useRecolor'

// ── Small sub-components ───────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 py-10 animate-fade-up"
    >
      <div className="relative w-14 h-14">
        <svg
          className="absolute inset-0 w-14 h-14 animate-spin text-magenta"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 56 56"
          aria-hidden="true"
        >
          <circle className="opacity-15" cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-80" fill="currentColor" d="M52 28a24 24 0 00-24-24v4a20 20 0 0120 20h4z" />
        </svg>
        <svg
          className="absolute inset-0 w-14 h-14 animate-spin text-teal"
          style={{ animationDuration: '2s', animationDirection: 'reverse' }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 56 56"
          aria-hidden="true"
        >
          <circle className="opacity-10" cx="28" cy="28" r="18" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-60" fill="currentColor" d="M46 28a18 18 0 00-18-18v3a15 15 0 0115 15h3z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-primary font-medium">{label}</p>
        <p className="text-muted text-sm mt-0.5">Applying HSV colour shift…</p>
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg bg-surface border border-danger/40 px-4 py-3.5 animate-fade-up"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5 text-danger shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <p className="text-sm font-medium text-danger">Recolor failed</p>
        <p className="text-xs text-secondary mt-0.5">{message}</p>
      </div>
    </div>
  )
}

// ── Slider row ─────────────────────────────────────────────────────────────

interface SliderRowProps {
  label:    string
  value:    number
  min:      number
  max:      number
  step:     number
  format:   (v: number) => string
  onChange: (v: number) => void
  disabled: boolean
}

function SliderRow({ label, value, min, max, step, format, onChange, disabled }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary font-medium">{label}</span>
        <span className="text-xs text-muted font-mono tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={label}
      />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

const FEATURE_CHIPS = [
  { label: 'Brush painting',         icon: '🖌️' },
  { label: 'HSV colour shift',        icon: '🎨' },
  { label: 'Preserves texture',       icon: '✨' },
  { label: 'Soft edge blending',      icon: '💧' },
  { label: 'Hair & fur friendly',     icon: '🐾' },
  { label: 'No API — runs locally',   icon: '⚡' },
]

export default function RecolorPage() {
  const canvasRef = useRef<RecolorCanvasHandle>(null)

  const {
    status, result, originalUrl, error, hasFile,
    brush, updateBrush,
    settings, updateSetting,
    loadFile, applyRecolor, reset, resetResult,
  } = useRecolor()

  const isProcessing = status === 'processing'
  const isDone       = status === 'done' && result !== null

  // ── Apply: export mask → submit ──────────────────────────────────────
  const handleApply = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!canvas.hasMask()) {
      return  // nothing painted — button should be disabled, but guard anyway
    }

    try {
      const maskBlob = await canvas.getMaskBlob()
      await applyRecolor(maskBlob)
    } catch {
      // applyRecolor sets its own error state
    }
  }, [applyRecolor])

  // ── Re-paint: keep file but reset result so canvas is re-shown ───────
  const handleRepaint = useCallback(() => {
    resetResult()
    canvasRef.current?.clearMask()
  }, [resetResult])

  const canApply = hasFile && !isProcessing && !isDone

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-10">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="text-center flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-magenta/30 bg-magenta/8 text-xs font-medium text-magenta">
          <span className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse" aria-hidden="true" />
          Magic Recolor
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary leading-tight tracking-tight">
          Change Any{' '}
          <span className="text-gradient-brand">Colour</span>
          {' '}Instantly
        </h1>
        <p className="text-secondary text-base max-w-md leading-relaxed">
          Paint over hair, clothing, or products with a brush — pick your target
          colour and hit <strong>Apply</strong>. Texture and shading stay intact.
        </p>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left — canvas / upload / result ──────────────────────── */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">

          {/* Upload zone — before any file is loaded */}
          {!hasFile && (
            <>
              <UploadZone onFile={loadFile} disabled={isProcessing} />
              <div className="flex flex-col items-center gap-3 pt-1">
                <p className="text-xs text-muted uppercase tracking-widest font-medium">
                  What you can do
                </p>
                <ul className="flex flex-wrap justify-center gap-2" aria-label="Feature list">
                  {FEATURE_CHIPS.map(({ label, icon }) => (
                    <li key={label} className="chip gap-1.5">
                      <span aria-hidden="true">{icon}</span>
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Processing spinner */}
          {isProcessing && <Spinner label="Applying recolor…" />}

          {/* Error banner */}
          {error && <ErrorBanner message={error} />}

          {/* Paint canvas — shown when file loaded and not yet done */}
          {hasFile && !isDone && !isProcessing && originalUrl && (
            <div className="flex flex-col gap-3 animate-fade-up">
              <div className="flex items-center justify-between px-0.5">
                <p className="text-xs text-muted uppercase tracking-widest font-medium">
                  Paint to recolour
                </p>
                <button
                  onClick={() => canvasRef.current?.clearMask()}
                  className="text-xs text-secondary hover:text-danger transition-colors flex items-center gap-1"
                  aria-label="Clear all strokes"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" clipRule="evenodd" />
                  </svg>
                  Clear strokes
                </button>
              </div>

              <RecolorCanvas
                ref={canvasRef}
                imageUrl={originalUrl}
                brushSize={brush.size}
                brushColor={brush.color}
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Result — before/after comparison */}
          {isDone && result && originalUrl && (
            <div className="flex flex-col gap-4 animate-fade-up">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted text-center font-medium">Original</p>
                  <div className="rounded-xl overflow-hidden border border-border bg-checker aspect-square">
                    <img
                      src={originalUrl}
                      alt="Original"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted text-center font-medium">Recoloured</p>
                  <div className="rounded-xl overflow-hidden border border-border bg-checker aspect-square">
                    <img
                      src={`/api/download/${result.output_filename}`}
                      alt="Recoloured result"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Full result */}
              <div className="rounded-xl overflow-hidden border border-border shadow-md bg-checker">
                <img
                  src={`/api/download/${result.output_filename}`}
                  alt="Recoloured result — full view"
                  className="w-full object-contain max-h-[480px]"
                />
              </div>

              {/* Actions bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-surface-raised rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-success shrink-0" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.844 4.574a.75.75 0 00-1.188-.918l-3.454 4.472-1.696-1.697a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.124-.096l4.024-5.07z" clipRule="evenodd" />
                  </svg>
                  Recolor applied
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-border ml-1 shrink-0"
                    style={{ background: brush.color }}
                    aria-label={`Colour: ${brush.color}`}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleRepaint} className="btn-ghost text-sm">
                    Repaint
                  </button>
                  <button onClick={reset} className="btn-ghost text-sm">
                    New image
                  </button>
                  <DownloadButton
                    downloadUrl={`/api/download/${result.output_filename}`}
                    filename={result.output_filename}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right — controls panel ────────────────────────────────── */}
        <aside
          className="w-full lg:w-72 shrink-0 flex flex-col gap-4 self-start"
          aria-label="Recolor controls"
        >

          {/* ── Colour picker ──────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-primary">Target Colour</h2>

            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Colour presets">
              {COLOR_PRESETS.map(hex => (
                <button
                  key={hex}
                  onClick={() => updateBrush('color', hex)}
                  className={`
                    w-7 h-7 rounded-full border-2 transition-all duration-150
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/60
                    active:scale-90
                    ${brush.color === hex
                      ? 'border-magenta scale-110 shadow-md'
                      : 'border-border hover:scale-105 hover:border-border-strong'
                    }
                  `}
                  style={{ background: hex }}
                  aria-label={`Select colour ${hex}`}
                  aria-pressed={brush.color === hex}
                />
              ))}
            </div>

            {/* Hex input + native colour picker */}
            <div className="flex items-center gap-2">
              <label htmlFor="color-picker" className="text-xs text-muted shrink-0">
                Custom
              </label>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Native colour picker */}
                <div className="relative shrink-0">
                  <input
                    id="color-picker"
                    type="color"
                    value={brush.color}
                    onChange={e => updateBrush('color', e.target.value)}
                    className="w-8 h-8 rounded-md border border-border cursor-pointer opacity-0 absolute inset-0"
                    aria-label="Open colour picker"
                  />
                  <div
                    className="w-8 h-8 rounded-md border-2 border-border cursor-pointer shadow-sm"
                    style={{ background: brush.color }}
                    aria-hidden="true"
                  />
                </div>
                {/* Hex text input */}
                <input
                  type="text"
                  value={brush.color}
                  maxLength={7}
                  onChange={e => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateBrush('color', v)
                  }}
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-border
                    bg-surface-raised text-xs font-mono text-primary
                    focus:outline-none focus:border-magenta/60 transition-colors"
                  aria-label="Hex colour value"
                  placeholder="#e83c6d"
                />
              </div>
            </div>

            {/* Live preview swatch */}
            <div
              className="w-full h-8 rounded-lg border border-border shadow-inner transition-all duration-200"
              style={{ background: brush.color }}
              aria-label={`Selected colour preview: ${brush.color}`}
            />
          </div>

          {/* ── Brush controls ─────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-primary">Brush</h2>
            <SliderRow
              label="Size"
              value={brush.size}
              min={4}
              max={80}
              step={2}
              format={v => `${v}px`}
              onChange={v => updateBrush('size', v)}
              disabled={isProcessing}
            />
            {/* Brush preview — fixed-height stage so small sizes stay visible */}
            <div
              className="flex items-center justify-center rounded-lg bg-surface-raised border border-border"
              style={{ height: 88 }}
              aria-hidden="true"
            >
              {(() => {
                // Map brush.size (4–80) to a display diameter (12–72 px)
                // so even the smallest brush is clearly visible
                const MIN_DISPLAY = 12
                const MAX_DISPLAY = 72
                const MIN_BRUSH   = 4
                const MAX_BRUSH   = 80
                const t      = (brush.size - MIN_BRUSH) / (MAX_BRUSH - MIN_BRUSH)
                const display = Math.round(MIN_DISPLAY + t * (MAX_DISPLAY - MIN_DISPLAY))
                return (
                  <div
                    className="rounded-full transition-all duration-150 shadow-sm"
                    style={{
                      width:      display,
                      height:     display,
                      background: brush.color,
                      opacity:    0.85,
                      boxShadow:  `0 0 0 3px ${brush.color}33`,
                    }}
                  />
                )
              })()}
            </div>
          </div>

          {/* ── Advanced settings ──────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-primary">Advanced</h2>
            <SliderRow
              label="Strength"
              value={settings.strength}
              min={0.1}
              max={1.0}
              step={0.05}
              format={v => `${Math.round(v * 100)}%`}
              onChange={v => updateSetting('strength', v)}
              disabled={isProcessing}
            />
            <SliderRow
              label="Edge feather"
              value={settings.feather}
              min={0}
              max={40}
              step={1}
              format={v => `${v}px`}
              onChange={v => updateSetting('feather', v)}
              disabled={isProcessing}
            />

            {/* Tip */}
            <div className="flex items-start gap-2 rounded-lg bg-surface-raised border border-border px-3 py-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-teal shrink-0 mt-0.5" aria-hidden="true">
                <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-muted leading-relaxed">
                <strong className="text-primary">Strength</strong> controls how much the colour shifts.{' '}
                <strong className="text-primary">Edge feather</strong> softens the stroke boundary.
              </p>
            </div>
          </div>

          {/* ── Apply button ───────────────────────────────────────── */}
          {!isDone && (
            <button
              onClick={handleApply}
              disabled={!canApply}
              className={`
                w-full flex items-center justify-center gap-2
                px-5 py-3 rounded-xl font-semibold text-sm
                transition-all duration-200
                ${canApply
                  ? 'bg-magenta hover:bg-magenta-hover text-white shadow-sm hover:shadow-md active:scale-95'
                  : 'bg-surface-raised text-muted border border-border cursor-not-allowed'
                }
              `}
              aria-label="Apply recolor to painted region"
            >
              {isProcessing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Applying…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path d="M15.28 5.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L3.72 9.28a.75.75 0 011.06-1.06l2.72 2.72 6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                  Apply Recolor
                </>
              )}
            </button>
          )}

          {/* Post-done: repaint / start over */}
          {isDone && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRepaint}
                className="w-full btn-ghost text-sm justify-center"
              >
                Repaint with different colour
              </button>
              <button
                onClick={reset}
                className="w-full btn-ghost text-sm justify-center"
              >
                Start over with new image
              </button>
            </div>
          )}

          {/* Hint — no file yet */}
          {!hasFile && (
            <p className="text-xs text-muted text-center">
              Upload an image first, then pick a colour and start painting.
            </p>
          )}

          {/* Hint — file loaded but no strokes yet */}
          {hasFile && !isDone && !isProcessing && (
            <p className="text-xs text-muted text-center" role="status">
              Paint over the area you want to recolour, then click{' '}
              <strong className="text-primary">Apply Recolor</strong>.
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}
