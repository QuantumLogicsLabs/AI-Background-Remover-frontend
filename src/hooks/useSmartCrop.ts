import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import { useStudioOutput } from './useStudioOutput'
import { useActiveImage } from '../contexts/ActiveImageContext'
import type { Quality } from './useUpload'

export type CropStatus = 'idle' | 'processing' | 'done' | 'error'

export interface CropSettings {
  paddingPct:  number   // 0.0 – 0.5
  aspectRatio: string   // "free" | "1:1" | "4:3" | etc.
  minSize:     number   // px, 16 – 512
  quality:     Quality  // "fast" | "quality"
}

export interface CropResult {
  upload_id:        string
  removed_filename: string
  cropped_filename: string
  removed_url:      string
  cropped_url:      string
  crop_meta: {
    crop_box:  { x0: number; y0: number; x1: number; y1: number }
    width:     number
    height:    number
    original:  { width: number; height: number }
    crop_mode: string   // "subject" | "center"
  }
}

export const ASPECT_RATIO_OPTIONS = [
  'free', '1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '5:4', '4:5',
]

export const DEFAULT_CROP_SETTINGS: CropSettings = {
  paddingPct:  0.05,
  aspectRatio: 'free',
  minSize:     64,
  quality:     'fast',
}

// ── Helper ────────────────────────────────────────────────────────────────

function buildFormData(file: File, s: CropSettings): FormData {
  const fd = new FormData()
  fd.append('file',         file)
  fd.append('padding_pct',  String(s.paddingPct))
  fd.append('aspect_ratio', s.aspectRatio)
  fd.append('min_size',     String(s.minSize))
  fd.append('quality',      s.quality)
  return fd
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useSmartCrop() {
  const [status,      setStatus]      = useState<CropStatus>('idle')
  const [result,      setResult]      = useState<CropResult | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [settings,    setSettings]    = useState<CropSettings>(DEFAULT_CROP_SETTINGS)

  const { setActiveImage } = useActiveImage()

  // Store uploaded file so reCrop() doesn't need a re-upload
  const fileRef = useRef<File | null>(null)
  // Separate state flag so React re-renders when a file is loaded/cleared
  const [hasFile, setHasFile] = useState(false)

  const { registerOutput } = useStudioOutput()

  const updateSetting = useCallback(
    <K extends keyof CropSettings>(key: K, value: CropSettings[K]) => {
      setSettings(prev => ({ ...prev, [key]: value }))
    },
    [],
  )

  const resetSettings = useCallback(() => setSettings(DEFAULT_CROP_SETTINGS), [])

  // ── Shared POST logic ─────────────────────────────────────────────────
  const _post = useCallback(async (file: File, s: CropSettings) => {
    setStatus('processing')
    setResult(null)
    setError(null)

    try {
      const res = await axios.post<CropResult>(
        '/api/smart-crop',
        buildFormData(file, s),
      )
      setResult(res.data)
      setStatus('done')
      // Register output in the pipeline so SendToMenu can forward it
      registerOutput(
        `/api/download/${res.data.cropped_filename}`,
        res.data.cropped_filename,
      )
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Smart crop failed. Please try again.'
      setError(msg)
      setStatus('error')
    }
  }, [])

  // ── Load file without processing (staging) ──────────────────────────
  const loadFile = useCallback((file: File) => {
    fileRef.current = file
    setHasFile(true)
    const localUrl = URL.createObjectURL(file)
    setOriginalUrl(prev => { if (prev) URL.revokeObjectURL(prev); return localUrl })
  }, [])

  // ── First upload: store file + show preview immediately ───────────────
  const crop = useCallback(async (file: File, customSettings?: CropSettings) => {
    fileRef.current = file
    setHasFile(true)

    const localUrl = URL.createObjectURL(file)
    setOriginalUrl(prev => { if (prev) URL.revokeObjectURL(prev); return localUrl })

    // Sync with global ActiveImageContext
    setActiveImage(file, localUrl)

    await _post(file, customSettings || settings)
  }, [settings, _post, setActiveImage])

  // ── Re-crop with updated settings (no re-upload needed) ───────────────
  const reCrop = useCallback(async (customSettings?: CropSettings | any) => {
    const file = fileRef.current
    if (!file) return
    const isPreset = customSettings && !customSettings.nativeEvent
    if (isPreset) {
      setSettings(prev => ({ ...prev, ...customSettings }))
    }
    await _post(file, isPreset ? { ...settings, ...customSettings } : settings)
  }, [settings, _post])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
    setOriginalUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    fileRef.current = null
    setHasFile(false)

    // Sync with global ActiveImageContext
    setActiveImage(null, null)
  }, [setActiveImage])

  return {
    status, result, originalUrl, error,
    settings, updateSetting, resetSettings,
    crop, reCrop, reset,
    hasFile,
    loadFile,
  }
}
