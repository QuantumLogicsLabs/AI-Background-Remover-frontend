import { useState, useCallback, useRef, useEffect } from 'react'
import axios from 'axios'
import type { Quality } from './useUpload'

// ── Types ──────────────────────────────────────────────────────────────────

export type JobStatus  = 'idle' | 'uploading' | 'pending' | 'running' | 'done' | 'error'
export type FileStatus = 'queued' | 'processing' | 'done' | 'error'

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
  const [job,         setJob]         = useState<BatchJob | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [quality,     setQuality]     = useState<Quality>('fast')

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const jobIdRef = useRef<string | null>(null)

  // ── Stop polling ───────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling])

  // ── Poll job status ────────────────────────────────────────────────────
  const startPolling = useCallback((jobId: string) => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get<BatchJob>(`/api/batch/${jobId}/status`)
        setJob(res.data)
        if (res.data.status === 'done') {
          setJobStatus('done')
          stopPolling()
        } else {
          setJobStatus(res.data.status as JobStatus)
        }
      } catch {
        // Non-fatal poll failure — keep trying
      }
    }, POLL_INTERVAL_MS)
  }, [stopPolling])

  // ── Start batch job ────────────────────────────────────────────────────
  const startBatch = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    setJobStatus('uploading')
    setJob(null)
    setUploadError(null)
    stopPolling()

    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    formData.append('quality', quality)

    try {
      const res = await axios.post<StartResult>(
        '/api/batch/start',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      jobIdRef.current = res.data.job_id
      setJobStatus('pending')
      startPolling(res.data.job_id)
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Failed to start batch job. Please try again.'
      setUploadError(msg)
      setJobStatus('error')
    }
  }, [quality, startPolling, stopPolling])

  // ── Download ZIP ───────────────────────────────────────────────────────
  const downloadZip = useCallback(() => {
    if (!jobIdRef.current) return
    const a = document.createElement('a')
    a.href = `/api/batch/${jobIdRef.current}/download`
    a.download = 'batch_results.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  // ── Reset ──────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopPolling()
    setJobStatus('idle')
    setJob(null)
    setUploadError(null)
    jobIdRef.current = null
  }, [stopPolling])

  // ── Derived progress ───────────────────────────────────────────────────
  const progressPct = job
    ? Math.round(((job.completed + job.failed) / Math.max(job.total, 1)) * 100)
    : 0

  return {
    jobStatus,
    job,
    uploadError,
    progressPct,
    quality,
    setQuality,
    startBatch,
    downloadZip,
    reset,
  }
}
