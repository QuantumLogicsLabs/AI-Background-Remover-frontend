import React, { useState, useRef, useEffect, useCallback } from 'react'
import UploadZone from '../components/UploadZone'
import DownloadButton from '../components/DownloadButton'
import SendToMenu from '../components/SendToMenu'
import CustomSlider from '../components/CustomSlider'
import RecolorCanvas, { type RecolorCanvasHandle } from '../components/RecolorCanvas'
import CanvasErrorBoundary from '../components/CanvasErrorBoundary'
import { useActiveImage } from '../contexts/ActiveImageContext'
import { useRecolor, COLOR_PRESETS } from '../hooks/useRecolor'

type Mode = 'recolor' | 'eraser'

function Spinner({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 py-10 animate-fade-up"
    >
      <div className="relative w-14 h-14">
        <svg
          className="absolute inset-0 w-14 h-14 animate-spin text-magenta"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 56 56"
          aria-hidden="true"
        >
          <circle className="opacity-15" cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-80" fill="currentColor" d="M52 28a24 24 0 00-24-24v4a20 20 0 0120 20h4z" />
        </svg>
        <svg
          className="absolute inset-0 w-14 h-14 animate-spin text-teal"
          style={{ animationDuration: '2s', animationDirection: 'reverse' }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 56 56"
          aria-hidden="true"
        >
          <circle className="opacity-10" cx="28" cy="28" r="18" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-60" fill="currentColor" d="M46 28a18 18 0 00-18-18v3a15 15 0 0115 15h3z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-primary font-medium">{label}</p>
        <p className="text-muted text-sm mt-0.5">Processing...</p>
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg bg-surface border border-danger/40 px-4 py-3.5 animate-fade-up"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5 text-danger shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-8.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75-1.5a1 1 0 110-2 1 1 0 010 2z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <p className="text-sm font-medium text-danger">Operation failed</p>
        <p className="text-xs text-secondary mt-0.5">{message}</p>
      </div>
    </div>
  )
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
  disabled: boolean
}

function SliderRow({ label, value, min, max, step, format, onChange, disabled }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary font-medium">{label}</span>
        <span className="text-xs text-muted font-mono tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={label}
      />
    </div>
  )
}

export default function RecolorAndEraserPage() {
  const { activeFile, activePreviewUrl, setActiveImage, setOutput } = useActiveImage()
  const [mode, setMode] = useState<Mode>('recolor')
  
  // Recolor state
  const recolorCanvasRef = useRef<RecolorCanvasHandle>(null)
  const {
    status: recolorStatus,
    result: recolorResult,
    originalUrl: recolorOriginalUrl,
    error: recolorError,
    hasFile: recolorHasFile,
    brush,
    updateBrush,
    settings,
    updateSetting,
    loadFile: recolorLoadFile,
    applyRecolor,
    reset: recolorReset,
    resetResult: recolorResetResult,
  } = useRecolor()
  
  // Magic Eraser state
  const [eraserOriginalUrl, setEraserOriginalUrl] = useState<string | null>(null)
  const [eraserResultUrl, setEraserResultUrl] = useState<string | null>(null)
  const [isEraserProcessing, setIsEraserProcessing] = useState(false)
  const [eraserError, setEraserError] = useState<string | null>(null)
  const [brushSize, setBrushSize] = useState<number>(30)
  
  const eraserCanvasRef = useRef<HTMLCanvasElement>(null)
  const eraserOriginalImgRef = useRef<HTMLImageElement | null>(null)
  const isDrawingRef = useRef<boolean>(false)
  const inpaintPointsRef = useRef<{ x: number; y: number; radius: number }[]>([])
  const inpaintOriginalBlobRef = useRef<Blob | null>(null)
  
  const isRecolorProcessing = recolorStatus === 'processing'
  const isRecolorDone = recolorStatus === 'done' && recolorResult !== null
  
  // Sync with global ActiveImage context
  useEffect(() => {
    if (activeFile && activePreviewUrl) {
      if (mode === 'eraser') {
        setEraserOriginalUrl(activePreviewUrl)
      } else if (!recolorHasFile) {
        recolorLoadFile(activeFile)
      }
    }
  }, [activeFile, activePreviewUrl, mode, recolorHasFile, recolorLoadFile])
  
  const handleUpload = (file: File) => {
    const url = URL.createObjectURL(file)
    setActiveImage(file, url)
    
    if (mode === 'eraser') {
      setEraserOriginalUrl(url)
      setEraserResultUrl(null)
      setEraserError(null)
    } else {
      recolorLoadFile(file)
    }
  }
  
  const reset = () => {
    setActiveImage(null, null)
    if (mode === 'eraser') {
      setEraserOriginalUrl(null)
      setEraserResultUrl(null)
      setEraserError(null)
    } else {
      recolorReset()
    }
  }
  
  // Eraser canvas setup
  useEffect(() => {
    if (mode !== 'eraser') return
    
    const sourceUrl = eraserResultUrl || eraserOriginalUrl
    if (!sourceUrl) return
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      eraserOriginalImgRef.current = img
      const canvas = eraserCanvasRef.current
      if (!canvas) return
      
      const MAX_WIDTH = 800
      const MAX_HEIGHT = 600
      let width = img.naturalWidth
      let height = img.naturalHeight
      
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }
      if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height)
        height = MAX_HEIGHT
      }
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
    }
    img.src = sourceUrl
  }, [eraserOriginalUrl, eraserResultUrl, mode])
  
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = eraserCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }
  
  const drawStroke = (x: number, y: number) => {
    const canvas = eraserCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(255, 0, 128, 0.5)'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    inpaintPointsRef.current.push({ x, y, radius: brushSize / 2 })
  }
  
  const handleEraserMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    inpaintPointsRef.current = []
    const canvas = eraserCanvasRef.current
    if (canvas) {
      canvas.toBlob((blob) => {
        inpaintOriginalBlobRef.current = blob
      }, 'image/png')
    }
    const coords = getCanvasCoords(e)
    drawStroke(coords.x, coords.y)
  }
  
  const handleEraserMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const coords = getCanvasCoords(e)
    drawStroke(coords.x, coords.y)
  }
  
  const handleEraserMouseUp = async () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    
    if (inpaintPointsRef.current.length === 0 || !inpaintOriginalBlobRef.current) return
    
    setIsEraserProcessing(true)
    setEraserError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', inpaintOriginalBlobRef.current, 'image.png')
      formData.append('mask_points', JSON.stringify(inpaintPointsRef.current))
      
      const token = localStorage.getItem('bgr_token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = 'Bearer ' + token
      }
      
      const res = await fetch('http://localhost:8000/api/inpaint', {
        method: 'POST',
        headers,
        body: formData,
      })
      
      if (!res.ok) throw new Error('Failed to remove object. Please try again.')
      const data = await res.json()
      
      const fullResultUrl = 'http://localhost:8000' + data.download_url
      setEraserResultUrl(fullResultUrl)
      
      setOutput(fullResultUrl, 'magic_eraser_result.png')
      
    } catch (err: any) {
      setEraserError(err.message || 'An error occurred during inpainting.')
      const img = eraserOriginalImgRef.current
      const canvas = eraserCanvasRef.current
      if (img && canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }
      }
    } finally {
      setIsEraserProcessing(false)
    }
  }
  
  // Recolor handlers
  const handleRecolorApply = useCallback(async () => {
    const canvas = recolorCanvasRef.current
    if (!canvas) return
    
    if (!canvas.hasMask()) {
      return
    }
    
    try {
      const maskBlob = await canvas.getMaskBlob()
      await applyRecolor(maskBlob)
    } catch {
      // applyRecolor sets its own error state
    }
  }, [applyRecolor])
  
  const handleRecolorRepaint = useCallback(() => {
    recolorResetResult()
    recolorCanvasRef.current?.clearMask()
  }, [recolorResetResult])
  
  const recolorCanApply = recolorHasFile && !isRecolorProcessing && !isRecolorDone
  
  const showUploadZone = (mode === 'recolor' && !recolorHasFile) || (mode === 'eraser' && !eraserOriginalUrl)
  const showProcessing = (mode === 'recolor' && isRecolorProcessing) || (mode === 'eraser' && isEraserProcessing)
  const showError = (mode === 'recolor' && recolorError) || (mode === 'eraser' && eraserError)
  const errorMessage = mode === 'recolor' ? recolorError : eraserError
  const processingLabel = mode === 'recolor' ? 'Applying recolor...' : 'Applying Magic Eraser...'
  
  return (
    <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-4 w-full">
      <div className="flex flex-col gap-6">
        {/* Header with mode switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              {mode === 'recolor' ? 'Magic Recolor' : 'Magic Eraser'}
            </h1>
            <p className="text-sm text-secondary mt-1">
              {mode === 'recolor' 
                ? 'Paint over any area to change its color while preserving texture and shading.'
                : 'Brush over any unwanted object or person — AI will remove it and fill in the background naturally.'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-surface-raised rounded-xl p-1 border border-border">
            <button
              onClick={() => setMode('recolor')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'recolor'
                  ? 'bg-magenta text-white shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              🎨 Recolor
            </button>
            <button
              onClick={() => setMode('eraser')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'eraser'
                  ? 'bg-magenta text-white shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              ✨ Eraser
            </button>
          </div>
        </div>
        
        {/* Upload zone */}
        {showUploadZone && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] px-4">
            <div className="w-full max-w-2xl mx-auto shadow-sm rounded-3xl overflow-hidden bg-surface p-1">
              <UploadZone onFile={handleUpload} disabled={false} />
            </div>
          </div>
        )}
        
        {/* Processing state */}
        {showProcessing && <Spinner label={processingLabel} />}
        
        {/* Error state */}
        {showError && errorMessage && <ErrorBanner message={errorMessage} />}
        
        {/* Main content area */}
        {!showUploadZone && !showProcessing && !showError && (
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              {/* Recolor Canvas */}
              {mode === 'recolor' && recolorHasFile && !isRecolorDone && recolorOriginalUrl && (
                <div className="flex flex-col gap-3 animate-fade-up">
                  <div className="flex items-center justify-between px-0.5">
                    <p className="text-xs text-muted uppercase tracking-widest font-medium">
                      Paint to recolour
                    </p>
                    <button
                      onClick={() => recolorCanvasRef.current?.clearMask()}
                      className="text-xs text-secondary hover:text-danger transition-colors flex items-center gap-1"
                      aria-label="Clear all strokes"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" clipRule="evenodd" />
                      </svg>
                      Clear strokes
                    </button>
                  </div>
                  
                  <CanvasErrorBoundary name="Recolor Canvas">
                    <RecolorCanvas
                      ref={recolorCanvasRef}
                      imageUrl={recolorOriginalUrl}
                      brushSize={brush.size}
                      brushColor={brush.color}
                      disabled={isRecolorProcessing}
                    />
                  </CanvasErrorBoundary>
                </div>
              )}
              
              {/* Recolor Result */}
              {mode === 'recolor' && isRecolorDone && recolorResult && recolorOriginalUrl && (
                <div className="flex flex-col gap-4 animate-fade-up">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-muted text-center font-medium">Original</p>
                      <div className="rounded-xl overflow-hidden border border-border bg-checker aspect-square">
                        <img
                          src={recolorOriginalUrl}
                          alt="Original"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-muted text-center font-medium">Recoloured</p>
                      <div className="rounded-xl overflow-hidden border border-border bg-checker aspect-square">
                        <img
                          src={`/api/download/${recolorResult.output_filename}`}
                          alt="Recoloured result"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-xl overflow-hidden border border-border shadow-md bg-checker">
                    <img
                      src={`/api/download/${recolorResult.output_filename}`}
                      alt="Recoloured result — full view"
                      className="w-full object-contain max-h-[480px]"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-surface-raised rounded-xl border border-border">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-success shrink-0" aria-hidden="true">
                        <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.844 4.574a.75.75 0 00-1.188-.918l-3.454 4.472-1.696-1.697a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.124-.096l4.024-5.07z" clipRule="evenodd" />
                      </svg>
                      Recolor applied
                      <span
                        className="inline-block w-3 h-3 rounded-full border border-border ml-1 shrink-0"
                        style={{ background: brush.color }}
                        aria-label={`Colour: ${brush.color}`}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={handleRecolorRepaint} className="btn-ghost text-sm">
                        Repaint
                      </button>
                      <button onClick={reset} className="btn-ghost text-sm">
                        New image
                      </button>
                      <SendToMenu excludeRoute="/recolor-and-eraser" />
                      <DownloadButton
                        downloadUrl={`/api/download/${recolorResult.output_filename}`}
                        filename={recolorResult.output_filename}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Eraser Canvas */}
              {mode === 'eraser' && eraserOriginalUrl && (
                <div className="flex flex-col gap-4 animate-fade-up">
                  <div className="relative flex items-center justify-center overflow-hidden p-4 rounded-xl border border-border bg-surface-raised min-h-[400px]">
                    <canvas
                      ref={eraserCanvasRef}
                      onMouseDown={handleEraserMouseDown}
                      onMouseMove={handleEraserMouseMove}
                      onMouseUp={handleEraserMouseUp}
                      onMouseLeave={handleEraserMouseUp}
                      className="max-w-full max-h-full object-contain cursor-crosshair shadow-xl rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-surface-raised rounded-xl border border-border">
                    <p className="text-sm text-secondary">Draw over the object to remove, then release.</p>
                    <div className="flex items-center gap-2">
                      <button onClick={reset} className="btn-ghost text-sm">
                        New image
                      </button>
                      {eraserResultUrl && (
                        <>
                          <SendToMenu excludeRoute="/recolor-and-eraser" />
                          <DownloadButton downloadUrl={eraserResultUrl} filename="magic_eraser_result.png" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Controls sidebar */}
            <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4 self-start">
              {mode === 'recolor' && (
                <>
                  {/* Colour picker */}
                  <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-primary">Target Colour</h2>
                    
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Colour presets">
                      {COLOR_PRESETS.map(hex => (
                        <button
                          key={hex}
                          onClick={() => updateBrush('color', hex)}
                          className={`
                            w-7 h-7 rounded-full border-2 transition-all duration-150
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/60
                            active:scale-90
                            ${brush.color === hex
                              ? 'border-magenta scale-110 shadow-md'
                              : 'border-border hover:scale-105 hover:border-border-strong'
                            }
                          `}
                          style={{ background: hex }}
                          aria-label={`Select colour ${hex}`}
                          aria-pressed={brush.color === hex}
                        />
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label htmlFor="color-picker" className="text-xs text-muted shrink-0">
                        Custom
                      </label>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <input
                            id="color-picker"
                            type="color"
                            value={brush.color}
                            onChange={e => updateBrush('color', e.target.value)}
                            className="w-8 h-8 rounded-md border border-border cursor-pointer opacity-0 absolute inset-0"
                            aria-label="Open colour picker"
                          />
                          <div
                            className="w-8 h-8 rounded-md border-2 border-border cursor-pointer shadow-sm"
                            style={{ background: brush.color }}
                            aria-hidden="true"
                          />
                        </div>
                        <input
                          type="text"
                          value={brush.color}
                          maxLength={7}
                          onChange={e => {
                            const v = e.target.value
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateBrush('color', v)
                          }}
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-border
                            bg-surface-raised text-xs font-mono text-primary
                            focus:outline-none focus:border-magenta/60 transition-colors"
                          aria-label="Hex colour value"
                          placeholder="#e83c6d"
                        />
                      </div>
                    </div>
                    
                    <div
                      className="w-full h-8 rounded-lg border border-border shadow-inner transition-all duration-200"
                      style={{ background: brush.color }}
                      aria-label={`Selected colour preview: ${brush.color}`}
                    />
                  </div>
                  
                  {/* Brush controls */}
                  <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-primary">Brush</h2>
                    <SliderRow
                      label="Size"
                      value={brush.size}
                      min={4}
                      max={80}
                      step={2}
                      format={v => `${v}px`}
                      onChange={v => updateBrush('size', v)}
                      disabled={isRecolorProcessing}
                    />
                    <div
                      className="flex items-center justify-center rounded-lg bg-surface-raised border border-border"
                      style={{ height: 88 }}
                      aria-hidden="true"
                    >
                      {(() => {
                        const MIN_DISPLAY = 12
                        const MAX_DISPLAY = 72
                        const MIN_BRUSH = 4
                        const MAX_BRUSH = 80
                        const t = (brush.size - MIN_BRUSH) / (MAX_BRUSH - MIN_BRUSH)
                        const display = Math.round(MIN_DISPLAY + t * (MAX_DISPLAY - MIN_DISPLAY))
                        return (
                          <div
                            className="rounded-full transition-all duration-150 shadow-sm"
                            style={{
                              width: display,
                              height: display,
                              background: brush.color,
                              opacity: 0.85,
                              boxShadow: `0 0 0 3px ${brush.color}33`,
                            }}
                          />
                        )
                      })()}
                    </div>
                  </div>
                  
                  {/* Advanced settings */}
                  <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-primary">Advanced</h2>
                    <SliderRow
                      label="Strength"
                      value={settings.strength}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      format={v => `${Math.round(v * 100)}%`}
                      onChange={v => updateSetting('strength', v)}
                      disabled={isRecolorProcessing}
                    />
                    <SliderRow
                      label="Edge feather"
                      value={settings.feather}
                      min={0}
                      max={40}
                      step={1}
                      format={v => `${v}px`}
                      onChange={v => updateSetting('feather', v)}
                      disabled={isRecolorProcessing}
                    />
                    
                    <div className="flex items-start gap-2 rounded-lg bg-surface-raised border border-border px-3 py-2.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-teal shrink-0 mt-0.5" aria-hidden="true">
                        <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-muted leading-relaxed">
                        <strong className="text-primary">Strength</strong> controls how much the colour shifts.{' '}
                        <strong className="text-primary">Edge feather</strong> softens the stroke boundary.
                      </p>
                    </div>
                  </div>
                  
                  {/* Apply button */}
                  {!isRecolorDone && (
                    <button
                      onClick={handleRecolorApply}
                      disabled={!recolorCanApply}
                      className={`
                        w-full flex items-center justify-center gap-2
                        px-5 py-3 rounded-xl font-semibold text-sm
                        transition-all duration-200
                        ${recolorCanApply
                          ? 'bg-magenta hover:bg-magenta-hover text-white shadow-sm hover:shadow-md active:scale-95'
                          : 'bg-surface-raised text-muted border border-border cursor-not-allowed'
                        }
                      `}
                      aria-label="Apply recolor to painted region"
                    >
                      {isRecolorProcessing ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          Applying…
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                            <path d="M15.28 5.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L3.72 9.28a.75.75 0 011.06-1.06l2.72 2.72 6.72-6.72a.75.75 0 011.06 0z" />
                          </svg>
                          Apply Recolor
                        </>
                      )}
                    </button>
                  )}
                  
                  {isRecolorDone && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleRecolorRepaint}
                        className="w-full btn-ghost text-sm justify-center"
                      >
                        Repaint with different colour
                      </button>
                      <button
                        onClick={reset}
                        className="w-full btn-ghost text-sm justify-center"
                      >
                        Start over with new image
                      </button>
                    </div>
                  )}
                </>
              )}
              
              {mode === 'eraser' && (
                <>
                  <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-primary mb-4">Brush Settings</h3>
                    <CustomSlider
                      label="Brush Size"
                      value={brushSize}
                      min={5}
                      max={150}
                      unit="px"
                      presets={[10, 30, 60, 100]}
                      onChange={setBrushSize}
                    />
                  </div>
                  
                  <div className="flex items-start gap-2.5 rounded-lg bg-surface-raised border border-border px-3.5 py-3">
                    <p className="text-xs text-muted leading-relaxed">
                      Paint over the object to remove. Use a brush slightly larger than the object for best AI results. The first use may take a moment as the AI model loads.
                    </p>
                  </div>
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
