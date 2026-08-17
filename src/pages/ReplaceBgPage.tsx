import UploadZone from '../components/UploadZone'
import DownloadButton from '../components/DownloadButton'
import BackgroundPicker from '../components/BackgroundPicker'
import QualityToggle from '../components/QualityToggle'
import { useReplaceBg } from '../hooks/useReplaceBg'

// ── Step indicator ─────────────────────────────────────────────────────────

interface StepBadgeProps {
  step:    number
  label:   string
  active:  boolean
  done:    boolean
}

function StepBadge({ step, label, active, done }: StepBadgeProps) {
  return (
    <div className={`flex items-center gap-2 transition-opacity ${active || done ? 'opacity-100' : 'opacity-35'}`}>
      <div
        className={`
          w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
          transition-colors
          ${done
            ? 'bg-success text-white'
            : active
            ? 'bg-magenta text-white'
            : 'bg-surface-raised border border-border text-muted'
          }
        `}
        aria-hidden="true"
      >
        {done
          ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 010 1.06l-5.5 5.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 011.06-1.06L6.5 8.316l4.97-4.94a.75.75 0 011.06 0h-.114z" clipRule="evenodd" />
            </svg>
          )
          : step
        }
      </div>
      <span className={`text-sm font-medium ${active ? 'text-primary' : 'text-secondary'}`}>
        {label}
      </span>
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-10 animate-fade-up">
      <div className="relative w-14 h-14">
        <svg className="absolute inset-0 w-14 h-14 animate-spin text-magenta"
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 56 56" aria-hidden="true">
          <circle className="opacity-15" cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-80" fill="currentColor" d="M52 28a24 24 0 00-24-24v4a20 20 0 0120 20h4z" />
        </svg>
        <svg className="absolute inset-0 w-14 h-14 animate-spin text-teal"
          style={{ animationDuration: '2s', animationDirection: 'reverse' }}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 56 56" aria-hidden="true">
          <circle className="opacity-10" cx="28" cy="28" r="18" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-60" fill="currentColor" d="M46 28a18 18 0 00-18-18v3a15 15 0 0115 15h3z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-primary font-medium">{label}</p>
        <p className="text-muted text-sm mt-0.5">This usually takes a few seconds</p>
      </div>
    </div>
  )
}

// ── Error banner ───────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg bg-surface border border-danger/40 px-4 py-3.5 animate-fade-up">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
        className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
      </svg>
      <div>
        <p className="text-sm font-medium text-danger">Something went wrong</p>
        <p className="text-xs text-secondary mt-0.5">{message}</p>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ReplaceBgPage() {
  const {
    removeStatus, originalUrl, removedUrl, removeError,
    removeBackground,
    quality, setQuality,
    replaceStatus, replaceResult, replaceError,
    replaceBackground,
    settings, updateSetting, resetSettings,
    reset,
    resetStep2,
  } = useReplaceBg()

  const isRemoving  = removeStatus  === 'removing'
  const isReplacing = replaceStatus === 'replacing'
  const step1Done   = removeStatus  === 'removed'
  const step2Done   = replaceStatus === 'done'
  const busy        = isRemoving || isReplacing

  // Can apply if step 1 is done, not busy, and (image/library mode needs a file)
  const needsFile = settings.bgType === 'image' || settings.bgType === 'library'
  const canApply =
    step1Done &&
    !busy &&
    (!needsFile || settings.bgFile !== null)

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-10">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="text-center flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-magenta/30 bg-magenta/8 text-xs font-medium text-magenta">
          <span className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse" aria-hidden="true" />
          Background Replacement
        </span>

        <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary leading-tight tracking-tight">
          Replace Any{' '}
          <span className="text-gradient-brand">Background</span>
        </h1>

        <p className="text-secondary text-base max-w-md leading-relaxed">
          Upload a photo, remove the background automatically, then drop in a
          solid colour, gradient, or your own image — all in two clicks.
        </p>
      </div>

      {/* ── Step indicators ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-1">
        <StepBadge step={1} label="Remove background" active={!step1Done} done={step1Done} />
        <div className="flex-1 h-px bg-border mx-1" aria-hidden="true" />
        <StepBadge step={2} label="Choose background"  active={step1Done && !step2Done} done={step2Done} />
        <div className="flex-1 h-px bg-border mx-1" aria-hidden="true" />
        <StepBadge step={3} label="Download result"    active={step2Done} done={false} />
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left column — canvas / upload ────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-5">

          {/* STEP 1: idle / uploading */}
          {!step1Done && (
            <>
              {isRemoving
                ? <Spinner label="Removing background…" />
                : (
                  <div className="flex flex-col gap-4">
                    <UploadZone onFile={removeBackground} disabled={busy} />
                    {/* Quality selector — shown while waiting for upload */}
                    <div className="flex justify-center">
                      <QualityToggle value={quality} onChange={setQuality} disabled={busy} />
                    </div>
                  </div>
                )
              }
              {removeError && <ErrorBanner message={removeError} />}
            </>
          )}

          {/* STEP 1 done, STEP 2 not yet started — show removed preview */}
          {step1Done && !step2Done && (
            <div className="flex flex-col gap-3 animate-fade-up">
              <p className="text-xs text-muted uppercase tracking-widest font-medium text-center">
                Background removed — choose a new background →
              </p>
              <div className="relative w-full overflow-hidden rounded-xl border border-border bg-checker shadow-md" style={{ minHeight: 320 }}>
                {removedUrl && (
                  <img
                    src={removedUrl}
                    alt="Subject with background removed"
                    className="w-full object-contain max-h-[480px]"
                  />
                )}
              </div>

              {isReplacing && <Spinner label="Compositing background…" />}
              {replaceError && <ErrorBanner message={replaceError} />}
            </div>
          )}

          {/* STEP 2 done — show final result with before/after */}
          {step2Done && replaceResult && (
            <div className="flex flex-col gap-4 animate-fade-up">

              {/* Before / After side-by-side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted text-center font-medium">Original</p>
                  <div className="rounded-xl overflow-hidden border border-border bg-checker aspect-square">
                    {originalUrl && (
                      <img src={originalUrl} alt="Original" className="w-full h-full object-contain" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted text-center font-medium">Result</p>
                  <div className="rounded-xl overflow-hidden border border-border aspect-square" style={{ background: '#f0f0f0' }}>
                    <img
                      src={`/api/download/${replaceResult.output_filename}`}
                      alt="Result with new background"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Full result preview */}
              <div className="rounded-xl overflow-hidden border border-border shadow-md">
                <img
                  src={`/api/download/${replaceResult.output_filename}`}
                  alt="Final composited result"
                  className="w-full object-contain max-h-[480px]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-surface-raised rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
                    className="w-4 h-4 text-success shrink-0" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.844 4.574a.75.75 0 00-1.188-.918l-3.454 4.472-1.696-1.697a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.124-.096l4.024-5.07z" clipRule="evenodd" />
                  </svg>
                  Background replaced
                  {replaceResult.image_meta && (
                    <span className="text-muted text-xs">
                      · {replaceResult.image_meta.width} × {replaceResult.image_meta.height}px
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={reset} className="btn-ghost text-sm">
                    Start over
                  </button>
                  <DownloadButton
                    downloadUrl={`/api/download/${replaceResult.output_filename}`}
                    filename={replaceResult.output_filename}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column — background picker + apply button ──────────── */}
        <aside
          className="w-full lg:w-80 shrink-0 flex flex-col gap-4 self-start"
          aria-label="Background options"
        >
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <BackgroundPicker
              settings={settings}
              onChange={updateSetting}
              onReset={resetSettings}
              disabled={busy || step2Done}
            />
          </div>

          {/* Apply button */}
          {!step2Done && (
            <button
              onClick={replaceBackground}
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
              aria-label="Apply selected background"
            >
              {isReplacing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Compositing…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                  </svg>
                  Apply Background
                </>
              )}
            </button>
          )}

          {/* Re-pick hint after step 2 done */}
          {step2Done && (
            <button
              onClick={resetStep2}
              className="w-full btn-ghost text-sm justify-center"
            >
              Try a different background
            </button>
          )}

          {/* Tip: image mode needs a file */}
          {(settings.bgType === 'image' || settings.bgType === 'library') && !settings.bgFile && step1Done && !step2Done && (
            <p className="text-xs text-warning text-center animate-fade-up" role="status">
              {settings.bgType === 'library'
                ? 'Select a background from the library above to enable Apply.'
                : 'Upload a background image above to enable Apply.'}
            </p>
          )}

          {/* Tip: step 1 not done yet */}
          {!step1Done && (
            <p className="text-xs text-muted text-center">
              Upload your photo first, then pick a background.
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}
