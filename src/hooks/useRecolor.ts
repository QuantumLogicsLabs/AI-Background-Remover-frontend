/**
 * useRecolor
 *
 * Manages all state for the Magic Recolor page:
 *   - Source file / preview URL
 *   - Brush settings (size, color)
 *   - Recolor strength + feather
 *   - API call to POST /api/recolor
 *   - Result URL + download filename
 */

import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import apiClient from '../services/apiClient'
import { useStudioOutput } from './useStudioOutput'

export type RecolorStatus = 'idle' | 'processing' | 'done' | 'error'

export interface RecolorResult {
  upload_id:       string
  output_filename: string
  download_url:    string
}

export interface BrushSettings {
  size:  number   // CSS pixels, 4–80
  color: string   // hex, e.g. "#e83c6d"
}

export interface RecolorSettings {
  strength: number   // 0.0–1.0
  feather:  number   // 0–60 px
}

export const DEFAULT_BRUSH: BrushSettings = {
  size:  28,
  color: '#e83c6d',
}

export const DEFAULT_RECOLOR_SETTINGS: RecolorSettings = {
  strength: 1.0,
  feather:  15,
}

// Preset palette — quick colour picks
export const COLOR_PRESETS = [
  '#e83c6d', // magenta-pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ffffff', // white
  '#6b7280', // gray
  '#0f172a', // near-black
]

export function useRecolor() {
  const [status,        setStatus]      = useState<RecolorStatus>('idle')
  const [result,        setResult]      = useState<RecolorResult | null>(null)
  const [originalUrl,   setOriginalUrl] = useState<string | null>(null)
  const [error,         setError]       = useState<string | null>(null)
  const [brush,         setBrush]       = useState<BrushSettings>(DEFAULT_BRUSH)
  const [settings,      setSettings]    = useState<RecolorSettings>(DEFAULT_RECOLOR_SETTINGS)
  const [hasFile,       setHasFile]     = useState(false)

  // Keep File reference so we can re-submit without re-uploading
  const fileRef = useRef<File | null>(null)

  const { registerOutput } = useStudioOutput()

  // ── Brush helpers ──────────────────────────────────────────────────────
  const updateBrush = useCallback(
    <K extends keyof BrushSettings>(key: K, value: BrushSettings[K]) =>
      setBrush(prev => ({ ...prev, [key]: value })),
    [],
  )

  // ── Settings helpers ───────────────────────────────────────────────────
  const updateSetting = useCallback(
    <K extends keyof RecolorSettings>(key: K, value: RecolorSettings[K]) =>
      setSettings(prev => ({ ...prev, [key]: value })),
    [],
  )

  // ── Load a source file ─────────────────────────────────────────────────
  const loadFile = useCallback((file: File) => {
    fileRef.current = file
    setHasFile(true)
    setResult(null)
    setError(null)
    setStatus('idle')

    const localUrl = URL.createObjectURL(file)
    setOriginalUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return localUrl
    })
  }, [])

  // ── Submit mask + file to the API ──────────────────────────────────────
  const applyRecolor = useCallback(
    async (maskBlob: Blob) => {
      const file = fileRef.current
      if (!file) return

      setStatus('processing')
      setResult(null)
      setError(null)

      const formData = new FormData()
      formData.append('image',        file,     file.name)
      formData.append('mask',         maskBlob, 'mask.png')
      formData.append('target_color', brush.color)
      formData.append('strength',     String(settings.strength))
      formData.append('feather',      String(settings.feather))

      try {
        const res = await apiClient.post<RecolorResult>(
          '/api/recolor',
          formData,
        )
        setResult(res.data)
        setStatus('done')
        // Register output in the pipeline so SendToMenu can forward it
        registerOutput(
          `/api/download/${res.data.output_filename}`,
          res.data.output_filename,
        )
      } catch (err) {
        const msg =
          axios.isAxiosError(err) && err.response?.data?.detail
            ? String(err.response.data.detail)
            : 'Recolor failed. Please try again.'
        setError(msg)
        setStatus('error')
      }
    },
    [brush.color, settings],
  )

  // ── Reset everything ───────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
    setHasFile(false)
    fileRef.current = null
    setOriginalUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setBrush(DEFAULT_BRUSH)
    setSettings(DEFAULT_RECOLOR_SETTINGS)
  }, [])

  // ── Reset only the result (keep file loaded, ready to re-paint) ────────
  const resetResult = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return {
    // state
    status,
    result,
    originalUrl,
    error,
    hasFile,

    // brush
    brush,
    updateBrush,

    // settings
    settings,
    updateSetting,

    // actions
    loadFile,
    applyRecolor,
    reset,
    resetResult,
  }
}
