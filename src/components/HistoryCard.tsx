import { useState } from 'react'
import type { HistoryItem, OperationType } from '../hooks/useHistory'
import { OPERATION_LABELS } from '../hooks/useHistory'
import ExportModal from './ExportModal'

interface HistoryCardProps {
  item: HistoryItem
  onDelete: (uploadId: string) => void
}

/** Tailwind colour classes per operation type */
const BADGE_STYLES: Record<OperationType, string> = {
  remove_bg:  'bg-teal/15 text-teal border-teal/30',
  enhance:    'bg-amber-400/15 text-amber-500 border-amber-400/30',
  replace_bg: 'bg-violet-500/15 text-violet-500 border-violet-500/30',
  smart_crop: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
}

export default function HistoryCard({ item, onDelete }: HistoryCardProps) {
  const downloadUrl = `/api/download/${item.output_filename}`
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exportOpen,    setExportOpen]    = useState(false)

  const formattedDate = item.created_at
    ? new Date(item.created_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Unknown date'

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(item.upload_id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const badgeClass = BADGE_STYLES[item.operation_type] ?? 'bg-border/20 text-secondary border-border'
  const badgeLabel = OPERATION_LABELS[item.operation_type] ?? item.operation_type

  return (
    <>
      <article className="
        group relative bg-surface border border-border rounded-xl overflow-hidden
        flex flex-col
        shadow-sm hover:shadow-md
        transition-all duration-200 hover:-translate-y-0.5
      ">
        {/* Preview */}
        <div className="relative bg-checker aspect-video flex items-center justify-center overflow-hidden">
          <img
            src={downloadUrl}
            alt={`Result for ${item.original_name}`}
            className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Operation type badge — top-left corner */}
          <span
            className={`
              absolute top-2 left-2
              inline-flex items-center px-2 py-0.5 rounded-full
              text-[10px] font-semibold tracking-wide
              border backdrop-blur-sm
              ${badgeClass}
            `}
            aria-label={`Operation: ${badgeLabel}`}
          >
            {badgeLabel}
          </span>

          {/* Hover overlay with quick export */}
          <div className="
            absolute inset-0 bg-black/50 backdrop-blur-[2px]
            flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          ">
            <button
              onClick={(e) => { e.stopPropagation(); setExportOpen(true) }}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-white/15 hover:bg-white/25 border border-white/30
                text-white text-xs font-medium backdrop-blur-sm
                transition-colors duration-150
                focus:outline-none
              "
              aria-label={`Export ${item.original_name}`}
              aria-haspopup="dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                <path d="M8.75 2.75a.75.75 0 00-1.5 0v5.69L5.03 6.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 8.44V2.75z"/>
                <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z"/>
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-2 flex-1">
          <p
            className="text-sm font-medium text-primary truncate leading-snug"
            title={item.original_name}
          >
            {item.original_name}
          </p>
          <p className="text-[11px] text-muted flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="currentColor" className="w-3 h-3 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M7 1a6 6 0 100 12A6 6 0 007 1zM6.25 4.75a.75.75 0 011.5 0v2.5l1.5 1.5a.75.75 0 01-1.06 1.06l-1.75-1.75a.75.75 0 01-.22-.53v-2.78z" clipRule="evenodd"/>
            </svg>
            {formattedDate}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-auto pt-1">
            {/* Export button — opens modal */}
            <button
              onClick={() => setExportOpen(true)}
              className="
                flex-1 inline-flex items-center justify-center gap-1.5
                px-3 py-1.5 rounded-md
                bg-teal hover:bg-teal-hover text-white text-xs font-medium
                transition-colors duration-150
                focus:outline-none focus:shadow-focus
                active:scale-95
              "
              aria-label={`Export ${item.original_name}`}
              aria-haspopup="dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="currentColor" className="w-3 h-3" aria-hidden="true">
                <path d="M7.75 2a.75.75 0 00-1.5 0v5.19L4.53 5.47a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 00-1.06-1.06L7.75 7.19V2z"/>
                <path d="M2.5 10a.75.75 0 00-1.5 0v1A1.5 1.5 0 002.5 12.5h9A1.5 1.5 0 0013 11v-1a.75.75 0 00-1.5 0v1H2.5v-1z"/>
              </svg>
              Export
            </button>
            <button
              onClick={handleDelete}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium
                transition-all duration-150
                focus:outline-none focus:shadow-focus
                ${confirmDelete
                  ? 'bg-danger text-white border-transparent'
                  : 'border border-border hover:border-danger/50 hover:text-danger text-secondary'
                }
              `}
              aria-label={confirmDelete ? `Confirm delete ${item.original_name}` : `Delete ${item.original_name}`}
            >
              {confirmDelete ? 'Confirm' : 'Delete'}
            </button>
          </div>
        </div>
      </article>

      {/* Export modal — shared for both hover and action bar triggers */}
      <ExportModal
        downloadUrl={downloadUrl}
        filename={item.output_filename}
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </>
  )
}
