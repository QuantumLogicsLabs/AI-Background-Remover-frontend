import { useState, useCallback, useRef } from 'react'
import UploadZone from '../components/UploadZone'
import { mlService } from '../services/mlService'
import type { DetectedObjectGroup, SimilarObjectsResponse } from '../services/mlService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupColor(g: DetectedObjectGroup): string {
  const [r, gv, b] = g.color_rgb
  return `rgb(${r},${gv},${b})`
}
function groupColorAlpha(g: DetectedObjectGroup, a: number): string {
  const [r, gv, b] = g.color_rgb
  return `rgba(${r},${gv},${b},${a})`
}

/** e.g. 0.94 → "94%" */
function pct(v: number) { return `${Math.round(v * 100)}%` }

/** Position label → short emoji + text */
function locationChip(loc: string) {
  const map: Record<string, string> = {
    'top-left': '↖ top-left',    'top': '↑ top',       'top-right': '↗ top-right',
    'left': '← left',            'center': '· center',  'right': '→ right',
    'bottom-left': '↙ bottom-left', 'bottom': '↓ bottom', 'bottom-right': '↘ bottom-right',
    'middle': '· middle',
  }
  return map[loc] ?? loc
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" aria-hidden>
      <div className="h-4 w-56 rounded-full bg-border" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-4 p-4 rounded-2xl border border-border bg-surface">
            <div className="w-20 h-20 rounded-xl bg-border shrink-0" />
            <div className="flex flex-col gap-2 flex-1 justify-center">
              <div className="h-3 w-1/2 rounded bg-border" />
              <div className="h-2 w-3/4 rounded bg-border" />
              <div className="h-2 w-1/3 rounded bg-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Object group card ─────────────────────────────────────────────────────────

function GroupCard({ group, rank }: { group: DetectedObjectGroup; rank: number }) {
  const color      = groupColor(group)
  const colorAlpha = (a: number) => groupColorAlpha(group, a)
  const simPct     = Math.round(group.avg_similarity * 100)

  // Similarity tier label
  const tier =
    simPct >= 95 ? { label: 'Nearly identical', icon: '🟢' } :
    simPct >= 88 ? { label: 'Very similar',     icon: '🟡' } :
                   { label: 'Similar',           icon: '🟠' }

  return (
    <div
      className="flex gap-4 p-4 rounded-2xl border-2 bg-surface transition-shadow hover:shadow-md"
      style={{ borderColor: colorAlpha(0.45) }}
    >
      {/* Thumbnail */}
      <div
        className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2"
        style={{ borderColor: color }}
      >
        {group.thumbnail_b64 ? (
          <img
            src={`data:image/jpeg;base64,${group.thumbnail_b64}`}
            alt={`Detected object ${rank}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-raised">
            <span className="text-2xl">🖼️</span>
          </div>
        )}
        {/* Numbered badge */}
        <span
          className="absolute top-1 left-1 w-5 h-5 rounded-full text-white text-[10px] font-extrabold flex items-center justify-center shadow"
          style={{ background: color }}
        >
          {rank}
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {/* Header line */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-bold text-primary">
            Similar object #{rank}
          </p>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0"
            style={{ color, borderColor: colorAlpha(0.4), background: colorAlpha(0.1) }}
          >
            {tier.icon} {tier.label}
          </span>
        </div>

        {/* Instance count */}
        <p className="text-sm text-secondary leading-snug">
          Found{' '}
          <span className="font-bold text-primary">{group.instance_count} times</span>
          {' '}in this image
        </p>

        {/* Location pills */}
        <div className="flex flex-wrap gap-1">
          {group.locations.map(loc => (
            <span
              key={loc}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
              style={{
                color,
                borderColor: colorAlpha(0.35),
                background: colorAlpha(0.08),
              }}
            >
              {locationChip(loc)}
            </span>
          ))}
        </div>

        {/* Similarity bar */}
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 h-1.5 rounded-full bg-surface-raised border border-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: pct(group.avg_similarity), background: color }}
            />
          </div>
          <span className="text-[11px] font-bold shrink-0" style={{ color }}>
            {pct(group.avg_similarity)} match
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Annotated image ───────────────────────────────────────────────────────────

function AnnotatedImage({ b64, fallbackUrl }: { b64: string; fallbackUrl: string }) {
  if (b64) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-border shadow-md">
        <img
          src={`data:image/png;base64,${b64}`}
          alt="Image with similar objects highlighted"
          className="w-full h-auto block"
        />
        <span className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/55 text-white/90 backdrop-blur-sm">
          AI annotated
        </span>
      </div>
    )
  }
  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-md">
      <img src={fallbackUrl} alt="Uploaded image" className="w-full h-auto block" />
    </div>
  )
}

// ── Summary banner ────────────────────────────────────────────────────────────

function SummaryBanner({ result }: { result: SimilarObjectsResponse }) {
  const hasGroups = result.groups.length > 0
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border ${
        hasGroups
          ? 'bg-success/8 border-success/30'
          : 'bg-surface-raised border-border'
      }`}
    >
      <span className="text-2xl shrink-0 mt-0.5">{hasGroups ? '✅' : '🔎'}</span>
      <div className="flex flex-col gap-0.5">
        <p className={`text-sm font-bold ${hasGroups ? 'text-success' : 'text-primary'}`}>
          {hasGroups ? 'Similar objects detected' : 'No repeated objects found'}
        </p>
        <p className="text-xs text-secondary leading-relaxed">{result.summary}</p>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 px-6 rounded-2xl border border-dashed border-border bg-surface-raised text-center">
      <span className="text-5xl">🔍</span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-primary">Nothing repeated in this image</p>
        <p className="text-xs text-muted max-w-xs leading-relaxed">
          Try an image with multiple similar objects — animals, flowers, windows,
          patterns, or any repeated element.
        </p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SimilaritySearchPage() {
  const [file, setFile]         = useState<File | null>(null)
  const [previewUrl, setPrev]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [result, setResult]     = useState<SimilarObjectsResponse | null>(null)
  const prevUrl = useRef<string | null>(null)

  const handleFile = useCallback((f: File) => {
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
    const url = URL.createObjectURL(f)
    prevUrl.current = url
    setFile(f); setPrev(url); setResult(null); setError(null)
  }, [])

  const handleAnalyse = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    try {
      setResult(await mlService.findSimilarObjects(file))
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
    prevUrl.current = null
    setFile(null); setPrev(null); setResult(null); setError(null)
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

      {/* ── Header ── */}
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-magenta/30 bg-magenta/10 text-xs font-semibold text-magenta w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse" />
          AI Powered
        </span>
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-primary tracking-tight">
          Find Similar Objects in an Image
        </h1>
        <p className="text-secondary text-sm leading-relaxed max-w-xl">
          Upload any photo and the AI will automatically find objects or patterns
          that appear more than once — like multiple flowers, windows, or animals.
          Each match is shown with a preview thumbnail and its location in the photo.
        </p>
      </div>

      {/* ── How it works — plain steps ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { step: '1', icon: '📸', title: 'Upload a photo',   desc: 'Any image with objects or patterns' },
          { step: '2', icon: '🔍', title: 'AI scans it',      desc: 'Looks at different regions of your photo' },
          { step: '3', icon: '🧩', title: 'Groups matches',   desc: 'Clusters visually similar regions together' },
          { step: '4', icon: '📋', title: 'Shows results',    desc: 'Each group gets a thumbnail and description' },
        ].map(({ step, icon, title, desc }) => (
          <div key={step} className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-surface-raised">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-magenta/15 text-magenta text-[10px] font-extrabold flex items-center justify-center shrink-0">
                {step}
              </span>
              <span className="text-base">{icon}</span>
            </div>
            <p className="text-xs font-bold text-primary">{title}</p>
            <p className="text-[11px] text-muted leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Upload + preview ── */}
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
          <div className="relative rounded-2xl border-2 border-success/50 overflow-hidden bg-surface shadow-md flex flex-col">
            <img
              src={previewUrl}
              alt="Your uploaded image"
              className="w-full object-contain max-h-[300px]"
            />
            {/* Confirmation banner */}
            <div className="absolute top-2 left-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/90 backdrop-blur-sm shadow">
              <svg className="w-4 h-4 text-white shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span className="text-white text-xs font-semibold truncate">
                ✓ {file?.name} — ready to scan
              </span>
            </div>
            <div className="px-3 py-2 border-t border-border bg-surface-raised flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted font-mono truncate">{file?.name}</span>
              <span className="text-[11px] text-muted shrink-0">
                {file
                  ? file.size < 1024 * 1024
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                  : ''}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface-raised flex flex-col items-center justify-center gap-2 min-h-[220px]">
            <span className="text-4xl opacity-25">🖼️</span>
            <span className="text-sm text-muted">Preview appears here</span>
          </div>
        )}
      </div>

      {/* ── Analyse button ── */}
      {file && (
        <div>
          <button
            type="button"
            onClick={handleAnalyse}
            disabled={loading}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-magenta text-white text-sm font-bold hover:bg-magenta-hover active:scale-[0.98] disabled:opacity-60 transition-all shadow-md"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12"/>
                </svg>
                Scanning image…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"/>
                </svg>
                Find Similar Objects
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger/10 border border-danger/40 p-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-danger shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="text-sm font-bold text-danger">Scan failed</p>
            <p className="text-xs text-secondary mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && <Skeleton />}

      {/* ── Results ── */}
      {result && !loading && (
        <section className="flex flex-col gap-6 animate-fade-up">

          {/* Summary banner */}
          <SummaryBanner result={result} />

          {result.groups.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

              {/* Left — annotated image */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  What the AI found
                </p>
                {previewUrl && (
                  <AnnotatedImage
                    b64={result.annotated_image_b64}
                    fallbackUrl={previewUrl}
                  />
                )}
                {/* Colour legend */}
                <div className="flex flex-wrap gap-2 mt-1">
                  {result.groups.map((g, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
                      style={{
                        color: groupColor(g),
                        borderColor: groupColorAlpha(g, 0.4),
                        background: groupColorAlpha(g, 0.1),
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: groupColor(g) }}
                      />
                      Object {i + 1}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Numbered boxes on the image show where each type of similar object was found.
                  Same number = same type of object.
                </p>
              </div>

              {/* Right — object group cards */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  Detected objects &amp; where they appear
                </p>
                <div className="flex flex-col gap-3">
                  {result.groups.map((g, i) => (
                    <GroupCard key={i} group={g} rank={i + 1} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Re-scan button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAnalyse}
              className="text-xs text-muted hover:text-magenta transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <path d="M2 8a6 6 0 1110.472-3.972" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12.5 1.5v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Scan again
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
