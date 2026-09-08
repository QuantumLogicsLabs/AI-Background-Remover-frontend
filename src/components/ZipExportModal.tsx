import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { ZipFormat } from '../hooks/useBatch'
import { useBrandKit } from '../contexts/BrandKitContext'

interface FormatOption {
  id:          ZipFormat
  label:       string
  ext:         string
  icon:        string
  description: string
  lossless:    boolean
}

export interface ZipExportModalProps {
  isOpen:        boolean
  onClose:       () => void
  fileCount:     number
  isZipping:     boolean
  zipError:      string | null
  onDownload:    (format: ZipFormat, quality: number, nameTemplate: string, bgColor: string) => void
}

const FORMATS: FormatOption[] = [
  { id: 'png',  label: 'PNG',  ext: '.png',  icon: 'dY-,?', description: 'Lossless & keeps transparency', lossless: true  },
  { id: 'jpeg', label: 'JPEG', ext: '.jpg',  icon: 'dY"', description: 'Smaller & white background',    lossless: false },
  { id: 'webp', label: 'WebP', ext: '.webp', icon: 's', description: 'Best compression & modern',      lossless: false },
]

const DEFAULT_QUALITY = 90

export default function ZipExportModal({
  isOpen,
  onClose,
  fileCount,
  isZipping,
  zipError,
  onDownload,
}: ZipExportModalProps) {
  const { brandKit } = useBrandKit()
  const [format,  setFormat]  = useState<ZipFormat>(brandKit?.defaultExportFormat || 'png')
  const [quality, setQuality] = useState(DEFAULT_QUALITY)
  const [nameTemplate, setNameTemplate] = useState('{original_name}_processed')
  const [bgColor, setBgColor] = useState('transparent')

  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      setFormat(brandKit?.defaultExportFormat || 'png')
      setQuality(DEFAULT_QUALITY)
      setNameTemplate('{original_name}_processed')
      setBgColor('transparent')
      setTimeout(() => closeRef.current?.focus(), 50)
    }
  }, [isOpen, brandKit])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isZipping) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, isZipping])

  const currentFmt = FORMATS.find(f => f.id === format)!
  const isLossless = currentFmt.lossless

  const handleDownload = useCallback(() => {
    onDownload(format, quality, nameTemplate, bgColor)
  }, [format, quality, nameTemplate, bgColor, onDownload])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !isZipping) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="zip-export-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-[800px] bg-surface rounded-2xl shadow-2xl flex flex-col border border-border overflow-hidden animate-zoom-in"
      >
        <div className="px-6 py-5 flex items-center justify-between border-b border-border bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center text-teal shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.15l.3-.3a2.121 2.121 0 013 3l-.3.3m-4.06 7.15l-.3.3a2.121 2.121 0 01-3-3l.3-.3" />
              </svg>
            </div>
            <div>
              <h2 id="zip-export-title" className="text-xl font-bold text-primary tracking-tight">Export Batch ZIP</h2>
              <p className="text-sm text-secondary">Configure bulk settings for {fileCount} images</p>
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            disabled={isZipping}
            className="p-2 rounded-full text-muted hover:text-primary hover:bg-surface-elevated transition-colors disabled:opacity-50"
            aria-label="Cancel export"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="px-6 py-5 flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-3">Target Format</p>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map(fmt => {
                  const active = format === fmt.id
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id)}
                      disabled={isZipping}
                      className={`
                        flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all
                        ${active
                          ? 'border-teal bg-teal/10 text-teal shadow-sm'
                          : 'border-border bg-surface hover:border-teal/50 hover:bg-surface-raised text-secondary'
                        }
                        disabled:opacity-60 disabled:cursor-not-allowed
                      `}
                    >
                      <span className="text-xl leading-none" aria-hidden="true">{fmt.icon}</span>
                      <span className="text-sm font-bold">{fmt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-3">Bulk Background Replacement</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setBgColor('transparent')}
                  disabled={isZipping}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${bgColor === 'transparent' ? 'border-teal bg-teal/10 text-teal' : 'border-border hover:bg-surface-raised text-secondary'}`}
                >
                  Transparent
                </button>
                {brandKit?.colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setBgColor(color)}
                    disabled={isZipping}
                    className={`w-8 h-8 rounded-lg border-2 transition-transform ${bgColor === color ? 'border-teal scale-110 shadow-sm' : 'border-transparent hover:scale-105 shadow-sm'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-3">File Naming Template</p>
              <input
                type="text"
                value={nameTemplate}
                onChange={e => setNameTemplate(e.target.value)}
                disabled={isZipping}
                placeholder="{original_name}_processed"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-teal"
              />
              <p className="text-[10px] text-muted mt-1.5">Use <code>{'{original_name}'}</code> to keep original filenames.</p>
            </div>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-semibold uppercase tracking-widest ${isLossless ? 'text-muted' : 'text-secondary'}`}>
                  Quality
                </p>
                {isLossless ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-raised border border-border text-[11px] text-muted font-medium">Lossless</span>
                ) : (
                  <span className="font-mono text-2xl font-bold text-primary tabular-nums leading-none">
                    {quality}<span className="text-sm font-medium text-muted">%</span>
                  </span>
                )}
              </div>
              <input
                type="range"
                min={1} max={100} step={1}
                value={quality}
                onChange={e => setQuality(Number(e.target.value))}
                disabled={isLossless || isZipping}
                className={`w-full ${isLossless || isZipping ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
              />
            </div>

            <div className="flex items-center gap-2.5 rounded-lg bg-teal/5 border border-teal/20 px-3 py-3 mt-auto">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-teal shrink-0">
                <path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0012.5 4H11V3.5A1.5 1.5 0 009.5 2h-6zm0 1.5h6v1H12a.5.5 0 01.5.5v.5h-9v-2z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-[10px] text-teal/70 font-medium uppercase tracking-wide">ZIP contents</p>
                <p className="text-sm font-semibold text-primary">
                  {fileCount} files {format.toUpperCase()} {!isLossless && `@ ${quality}%`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {zipError && (
          <div role="alert" className="mx-6 mb-4 flex items-start gap-2.5 rounded-lg border border-danger/40 bg-danger/5 px-4 py-3">
            <p className="text-sm text-danger">{zipError}</p>
          </div>
        )}

        <div className="px-6 py-4 border-t border-border bg-surface-raised flex items-center justify-between gap-4">
          <p className="text-xs text-muted truncate min-w-0">
            Preview: <span className="font-mono font-medium text-secondary">{nameTemplate.replace('{original_name}', 'photo1')}{currentFmt.ext}</span>
          </p>
          <button
            onClick={handleDownload}
            disabled={isZipping}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-teal hover:bg-teal-hover shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isZipping ? 'Building ZIP...' : 'Download ZIP'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
