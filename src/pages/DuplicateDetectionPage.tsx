import { useState, useCallback, useRef } from 'react'
import UploadZone from '../components/UploadZone'
import { mlService } from '../services/mlService'
import type { DuplicateMatch, DuplicateCheckResponse } from '../services/mlService'

// ── Duplicate type metadata ───────────────────────────────────────────────────

const DUP_META: Record<
  string,
  { label: string; icon: string; color: string; desc: string }
> = {
  exact: {
    label: 'Exact Duplicate',
    icon: '🔴',
    color: 'text-danger bg-danger/10 border-danger/30',
    desc: 'Byte-identical copy (same MD5)',
  },
  resized: {
    label: 'Resized Duplicate',
    icon: '🟠',
    color: 'text-warning bg-warning/10 border-warning/30',
    desc: 'Same image at a different resolution',
  },
  cropped: {
    label: 'Cropped Duplicate',
    icon: '🟡',
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    desc: 'Looks like a crop of an existing image',
  },
  similar: {
    label: 'Similar Image',
    icon: '🟢',
    color: 'text-success bg-success/10 border-success/30',
    desc: 'Slight modifications (filter, brightness, compression)',
  },
}

// ── Scanning overlay ──────────────────────────────────────────────────────────

function ScanningOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface/80 backdrop-blur-sm rounded-2xl z-10">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 animate-spin" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="23" stroke="var(--border-strong)" strokeWidth="4" />
          <path d="M28 5 A23 23 0 0 1 51 28" stroke="var(--accent-primary)" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl">🔎</span>
      </div>
      <p className="text-sm font-semibold text-primary">Scanning for duplicates…</p>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ScanSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface">
          <div className="w-14 h-14 rounded-lg bg-border shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-3 w-1/2 rounded bg-border" />
            <div className="h-2 w-1/3 rounded bg-border" />
            <div className="h-2 w-1/4 rounded bg-border" />
          </div>
          <div className="h-6 w-24 rounded-full bg-border" />
        </div>
      ))}
    </div>
  )
}

// ── Duplicate card ────────────────────────────────────────────────────────────

function DuplicateCard({ match }: { match: DuplicateMatch }) {
  const meta = DUP_META[match.duplicate_type] ?? DUP_META.similar
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface hover:border-accent-primary/40 transition-colors">
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-raised border border-border flex items-center justify-center shrink-0">
        {match.download_url ? (
          <img
            src={match.download_url}
            alt={match.filename}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span className="text-2xl">🖼️</span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{match.filename}</p>
        <p className="text-xs text-muted font-mono truncate">{match.image_id}</p>
        <p className="text-xs text-muted">{meta.desc}</p>
        {match.duplicate_type !== 'exact' && (
          <p className="text-xs text-muted">
            Hash distance: <span className="font-mono font-medium text-secondary">{match.hamming_distance}</span>
          </p>
        )}
      </div>

      {/* Badge */}
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${meta.color}`}>
        {meta.icon} {meta.label}
      </span>
    </div>
  )
}

// ── Summary stat ──────────────────────────────────────────────────────────────

function StatPill({
  type,
  count,
}: {
  type: keyof typeof DUP_META
  count: number
}) {
  const meta = DUP_META[type]
  if (count === 0) return null
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${meta.color}`}>
      {meta.icon} {count} {meta.label}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DuplicateDetectionPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DuplicateCheckResponse | null>(null)
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

  const handleCheck = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await mlService.checkDuplicates(file)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Duplicate check failed.')
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
      const data = await mlService.indexForDuplicates(file)
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

  // Group duplicate counts by type
  const counts = result
    ? (['exact', 'resized', 'cropped', 'similar'] as const).reduce(
        (acc, t) => ({
          ...acc,
          [t]: result.duplicates.filter((d) => d.duplicate_type === t).length,
        }),
        {} as Record<string, number>,
      )
    : {}

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
          Duplicate Image Detection
        </h1>
        <p className="text-secondary text-sm">
          Detect exact copies, resized versions, crops, and similar variants of your uploaded images.
        </p>
      </div>

      {/* Duplicate type legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(DUP_META) as [string, typeof DUP_META[string]][]).map(
          ([type, meta]) => (
            <div
              key={type}
              className={`flex flex-col gap-1 p-3 rounded-xl border ${meta.color}`}
            >
              <span className="text-xl">{meta.icon}</span>
              <p className="text-xs font-bold">{meta.label}</p>
              <p className="text-[10px] opacity-70 leading-snug">{meta.desc}</p>
            </div>
          ),
        )}
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
          <div className="relative rounded-2xl border-2 border-accent-primary/40 overflow-hidden bg-surface shadow-md flex flex-col min-h-[220px]">
            <img
              src={previewUrl}
              alt="Uploaded preview"
              className={`w-full h-full object-contain max-h-[320px] transition-all duration-300 ${loading ? 'opacity-30 blur-[2px]' : 'opacity-100'}`}
            />
            {loading && <ScanningOverlay />}
            {/* Confirmation banner — only when not scanning */}
            {!loading && (
              <div className="absolute top-2 left-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/90 backdrop-blur-sm shadow-sm">
                <svg className="w-4 h-4 text-white shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white text-xs font-semibold truncate">
                  ✓ Image loaded &amp; ready
                </span>
              </div>
            )}
            {/* File info footer */}
            <div className="px-3 py-2 border-t border-border bg-surface-raised flex items-center gap-3">
              <span className="text-[11px] text-muted font-mono truncate">{file?.name}</span>
              <span className="text-[11px] text-muted shrink-0">
                {file ? (file.size / 1024 < 1024
                  ? `${(file.size / 1024).toFixed(1)} KB`
                  : `${(file.size / (1024 * 1024)).toFixed(1)} MB`)
                : ''}
              </span>
            </div>
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
            onClick={handleCheck}
            disabled={loading || indexing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-magenta text-white text-sm font-bold hover:bg-magenta-hover disabled:opacity-50 transition-colors shadow-md"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                Scanning…
              </>
            ) : (
              <><span>🔎</span> Check for Duplicates</>
            )}
          </button>

          <button
            type="button"
            onClick={handleIndex}
            disabled={loading || indexing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-magenta text-magenta text-sm font-bold hover:bg-magenta hover:text-white disabled:opacity-50 transition-colors"
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
            <p className="text-sm font-bold text-danger">Scan failed</p>
            <p className="text-xs text-secondary mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && <ScanSkeleton />}

      {/* Results */}
      {result && !loading && (
        <section className="flex flex-col gap-4 animate-fade-up">
          {/* Summary banner */}
          <div
            className={`flex items-center gap-4 p-4 rounded-2xl border ${
              result.has_duplicates
                ? 'bg-danger/5 border-danger/30'
                : 'bg-success/5 border-success/30'
            }`}
          >
            <span className="text-3xl">{result.has_duplicates ? '⚠️' : '✅'}</span>
            <div className="flex flex-col gap-0.5">
              <p className={`text-sm font-bold ${result.has_duplicates ? 'text-danger' : 'text-success'}`}>
                {result.has_duplicates
                  ? `${result.total_found} duplicate${result.total_found !== 1 ? 's' : ''} found`
                  : 'No duplicates found — this image is unique'}
              </p>
              <p className="text-xs text-muted font-mono">
                MD5: {result.query_md5.slice(0, 16)}…
              </p>
            </div>
          </div>

          {/* Breakdown pills */}
          {result.has_duplicates && (
            <div className="flex flex-wrap gap-2">
              {(['exact', 'resized', 'cropped', 'similar'] as const).map((t) => (
                <StatPill key={t} type={t} count={counts[t] ?? 0} />
              ))}
            </div>
          )}

          {/* Duplicate list */}
          {result.has_duplicates && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-magenta/10 border border-magenta/20 flex items-center justify-center text-[10px]">🔎</span>
                Detected Duplicates
              </h2>
              {result.duplicates.map((d) => (
                <DuplicateCard key={d.image_id} match={d} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
