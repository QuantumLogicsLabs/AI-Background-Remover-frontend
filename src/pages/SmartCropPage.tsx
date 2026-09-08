import { useState, useEffect } from 'react'
import UploadZone from '../components/UploadZone'
import DownloadButton from '../components/DownloadButton'
import SendToMenu from '../components/SendToMenu'
import ManualCrop from '../components/ManualCrop'
import { useActiveImage } from '../contexts/ActiveImageContext'
import { useStudioOutput } from '../hooks/useStudioOutput'

const FEATURE_CHIPS = [
  { label: 'Manual crop like WhatsApp', icon: '✂️' },
  { label: 'Aspect ratio lock',       icon: '⬜' },
  { label: 'Rule of thirds grid',     icon: '📐' },
  { label: 'Transparent PNG output',  icon: '✨' },
  { label: 'E-commerce ready',        icon: '🛍️' },
]

export default function SmartCropPage() {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null)
  const [hasFile, setHasFile] = useState(false)
  const { activeFile, activePreviewUrl, setActiveImage } = useActiveImage()
  const { registerOutput } = useStudioOutput()

  // Handle file upload
  const handleUpload = (file: File) => {
    const url = URL.createObjectURL(file)
    setActiveImage(file, url)
    setOriginalUrl(url)
    setCroppedUrl(null)
    setHasFile(true)
  }

  const handleCropComplete = (cropData: { x: number; y: number; width: number; height: number }) => {
    // Create cropped image using canvas
    if (!originalUrl) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = cropData.width
      canvas.height = cropData.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(
          img,
          cropData.x, cropData.y, cropData.width, cropData.height,
          0, 0, cropData.width, cropData.height
        )
        const croppedDataUrl = canvas.toDataURL('image/png')
        setCroppedUrl(croppedDataUrl)
        
        // Register output for SendToMenu
        registerOutput(croppedDataUrl, 'cropped_image.png')
      }
    }
    img.src = originalUrl
  }

  const reset = () => {
    setActiveImage(null, null)
    setOriginalUrl(null)
    setCroppedUrl(null)
    setHasFile(false)
  }

  // Handle "Send to" functionality
  useEffect(() => {
    if (activeFile && activePreviewUrl && !hasFile) {
      setActiveImage(activeFile, activePreviewUrl)
      setOriginalUrl(activePreviewUrl)
      setHasFile(true)
    }
  }, [activeFile, activePreviewUrl, hasFile, setActiveImage])

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="text-center flex flex-col items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-teal/30 bg-teal/8 text-xs font-medium text-teal">
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" aria-hidden="true" />
          Manual Cropping
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-primary leading-tight tracking-tight">
          Crop to{' '}
          <span className="text-gradient-brand">Your Style</span>
        </h1>
        <p className="text-secondary text-sm max-w-md leading-relaxed">
          Drag the corners and edges to crop exactly how you want, just like in WhatsApp and other apps.
        </p>
      </div>

      {/* ── Single column layout ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        {/* ── Upload / result section ─────────────────────────────────────── */}
        <div className="flex flex-col gap-3">

          {/* Upload zone — only when no file yet */}
          {!hasFile && (
            <UploadZone onFile={handleUpload} disabled={false} />
          )}

          {/* Manual crop interface */}
          {hasFile && originalUrl && !croppedUrl && (
            <div className="card p-6 flex flex-col items-center gap-4 text-center max-w-2xl mx-auto animate-fade-up">
              <ManualCrop
                imageUrl={originalUrl}
                aspectRatio="free"
                onCropComplete={handleCropComplete}
                onCancel={reset}
              />
            </div>
          )}

          {/* Cropped result */}
          {croppedUrl && (
            <div className="flex flex-col gap-3 animate-fade-up">
              {/* Before/After comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted text-center font-medium">Original</p>
                  <div className="rounded-xl overflow-hidden border border-border bg-checker aspect-square">
                    {originalUrl && <img src={originalUrl} alt="Original" className="w-full h-full object-contain" />}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted text-center font-medium">Cropped</p>
                  <div className="rounded-xl overflow-hidden border border-border bg-checker aspect-square">
                    <img src={croppedUrl} alt="Cropped result" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 flex-wrap p-3 bg-surface-raised rounded-lg border border-border">
                <div className="flex items-center gap-1.5 text-xs text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.844 4.574a.75.75 0 00-1.188-.918l-3.454 4.472-1.696-1.697a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.124-.096l4.024-5.07z" clipRule="evenodd" />
                  </svg>
                  Image cropped successfully
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => setCroppedUrl(null)} className="btn-ghost text-xs">
                    Recrop
                  </button>
                  <button onClick={reset} className="btn-ghost text-xs">
                    New image
                  </button>
                  <SendToMenu excludeRoute="/smart-crop" />
                  {croppedUrl && <DownloadButton downloadUrl={croppedUrl} filename="cropped_image.png" />}
                </div>
              </div>
            </div>
          )}

          {/* Feature chips — shown when no file */}
          {!hasFile && (
            <div className="flex flex-col items-center gap-2 pt-1">
              <p className="text-[10px] text-muted uppercase tracking-widest font-medium">Features</p>
              <ul className="flex flex-wrap justify-center gap-1.5" aria-label="Manual crop features">
                {FEATURE_CHIPS.map(({ label, icon }) => (
                  <li key={label} className="chip gap-1 text-[10px]">
                    <span aria-hidden="true">{icon}</span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Tip for manual crop */}
        {hasFile && !croppedUrl && (
          <div className="flex items-start gap-2.5 rounded-lg bg-magenta/5 border border-magenta/20 px-3.5 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-magenta shrink-0 mt-0.5" aria-hidden="true">
              <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-muted leading-relaxed">
              Drag the corners and edges to adjust the crop area. The grid lines help you compose using the rule of thirds for better photo composition.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
