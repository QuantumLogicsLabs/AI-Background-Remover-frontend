import { useState, useCallback, useRef } from 'react'
import UploadZone from '../components/UploadZone'
import { mlService } from '../services/mlService'
import type { CategorizationResponse } from '../services/mlService'

// ── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Portrait:  { icon: '👤', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  Product:   { icon: '📦', color: 'text-violet-400 bg-violet-400/10 border-violet-400/30' },
  Food:      { icon: '🍕', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
  Animal:    { icon: '🐾', color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  Landscape: { icon: '🌄', color: 'text-teal-400 bg-teal-400/10 border-teal-400/30' },
  Document:  { icon: '📄', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  Vehicle:   { icon: '🚗', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  Other:     { icon: '🖼️', color: 'text-secondary bg-surface-raised border-border' },
}

// ── Analysing overlay ─────────────────────────────────────────────────────────

function AnalysingOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface/80 backdrop-blur-sm rounded-2xl z-10">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 animate-spin" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="23" stroke="var(--border-strong)" strokeWidth="4" />
          <path d="M28 5 A23 23 0 0 1 51 28" stroke="var(--accent-primary)" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl">🏷️</span>
      </div>
      <p className="text-sm font-semibold text-primary">Classifying image…</p>
    </div>
  )
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function CategoryScoreBar({
  category,
  score,
  isTop,
}: {
  category: string
  score: number
  isTop: boolean
}) {
  const pct = Math.round(score * 100)
  const meta = CATEGORY_META[category] ?? CATEGORY_META.Other
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 text-center text-sm shrink-0">{meta.icon}</span>
      <span className={`w-20 text-xs font-medium shrink-0 ${isTop ? 'text-primary font-bold' : 'text-secondary'}`}>
        {category}
      </span>
      <div className="flex-1 h-2 rounded-full bg-surface-raised border border-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${isTop ? 'bg-accent-primary' : 'bg-border-strong'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-10 text-right text-xs font-mono ${isTop ? 'text-primary font-bold' : 'text-muted'}`}>
        {pct}%
      </span>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CategorizationSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse p-5 rounded-2xl border border-border bg-surface" aria-hidden="true">
      <div className="h-16 w-48 rounded-xl bg-border mx-auto" />
      <div className="flex flex-col gap-3 mt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-border" />
            <div className="w-20 h-3 rounded bg-border" />
            <div className="flex-1 h-2 rounded-full bg-border" />
            <div className="w-8 h-3 rounded bg-border" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CategorizationPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CategorizationResponse | null>(null)
  const prevPreviewUrl = useRef<string | null>(null)

  const handleFile = useCallback(async (f: File) => {
    if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current)
    const url = URL.createObjectURL(f)
    prevPreviewUrl.current = url
    setFile(f)
    setPreviewUrl(url)
    setResult(null)
    setError(null)
    setLoading(true)

    try {
      const data = await mlService.categorize(f)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Categorization failed.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReset = () => {
    if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current)
    prevPreviewUrl.current = null
    setFile(null)
    setPreviewUrl(null)
    setResult(null)
    setError(null)
  }

  const topMeta = result ? (CATEGORY_META[result.category] ?? CATEGORY_META.Other) : null

  // Sort scores descending for display
  const sortedScores = result
    ? Object.entries(result.scores).sort(([, a], [, b]) => b - a)
    : []

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
          Image Categorization
        </h1>
        <p className="text-secondary text-sm">
          Upload an image and AI will automatically classify it into one of 8 categories.
        </p>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_META).map(([cat, meta]) => (
          <span
            key={cat}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${
              result?.category === cat
                ? meta.color + ' ring-2 ring-offset-1 ring-offset-surface ring-accent-primary/40'
                : 'border-border bg-surface-raised text-secondary'
            }`}
          >
            {meta.icon} {cat}
          </span>
        ))}
      </div>

      {/* Upload + preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
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
        <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger/10 border border-danger/40 p-4 animate-fade-up">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-danger shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-bold text-danger">Categorization failed</p>
            <p className="text-xs text-secondary mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && <CategorizationSkeleton />}

      {/* Results */}
      {result && !loading && topMeta && (
        <section className="flex flex-col gap-6 animate-fade-up">
          {/* Top result hero */}
          <div className={`flex flex-col items-center gap-3 p-6 rounded-2xl border ${topMeta.color} shadow-sm`}>
            <span className="text-5xl">{topMeta.icon}</span>
            <div className="text-center">
              <p className="text-2xl font-display font-extrabold text-primary tracking-tight">
                {result.category}
              </p>
              <p className="text-sm text-secondary mt-0.5">
                {Math.round(result.confidence * 100)}% confidence
                {result.method === 'clip' && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-magenta/10 text-magenta border border-magenta/20 font-semibold">
                    CLIP
                  </span>
                )}
              </p>
            </div>
            <p className="text-xs text-muted">{result.filename}</p>
          </div>

          {/* Per-category breakdown */}
          <div className="p-5 rounded-2xl border border-border bg-surface shadow-sm">
            <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-magenta/10 border border-magenta/20 flex items-center justify-center text-[10px]">📊</span>
              Category Scores
            </h2>
            <div className="flex flex-col gap-3">
              {sortedScores.map(([cat, score]) => (
                <CategoryScoreBar
                  key={cat}
                  category={cat}
                  score={score}
                  isTop={cat === result.category}
                />
              ))}
            </div>
          </div>

          {/* Method info */}
          <div className="flex items-center gap-2 text-xs text-muted px-1">
            <span>⚙️</span>
            <span>
              {result.method === 'clip'
                ? 'Classified using OpenAI CLIP zero-shot image classification'
                : 'Classified using ImageNet keyword heuristic (CLIP not available)'}
            </span>
          </div>
        </section>
      )}
    </main>
  )
}
