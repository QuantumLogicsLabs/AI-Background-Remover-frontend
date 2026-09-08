import { useCallback, useState } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import BatchFileList from '../components/BatchFileList'
import QualityToggle from '../components/QualityToggle'
import ZipExportModal from '../components/ZipExportModal'
import CircularProgress from '../components/CircularProgress'
import { useBatch, ZipFormat } from '../hooks/useBatch'

const MAX_FILES = 100
const MAX_SIZE_MB = 15
const ACCEPTED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

interface BatchDropZoneProps {
  onFiles: (files: File[]) => void
  disabled: boolean
}

function BatchDropZone({ onFiles, disabled }: BatchDropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[], _rejected: FileRejection[]) => {
      if (accepted.length > 0) onFiles(accepted)
    },
    [onFiles]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
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
          min-h-[260px] rounded-2xl border-2 border-dashed cursor-pointer
          select-none overflow-hidden transition-all duration-200
          ${isDragActive
            ? 'border-magenta bg-magenta/10 scale-[1.01] shadow-glow'
            : 'border-border hover:border-magenta/50 bg-surface hover:bg-surface-raised'
          }
          ${disabled ? 'opacity-40 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />

        {/* Ambient Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--text-primary) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        {/* Corner Accents */}
        {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
          <span
            key={i}
            className={`absolute ${pos} w-4 h-4 border-magenta pointer-events-none opacity-50
              ${i === 0 ? 'border-t-2 border-l-2 rounded-tl-md' : ''}
              ${i === 1 ? 'border-t-2 border-r-2 rounded-tr-md' : ''}
              ${i === 2 ? 'border-b-2 border-l-2 rounded-bl-md' : ''}
              ${i === 3 ? 'border-b-2 border-r-2 rounded-br-md' : ''}
            `}
            aria-hidden="true"
          />
        ))}

        {/* Icon */}
        <div
          className={`relative w-18 h-18 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
            isDragActive ? 'bg-magenta text-white scale-110' : 'bg-surface-raised border border-border text-magenta'
          }`}
        >
          {isDragActive ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-9 h-9 animate-bounce">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-9 h-9">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
            </svg>
          )}
        </div>

        <div className="text-center px-6 z-10">
          <p className="font-display font-bold text-lg text-primary">
            {isDragActive ? 'Release to queue batch' : 'Drop multiple photos here'}
          </p>
          <p className="text-xs text-muted mt-1.5">
            or click to browse &bull; JPEG, PNG, WebP &bull; up to {MAX_FILES} photos &bull; {MAX_SIZE_MB} MB each
          </p>
        </div>
      </div>

      {hasRejections && (
        <p role="alert" className="mt-2 text-xs text-danger text-center font-medium">
          Some files were rejected &mdash; please check supported format (JPEG, PNG, WebP) and size limits.
        </p>
      )}
    </div>
  )
}

export default function BatchPage() {
  const {
    jobStatus,
    job,
    uploadError,
    progressPct,
    quality,
    setQuality,
    startBatch,
    downloadZip,
    isZipping,
    zipError,
    reset,
    thumbnails,
  } = useBatch()

  const [zipModalOpen, setZipModalOpen] = useState(false)

  const handleDownloadZip = useCallback(
    (format: ZipFormat, q: number, nameTemplate: string, bgColor: string) => {
      downloadZip(format, q, nameTemplate, bgColor)
    },
    [downloadZip]
  )

  const isIdle = jobStatus === 'idle'
  const isUploading = jobStatus === 'uploading'
  const isActive = jobStatus === 'pending' || jobStatus === 'running'
  const isDone = jobStatus === 'done'
  const isError = jobStatus === 'error'
  const busy = isUploading || isActive

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Hero Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-magenta/30 bg-magenta/10 text-xs font-semibold text-magenta shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-magenta animate-pulse" aria-hidden="true" />
          Bulk Background Eraser
        </span>
        <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-primary leading-tight tracking-tight">
          Batch Process <span className="text-gradient-brand">Images</span>
        </h1>
        <p className="text-secondary text-xs sm:text-sm max-w-lg leading-relaxed">
          Queue up to {MAX_FILES} images simultaneously. High-throughput neural models run in parallel with instant ZIP archive export.
        </p>
      </div>

      {/* Upload area */}
      {(isIdle || isError) && (
        <div className="flex flex-col gap-5 animate-fade-up max-w-2xl mx-auto w-full">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">AI Quality Mode</span>
            <QualityToggle value={quality} onChange={setQuality} disabled={busy} />
          </div>
          <BatchDropZone onFiles={startBatch} disabled={busy} />
          {isError && uploadError && (
            <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger/10 border border-danger/40 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-danger shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-bold text-danger">Upload failed</p>
                <p className="text-xs text-secondary mt-0.5">{uploadError}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Uploading progress indicator */}
      {isUploading && (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-10 animate-fade-up">
          <CircularProgress progress={50} label="Uploading batch to server…" sublabel="Initializing parallel workers" />
        </div>
      )}

      {/* Active or Completed Batch */}
      {(isActive || isDone) && job && (
        <div className="flex flex-col gap-6 animate-fade-up">
          {/* Progress Overview Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-md flex flex-col md:flex-row items-center gap-6 glass-modal">
            <CircularProgress
              progress={progressPct}
              status={isDone ? (job.failed > 0 && job.completed === 0 ? 'error' : 'done') : 'processing'}
            />

            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-primary">
                    {isDone ? 'Batch Processing Complete' : 'Processing Batch Queue…'}
                  </h3>
                  <p className="text-xs text-muted">
                    {isDone
                      ? `${job.completed} succeeded, ${job.failed} failed out of ${job.total} total`
                      : `Processed ${job.completed + job.failed} of ${job.total} files`}
                  </p>
                </div>
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-surface-raised border border-border text-primary">
                  {job.quality?.toUpperCase() || 'AI'} MODE
                </span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="chip gap-1.5 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {job.total} total
                </span>
                {job.completed > 0 && (
                  <span className="chip gap-1.5 text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    {job.completed} done
                  </span>
                )}
                {job.failed > 0 && (
                  <span className="chip gap-1.5 text-danger">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                    {job.failed} failed
                  </span>
                )}
              </div>

              {/* Actions */}
              {isDone && (
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <button
                    id="batch-download-zip-button"
                    onClick={() => setZipModalOpen(true)}
                    disabled={job.completed === 0 || isZipping}
                    className="btn-primary text-xs py-2.5 px-4 shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                    </svg>
                    Download All ({job.completed}) ZIP
                  </button>

                  <button onClick={reset} disabled={isZipping} className="btn-ghost text-xs py-2 px-3.5">
                    Process Another Batch
                  </button>
                </div>
              )}

              {zipError && (
                <p role="alert" className="text-xs text-danger flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.75a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 6.5a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {zipError}
                </p>
              )}
            </div>
          </div>

          {/* Per File List */}
          <BatchFileList files={job.files} thumbnails={thumbnails} />
        </div>
      )}

      {/* Zip Export Modal */}
      {job && (
        <ZipExportModal
          isOpen={zipModalOpen}
          onClose={() => setZipModalOpen(false)}
          fileCount={job.completed}
          isZipping={isZipping}
          zipError={zipError}
          onDownload={handleDownloadZip}
        />
      )}
    </main>
  )
}
