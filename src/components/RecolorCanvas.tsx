/**
 * RecolorCanvas
 *
 * Two-canvas architecture:
 *   visibleCanvas  — the image the user sees, with colour strokes painted
 *                    directly on top in real time (semi-transparent).
 *   maskCanvas     — a black canvas that receives identical white strokes,
 *                    exported as a PNG mask sent to the backend.
 *
 * On every brush move we paint the same line segment to BOTH canvases
 * simultaneously:
 *   maskCanvas   → opaque white  (used by the AI service)
 *   visibleCanvas → semi-transparent target colour (user feedback)
 *
 * This is simpler and ~10× faster than the previous approach that tried
 * to composite the mask back onto the image every frame.
 *
 * Public API (via ref):
 *   getMaskBlob() → Promise<Blob>
 *   clearMask()
 *   hasMask()     → boolean
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecolorCanvasHandle {
  getMaskBlob: () => Promise<Blob>
  clearMask:   () => void
  hasMask:     () => boolean
}

interface RecolorCanvasProps {
  imageUrl:   string
  brushSize:  number   // CSS px diameter — scaled to canvas space internally
  brushColor: string   // hex, e.g. "#e83c6d"
  onStroke?:  () => void
  disabled?:  boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getCanvasPoint(
  e: MouseEvent | Touch,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect   = canvas.getBoundingClientRect()
  const scaleX = canvas.width  / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY,
  }
}

function hexToRgb(hex: string): string {
  const h    = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r    = parseInt(full.slice(0, 2), 16)
  const g    = parseInt(full.slice(2, 4), 16)
  const b    = parseInt(full.slice(4, 6), 16)
  return `${r},${g},${b}`
}

/** Draw a round-capped line (or a dot when from === to) on a 2d context. */
function drawStroke(
  ctx:       CanvasRenderingContext2D,
  from:      { x: number; y: number },
  to:        { x: number; y: number },
  lineWidth: number,
  style:     string,
  alpha:     number,
) {
  ctx.save()
  ctx.globalAlpha      = alpha
  ctx.strokeStyle      = style
  ctx.lineWidth        = lineWidth
  ctx.lineCap          = 'round'
  ctx.lineJoin         = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x,   to.y)
  ctx.stroke()
  ctx.restore()
}

// ── Component ──────────────────────────────────────────────────────────────

const RecolorCanvas = forwardRef<RecolorCanvasHandle, RecolorCanvasProps>(
  function RecolorCanvas(
    { imageUrl, brushSize, brushColor, onStroke, disabled = false },
    ref,
  ) {
    const visibleRef  = useRef<HTMLCanvasElement>(null)
    const maskRef     = useRef<HTMLCanvasElement>(null)
    const imgRef      = useRef<HTMLImageElement | null>(null)
    const painting    = useRef(false)
    const lastPoint   = useRef<{ x: number; y: number } | null>(null)
    const [strokeCount, setStrokeCount] = useState(0)

    // ── Load image → size both canvases ───────────────────────────────
    useEffect(() => {
      const visible = visibleRef.current
      const mask    = maskRef.current
      if (!visible || !mask) return

      const img        = new Image()
      img.crossOrigin  = 'anonymous'
      img.onload = () => {
        imgRef.current = img

        visible.width  = img.naturalWidth
        visible.height = img.naturalHeight
        mask.width     = img.naturalWidth
        mask.height    = img.naturalHeight

        // Reset mask to solid black
        const mCtx = mask.getContext('2d')!
        mCtx.fillStyle = '#000'
        mCtx.fillRect(0, 0, mask.width, mask.height)

        // Draw base image on visible canvas
        const vCtx = visible.getContext('2d')!
        vCtx.drawImage(img, 0, 0)
      }
      img.src = imageUrl
    }, [imageUrl])

    // ── Core paint: one segment → both canvases simultaneously ────────
    const paintSegment = useCallback(
      (from: { x: number; y: number }, to: { x: number; y: number }) => {
        const visible = visibleRef.current
        const mask    = maskRef.current
        if (!visible || !mask) return

        // Scale CSS brush size → canvas pixel space
        const rect      = visible.getBoundingClientRect()
        const scale     = visible.width / rect.width
        const lineWidth = brushSize * scale

        // 1. White opaque line on mask (used by backend)
        const mCtx = mask.getContext('2d')!
        drawStroke(mCtx, from, to, lineWidth, '#ffffff', 1.0)

        // 2. Target colour semi-transparent line on visible canvas (user sees this)
        const vCtx = visible.getContext('2d')!
        const rgb   = hexToRgb(brushColor)
        drawStroke(vCtx, from, to, lineWidth, `rgba(${rgb}, 0.55)`, 1.0)
      },
      [brushSize, brushColor],
    )

    // ── Input handlers ─────────────────────────────────────────────────

    const startPainting = useCallback((e: MouseEvent | Touch) => {
      if (disabled) return
      painting.current  = true
      const pt          = getCanvasPoint(e, visibleRef.current!)
      lastPoint.current = pt
      paintSegment(pt, pt)   // dot at click origin
    }, [disabled, paintSegment])

    const continuePainting = useCallback((e: MouseEvent | Touch) => {
      if (!painting.current || disabled) return
      const pt   = getCanvasPoint(e, visibleRef.current!)
      const last = lastPoint.current ?? pt
      paintSegment(last, pt)
      lastPoint.current = pt
    }, [disabled, paintSegment])

    const stopPainting = useCallback(() => {
      if (painting.current) {
        painting.current  = false
        lastPoint.current = null
        setStrokeCount(c => c + 1)
        onStroke?.()
      }
    }, [onStroke])

    useEffect(() => {
      const canvas = visibleRef.current
      if (!canvas) return

      const onMD = (e: MouseEvent) => { e.preventDefault(); startPainting(e) }
      const onMM = (e: MouseEvent) => { e.preventDefault(); continuePainting(e) }
      const onMU = () => stopPainting()
      const onML = () => stopPainting()
      const onTS = (e: TouchEvent) => { e.preventDefault(); startPainting(e.touches[0]) }
      const onTM = (e: TouchEvent) => { e.preventDefault(); continuePainting(e.touches[0]) }
      const onTE = () => stopPainting()

      canvas.addEventListener('mousedown',  onMD, { passive: false })
      canvas.addEventListener('mousemove',  onMM, { passive: false })
      canvas.addEventListener('mouseup',    onMU)
      canvas.addEventListener('mouseleave', onML)
      canvas.addEventListener('touchstart', onTS, { passive: false })
      canvas.addEventListener('touchmove',  onTM, { passive: false })
      canvas.addEventListener('touchend',   onTE)

      return () => {
        canvas.removeEventListener('mousedown',  onMD)
        canvas.removeEventListener('mousemove',  onMM)
        canvas.removeEventListener('mouseup',    onMU)
        canvas.removeEventListener('mouseleave', onML)
        canvas.removeEventListener('touchstart', onTS)
        canvas.removeEventListener('touchmove',  onTM)
        canvas.removeEventListener('touchend',   onTE)
      }
    }, [startPainting, continuePainting, stopPainting])

    // ── Imperative handle ──────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      getMaskBlob: () =>
        new Promise<Blob>((resolve, reject) => {
          const mask = maskRef.current
          if (!mask) return reject(new Error('Mask canvas not ready'))
          mask.toBlob(
            b => b ? resolve(b) : reject(new Error('Failed to export mask')),
            'image/png',
          )
        }),

      clearMask: () => {
        const mask    = maskRef.current
        const visible = visibleRef.current
        const img     = imgRef.current
        if (!mask || !visible || !img) return

        // Reset mask to black
        const mCtx = mask.getContext('2d')!
        mCtx.fillStyle = '#000'
        mCtx.fillRect(0, 0, mask.width, mask.height)

        // Redraw clean image (removes all painted strokes)
        const vCtx = visible.getContext('2d')!
        vCtx.clearRect(0, 0, visible.width, visible.height)
        vCtx.drawImage(img, 0, 0)

        setStrokeCount(0)
      },

      hasMask: () => strokeCount > 0,
    }), [strokeCount])

    // ── Custom brush cursor ────────────────────────────────────────────
    const rgb = hexToRgb(brushColor)
    const cursorSize = Math.max(brushSize, 8)
    const cursorSvg  = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}">` +
      `<circle cx="${cursorSize / 2}" cy="${cursorSize / 2}" r="${cursorSize / 2 - 1.5}" ` +
      `fill="rgba(${rgb},0.35)" stroke="rgba(${rgb},1)" stroke-width="2"/>` +
      `</svg>`,
    )
    const cursorStyle = disabled
      ? 'not-allowed'
      : `url("data:image/svg+xml,${cursorSvg}") ${cursorSize / 2} ${cursorSize / 2}, crosshair`

    return (
      <div className="relative w-full rounded-xl overflow-hidden border border-border bg-checker shadow-md select-none">
        {/* Visible canvas */}
        <canvas
          ref={visibleRef}
          className="w-full h-auto block"
          style={{ cursor: cursorStyle, touchAction: 'none' }}
          aria-label="Paint canvas — drag to mark the region to recolour"
          role="img"
        />

        {/* Mask canvas — hidden, only used for export */}
        <canvas ref={maskRef} className="hidden" aria-hidden="true" />

        {/* Stroke badge */}
        {strokeCount > 0 && (
          <div
            className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium
              bg-black/60 text-white backdrop-blur-sm pointer-events-none"
            aria-live="polite"
          >
            {strokeCount} stroke{strokeCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Painting hint — shown before any strokes */}
        {strokeCount === 0 && !disabled && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full
              bg-black/55 text-white text-xs font-medium backdrop-blur-sm pointer-events-none
              whitespace-nowrap"
            aria-hidden="true"
          >
            🖌️ Paint over the area to recolour
          </div>
        )}

        {/* Disabled overlay */}
        {disabled && (
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px]
              flex items-center justify-center rounded-xl"
            aria-hidden="true"
          >
            <div className="bg-surface/90 backdrop-blur-sm rounded-lg px-3 py-2
              text-xs text-secondary font-medium shadow-sm border border-border">
              Processing…
            </div>
          </div>
        )}
      </div>
    )
  },
)

export default RecolorCanvas
