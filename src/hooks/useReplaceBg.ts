import { useState, useCallback } from 'react'
import axios from 'axios'
import { useActiveImage } from '../contexts/ActiveImageContext'
import { useStudioOutput } from './useStudioOutput'
import type { Quality } from './useUpload'

// ── Types ──────────────────────────────────────────────────────────────────

export type BgType        = 'solid' | 'gradient' | 'image' | 'library'
export type GradientDir   = 'horizontal' | 'vertical' | 'diagonal'
export type BgFit         = 'cover' | 'contain' | 'stretch'
export type RemoveStatus  = 'idle' | 'removing' | 'removed' | 'error'
export type ReplaceStatus = 'idle' | 'replacing' | 'done' | 'error'

export interface BgSettings {
  bgType:         BgType
  solidColor:     string      // CSS hex, e.g. "#ffffff"
  gradientStart:  string
  gradientEnd:    string
  gradientDir:    GradientDir
  bgFile:         File | null
  bgFit:          BgFit
  libraryUrl:     string | null  // tracks the selected library thumbnail URL
}

export interface RemoveResult {
  output_filename: string
  download_url:    string
}

export interface ReplaceResult {
  result_id:       string
  output_filename: string
  download_url:    string
  image_meta:      { width: number; height: number }
}

export const DEFAULT_BG_SETTINGS: BgSettings = {
  bgType:        'solid',
  solidColor:    '#ffffff',
  gradientStart: '#e8336d',
  gradientEnd:   '#2fbfb0',
  gradientDir:   'vertical',
  bgFile:        null,
  bgFit:         'cover',
  libraryUrl:    null,
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useReplaceBg() {
  const { setActiveImage } = useActiveImage()
  const { registerOutput } = useStudioOutput()
  // Step 1 — remove bg
  const [removeStatus,  setRemoveStatus]  = useState<RemoveStatus>('idle')
  const [removeResult,  setRemoveResult]  = useState<RemoveResult | null>(null)
  const [originalUrl,   setOriginalUrl]   = useState<string | null>(null)
  const [removedUrl,    setRemovedUrl]    = useState<string | null>(null)
  const [removeError,   setRemoveError]   = useState<string | null>(null)

  // Quality for step 1 inference
  const [quality, setQuality] = useState<Quality>('fast')

  // Step 2 — replace bg
  const [replaceStatus, setReplaceStatus] = useState<ReplaceStatus>('idle')
  const [replaceResult, setReplaceResult] = useState<ReplaceResult | null>(null)
  const [replaceError,  setReplaceError]  = useState<string | null>(null)

  // Background settings
  const [settings, setSettings] = useState<BgSettings>(DEFAULT_BG_SETTINGS)

  // ── Setting helpers ───────────────────────────────────────────────────

  const updateSetting = useCallback(
    <K extends keyof BgSettings>(key: K, value: BgSettings[K]) => {
      setSettings(prev => ({ ...prev, [key]: value }))
    },
    [],
  )

  const resetSettings = useCallback(() => setSettings(DEFAULT_BG_SETTINGS), [])

  // ── Step 1: remove background ─────────────────────────────────────────

  const removeBackground = useCallback(async (file: File) => {
    setRemoveStatus('removing')
    setRemoveResult(null)
    setReplaceResult(null)
    setRemoveError(null)
    setReplaceStatus('idle')

    const localUrl = URL.createObjectURL(file)
    setActiveImage(file, localUrl)
    setOriginalUrl(prev => { if (prev) URL.revokeObjectURL(prev); return localUrl })
    setRemovedUrl(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('quality', quality)

    try {
      const res = await axios.post<RemoveResult>(
        '/api/remove-background',
        formData,
      )
      setRemoveResult(res.data)
      setRemovedUrl(`/api/download/${res.data.output_filename}`)
      setRemoveStatus('removed')
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Background removal failed. Please try again.'
      setRemoveError(msg)
      setRemoveStatus('error')
    }
  }, [quality, setActiveImage])

  // ── Step 2: replace background ────────────────────────────────────────

  const replaceBackground = useCallback(async (customSettings?: BgSettings | any) => {
    if (!removeResult) return

    setReplaceStatus('replacing')
    setReplaceResult(null)
    setReplaceError(null)

    const isPreset = customSettings && !customSettings.nativeEvent
    if (isPreset) {
      setSettings(prev => ({ ...prev, ...customSettings }))
    }
    const activeSettings = isPreset ? { ...settings, ...customSettings } : settings
    const apiType = activeSettings.bgType === 'library' ? 'image' : activeSettings.bgType

    let bgFile = activeSettings.bgFile

    if (activeSettings.bgType === 'library' && activeSettings.libraryUrl && !bgFile) {
      try {
        const resp = await fetch(activeSettings.libraryUrl)
        const blob = await resp.blob()
        const ext  = blob.type.split('/')[1] || 'jpg'
        bgFile = new File([blob], `library_bg.${ext}`, { type: blob.type })
      } catch {
        setReplaceError('Failed to load the selected library background. Please try again.')
        setReplaceStatus('idle')
        return
      }
    }

    const formData = new FormData()
    formData.append('fg_filename',    removeResult.output_filename)
    formData.append('bg_type',        apiType)
    formData.append('solid_color',    activeSettings.solidColor)
    formData.append('gradient_start', activeSettings.gradientStart)
    formData.append('gradient_end',   activeSettings.gradientEnd)
    formData.append('gradient_dir',   activeSettings.gradientDir)
    formData.append('bg_fit',         activeSettings.bgFit)
    if ((activeSettings.bgType === 'image' || activeSettings.bgType === 'library') && bgFile) {
      formData.append('bg_file', bgFile)
    }

    try {
      const res = await axios.post<ReplaceResult>(
        '/api/replace-background',
        formData,
      )
      setReplaceResult(res.data)
      setReplaceStatus('done')
      // Register output in the pipeline so SendToMenu can forward it
      registerOutput(
        `/api/download/${res.data.output_filename}`,
        res.data.output_filename,
      )
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Background replacement failed. Please try again.'
      setReplaceError(msg)
      setReplaceStatus('idle')
    }
  }, [removeResult, settings, registerOutput])

  // ── Step-2-only reset — keeps removed foreground, clears result ───────

  const resetStep2 = useCallback(() => {
    setReplaceStatus('idle')
    setReplaceResult(null)
    setReplaceError(null)
  }, [])

  // ── Full reset ────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setRemoveStatus('idle')
    setRemoveResult(null)
    setReplaceResult(null)
    setRemoveError(null)
    setReplaceError(null)
    setReplaceStatus('idle')
    setActiveImage(null, null)
    setOriginalUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setRemovedUrl(null)
  }, [setActiveImage])

  return {
    // step 1
    removeStatus, removeResult, originalUrl, removedUrl, removeError,
    removeBackground,
    quality, setQuality,
    // step 2
    replaceStatus, replaceResult, replaceError,
    replaceBackground,
    // settings
    settings, updateSetting, resetSettings,
    // global
    reset,
    resetStep2,
  }
}
