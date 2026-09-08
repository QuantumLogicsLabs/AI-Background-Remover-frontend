import { useState, useCallback } from 'react'
import axios from 'axios'
import apiClient from '../services/apiClient'
import { useActiveImage } from '../contexts/ActiveImageContext'
import { useStudioOutput } from './useStudioOutput'
import { useToast } from './useToast'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'
export type Quality = 'fast' | 'standard' | 'quality'

export interface UploadResult {
  output_filename: string
  download_url:    string
  quality:         Quality
}

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff in ms

export function useUpload() {
  const [status,      setStatus]      = useState<UploadStatus>('idle')
  const [result,      setResult]      = useState<UploadResult | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [quality,     setQuality]     = useState<Quality>('fast')
  const [isRetrying,  setIsRetrying]  = useState(false)
  const { setActiveImage }            = useActiveImage()
  const { registerOutput }            = useStudioOutput()
  const { showToast }                 = useToast()

  const upload = useCallback(async (file: File, overrideQuality?: Quality) => {
    const q = overrideQuality ?? quality
    setStatus('uploading')
    setResult(null)
    setError(null)
    setIsRetrying(false)

    // Show original image immediately via object URL
    const localUrl = URL.createObjectURL(file)
    setActiveImage(file, localUrl)
    setOriginalUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return localUrl
    })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('quality', q)

    let attempt = 0
    while (attempt <= MAX_RETRIES) {
      try {
        const response = await apiClient.post<UploadResult>('/api/remove-background', formData)
        setResult(response.data)
        setStatus('success')
        setIsRetrying(false)
        // Register output in the pipeline so SendToMenu can forward it
        registerOutput(
          `/api/download/${response.data.output_filename}`,
          response.data.output_filename,
        )
        return
      } catch (err) {
        const isNetworkErr =
          !navigator.onLine ||
          (axios.isAxiosError(err) && (!err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED'))

        if (isNetworkErr && attempt < MAX_RETRIES) {
          attempt++
          setIsRetrying(true)
          const delay = RETRY_DELAYS[attempt - 1] || 2000
          showToast(`Network connection lost. Retrying upload (Attempt ${attempt}/${MAX_RETRIES})...`, 'error')
          await new Promise(res => setTimeout(res, delay))
        } else {
          setIsRetrying(false)
          const msg =
            axios.isAxiosError(err) && err.response?.data?.detail
              ? String(err.response.data.detail)
              : isNetworkErr
              ? 'Network connection failed after multiple retries. Please check your internet.'
              : 'Something went wrong. Please try again.'
          setError(msg)
          setStatus('error')
          return
        }
      }
    }
  }, [quality, setActiveImage, showToast, registerOutput])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
    setIsRetrying(false)
    setActiveImage(null, null)
    setOriginalUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [setActiveImage])

  return { status, result, originalUrl, error, quality, setQuality, isRetrying, upload, reset }
}
