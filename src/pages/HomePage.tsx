import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import UploadZone from '../components/UploadZone'
import ImageCanvas from '../components/ImageCanvas'
import DownloadButton from '../components/DownloadButton'
import DownloadSvgButton from '../components/DownloadSvgButton'
import QualityToggle from '../components/QualityToggle'
import BackgroundPicker from '../components/BackgroundPicker'
import SendToMenu from '../components/SendToMenu'
import CircularProgress from '../components/CircularProgress'
import InteractiveDemo from '../components/InteractiveDemo'
import AdvancedEditorModal from '../components/AdvancedEditorModal'
import Tooltip from '../components/Tooltip'
import { useUpload } from '../hooks/useUpload'
import { useActiveImage } from '../contexts/ActiveImageContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { extractImagePalette, ExtractedPalette } from '../services/colorExtractor'
import type { BgSettings } from '../hooks/useReplaceBg'

const FEATURE_CHIPS = [
  { label: 'JPEG, PNG, WebP', icon: '🖼️' },
  { label: 'Lossless Alpha Mask', icon: '⚡' },
  { label: 'Sub-pixel Hair Matting', icon: '✨' },
  { label: 'Manual Touch-up Canvas', icon: '🎨' },
  { label: 'Client Image Compression', icon: '🚀' },
  { label: 'Offline / PWA Ready', icon: '🌐' },
]

const STATS_DATA = [
  { label: 'Edge Accuracy', value: '99.4%', change: '+0.8% with BiRefNet' },
  { label: 'Avg Processing', value: '1.2s', change: 'GPU accelerated' },
  { label: 'Max Resolution', value: '4K Ultra', change: 'Full detail output' },
]

const FAST_STEPS = [
  { text: 'Uploading image…', sub: 'Analyzing image payload' },
  { text: 'Detecting contours…', sub: 'ISNet fast edge isolation' },
  { text: 'Generating alpha matte…', sub: 'Sub-pixel transparency map' },
  { text: 'Finalizing PNG…', sub: 'Ready for instant download' },
]
const STANDARD_STEPS = [
  { text: 'Uploading image…', sub: 'Sending to server' },
  { text: 'Human portrait segmentation…', sub: 'U²-Net deep portrait pass' },
  { text: 'Skin & hair boundary matting…', sub: 'Refining complex foreground borders' },
  { text: 'Almost done…', sub: 'Generating crisp transparent PNG' },
]
const QUALITY_STEPS = [
  { text: 'Uploading image…', sub: 'High-res pipeline stream' },
  { text: 'Deep feature extraction…', sub: 'BiRefNet multi-scale pass 1/2' },
  { text: 'Fine-strand hair & fur matting…', sub: 'BiRefNet sub-pixel pass 2/2' },
  { text: 'Smoothing & alpha blending…', sub: 'High precision transparency rendering' },
  { text: 'Exporting transparent PNG…', sub: 'Full resolution lossless output' },
]

const STEP_INTERVAL = 2200

export default function HomePage() {
  const { status, result, originalUrl, error, quality, setQuality, upload, reset } = useUpload()
  const { activeFile } = useActiveImage()
  const { addItemToProject } = useWorkspace()

  // Background replacement state
  const [showReplaceBg, setShowReplaceBg] = useState(false)
  const [replaceStatus, setReplaceStatus] = useState<'idle' | 'replacing' | 'done' | 'error'>('idle')
  const [replaceResult, setReplaceResult] = useState<any>(null)
  const [replaceError, setReplaceError] = useState<string | null>(null)

  // Manual canvas touch-up editor modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [refinedResultUrl, setRefinedResultUrl] = useState<string | null>(null)

  // Dynamic ambient glow palette
  const [palette, setPalette] = useState<ExtractedPalette | null>(null)

  // Background settings
  const [bgSettings, setBgSettings] = useState<BgSettings>({
    bgType: 'solid',
    solidColor: '#ffffff',
    gradientStart: '#e8336d',
    gradientEnd: '#2fbfb0',
    gradientDir: 'vertical',
    bgFile: null,
    bgFit: 'cover',
    libraryUrl: null,
  })

  const updateBgSetting = <K extends keyof BgSettings>(key: K, value: BgSettings[K]) => {
    setBgSettings(prev => ({ ...prev, [key]: value }))
  }

  const resetBgSettings = () => {
    setBgSettings({
      bgType: 'solid',
      solidColor: '#ffffff',
      gradientStart: '#e8336d',
      gradientEnd: '#2fbfb0',
      gradientDir: 'vertical',
      bgFile: null,
      bgFit: 'cover',
      libraryUrl: null,
    })
  }

  const isReplacing = replaceStatus === 'replacing'
  const replaceDone = replaceStatus === 'done' && replaceResult !== null

  // Extract dynamic colors when original image is loaded
  useEffect(() => {
    if (originalUrl) {
      extractImagePalette(originalUrl).then((p) => {
        setPalette(p)
      })
    } else {
      setPalette(null)
    }
  }, [originalUrl])

  // Replace background API call
  const handleReplaceBackground = async () => {
    if (!result) return

    setReplaceStatus('replacing')
    setReplaceResult(null)
    setReplaceError(null)

    const formData = new FormData()
    formData.append('fg_filename', result.output_filename)
    formData.append('bg_type', bgSettings.bgType === 'library' ? 'image' : bgSettings.bgType)
    formData.append('solid_color', bgSettings.solidColor)
    formData.append('gradient_start', bgSettings.gradientStart)
    formData.append('gradient_end', bgSettings.gradientEnd)
    formData.append('gradient_dir', bgSettings.gradientDir)
    formData.append('bg_fit', bgSettings.bgFit)

    if ((bgSettings.bgType === 'image' || bgSettings.bgType === 'library') && bgSettings.bgFile) {
      formData.append('bg_file', bgSettings.bgFile)
    }

    try {
      const res = await axios.post('/api/replace-background', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setReplaceResult(res.data)
      setReplaceStatus('done')

      // Add to workspace project
      addItemToProject({
        name: `Replaced BG - ${result.output_filename}`,
        originalUrl: originalUrl || undefined,
        outputUrl: `/api/download/${res.data.output_filename}`,
        outputFilename: res.data.output_filename,
        operationType: 'replace_bg',
      })
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Background replacement failed. Please try again.'
      setReplaceError(msg)
      setReplaceStatus('error')
    }
  }

  // Auto-trigger when redirected with active image — runs once on mount only
  const didAutoUploadRef = useRef(false)
  useEffect(() => {
    if (!didAutoUploadRef.current && activeFile && status === 'idle') {
      didAutoUploadRef.current = true
      upload(activeFile)
    }
  }, [activeFile, status, upload])

  // Auto add to workspace project when upload completes
  useEffect(() => {
    if (status === 'success' && result) {
      addItemToProject({
        name: `Transparent Cutout - ${result.output_filename}`,
        originalUrl: originalUrl || undefined,
        outputUrl: `/api/download/${result.output_filename}`,
        outputFilename: result.output_filename,
        operationType: 'remove_bg',
      })
    }
  }, [status, result, addItemToProject, originalUrl])

  // Processing step timer
  const steps = quality === 'quality' ? QUALITY_STEPS : quality === 'standard' ? STANDARD_STEPS : FAST_STEPS
  const [stepIdx, setStepIdx] = useState(0)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status === 'uploading') {
      setStepIdx(0)
      stepTimer.current = setInterval(() => {
        setStepIdx((prev) => Math.min(prev + 1, steps.length - 1))
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
  const isDone = status === 'success' && result !== null && originalUrl !== null
  const progressPercent = Math.min(95, Math.round(((stepIdx + 1) / steps.length) * 100))

  return (
    <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-10">
      {/* Dynamic Ambient Background Glow */}
      {palette && (
        <div
          className="ambient-glow-bg top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px]"
          style={{ background: palette.gradientCss }}
          aria-hidden="true"
        />
      )}

      {/* Hero Section */}
      <div className="text-center flex flex-col items-center gap-3 relative z-10">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-magenta/30 bg-magenta/10 text-xs font-semibold text-magenta shadow-sm">
          <span className="w-2 h-2 rounded-full bg-magenta animate-pulse" aria-hidden="true" />
          AI-Powered Neural Segmentation
        </span>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-primary leading-tight tracking-tight">
          Remove Backgrounds <span className="text-gradient-brand">Instantly</span>
        </h1>

        <p className="text-secondary text-sm sm:text-base max-w-xl leading-relaxed">
          Drop any photo &mdash; our AI isolates subjects, refines fine hair and fur edges, and outputs crisp transparent PNGs with full sub-pixel precision.
        </p>

        {/* Quick Stats Banner */}
        {!isDone && !isUploading && (
          <div className="grid grid-cols-3 gap-3 w-full max-w-lg mt-2">
            {STATS_DATA.map((stat, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-surface/70 border border-border text-center shadow-xs">
                <span className="text-base font-bold font-mono text-primary block">{stat.value}</span>
                <span className="text-[11px] font-medium text-secondary">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Upload / Results Area */}
      <div className="w-full max-w-3xl mx-auto relative z-10">
        {!isDone ? (
          <div className="flex flex-col gap-6">
            <UploadZone onFile={upload} disabled={isUploading} />

            {/* Quality Model Selector */}
            {!isUploading && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">Select AI Model</span>
                <QualityToggle value={quality} onChange={setQuality} disabled={isUploading} />
              </div>
            )}

            {/* Processing Circular Progress */}
            {isUploading && (
              <div
                role="status"
                aria-live="polite"
                className="p-8 rounded-2xl bg-surface border border-border shadow-xl flex flex-col items-center gap-6 animate-fade-up glass-modal"
              >
                <CircularProgress
                  progress={progressPercent}
                  label={steps[stepIdx].text}
                  sublabel={steps[stepIdx].sub}
                />

                {/* Progress Steps Dots */}
                <div className="flex items-center gap-2">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === stepIdx
                          ? 'w-6 bg-magenta'
                          : i < stepIdx
                          ? 'w-2 bg-magenta/50'
                          : 'w-2 bg-border'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl bg-danger/10 border border-danger/40 p-4 animate-fade-up"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-danger shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-danger">Processing Error</p>
                  <p className="text-xs text-secondary mt-0.5">{error}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Result View */
          <div className="flex flex-col gap-6 animate-fade-up">
            <ImageCanvas
              originalUrl={originalUrl!}
              resultUrl={refinedResultUrl || `/api/download/${result!.output_filename}`}
            />

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-surface rounded-2xl border border-border shadow-md">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                <span className="text-xs font-semibold text-primary">Processed & Ready</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-raised border border-border text-muted uppercase">
                  {result?.quality || 'AI'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Tooltip content="Touch up edges with brush erase & restore">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(true)}
                    className="btn-secondary text-xs py-2 px-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192z" />
                    </svg>
                    Refine Edges
                  </button>
                </Tooltip>

                <button
                  type="button"
                  onClick={() => setShowReplaceBg(!showReplaceBg)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  {showReplaceBg ? 'Hide Replace BG' : 'Replace Background'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRefinedResultUrl(null)
                    reset()
                  }}
                  className="btn-ghost text-xs py-2 px-3"
                >
                  New Image
                </button>

                <SendToMenu excludeRoute="/" />

                <DownloadSvgButton
                  sourceUrl={refinedResultUrl || `/api/download/${result!.output_filename}`}
                  filename={result!.output_filename}
                />

                <DownloadButton
                  downloadUrl={refinedResultUrl || `/api/download/${result!.output_filename}`}
                  filename={result!.output_filename}
                />
              </div>
            </div>

            {/* Replace Background Section */}
            {showReplaceBg && (
              <div className="flex flex-col gap-4 animate-fade-up p-5 rounded-2xl bg-surface border border-border shadow-lg">
                <BackgroundPicker
                  settings={bgSettings}
                  onChange={updateBgSetting}
                  onReset={resetBgSettings}
                  disabled={isReplacing}
                />

                <button
                  type="button"
                  onClick={handleReplaceBackground}
                  disabled={isReplacing}
                  className="btn-primary w-full py-3 text-sm font-bold shadow-md"
                >
                  {isReplacing ? 'Applying background…' : 'Generate Replaced Background'}
                </button>

                {replaceError && (
                  <p role="alert" className="text-xs text-danger text-center font-medium animate-fade-up">
                    {replaceError}
                  </p>
                )}

                {replaceDone && replaceResult && (
                  <div className="flex flex-col gap-3 mt-4 animate-fade-up">
                    <ImageCanvas
                      originalUrl={originalUrl!}
                      resultUrl={`/api/download/${replaceResult.output_filename}`}
                    />
                    <div className="flex items-center justify-between p-3 bg-surface-raised rounded-xl border border-border">
                      <span className="text-xs font-semibold text-success flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-success"></span>
                        Background replaced successfully
                      </span>
                      <DownloadButton
                        downloadUrl={`/api/download/${replaceResult.output_filename}`}
                        filename={replaceResult.output_filename}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Before/After Demo Section */}
      {!isDone && (
        <section className="w-full mt-4">
          <InteractiveDemo />
        </section>
      )}

      {/* Feature Badges */}
      {!isDone && !isUploading && (
        <div className="flex flex-col items-center gap-3 pt-4 border-t border-border">
          <span className="text-[11px] font-bold text-muted uppercase tracking-widest">Enterprise AI Features</span>
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Features">
            {FEATURE_CHIPS.map(({ label, icon }) => (
              <li key={label} className="chip gap-1.5 shadow-xs">
                <span aria-hidden="true">{icon}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advanced Refinement Modal */}
      {isDone && (
        <AdvancedEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          originalImageUrl={originalUrl!}
          cutoutImageUrl={`/api/download/${result!.output_filename}`}
          onSaveRefined={(_blob, previewUrl) => {
            setRefinedResultUrl(previewUrl)
          }}
        />
      )}
    </main>
  )
}

