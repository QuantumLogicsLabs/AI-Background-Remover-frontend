import { useEffect, useRef, useState } from 'react'
import UploadZone from '../components/UploadZone'
import ImageCanvas from '../components/ImageCanvas'
import DownloadButton from '../components/DownloadButton'
import QualityToggle from '../components/QualityToggle'
import { useUpload } from '../hooks/useUpload'

const FEATURE_CHIPS = [
  { label: 'JPEG, PNG, WebP',       icon: '🖼️' },
  { label: 'Up to 10 MB',           icon: '⚡' },
  { label: 'Transparent PNG output', icon: '✨' },
  { label: 'AI-powered',            icon: '🤖' },
  { label: 'Instant download',      icon: '⬇️' },
  { label: 'Dark mode',             icon: '🌙' },
]

// Steps shown in sequence while the AI is working.
// Each step advances every STEP_INTERVAL ms so the UI always feels alive.
const FAST_STEPS = [
  { text: 'Uploading image…',        sub: 'Sending to AI server'           },
  { text: 'Analysing subject…',      sub: 'ISNet detecting edges'          },
  { text: 'Removing background…',    sub: 'Generating alpha mask'          },
  { text: 'Refining edges…',         sub: 'Smoothing transparency'         },
  { text: 'Almost done…',            sub: 'Saving your PNG'                },
]
const STANDARD_STEPS = [
  { text: 'Uploading image…',        sub: 'Sending to AI server'           },
  { text: 'Detecting subject…',      sub: 'U²-Net portrait analysis'       },
  { text: 'Isolating person…',       sub: 'Human segmentation model'       },
  { text: 'Refining edges…',         sub: 'Smoothing hair & skin boundary' },
  { text: 'Almost done…',            sub: 'Saving your PNG'                },
]
const QUALITY_STEPS = [
  { text: 'Uploading image…',        sub: 'Sending to AI server'           },
  { text: 'Analysing subject…',      sub: 'BiRefNet deep feature pass 1/2' },
  { text: 'Fine-detail processing…', sub: 'BiRefNet deep feature pass 2/2' },
  { text: 'Removing background…',    sub: 'Generating high-res alpha mask' },
  { text: 'Refining edges…',         sub: 'Hair & fur detail pass'         },
  { text: 'Almost done…',            sub: 'Saving your PNG'                },
]
const STEP_INTERVAL = 2800  // ms between step advances

export default function HomePage() {
  const { status, result, originalUrl, error, quality, setQuality, upload, reset } = useUpload()

  // ── Processing step cycling ──────────────────────────────────────────────
  const steps = quality === 'quality' ? QUALITY_STEPS
              : quality === 'standard' ? STANDARD_STEPS
              : FAST_STEPS
  const [stepIdx, setStepIdx] = useState(0)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status === 'uploading') {
      setStepIdx(0)
      stepTimer.current = setInterval(() => {
        setStepIdx(prev => Math.min(prev + 1, steps.length - 1))
      }, STEP_INTERVAL)
    } else {
      if (stepTimer.current) {
        clearInterval(stepTimer.current)
        stepTimer.current = null
      }
    }
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current)
    }
  }, [status, steps.length])

  const isUploading = status === 'uploading'
  const isDone      = status === 'success' && result !== null && originalUrl !== null

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-10">

      {/* Hero */}
      <div className="text-center flex flex-col items-center gap-3">
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-magenta/30 bg-magenta/8 text-xs font-medium text-magenta">
          <span className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse" aria-hidden="true" />
          AI-Powered Background Removal
        </span>

        <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary leading-tight tracking-tight">
          Remove Backgrounds{' '}
          <span className="text-gradient-brand">Instantly</span>
        </h1>

        <p className="text-secondary text-base max-w-md leading-relaxed">
          Drop any photo — our AI isolates the subject and hands you a crisp transparent PNG in seconds.
        </p>
      </div>

      {/* Upload / Result area */}
      {!isDone ? (
        <div className="flex flex-col gap-5">
          <UploadZone onFile={upload} disabled={isUploading} />

          {/* Quality selector — shown when idle */}
          {!isUploading && (
            <div className="flex justify-center">
              <QualityToggle value={quality} onChange={setQuality} disabled={isUploading} />
            </div>
          )}

          {/* Processing state */}
          {isUploading && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-5 py-8 animate-fade-up"
            >
              {/* Spinner */}
              <div className="relative w-14 h-14">
                <svg className="absolute inset-0 w-14 h-14 animate-spin text-magenta" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 56 56" aria-hidden="true">
                  <circle className="opacity-15" cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-80" fill="currentColor" d="M52 28a24 24 0 00-24-24v4a20 20 0 0120 20h4z" />
                </svg>
                <svg className="absolute inset-0 w-14 h-14 animate-spin text-teal" style={{ animationDuration: '2s', animationDirection: 'reverse' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 56 56" aria-hidden="true">
                  <circle className="opacity-10" cx="28" cy="28" r="18" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-60" fill="currentColor" d="M46 28a18 18 0 00-18-18v3a15 15 0 0115 15h3z" />
                </svg>
              </div>

              {/* Animated step text */}
              <div className="text-center">
                <p
                  key={stepIdx}
                  className="text-primary font-medium animate-fade-up"
                >
                  {steps[stepIdx].text}
                </p>
                <p
                  key={`sub-${stepIdx}`}
                  className="text-muted text-sm mt-0.5 animate-fade-up"
                >
                  {steps[stepIdx].sub}
                </p>
              </div>

              {/* Step progress dots */}
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`
                      rounded-full transition-all duration-500
                      ${i === stepIdx
                        ? 'w-4 h-2 bg-magenta'
                        : i < stepIdx
                        ? 'w-2 h-2 bg-magenta/40'
                        : 'w-2 h-2 bg-border'
                      }
                    `}
                  />
                ))}
              </div>

              {/* Quality badge */}
              <span className="text-xs px-2.5 py-1 rounded-full border border-border text-muted bg-surface-raised">
                {quality === 'quality'  ? '✨ BiRefNet — best edges'
               : quality === 'standard' ? '👤 U²-Net — portrait mode'
               :                          '⚡ ISNet — fast mode'}
              </span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg bg-surface border border-danger/40 px-4 py-3.5 animate-fade-up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-danger">Something went wrong</p>
                <p className="text-xs text-secondary mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Result */
        <div className="flex flex-col gap-5">
          <ImageCanvas
            originalUrl={originalUrl!}
            resultUrl={`/api/download/${result!.output_filename}`}
          />

          {/* Actions bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-surface-raised rounded-xl border border-border">
            <div className="flex items-center gap-2 text-sm text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-success shrink-0" aria-hidden="true">
                <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.844 4.574a.75.75 0 00-1.188-.918l-3.454 4.472-1.696-1.697a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.124-.096l4.024-5.07z" clipRule="evenodd"/>
              </svg>
              Background removed
              {result?.quality === 'quality' && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-magenta/10 text-magenta border border-magenta/20">
                  BiRefNet
                </span>
              )}
              {result?.quality === 'standard' && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-teal/10 text-teal border border-teal/20">
                  Portrait
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="btn-ghost text-sm"
              >
                Try another
              </button>
              <DownloadButton
                downloadUrl={`/api/download/${result!.output_filename}`}
                filename={result!.output_filename}
              />
            </div>
          </div>

          {/* Tip — shown only for fast/standard mode results */}
          {result?.quality === 'fast' && (
            <p className="text-xs text-center text-muted px-2">
              Not happy with the edges?{' '}
              <button onClick={reset} className="text-magenta underline underline-offset-2 hover:no-underline">
                Try again
              </button>
              {' '}with <strong className="text-secondary">Standard</strong> (portraits) or{' '}
              <strong className="text-secondary">Quality</strong> (BiRefNet) for finer detail.
            </p>
          )}
          {result?.quality === 'standard' && (
            <p className="text-xs text-center text-muted px-2">
              Need even sharper edges?{' '}
              <button onClick={reset} className="text-magenta underline underline-offset-2 hover:no-underline">
                Try again
              </button>
              {' '}with <strong className="text-secondary">Quality mode</strong> (BiRefNet) for the best possible result.
            </p>
          )}
        </div>
      )}

      {/* Feature chips — only on idle */}
      {!isDone && !isUploading && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-muted uppercase tracking-widest font-medium">What we support</p>
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Supported features">
            {FEATURE_CHIPS.map(({ label, icon }) => (
              <li key={label} className="chip gap-1.5">
                <span aria-hidden="true">{icon}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  )
}
