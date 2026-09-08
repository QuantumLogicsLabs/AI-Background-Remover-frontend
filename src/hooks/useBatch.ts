import { useState, useCallback, useRef, useEffect } from 'react'
import axios from 'axios'
import JSZip from 'jszip'
import type { Quality } from './useUpload'

// ─── Types ───────────────────────────────────────────────────────────────────

export type JobStatus  = 'idle' | 'uploading' | 'pending' | 'running' | 'done' | 'error'
export type FileStatus = 'queued' | 'processing' | 'done' | 'error'
export type ZipFormat  = 'png' | 'jpeg' | 'webp'

export interface BatchFile {
  original_name:   string
  output_filename: string | null
  download_url:    string | null
  status:          FileStatus
  error:           string | null
}

export interface BatchJob {
  job_id:     string
  status:     'pending' | 'running' | 'done'
  quality:    Quality
  created_at: string
  total:      number
  completed:  number
  failed:     number
  files:      BatchFile[]
}

export interface StartResult {
  job_id:      string
  total_files: number
  quality:     Quality
  status:      string
}

const POLL_INTERVAL_MS = 1500

export function useBatch() {
  const [jobStatus,   setJobStatus]   = useState<JobStatus>('idle')
  const [thumbnails,  setThumbnails]  = useState<Record<string, string>>({})
  const [job,         setJob]         = useState<BatchJob | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [quality,     setQuality]     = useState<Quality>('fast')
  const [isZipping,   setIsZipping]   = useState(false)
  const [zipError,    setZipError]    = useState<string | null>(null)

  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const jobIdRef       = useRef<string | null>(null)

  // ─── Stop polling & close SSE ────────────────────────────────────────────
  const cleanupSubscriptions = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (eventSourceRef.current !== null) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  useEffect(() => () => cleanupSubscriptions(), [cleanupSubscriptions])

  // ─── Fallback poll ───────────────────────────────────────────────────────
  const startPolling = useCallback((jobId: string) => {
    if (pollRef.current !== null) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get<BatchJob>(`/api/batch/${jobId}/status`)
        setJob(res.data)
        if (res.data.status === 'done') {
          setJobStatus('done')
          cleanupSubscriptions()
        } else {
          setJobStatus(res.data.status as JobStatus)
        }
      } catch {
        // Non-fatal poll failure — keep trying
      }
    }, POLL_INTERVAL_MS)
  }, [cleanupSubscriptions])

  // ─── SSE real-time tracking (with polling fallback) ──────────────────────
  const startTracking = useCallback((jobId: string) => {
    cleanupSubscriptions()

    if (typeof EventSource === 'undefined') {
      startPolling(jobId)
      return
    }

    try {
      const sse = new EventSource(`/api/batch/${jobId}/events`, { withCredentials: true })
      eventSourceRef.current = sse

      sse.addEventListener('snapshot', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          setJob(data)
          setJobStatus(data.status as JobStatus)
        } catch {}
      })

      sse.addEventListener('job_started', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          setJobStatus('running')
          setJob(prev => prev ? { ...prev, status: 'running', ...data } : null)
        } catch {}
      })

      sse.addEventListener('file_processing', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          setJob(prev => {
            if (!prev) return prev
            const newFiles = [...prev.files]
            if (newFiles[data.index]) {
              newFiles[data.index] = { ...newFiles[data.index], status: 'processing' }
            }
            return { ...prev, files: newFiles }
          })
        } catch {}
      })

      sse.addEventListener('file_done', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          setJob(prev => {
            if (!prev) return prev
            const newFiles = [...prev.files]
            if (newFiles[data.index]) {
              newFiles[data.index] = {
                ...newFiles[data.index],
                status: 'done',
                output_filename: data.output_filename,
                download_url: data.download_url,
              }
            }
            return { ...prev, completed: data.completed, failed: data.failed, files: newFiles }
          })
        } catch {}
      })

      sse.addEventListener('file_error', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          setJob(prev => {
            if (!prev) return prev
            const newFiles = [...prev.files]
            if (newFiles[data.index]) {
              newFiles[data.index] = { ...newFiles[data.index], status: 'error', error: data.error }
            }
            return { ...prev, completed: data.completed, failed: data.failed, files: newFiles }
          })
        } catch {}
      })

      sse.addEventListener('job_done', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          setJobStatus('done')
          setJob(prev => prev ? {
            ...prev,
            status: 'done',
            completed: data.completed,
            failed: data.failed,
            files: data.files,
          } : null)
          cleanupSubscriptions()
        } catch {}
      })

      sse.onerror = () => {
        cleanupSubscriptions()
        startPolling(jobId)
      }
    } catch {
      startPolling(jobId)
    }
  }, [cleanupSubscriptions, startPolling])

  // ─── Start batch job ─────────────────────────────────────────────────────
  const startBatch = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    const newThumbnails: Record<string, string> = {}
    files.forEach(f => { newThumbnails[f.name] = URL.createObjectURL(f) })
    setThumbnails(newThumbnails)

    setJobStatus('uploading')
    setJob(null)
    setUploadError(null)
    cleanupSubscriptions()

    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    formData.append('quality', quality)

    try {
      const res = await axios.post<StartResult>(
        '/api/batch/start',
        formData,
      )
      jobIdRef.current = res.data.job_id
      setJobStatus('pending')
      startTracking(res.data.job_id)
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Failed to start batch job. Please try again.'
      setUploadError(msg)
      setJobStatus('error')
    }
  }, [quality, startTracking, cleanupSubscriptions])

  // ─── Download ZIP (client-side via JSZip + Canvas) ───────────────────────
  const downloadZip = useCallback(async (
    format:       ZipFormat = 'png',
    quality:      number    = 90,
    nameTemplate: string    = '{original_name}',
    bgColor:      string    = 'transparent'
  ) => {
    if (!job) return
    setIsZipping(true)
    setZipError(null)

    try {
      const zip = new JSZip()
      const doneFiles = job.files.filter(f => f.status === 'done' && f.download_url)

      for (const file of doneFiles) {
        const response = await fetch(file.download_url!)
        const blob = await response.blob()

        let finalBlob = blob

        if (bgColor !== 'transparent' || format !== 'png') {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          const imgUrl = URL.createObjectURL(blob)
          img.src = imgUrl
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
          })

          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')!

          if (bgColor !== 'transparent') {
            ctx.fillStyle = bgColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }
          ctx.drawImage(img, 0, 0)
          URL.revokeObjectURL(imgUrl)

          const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
          const q = format === 'png' ? undefined : quality / 100

          finalBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), mimeType, q)
          })
        }

        const originalNameBase = file.original_name.replace(/\.[^/.]+$/, '')
        const newNameBase = nameTemplate.replace('{original_name}', originalNameBase)
        const exts: Record<ZipFormat, string> = { png: '.png', jpeg: '.jpg', webp: '.webp' }
        zip.file(`${newNameBase}${exts[format]}`, finalBlob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(zipBlob)
      a.download = `batch_${job.job_id.substring(0, 8)}_results.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)

    } catch {
      setZipError('Failed to generate ZIP archive.')
    } finally {
      setIsZipping(false)
    }
  }, [job])

  // ─── Derived progress ────────────────────────────────────────────────────
  const progressPct = job
    ? Math.round(((job.completed + job.failed) / Math.max(job.total, 1)) * 100)
    : 0

  // ─── Reset ───────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setJobStatus('idle')
    setJob(null)
    setUploadError(null)
    setZipError(null)
    setIsZipping(false)
    setThumbnails(prev => {
      Object.values(prev).forEach(url => URL.revokeObjectURL(url))
      return {}
    })
    cleanupSubscriptions()
  }, [cleanupSubscriptions])

  return {
    jobStatus,
    thumbnails,
    job,
    uploadError,
    progressPct,
    quality,
    setQuality,
    startBatch,
    downloadZip,
    isZipping,
    zipError,
    reset,
  }
}
