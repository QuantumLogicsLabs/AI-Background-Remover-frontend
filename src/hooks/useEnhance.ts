import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import { useStudioOutput } from './useStudioOutput'
import { useActiveImage } from '../contexts/ActiveImageContext'

export type EnhanceStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface EnhanceSettings {
  brightness: number       // 0.0 – 3.0  (1.0 = no change)
  contrast: number         // 0.0 – 3.0
  saturation: number       // 0.0 – 3.0
  sharpness: number        // 0.0 – 3.0
  denoise: boolean
  auto_wb: boolean
  denoise_strength: number // 5 – 15
}

export interface EnhanceResult {
  upload_id: string
  output_filename: string
  download_url: string
  image_meta: { width: number; height: number; mode: string }
}

export const DEFAULT_SETTINGS: EnhanceSettings = {
  brightness: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  sharpness: 1.0,
  denoise: false,
  auto_wb: false,
  denoise_strength: 9,
}

// ── Helper: build FormData from a file + settings ─────────────────────────

function buildFormData(file: File, s: EnhanceSettings): FormData {
  const fd = new FormData()
  fd.append('file',             file)
  fd.append('brightness',       String(s.brightness))
  fd.append('contrast',         String(s.contrast))
  fd.append('saturation',       String(s.saturation))
  fd.append('sharpness',        String(s.sharpness))
  fd.append('denoise',          String(s.denoise))
  fd.append('auto_wb',          String(s.auto_wb))
  fd.append('denoise_strength', String(s.denoise_strength))
  return fd
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useEnhance() {
  const [status,      setStatus]      = useState<EnhanceStatus>('idle')
  const [result,      setResult]      = useState<EnhanceResult | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [settings,    setSettings]    = useState<EnhanceSettings>(DEFAULT_SETTINGS)

  const { setActiveImage } = useActiveImage()

  // Keep a ref to the last uploaded File so re-apply doesn't need a new upload
  const fileRef = useRef<File | null>(null)
  // State flag so React re-renders when a file is loaded/cleared
  const [hasFile, setHasFile] = useState(false)

  const { registerOutput } = useStudioOutput()

  const updateSetting = useCallback(
    <K extends keyof EnhanceSettings>(key: K, value: EnhanceSettings[K]) => {
      setSettings(prev => ({ ...prev, [key]: value }))
    },
    [],
  )

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  // ── Shared POST logic ────────────────────────────────────────────────────
  const _post = useCallback(async (file: File, s: EnhanceSettings) => {
    setStatus('uploading')
    setResult(null)
    setError(null)

    try {
      const response = await axios.post<EnhanceResult>(
        '/api/enhance',
        buildFormData(file, s),
      )
      setResult(response.data)
      setStatus('success')
      // Register output in the pipeline so SendToMenu can forward it
      registerOutput(
        `/api/download/${response.data.output_filename}`,
        response.data.output_filename,
      )
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Something went wrong. Please try again.'
      setError(msg)
      setStatus('error')
    }
  }, [])

  // ── Load file without processing (staging) ──────────────────────────
  const loadFile = useCallback((file: File) => {
    fileRef.current = file
    setHasFile(true)
    const localUrl = URL.createObjectURL(file)
    setOriginalUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return localUrl
    })
  }, [])

  // ── First upload: store file + create preview URL ─────────────────────
  const enhance = useCallback(
    async (file: File, customSettings?: EnhanceSettings) => {
      fileRef.current = file
      setHasFile(true)

      // Show original preview instantly
      const localUrl = URL.createObjectURL(file)
      setOriginalUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return localUrl
      })

      // Sync with global ActiveImageContext
      setActiveImage(file, localUrl)

      await _post(file, customSettings || settings)
    },
    [settings, _post, setActiveImage],
  )

  const reEnhance = useCallback(async (customSettings?: EnhanceSettings | any) => {
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
    setOriginalUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    fileRef.current = null
    setHasFile(false)
    setSettings(DEFAULT_SETTINGS)

    // Sync with global ActiveImageContext
    setActiveImage(null, null)
  }, [setActiveImage])

  return {
    status,
    result,
    originalUrl,
    error,
    settings,
    updateSetting,
    resetSettings,
    enhance,
    reEnhance,
    reset,
    hasFile,
    loadFile,
  }
}
