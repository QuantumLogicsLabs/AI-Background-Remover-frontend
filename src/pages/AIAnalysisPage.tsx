import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UploadZone from '../components/UploadZone'
import { Skeleton } from '../components/Skeleton'
import { imageService } from '../services/imageService'
import { useActiveImage } from '../contexts/ActiveImageContext'
import type { ImageAnalysis } from '../types'

// ── Score gauge ───────────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value?: number }) {
  const score = value ?? 0
  const color =
    score >= 85 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-danger'
  const textColor =
    score >= 85 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-danger'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-secondary">{label}</span>
        <span className={`text-xs font-bold font-mono ${textColor}`}>
          {value !== undefined ? score : '—'}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-raised border border-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

// ── Info card ─────────────────────────────────────────────────────────────────

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-border bg-surface-raised">
      <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
        {label}
      </span>
      <p className="text-sm text-primary leading-relaxed">{value}</p>
    </div>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function AnalysisSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-fade-up" aria-hidden="true">
      {/* Scores */}
      <div className="p-5 rounded-2xl border border-border bg-surface shadow-sm">
        <Skeleton className="w-32 h-4 mb-4 rounded !bg-border" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <Skeleton className="w-24 h-3 rounded !bg-border" />
                <Skeleton className="w-8 h-3 rounded !bg-border" />
              </div>
              <Skeleton className="w-full h-2 rounded-full !bg-border" />
            </div>
          ))}
        </div>
      </div>
      {/* Palette */}
      <div className="p-5 rounded-2xl border border-border bg-surface shadow-sm">
        <Skeleton className="w-28 h-4 mb-4 rounded !bg-border" />
        <div className="flex gap-3 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-14 h-14 rounded-xl !bg-border" />
          ))}
        </div>
      </div>
      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-2">
            <Skeleton className="w-20 h-3 rounded !bg-border" />
            <Skeleton className="w-full h-4 rounded !bg-border" />
            <Skeleton className="w-3/4 h-4 rounded !bg-border" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Analysing overlay shown on the preview panel ──────────────────────────────

function AnalysingOverlay() {
  const steps = ['Reading pixels…', 'Scoring quality…', 'Extracting palette…', 'Identifying subject…', 'Building insights…']
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % steps.length), 1400)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface/80 backdrop-blur-sm rounded-2xl z-10">
      {/* Spinning ring */}
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 animate-spin" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="23" stroke="var(--border-strong)" strokeWidth="4" />
          <path
            d="M28 5 A23 23 0 0 1 51 28"
            stroke="var(--accent-primary)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl">🔍</span>
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-semibold text-primary">Analysing image…</p>
        <p className="text-xs text-muted animate-pulse transition-all duration-500">{steps[step]}</p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i <= step ? 'var(--accent-primary)' : 'var(--border-strong)',
              transform: i === step ? 'scale(1.4)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AIAnalysisPage() {
  const navigate = useNavigate()
  const { setActiveImage } = useActiveImage()

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImageAnalysis | null>(null)
  const [copiedHex, setCopiedHex] = useState<string | null>(null)
  const prevPreviewUrl = useRef<string | null>(null)

  const handleFile = useCallback(async (f: File) => {
    // Revoke previous object URL to avoid memory leaks
    if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current)

    const url = URL.createObjectURL(f)
    prevPreviewUrl.current = url
    setFile(f)
    setPreviewUrl(url)
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      const data = await imageService.analyze(f)
      setResult(data)
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Analysis failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopiedHex(hex)
      setTimeout(() => setCopiedHex(null), 1500)
    })
  }

  const handleSendTo = (route: string) => {
    if (!file || !previewUrl) return
    setActiveImage(file, previewUrl)
    navigate(route)
  }

  const handleDownloadReport = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-analysis-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current)
    prevPreviewUrl.current = null
    setFile(null)
    setPreviewUrl(null)
    setResult(null)
    setError(null)
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-magenta/30 bg-magenta/10 text-xs font-semibold text-magenta">
            <span className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse" />
            AI Powered
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-primary tracking-tight mt-2">
          Image Analysis
        </h1>
        <p className="text-secondary text-sm">
          Upload any image to get quality scores, a color palette, subject insights, and editing recommendations.
        </p>
      </div>

      {/* Upload + preview row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Upload zone */}
        <div className="flex flex-col gap-3">
          <UploadZone onFile={handleFile} disabled={loading} />
          {file && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted hover:text-danger transition-colors self-center"
            >
              ✕ Clear &amp; upload new image
            </button>
          )}
        </div>

        {/* Image preview */}
        {previewUrl ? (
          <div className="relative rounded-2xl border border-border overflow-hidden bg-surface shadow-sm flex items-center justify-center min-h-[220px]">
            <img
              src={previewUrl}
              alt="Uploaded preview"
              className={`w-full h-full object-contain max-h-[340px] transition-all duration-300 ${loading ? 'opacity-30 blur-[2px]' : 'opacity-100'}`}
            />
            {loading && <AnalysingOverlay />}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface-raised flex items-center justify-center min-h-[220px]">
            <span className="text-muted text-sm">Preview appears here</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl bg-danger/10 border border-danger/40 p-4 animate-fade-up"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5 text-danger shrink-0 mt-0.5"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-bold text-danger">Analysis failed</p>
            <p className="text-xs text-secondary mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Skeleton while loading */}
      {loading && <AnalysisSkeleton />}

      {/* Results */}
      {result && !loading && (
        <div className="flex flex-col gap-6 animate-fade-up">

          {/* ── Quality Scores ── */}
          <section className="p-5 rounded-2xl border border-border bg-surface shadow-sm">
            <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-magenta/10 border border-magenta/20 flex items-center justify-center text-magenta text-[10px]">
                📊
              </span>
              Quality Scores
              {result.quality_rating && (
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-success">
                  {result.quality_rating}
                </span>
              )}
            </h2>
            <div className="flex flex-col gap-3">
              <ScoreBar label="Overall Quality" value={result.quality_score} />
              <ScoreBar label="Edge Accuracy" value={result.edge_score} />
              <ScoreBar label="Lighting" value={result.lighting_score} />
              <ScoreBar label="Sharpness" value={result.sharpness_score} />
              <ScoreBar label="Subject Isolation" value={result.isolation_score} />
            </div>
          </section>

          {/* ── Color Palette ── */}
          {result.color_palette && result.color_palette.length > 0 && (
            <section className="p-5 rounded-2xl border border-border bg-surface shadow-sm">
              <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-magenta/10 border border-magenta/20 flex items-center justify-center text-[10px]">
                  🎨
                </span>
                Color Palette
                <span className="ml-auto text-[10px] text-muted font-medium">
                  Click a swatch to copy hex
                </span>
              </h2>
              <div className="flex flex-col gap-3">
                {result.color_palette.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => handleCopyHex(c.hex)}
                    className="flex items-center gap-3 w-full text-left group"
                    title={`Copy ${c.hex}`}
                  >
                    {/* Swatch */}
                    <span
                      className="w-10 h-10 rounded-xl shrink-0 border border-border/50 shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: c.hex }}
                    />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-primary truncate">
                          {c.name}
                        </span>
                        <span className="text-[10px] font-mono text-muted shrink-0 flex items-center gap-1">
                          {copiedHex === c.hex ? (
                            <span className="text-success font-semibold">Copied!</span>
                          ) : (
                            c.hex
                          )}
                        </span>
                      </div>
                      {/* Percentage bar */}
                      <div className="h-1.5 w-full rounded-full bg-surface-raised border border-border overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${c.percentage}%`,
                            backgroundColor: c.hex,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted mt-0.5 block">
                        {c.use_case} · {c.percentage}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Image Info Cards ── */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-magenta/10 border border-magenta/20 flex items-center justify-center text-[10px]">
                🔍
              </span>
              Image Insights
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard label="Subject" value={result.subject} />
              <InfoCard label="Image Type" value={result.image_type} />
              <InfoCard label="Background" value={result.background_description} />
              <InfoCard label="Suggested Use" value={result.suggested_use} />
            </div>
          </section>

          {/* ── Editing Recommendations ── */}
          {result.editing_recommendations && result.editing_recommendations.length > 0 && (
            <section className="p-5 rounded-2xl border border-border bg-surface shadow-sm">
              <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-magenta/10 border border-magenta/20 flex items-center justify-center text-[10px]">
                  ✏️
                </span>
                Editing Recommendations
              </h2>
              <ul className="flex flex-col gap-2.5">
                {result.editing_recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-success/10 border border-success/30 flex items-center justify-center shrink-0 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 12 12"
                        fill="currentColor"
                        className="w-2.5 h-2.5 text-success"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.22 2.47a.75.75 0 010 1.06l-5.5 5.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 011.06-1.06L4.25 7.44l4.97-4.97a.75.75 0 011.06 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <span className="text-sm text-secondary leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Action Bar ── */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-border bg-surface shadow-sm">
            <span className="text-xs font-semibold text-secondary mr-auto">
              What would you like to do next?
            </span>
            <button
              type="button"
              onClick={() => handleSendTo('/')}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M8.543 2.232a.75.75 0 00-1.085 0l-5.25 5.5A.75.75 0 002.75 9H4v2.987A1.5 1.5 0 005.487 13.5h1.013a.75.75 0 000-1.5H5.5V8.257a.75.75 0 00-.22-.53l.22-.232V9h5v-.505l.22.232a.75.75 0 00-.22.53v3.743h-1a.75.75 0 000 1.5h1.013A1.5 1.5 0 0012 13.987V9h1.25a.75.75 0 00.542-1.268l-5.25-5.5z" />
              </svg>
              Send to Editor
            </button>
            <button
              type="button"
              onClick={() => handleSendTo('/enhance')}
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M9.58 1.077a.75.75 0 01.405.82L9.165 6h4.085a.75.75 0 01.567 1.241l-6.5 7.5a.75.75 0 01-1.302-.638L6.835 10H2.75a.75.75 0 01-.567-1.241l6.5-7.5a.75.75 0 01.897-.182z" clipRule="evenodd" />
              </svg>
              Send to Enhance
            </button>
            <button
              type="button"
              onClick={handleDownloadReport}
              className="btn-ghost text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M8.75 2.75a.75.75 0 00-1.5 0v5.69L5.03 6.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 8.44V2.75z" />
                <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z" />
              </svg>
              Download Report
            </button>
          </div>
        </div>
      )}

      {/* Empty state — no file yet */}
      {!file && !loading && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-2xl shadow-sm">
            🔍
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Upload an image to get started</p>
            <p className="text-xs text-muted mt-1 max-w-xs">
              The AI will score quality, extract a color palette, identify the subject, and suggest edits.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
