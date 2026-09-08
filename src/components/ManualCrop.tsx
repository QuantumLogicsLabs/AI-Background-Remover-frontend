import React, { useState, useRef, useEffect } from 'react'

interface ManualCropProps {
  imageUrl: string
  onCropComplete: (cropData: { x: number; y: number; width: number; height: number }) => void
  onCancel: () => void
  aspectRatio?: number | 'free'
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move'

export default function ManualCrop({ imageUrl, onCropComplete, onCancel, aspectRatio = 'free' }: ManualCropProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragHandle, setDragHandle] = useState<HandlePosition | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [cropStart, setCropStart] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 })

  // Initialize crop area when image loads
  useEffect(() => {
    const img = imageRef.current
    if (!img || !imageUrl) return

    const handleLoad = () => {
      const width = img.naturalWidth
      const height = img.naturalHeight
      setImageSize({ width, height })

      // Initial crop area (80% of image, centered)
      const initialCrop = {
        x: width * 0.1,
        y: height * 0.1,
        width: width * 0.8,
        height: height * 0.8,
      }
      setCropArea(initialCrop)
    }

    if (img.complete) {
      handleLoad()
    } else {
      img.addEventListener('load', handleLoad)
      return () => img.removeEventListener('load', handleLoad)
    }
  }, [imageUrl])

  const getMouseDownPosition = (e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }

    const rect = container.getBoundingClientRect()
    const scaleX = imageSize.width / rect.width
    const scaleY = imageSize.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const getHandleFromPosition = (x: number, y: number, crop: CropArea): HandlePosition | null => {
    const handleSize = 20
    const { x: cx, y: cy, width, height } = crop

    // Check corners
    if (Math.abs(x - cx) < handleSize && Math.abs(y - cy) < handleSize) return 'nw'
    if (Math.abs(x - (cx + width)) < handleSize && Math.abs(y - cy) < handleSize) return 'ne'
    if (Math.abs(x - (cx + width)) < handleSize && Math.abs(y - (cy + height)) < handleSize) return 'se'
    if (Math.abs(x - cx) < handleSize && Math.abs(y - (cy + height)) < handleSize) return 'sw'

    // Check edges
    if (Math.abs(x - cx) < handleSize && y > cy && y < cy + height) return 'w'
    if (Math.abs(x - (cx + width)) < handleSize && y > cy && y < cy + height) return 'e'
    if (Math.abs(y - cy) < handleSize && x > cx && x < cx + width) return 'n'
    if (Math.abs(y - (cy + height)) < handleSize && x > cx && x < cx + width) return 's'

    // Check if inside crop area (for moving)
    if (x > cx && x < cx + width && y > cy && y < cy + height) return 'move'

    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMouseDownPosition(e)
    const handle = getHandleFromPosition(pos.x, pos.y, cropArea)

    if (handle) {
      setIsDragging(true)
      setDragHandle(handle)
      setDragStart(pos)
      setCropStart({ ...cropArea })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragHandle(null)
  }

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const container = containerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const scaleX = imageSize.width / rect.width
        const scaleY = imageSize.height / rect.height

        const pos = {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        }

        const dx = pos.x - dragStart.x
        const dy = pos.y - dragStart.y
        const { width: imgWidth, height: imgHeight } = imageSize

        let newCrop = { ...cropStart }

        switch (dragHandle) {
          case 'nw':
            newCrop.x = Math.max(0, cropStart.x + dx)
            newCrop.y = Math.max(0, cropStart.y + dy)
            newCrop.width = cropStart.width - dx
            newCrop.height = cropStart.height - dy
            break
          case 'n':
            newCrop.y = Math.max(0, cropStart.y + dy)
            newCrop.height = cropStart.height - dy
            break
          case 'ne':
            newCrop.y = Math.max(0, cropStart.y + dy)
            newCrop.width = cropStart.width + dx
            newCrop.height = cropStart.height - dy
            break
          case 'e':
            newCrop.width = cropStart.width + dx
            break
          case 'se':
            newCrop.width = cropStart.width + dx
            newCrop.height = cropStart.height + dy
            break
          case 's':
            newCrop.height = cropStart.height + dy
            break
          case 'sw':
            newCrop.x = Math.max(0, cropStart.x + dx)
            newCrop.width = cropStart.width - dx
            newCrop.height = cropStart.height + dy
            break
          case 'w':
            newCrop.x = Math.max(0, cropStart.x + dx)
            newCrop.width = cropStart.width - dx
            break
          case 'move':
            newCrop.x = Math.max(0, Math.min(imgWidth - cropStart.width, cropStart.x + dx))
            newCrop.y = Math.max(0, Math.min(imgHeight - cropStart.height, cropStart.y + dy))
            break
        }

        // Apply aspect ratio constraint if not free
        if (aspectRatio !== 'free' && typeof aspectRatio === 'number') {
          if (dragHandle === 'move') {
            const currentRatio = newCrop.width / newCrop.height
            if (Math.abs(currentRatio - aspectRatio) > 0.01) {
              if (currentRatio > aspectRatio) {
                newCrop.height = newCrop.width / aspectRatio
              } else {
                newCrop.width = newCrop.height * aspectRatio
              }
            }
          } else {
            if (dragHandle && ['nw', 'ne', 'sw', 'se'].includes(dragHandle)) {
              const size = Math.max(newCrop.width, newCrop.height)
              newCrop.width = size
              newCrop.height = size / aspectRatio
            }
          }
        }

        // Ensure minimum size and bounds
        const minSize = 50
        newCrop.width = Math.max(minSize, newCrop.width)
        newCrop.height = Math.max(minSize, newCrop.height)
        newCrop.x = Math.max(0, Math.min(imgWidth - newCrop.width, newCrop.x))
        newCrop.y = Math.max(0, Math.min(imgHeight - newCrop.height, newCrop.y))

        setCropArea(newCrop)
      }
      const handleGlobalMouseUp = () => handleMouseUp()

      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove)
        window.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, dragHandle, dragStart, cropStart, imageSize, aspectRatio])

  const handleApplyCrop = () => {
    onCropComplete(cropArea)
  }

  const containerStyle = {
    position: 'relative' as const,
    display: 'inline-block',
    maxWidth: '100%',
  }

  const overlayStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    pointerEvents: 'none' as const,
  }

  const cropOverlayStyle = {
    position: 'absolute' as const,
    border: '2px solid #fff',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.3)',
    pointerEvents: 'none' as const,
    left: `${(cropArea.x / imageSize.width) * 100}%`,
    top: `${(cropArea.y / imageSize.height) * 100}%`,
    width: `${(cropArea.width / imageSize.width) * 100}%`,
    height: `${(cropArea.height / imageSize.height) * 100}%`,
  }

  const handleStyle = {
    position: 'absolute' as const,
    width: '20px',
    height: '20px',
    backgroundColor: '#fff',
    border: '2px solid #e83c6d',
    borderRadius: '50%',
    pointerEvents: 'auto' as const,
    cursor: 'pointer',
  }

  const handles = [
    { pos: 'nw', style: { ...handleStyle, left: '-10px', top: '-10px', cursor: 'nw-resize' } },
    { pos: 'n', style: { ...handleStyle, left: '50%', top: '-10px', transform: 'translateX(-50%)', cursor: 'n-resize' } },
    { pos: 'ne', style: { ...handleStyle, right: '-10px', top: '-10px', cursor: 'ne-resize' } },
    { pos: 'e', style: { ...handleStyle, right: '-10px', top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' } },
    { pos: 'se', style: { ...handleStyle, right: '-10px', bottom: '-10px', cursor: 'se-resize' } },
    { pos: 's', style: { ...handleStyle, left: '50%', bottom: '-10px', transform: 'translateX(-50%)', cursor: 's-resize' } },
    { pos: 'sw', style: { ...handleStyle, left: '-10px', bottom: '-10px', cursor: 'sw-resize' } },
    { pos: 'w', style: { ...handleStyle, left: '-10px', top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' } },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div 
        ref={containerRef}
        style={containerStyle}
        onMouseDown={handleMouseDown}
        className="cursor-crosshair"
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Crop target"
          className="max-w-full h-auto"
          draggable={false}
        />
        
        {/* Dark overlay */}
        <div style={overlayStyle} />
        
        {/* Crop area overlay */}
        <div style={cropOverlayStyle}>
          {/* Resize handles */}
          {handles.map((handle) => (
            <div
              key={handle.pos}
              style={handle.style}
              onMouseDown={(e) => {
                e.stopPropagation()
                setDragHandle(handle.pos as HandlePosition)
                setIsDragging(true)
                setDragStart(getMouseDownPosition(e))
                setCropStart({ ...cropArea })
              }}
            />
          ))}
          
          {/* Grid lines for rule of thirds */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onCancel}
          className="btn-ghost text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleApplyCrop}
          className="btn-primary text-sm"
        >
          Apply Crop
        </button>
      </div>

      {/* Crop info */}
      <div className="text-center text-xs text-muted">
        Crop area: {Math.round(cropArea.width)} × {Math.round(cropArea.height)} px
        {aspectRatio !== 'free' && ` (${aspectRatio})`}
      </div>
    </div>
  )
}
