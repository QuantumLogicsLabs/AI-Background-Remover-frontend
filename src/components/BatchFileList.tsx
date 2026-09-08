import { BatchFile, FileStatus } from '../hooks/useBatch'

interface BatchFileListProps {
  thumbnails?: Record<string, string>
  files: BatchFile[]
}

// ── Status icon ────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === 'done') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
        className="w-4 h-4 text-success shrink-0" aria-label="Done">
        <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.844 4.574a.75.75 0 00-1.188-.918l-3.454 4.472-1.696-1.697a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.124-.096l4.024-5.07z" clipRule="evenodd" />
      </svg>
    )
  }
  if (status === 'error') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
        className="w-4 h-4 text-danger shrink-0" aria-label="Error">
        <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM6.354 5.646a.5.5 0 10-.708.708L7.293 8l-1.647 1.646a.5.5 0 00.708.708L8 8.707l1.646 1.647a.5.5 0 00.708-.708L8.707 8l1.647-1.646a.5.5 0 00-.708-.708L8 7.293 6.354 5.646z" clipRule="evenodd" />
      </svg>
    )
  }
  if (status === 'processing') {
    return (
      <svg className="w-4 h-4 text-magenta shrink-0 animate-spin" xmlns="http://www.w3.org/2000/svg"
        fill="none" viewBox="0 0 16 16" aria-label="Processing">
        <circle className="opacity-20" cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
        <path className="opacity-80" fill="currentColor" d="M14 8a6 6 0 00-6-6V4a4 4 0 014 4h2z" />
      </svg>
    )
  }
  // queued
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
      className="w-4 h-4 text-muted shrink-0" aria-label="Queued">
      <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM4.75 8a.75.75 0 01.75-.75h3.69L7.22 5.28a.75.75 0 011.06-1.06l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.97-1.97H5.5A.75.75 0 014.75 8z" clipRule="evenodd" />
    </svg>
  )
}

// ── Status label ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<FileStatus, string> = {
  queued:     'Queued',
  processing: 'Processing…',
  done:       'Done',
  error:      'Failed',
}

const STATUS_COLORS: Record<FileStatus, string> = {
  queued:     'text-muted',
  processing: 'text-magenta',
  done:       'text-success',
  error:      'text-danger',
}

// ── File card ──────────────────────────────────────────────────────────────

function FileCard({ file, thumbnail }: { file: BatchFile; thumbnail?: string }) {
  return (
    <li className={`
      flex items-center gap-3 px-3.5 py-2.5 rounded-lg border transition-colors
      ${file.status === 'done'       ? 'border-success/30 bg-success/5'   : ''}
      ${file.status === 'error'      ? 'border-danger/30  bg-danger/5'    : ''}
      ${file.status === 'processing' ? 'border-magenta/30 bg-magenta/5'   : ''}
      ${file.status === 'queued'     ? 'border-border     bg-surface'      : ''}
    `}>
      <StatusIcon status={file.status} />

      {/* Thumbnail */}
      <div className="w-10 h-10 shrink-0 rounded bg-surface-raised border border-border overflow-hidden flex items-center justify-center">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      {/* Filename */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary truncate font-medium" title={file.original_name}>
          {file.original_name}
        </p>
        {file.error && (
          <p className="text-xs text-danger truncate mt-0.5">{file.error}</p>
        )}
      </div>

      {/* Status label */}
      <span className={`text-xs font-medium shrink-0 ${STATUS_COLORS[file.status]}`}>
        {STATUS_LABELS[file.status]}
      </span>

      {/* Individual download link */}
      {file.status === 'done' && file.download_url && (
        <a
          href={file.download_url}
          download={file.output_filename ?? undefined}
          className="shrink-0 p-1 rounded text-muted hover:text-teal transition-colors"
          aria-label={`Download ${file.original_name}`}
          title="Download"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M8.75 2.75a.75.75 0 00-1.5 0v5.69L5.03 6.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 8.44V2.75z" />
            <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z" />
          </svg>
        </a>
      )}
    </li>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function BatchFileList({ files, thumbnails = {} }: BatchFileListProps) {
  if (files.length === 0) return null

  return (
    <ul className="flex flex-col gap-2" aria-label="Batch file list" role="list">
      {files.map((file, i) => (
        <FileCard key={`${file.original_name}-${i}`} file={file} thumbnail={thumbnails[file.original_name]} />
      ))}
    </ul>
  )
}
