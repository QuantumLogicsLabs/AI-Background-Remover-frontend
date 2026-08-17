import { useCallback } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import BatchFileList from '../components/BatchFileList'
import QualityToggle from '../components/QualityToggle'
import { useBatch } from '../hooks/useBatch'

const MAX_FILES   = 20
const MAX_SIZE_MB = 10
const ACCEPTED    = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/webp': ['.webp'],
}

// ── Multi-file drop zone ───────────────────────────────────────────────────

interface BatchDropZoneProps {
  onFiles:  (files: File[]) => void
  disabled: boolean
}

function BatchDropZone({ onFiles, disabled }: BatchDropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[], _rejected: FileRejection[]) => {
      if (accepted.length > 0) onFiles(accepted)
    },
    [onFiles],
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept:   ACCEPTED,
    maxSize:  MAX_SIZE_MB * 1024 * 1024,
    maxFiles: MAX_FILES,
    disabled,
    multiple: true,
  })

  const hasRejections = fileRejections.length > 0

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative flex flex-col items-center justify-center gap-5
          min-h-[240px] rounded-xl border-2 border-dashed cursor-pointer
          select-none overflow-hidden transition-all duration-200
          ${isDragActive
            ? 'border-magenta bg-magenta/5 scale-[1.01]'
            : 'border-border hover:border-magenta/50 bg-surface hover:bg-surface-raised'
          }
          ${disabled ? 'opacity-40 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(var(--border-strong) 1px,transparent 1px),linear-gradient(90deg,var(--border-strong) 1px,transparent 1px)',
            backgroundSize: '32px 32px',
          }} aria-hidden="true" />

        {/* Corner accents */}
        {['top-0 left-0','top-0 right-0','bottom-0 left-0','bottom-0 right-0'].map((pos, i) => (
          <span key={i} className={`absolute ${pos} w-4 h-4 border-magenta pointer-events-none opacity-50
            ${i===0?'border-t-2 border-l-2 rounded-tl-lg':''}
            ${i===1?'border-t-2 border-r-2 rounded-tr-lg':''}
            ${i===2?'border-b-2 border-l-2 rounded-bl-lg':''}
            ${i===3?'border-b-2 border-r-2 rounded-br-lg':''}`} aria-hidden="true" />
        ))}

        {/* Icon */}
        <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all
          ${isDragActive ? 'bg-magenta/15 border-2 border-magenta/30' : 'bg-checker border border-border'}`}>
          {isDragActive ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-magenta animate-bounce" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          ) : (
            /* Stack of images icon */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-muted" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
            </svg>
          )}
        </div>

        <div className="text-center px-8 z-10">
          <p className="font-display font-semibold text-lg text-primary">
            {isDragActive ? 'Release to queue' : 'Drop multiple images here'}
          </p>
          <p className="text-sm text-muted mt-1.5">
            or click to browse &mdash; JPEG, PNG, WebP &bull; up to {MAX_FILES} files &bull; {MAX_SIZE_MB} MB each
          </p>
        </div>
      </div>

      {hasRejections && (
        <p role="alert" className="mt-2 text-sm text-danger text-center">
          Some files were rejected — check type (JPEG/PNG/WebP) and size (≤{MAX_SIZE_MB} MB).
        </p>
      )}
    </div>
  )
}

// ── Overall progress bar ───────────────────────────────────────────────────

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="flex flex-col gap-1.5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-secondary font-medium">{label}</span>
        <span className="text-muted font-mono">{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-surface-raised border border-border overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-magenta to-teal transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function BatchPage() {
  const {
    jobStatus, job, uploadError,
    progressPct, quality, setQuality, startBatch, downloadZip, reset,
  } = useBatch()

  const isIdle      = jobStatus === 'idle'
  const isUploading = jobStatus === 'uploading'
  const isActive    = jobStatus === 'pending' || jobStatus === 'running'
  const isDone      = jobStatus === 'done'
  const isError     = jobStatus === 'error'
  const busy        = isUploading || isActive

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-10">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="text-center flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-magenta/30 bg-magenta/8 text-xs font-medium text-magenta">
          <span className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse" aria-hidden="true" />
          Batch Processing
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary leading-tight tracking-tight">
          Remove Backgrounds{' '}
          <span className="text-gradient-brand">in Bulk</span>
        </h1>
        <p className="text-secondary text-base max-w-md leading-relaxed">
          Upload up to {MAX_FILES} images at once. We process them in parallel and
          let you download all results as a single ZIP.
        </p>
      </div>

      {/* ── Upload zone — only when idle or error ────────────────────────── */}
      {(isIdle || isError) && (
        <div className="flex flex-col gap-4 animate-fade-up">
          {/* Quality selector — shown before starting a job */}
          <div className="flex justify-center">
            <QualityToggle value={quality} onChange={setQuality} disabled={busy} />
          </div>
          <BatchDropZone onFiles={startBatch} disabled={busy} />
          {isError && uploadError && (
            <div role="alert" className="flex items-start gap-3 rounded-lg bg-surface border border-danger/40 px-4 py-3.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-danger">Upload failed</p>
                <p className="text-xs text-secondary mt-0.5">{uploadError}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Uploading spinner ─────────────────────────────────────────────── */}
      {isUploading && (
        <div role="status" aria-live="polite"
          className="flex flex-col items-center gap-3 py-8 animate-fade-up">
          <svg className="w-10 h-10 text-magenta animate-spin" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 40 40" aria-hidden="true">
            <circle className="opacity-20" cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M36 20a16 16 0 00-16-16v3a13 13 0 0113 13h3z" />
          </svg>
          <p className="text-primary font-medium">Uploading files…</p>
        </div>
      )}

      {/* ── Job in progress / done ────────────────────────────────────────── */}
      {(isActive || isDone) && job && (
        <div className="flex flex-col gap-5 animate-fade-up">

          {/* Progress bar */}
          <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
            <ProgressBar
              pct={progressPct}
              label={
                isDone
                  ? `Complete — ${job.completed} done, ${job.failed} failed`
                  : `Processing ${job.completed + job.failed} of ${job.total}…`
              }
            />

            {/* Summary chips */}
            <div className="flex flex-wrap gap-2">
              <span className="chip gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                {job.total} total
              </span>
              {job.completed > 0 && (
                <span className="chip gap-1.5 text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
                  {job.completed} done
                </span>
              )}
              {job.failed > 0 && (
                <span className="chip gap-1.5 text-danger">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger" aria-hidden="true" />
                  {job.failed} failed
                </span>
              )}
              <span className={`chip gap-1.5 ${isActive ? 'text-magenta' : 'text-success'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-magenta animate-pulse' : 'bg-success'}`} aria-hidden="true" />
                {isDone ? 'Finished' : job.status === 'pending' ? 'Pending' : 'Running'}
              </span>
              {/* Quality badge */}
              <span className="chip gap-1.5 text-secondary">
                {job.quality === 'quality'
                  ? '✨ BiRefNet'
                  : job.quality === 'standard'
                  ? '👤 Portrait'
                  : '⚡ Fast'}
              </span>
            </div>

            {/* Action buttons */}
            {isDone && (
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <button
                  onClick={downloadZip}
                  disabled={job.completed === 0}
                  className={`
                    inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-medium text-sm
                    transition-all duration-200 active:scale-95
                    ${job.completed > 0
                      ? 'bg-teal hover:bg-teal-hover text-white shadow-sm hover:shadow-md'
                      : 'bg-surface-raised text-muted border border-border cursor-not-allowed'
                    }
                  `}
                  aria-label="Download all results as ZIP"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                    className="w-4 h-4" aria-hidden="true">
                    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                  </svg>
                  Download All ({job.completed}) as ZIP
                </button>
                <button onClick={reset} className="btn-ghost text-sm">
                  Process more
                </button>
              </div>
            )}
          </div>

          {/* Per-file list */}
          <BatchFileList files={job.files} />
        </div>
      )}
    </main>
  )
}
