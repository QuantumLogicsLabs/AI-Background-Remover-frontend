import { useState, useCallback, useRef } from 'react'
import UploadZone from '../components/UploadZone'
import { mlService } from '../services/mlService'
import type { SimilarityResult, SimilaritySearchResponse } from '../services/mlService'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface"
        >
          <div className="w-16 h-16 rounded-lg bg-border shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-3 w-1/2 rounded bg-border" />
            <div className="h-2 w-1/4 rounded bg-border" />
          </div>
          <div className="h-8 w-20 rounded-lg bg-border" />
        </div>
      ))}
    </div>
  )
}

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 80 ? 'bg-success/10 text-success border-success/30' :
    pct >= 50 ? 'bg-warning/10 text-warning border-warning/30' :
    'bg-border text-muted border-border'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {pct}% match
    </span>
  )
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ result, rank }: { result: SimilarityResult; rank: number }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface hover:border-accent-primary/40 transition-colors group">
      {/* Rank + thumbnail */}
      <div className="relative shrink-0">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-raised border border-border flex items-center justify-center">
          {result.download_url ? (
            <img
              src={result.download_url}
              alt={result.filename}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <span className="text-2xl">🖼️</span>
          )}
        </div>
        <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-accent-primary text-white text-[10px] font-bold flex items-center justify-center shadow">
          {rank}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{result.filename}</p>
        <p className="text-xs text-muted font-mono truncate">{result.image_id}</p>
        {/* Mini score bar */}
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-raised border border-border overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-primary transition-all duration-700"
            style={{ width: `${Math.round(result.score * 100)}%` }}
          />
        </div>
      </div>

      {/* Badge */}
      <ScoreBadge score={result.score} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SimilaritySearchPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimilaritySearchResponse | null>(null)
  const [indexMsg, setIndexMsg] = useState<string | null>(null)
  const prevPreviewUrl = useRef<string | null>(null)

  const handleFile = useCallback((f: File) => {
    if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current)
    const url = URL.createObjectURL(f)
    prevPreviewUrl.current = url
    setFile(f)
    setPreviewUrl(url)
    setResult(null)
    setError(null)
    setIndexMsg(null)
  }, [])

  const handleSearch = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await mlService.searchSimilar(file, 10)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Search failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleIndex = async () => {
    if (!file) return
    setIndexing(true)
    setIndexMsg(null)
    setError(null)
    try {
      const data = await mlService.indexForSimilarity(file)
      setIndexMsg(data.message)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Indexing failed.')
    } finally {
      setIndexing(false)
    }
  }

  const handleReset = () => {
    if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current)
    prevPreviewUrl.current = null
    setFile(null)
    setPreviewUrl(null)
    setResult(null)
    setError(null)
    setIndexMsg(null)
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
          Image Similarity Search
        </h1>
        <p className="text-secondary text-sm">
          Upload an image to find visually similar images in your library using AI-generated embeddings.
        </p>
      </div>

      {/* How it works chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: '📤', label: 'Upload Image' },
          { icon: '🔢', label: 'AI Embedding' },
          { icon: '🔍', label: 'Vector Search' },
          { icon: '🏆', label: 'Ranked Results' },
        ].map(({ icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface-raised text-xs font-medium text-secondary"
          >
            <span>{icon}</span>
            {label}
          </span>
        ))}
      </div>

      {/* Upload + preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-3">
          <UploadZone onFile={handleFile} disabled={loading || indexing} />
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
              className="w-full h-full object-contain max-h-[340px]"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface-raised flex items-center justify-center min-h-[220px]">
            <span className="text-muted text-sm">Preview appears here</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {file && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || indexing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                Searching…
              </>
            ) : (
              <><span>🔍</span> Find Similar Images</>
            )}
          </button>

          <button
            type="button"
            onClick={handleIndex}
            disabled={loading || indexing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-surface text-sm font-semibold text-secondary hover:text-primary hover:border-accent-primary/40 disabled:opacity-50 transition-colors"
          >
            {indexing ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                Indexing…
              </>
            ) : (
              <><span>➕</span> Add to Index</>
            )}
          </button>
        </div>
      )}

      {/* Index success */}
      {indexMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-success/10 border border-success/30 px-4 py-3 animate-fade-up">
          <span className="text-success text-base">✅</span>
          <p className="text-sm text-success font-medium">{indexMsg}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger/10 border border-danger/40 p-4 animate-fade-up">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-danger shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-bold text-danger">Search failed</p>
            <p className="text-xs text-secondary mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && <ResultSkeleton />}

      {/* Results */}
      {result && !loading && (
        <section className="flex flex-col gap-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-magenta/10 border border-magenta/20 flex items-center justify-center text-[10px]">🔍</span>
              Similar Images
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">{result.total_indexed} image{result.total_indexed !== 1 ? 's' : ''} in index</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                {result.results.length} result{result.results.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {result.results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 rounded-2xl border border-dashed border-border bg-surface-raised text-center">
              <span className="text-4xl">🔎</span>
              <p className="text-sm font-semibold text-primary">No similar images found</p>
              <p className="text-xs text-muted max-w-xs">
                Your index may be empty or no images are visually similar enough.
                Try adding images to the index first using "Add to Index".
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {result.results.map((r, i) => (
                <ResultCard key={r.image_id} result={r} rank={i + 1} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
